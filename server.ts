import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Configure Cloudinary server-side instance (Credentials from env only - never exposed to client)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

if (cloudName) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Check Cloudinary Configuration Status (Safe for frontend, NO secret revealed)
app.get('/api/cloudinary/config', (_req, res) => {
  const isConfigured = Boolean(cloudName && (apiSecret || process.env.VITE_CLOUDINARY_UPLOAD_PRESET));
  res.json({
    configured: isConfigured,
    cloudName: cloudName || null,
    hasApiKey: Boolean(apiKey),
    hasApiSecret: Boolean(apiSecret),
    hasUploadPreset: Boolean(process.env.VITE_CLOUDINARY_UPLOAD_PRESET),
  });
});

// 2. Server-side Secure Upload Route (Uses server-side API Secret if present)
app.post('/api/cloudinary/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const folder = req.body.folder || 'infinity_app';
    const resourceType = req.body.resource_type || (file.mimetype.startsWith('video/') ? 'video' : 'image');

    // If server has API Secret configured, upload using Node SDK stream
    if (cloudName && apiSecret && apiKey) {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType as any,
          transformation: [
            resourceType === 'video'
              ? { quality: 'auto', fetch_format: 'auto', width: 1080, crop: 'limit' }
              : { quality: 'auto', fetch_format: 'auto', width: 1080, crop: 'limit' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            console.error('Cloudinary Server Upload Stream Error:', error);
            return res.status(500).json({ error: error?.message || 'Upload failed' });
          }
          return res.json(result);
        }
      );

      uploadStream.end(file.buffer);
    } else if (cloudName && process.env.VITE_CLOUDINARY_UPLOAD_PRESET) {
      // Forward using unsigned preset
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }));
      formData.append('upload_preset', process.env.VITE_CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', folder);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: errText });
      }

      const data = await response.json();
      return res.json(data);
    } else {
      return res.status(400).json({
        error: 'Cloudinary credentials not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET or CLOUDINARY_API_SECRET.',
      });
    }
  } catch (err: any) {
    console.error('Upload Error in server.ts:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Mount Vite in development or serve static in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Infinity Server running on port ${PORT}`);
  });
}

startServer();
