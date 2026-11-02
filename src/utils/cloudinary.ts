/**
 * Cloudinary Media Integration Utility for Infinity App
 * 
 * Secure media storage for:
 * 1. Reels (Videos)
 * 2. Stories (Photos & Videos)
 * 3. Posts (Gallery Photos & Videos)
 * 
 * Security rule: NEVER expose CLOUDINARY_API_SECRET in frontend code.
 * Uses Unsigned Upload Presets for client-side uploads, or server-side /api/cloudinary proxy.
 */

export interface CloudinaryUploadOptions {
  folder?: 'reels' | 'stories' | 'posts';
  resourceType?: 'auto' | 'video' | 'image';
  tags?: string[];
  maxDimension?: number; // e.g. 1080
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  resourceType: 'video' | 'image';
  format: string;
  bytes: number;
  width: number;
  height: number;
  duration?: number;
  createdAt: string;
}

// Read public client-side Cloudinary settings from env (NO API SECRET!)
export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } {
  const cloudName =
    (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME ||
    (typeof window !== 'undefined' ? (window as any).__INFINITY_CLOUDINARY_CLOUD_NAME : '') ||
    '';

  const uploadPreset =
    (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET ||
    (typeof window !== 'undefined' ? (window as any).__INFINITY_CLOUDINARY_UPLOAD_PRESET : '') ||
    '';

  return { cloudName, uploadPreset };
}

/**
 * Compress and resize images before upload
 * Resizes large camera photos down to max 1080x1920 keeping aspect ratio
 * and applies JPEG/WebP compression (quality 0.82)
 */
export async function compressImageBeforeUpload(
  file: File | Blob,
  maxWidth = 1080,
  maxHeight = 1920,
  quality = 0.82
): Promise<Blob> {
  // If not an image, return original
  if (file.type && !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Check if resizing is needed
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      } else if (file.size < 300 * 1024) {
        // Already under 300KB and within dimensions, no re-encoding needed
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Determine output format
      const outputType = 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Optimizes Cloudinary URL with f_auto, q_auto and dimensions
 */
export function getOptimizedCloudinaryUrl(
  url: string,
  options?: {
    resourceType?: 'video' | 'image';
    width?: number;
    height?: number;
    crop?: 'limit' | 'fill' | 'scale';
  }
): string {
  if (!url || typeof url !== 'string') return url;

  // Only apply to Cloudinary delivery URLs
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  const resourceType = options?.resourceType || (url.includes('/video/upload/') ? 'video' : 'image');
  const width = options?.width || (resourceType === 'video' ? 1080 : 1080);
  const crop = options?.crop || 'limit';

  // Construct transformation string: f_auto,q_auto,w_{width},c_{crop}
  const transforms = `f_auto,q_auto,w_${width},c_${crop}`;

  // If URL already has transformations, avoid duplicate insertion
  if (url.includes('/upload/f_auto') || url.includes('/upload/q_auto')) {
    return url;
  }

  // Insert transformations after /upload/
  return url.replace('/upload/', `/upload/${transforms}/`);
}

/**
 * Generate video poster thumbnail URL using Cloudinary
 */
export function getCloudinaryVideoThumbnailUrl(videoUrl: string, width = 720): string {
  if (!videoUrl || !videoUrl.includes('res.cloudinary.com')) {
    return videoUrl;
  }

  // Replace file extension with .jpg and add auto frame selection so_auto
  const cleanUrl = videoUrl.replace(/\.[^/.]+$/, '.jpg');
  const transforms = `f_auto,q_auto,w_${width},c_limit,so_auto`;

  if (cleanUrl.includes('/upload/')) {
    return cleanUrl.replace('/upload/', `/upload/${transforms}/`);
  }

  return cleanUrl;
}

/**
 * Main Upload Function to Cloudinary:
 * Uploads media (Reel video, Story photo/video, or Post photo/video)
 * 
 * Rules strictly followed:
 * - Never exposes API Secret on client
 * - Compresses images before upload
 * - Automatically produces f_auto,q_auto optimized delivery URLs
 */
export async function uploadMediaToCloudinary(
  fileOrBlob: File | Blob,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const isVideo = fileOrBlob.type?.startsWith('video/') || false;
  const resourceType = isVideo ? 'video' : 'image';
  const folder = options.folder ? `infinity_app/${options.folder}` : 'infinity_app';

  // 1. Compress image client-side if it's an image
  let uploadPayload: Blob = fileOrBlob;
  if (!isVideo) {
    uploadPayload = await compressImageBeforeUpload(
      fileOrBlob,
      options.maxDimension || 1080,
      1920,
      0.82
    );
  }

  const { cloudName, uploadPreset } = getCloudinaryConfig();

  // Try Server-Side Proxy First if available (keeps everything on backend)
  try {
    const formData = new FormData();
    formData.append('file', uploadPayload);
    formData.append('resource_type', resourceType);
    formData.append('folder', folder);

    const serverRes = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.secure_url) {
        const optimized = getOptimizedCloudinaryUrl(data.secure_url, { resourceType });
        const thumb =
          resourceType === 'video'
            ? getCloudinaryVideoThumbnailUrl(data.secure_url)
            : getOptimizedCloudinaryUrl(data.secure_url, { width: 480 });

        return {
          publicId: data.public_id,
          secureUrl: data.secure_url,
          optimizedUrl: optimized,
          thumbnailUrl: thumb,
          resourceType,
          format: data.format || (isVideo ? 'mp4' : 'jpg'),
          bytes: data.bytes || uploadPayload.size,
          width: data.width || (isVideo ? 1080 : 1080),
          height: data.height || (isVideo ? 1920 : 1920),
          duration: data.duration,
          createdAt: data.created_at || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    // Server endpoint not active or fallback to direct client unsigned upload
  }

  // 2. Direct Unsigned Upload to Cloudinary API (NO API SECRET REQUIRED)
  if (cloudName && uploadPreset) {
    const formData = new FormData();
    formData.append('file', uploadPayload);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        parsedMessage = parsed.error?.message || errorText;
      } catch {
        // ignore
      }
      throw new Error(`Cloudinary Upload Failed: ${parsedMessage}`);
    }

    const data = await response.json();
    const optimized = getOptimizedCloudinaryUrl(data.secure_url, { resourceType });
    const thumb =
      resourceType === 'video'
        ? getCloudinaryVideoThumbnailUrl(data.secure_url)
        : getOptimizedCloudinaryUrl(data.secure_url, { width: 480 });

    return {
      publicId: data.public_id,
      secureUrl: data.secure_url,
      optimizedUrl: optimized,
      thumbnailUrl: thumb,
      resourceType,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
      duration: data.duration,
      createdAt: data.created_at,
    };
  }

  // 3. Fallback / Demonstration Mode when credentials are not yet entered in .env:
  // Creates an accessible blob URL and simulated Cloudinary public ID so the user can test the UI immediately
  const localUrl = URL.createObjectURL(uploadPayload);
  const simId = `infinity_sim_${Date.now()}`;
  return {
    publicId: simId,
    secureUrl: localUrl,
    optimizedUrl: localUrl,
    thumbnailUrl: isVideo
      ? 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=700&auto=format&fit=crop&q=80'
      : localUrl,
    resourceType,
    format: isVideo ? 'mp4' : 'jpg',
    bytes: uploadPayload.size,
    width: 1080,
    height: 1920,
    duration: isVideo ? 15 : undefined,
    createdAt: new Date().toISOString(),
  };
}
