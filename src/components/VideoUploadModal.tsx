import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Upload,
  Film,
  Image as ImageIcon,
  Music,
  MapPin,
  Tag,
  Check,
  X,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Camera,
  FolderOpen
} from 'lucide-react';
import { ReelItem } from '../types';
import { SOUND_TRACKS } from '../data/mockReels';
import { playClickSound, playWinChime } from '../utils/audio';
import { uploadMediaToCloudinary } from '../utils/cloudinary';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (newReel: ReelItem, format: 'Reel' | 'Post') => void;
  username: string;
  userAvatar: string;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onPublish,
  username,
  userAvatar,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'Reel' | 'Post'>('Reel');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoThumbnail, setVideoThumbnail] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedSound, setSelectedSound] = useState(SOUND_TRACKS[0]);
  const [audioSource, setAudioSource] = useState<'original' | 'track'>('original');
  const [locationTag, setLocationTag] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showSoundSelector, setShowSoundSelector] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (mediaUrl && mediaUrl.startsWith('blob:')) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (selectedFormat === 'Reel' && !isVideo) {
      alert('Reels require a video file. Please select a video.');
      return;
    }

    if (!isVideo && !isImage) {
      alert('Please select a valid video or image file from your device.');
      return;
    }

    setMediaFile(file);
    const objectUrl = URL.createObjectURL(file);
    setMediaUrl(objectUrl);

    // Default caption from file name
    const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    if (!caption) {
      setCaption(`${defaultTitle} ✨ #Infinity`);
    }

    if (isVideo) {
      setMediaType('video');
      // Capture thumbnail once video loads
      const tempVideo = document.createElement('video');
      tempVideo.src = objectUrl;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      tempVideo.crossOrigin = 'anonymous';

      tempVideo.onloadedmetadata = () => {
        setVideoDuration(tempVideo.duration);
        tempVideo.currentTime = Math.min(1, tempVideo.duration / 2);
      };

      tempVideo.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = tempVideo.videoWidth || 480;
          canvas.height = tempVideo.videoHeight || 640;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.8);
            setVideoThumbnail(thumb);
          }
        } catch {
          setVideoThumbnail('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80');
        }
      };
    } else {
      setMediaType('image');
      setVideoDuration(0);
      setVideoThumbnail(objectUrl);
    }
  };

  const handleSelectSample = (sampleUrl: string, samplePoster: string, sampleTitle: string) => {
    setMediaUrl(sampleUrl);
    setMediaType('video');
    setVideoThumbnail(samplePoster);
    setVideoDuration(12);
    setCaption(`${sampleTitle} ✨ #Trending`);
    setMediaFile(new File(['sample'], 'sample_gallery_clip.mp4', { type: 'video/mp4' }));
  };

  const addHashtag = (tag: string) => {
    playClickSound();
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  const togglePlay = () => {
    if (!previewVideoRef.current) return;
    if (isPlaying) {
      previewVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      previewVideoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = async () => {
    if (!mediaUrl) {
      alert('Please select or upload media first.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    playClickSound();

    try {
      let finalMediaUrl = mediaUrl;
      let finalPosterUrl = videoThumbnail;
      let cloudinaryData = undefined;

      // Real Cloudinary Upload
      if (mediaFile && mediaFile.size > 100) {
        setUploadProgress(40);
        const cloudResult = await uploadMediaToCloudinary(mediaFile, {
          folder: selectedFormat === 'Reel' ? 'reels' : 'posts',
          resourceType: mediaType,
          maxDimension: 1080,
        });

        finalMediaUrl = cloudResult.optimizedUrl || cloudResult.secureUrl;
        finalPosterUrl = cloudResult.thumbnailUrl || (mediaType === 'image' ? finalMediaUrl : videoThumbnail);
        cloudinaryData = cloudResult;
      }

      setUploadProgress(100);

      const newReel: ReelItem = {
        id: Date.now().toString(),
        views: '1',
        viewsCount: 1,
        likes: '0',
        likesCount: 0,
        comments: '0',
        shares: '0',
        title: caption.trim() || `New ${selectedFormat} by @${username}`,
        user: username,
        userAvatar: userAvatar,
        isVerified: false,
        videoUrl: finalMediaUrl,
        posterUrl:
          finalPosterUrl ||
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
        soundTitle:
          audioSource === 'track'
            ? selectedSound.title
            : `Original Audio - @${username}`,
        category: 'both',
        isLiked: false,
        isSaved: false,
        isFollowing: false,
        commentsList: [],
        timestamp: Date.now(),
        createdAt: 'Just now',
        cloudinary: cloudinaryData,
      };

      playWinChime();
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.5 },
          colors: ['#00FF88', '#FFD700', '#00E5FF', '#FFFFFF'],
        });
      } catch {
        // fallback
      }

      onPublish(newReel, selectedFormat);
      setIsUploading(false);
      onClose();
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      setIsUploading(false);
      alert(`Upload error: ${err.message || 'Failed to upload media to Cloudinary'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="relative w-full max-w-xl max-h-[92vh] bg-[#14161C] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film size={18} className="text-[#00FF88]" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              Create & Prepare Video
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Format Selector: Reel vs Post */}
        <div className="px-5 pt-3 flex gap-2">
          <button
            onClick={() => {
              playClickSound();
              setSelectedFormat('Reel');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedFormat === 'Reel'
                ? 'bg-[#00FF88] text-black shadow-[0_2px_12px_rgba(0,255,136,0.25)]'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <Film size={14} />
            <span>Reel (9:16 Vertical)</span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setSelectedFormat('Post');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedFormat === 'Post'
                ? 'bg-[#00FF88] text-black shadow-[0_2px_12px_rgba(0,255,136,0.25)]'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <ImageIcon size={14} />
            <span>Feed Post (Photo / Video)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Upload Section / Preview */}
          {!mediaUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-[#00FF88] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/70 group"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-800 group-hover:bg-emerald-500/10 flex items-center justify-center text-zinc-400 group-hover:text-[#00FF88] transition-colors mb-3">
                <Upload size={24} />
              </div>
              <p className="text-xs font-bold text-white mb-1">
                {selectedFormat === 'Reel'
                  ? 'Choose video from device gallery'
                  : 'Choose photo or video from device gallery'}
              </p>
              <p className="text-[11px] text-zinc-400 max-w-xs">
                {selectedFormat === 'Reel'
                  ? 'Supports MP4, MOV, WebM. Ideal for short vertical reels.'
                  : 'Supports MP4, WebM videos, and JPEG, PNG, WebP photos.'}
              </p>

              <button
                type="button"
                className="mt-3.5 px-4 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors flex items-center gap-1.5"
              >
                <FolderOpen size={14} />
                Browse Device Gallery
              </button>

              {/* Sample Clips for immediate one-click testing */}
              <div className="mt-5 pt-4 border-t border-zinc-800/80 w-full text-left">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-2">
                  Or select a sample clip from library:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSample(
                        'https://assets.mixkit.co/videos/preview/mixkit-young-woman-skater-moving-forward-along-the-street-41713-large.mp4',
                        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
                        'Skating Through Sunset Avenue 🛹'
                      );
                    }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left text-[11px] text-zinc-300 transition-colors"
                  >
                    🛹 Sunset Skater
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSample(
                        'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-playing-a-synthesizer-41617-large.mp4',
                        'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
                        'Synthesizer Jam Session 🎹'
                      );
                    }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left text-[11px] text-zinc-300 transition-colors"
                  >
                    🎹 Synth Beats
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectSample(
                        'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-clouds-30232-large.mp4',
                        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
                        'Cosmic Starfield Time-lapse 🌌'
                      );
                    }}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left text-[11px] text-zinc-300 transition-colors"
                  >
                    🌌 Starry Night
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Media Selected & Ready to Prepare */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Media Preview Column */}
              <div className="flex flex-col items-center">
                <div
                  className={`relative bg-black rounded-xl overflow-hidden shadow-lg cursor-pointer ${
                    selectedFormat === 'Reel'
                      ? 'w-full max-w-[220px] aspect-[9/16]'
                      : 'w-full max-w-[260px] aspect-square'
                  }`}
                  onClick={mediaType === 'video' ? togglePlay : undefined}
                >
                  {mediaUrl ? (
                    mediaType === 'video' ? (
                      <video
                        ref={previewVideoRef}
                        src={mediaUrl}
                        poster={videoThumbnail || undefined}
                        loop
                        muted
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt="Post Preview"
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : null}
                  {mediaType === 'video' && !isPlaying && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                      <Play size={36} />
                    </div>
                  )}

                  {/* Format Badge Overlay */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-[#00FF88] font-bold">
                    {selectedFormat} Preview ({mediaType === 'video' ? 'Video' : 'Photo'})
                  </div>

                  {/* Duration overlay */}
                  {mediaType === 'video' && videoDuration > 0 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                      {Math.round(videoDuration)}s
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    Change media
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    onClick={() => {
                      setMediaUrl('');
                      setMediaFile(null);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Video Preparation Form Column */}
              <div className="space-y-3">
                {/* Caption Input */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-1">
                    Caption & Description
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a catchy caption, ask a question, or share your story..."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] resize-none"
                  />
                </div>

                {/* Hashtag chips */}
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-1">
                    Quick Hashtags:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['#Infinity', '#Trending', '#ReelsIndia', '#DesiVibes', '#0toInfinity', '#Viral'].map(
                      (tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addHashtag(tag)}
                          className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded-md transition-colors"
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Audio Track Selector */}
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <Music size={14} className="text-[#00FF88]" />
                      <span>Audio Track</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAudioSource('original')}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          audioSource === 'original'
                            ? 'bg-[#00FF88] text-black font-bold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Original
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioSource('track');
                          setShowSoundSelector(true);
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded ${
                          audioSource === 'track'
                            ? 'bg-[#00FF88] text-black font-bold'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Music Library
                      </button>
                    </div>
                  </div>

                  {audioSource === 'track' && (
                    <div
                      onClick={() => setShowSoundSelector(true)}
                      className="p-2 rounded-lg bg-black/40 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-zinc-700"
                    >
                      <span className="text-xs text-white truncate max-w-[170px]">
                        🎵 {selectedSound.title}
                      </span>
                      <span className="text-[10px] text-[#00FF88]">Change</span>
                    </div>
                  )}
                </div>

                {/* Location Input */}
                <div>
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />
                    <input
                      type="text"
                      value={locationTag}
                      onChange={(e) => setLocationTag(e.target.value)}
                      placeholder="Add location (e.g. Mumbai, Mandla)"
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={selectedFormat === 'Post' ? 'video/*,image/*' : 'video/*'}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!mediaUrl || isUploading}
            className="px-6 py-2 rounded-xl bg-[#00FF88] hover:bg-[#00e57a] text-black font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_14px_rgba(0,255,136,0.25)] flex items-center gap-2 active:scale-95 transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Preparing & Posting ({uploadProgress}%)...</span>
              </>
            ) : (
              <>
                <span>Post as {selectedFormat}</span>
                <Check size={14} />
              </>
            )}
          </button>
        </div>

        {/* Sound Selection Modal */}
        {showSoundSelector && (
          <div className="absolute inset-0 z-50 bg-black/90 p-5 flex flex-col justify-between animate-fadeIn">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-white">Choose Audio Track</span>
                <button
                  onClick={() => setShowSoundSelector(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Done
                </button>
              </div>

              <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
                {SOUND_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => {
                      setSelectedSound(track);
                      setShowSoundSelector(false);
                      setAudioSource('track');
                    }}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer ${
                      selectedSound.id === track.id
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white'
                        : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{track.title}</p>
                      <p className="text-[10px] text-zinc-400">@{track.artist}</p>
                    </div>
                    {selectedSound.id === track.id && (
                      <Check size={14} className="text-[#00FF88]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSoundSelector(false)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white rounded-lg mt-3"
            >
              Confirm Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
