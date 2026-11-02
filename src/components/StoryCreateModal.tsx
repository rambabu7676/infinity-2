import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Upload,
  Image as ImageIcon,
  Type,
  Music,
  Smile,
  Sparkles,
  Check,
  Palette,
  Camera,
  FolderOpen
} from 'lucide-react';
import { StorySlide } from '../types';
import { SOUND_TRACKS } from '../data/mockReels';
import { playClickSound, playWinChime } from '../utils/audio';
import { uploadMediaToCloudinary } from '../utils/cloudinary';

interface StoryCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStorySlide: (slide: StorySlide) => void;
  username: string;
}

const PRESET_BACKGROUNDS = [
  { id: 'neon', name: 'Neon Cyber', url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80', gradient: 'from-[#00FF88]/40 via-black to-[#00E5FF]/40' },
  { id: 'desi', name: 'Desi Street', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80', gradient: 'from-amber-600/40 via-black to-red-600/40' },
  { id: 'fitness', name: 'Fitness Gym', url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80', gradient: 'from-blue-600/40 via-black to-purple-600/40' },
  { id: 'sunset', name: 'Golden Glow', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80', gradient: 'from-[#FFD700]/40 via-black to-rose-600/40' },
  { id: 'abstract', name: '0-∞ Cosmic', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', gradient: 'from-emerald-500/40 via-black to-teal-500/40' }
];

const STICKERS = ['🔥 HOT', '✨ VIBES', '⚡️ 0-∞', '💎 100 DIAMONDS', '📍 MUMBAI', '🎧 LIVE MUSIC'];

export const StoryCreateModal: React.FC<StoryCreateModalProps> = ({
  isOpen,
  onClose,
  onAddStorySlide,
  username,
}) => {
  const [selectedBg, setSelectedBg] = useState(PRESET_BACKGROUNDS[0].url);
  const [customMediaUrl, setCustomMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [textColor, setTextColor] = useState('#00FF88');
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState(SOUND_TRACKS[0]);
  const [showSoundSelector, setShowSoundSelector] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');

    const objUrl = URL.createObjectURL(file);
    setCustomMediaUrl(objUrl);
  };

  const handlePostStory = async () => {
    setIsPosting(true);
    playClickSound();

    try {
      let finalMediaUrl = customMediaUrl || selectedBg;
      let cloudinaryData = undefined;

      // Real Cloudinary Upload for photo or video
      if (mediaFile) {
        const cloudResult = await uploadMediaToCloudinary(mediaFile, {
          folder: 'stories',
          resourceType: mediaType,
          maxDimension: 1080,
        });
        finalMediaUrl = cloudResult.optimizedUrl || cloudResult.secureUrl;
        cloudinaryData = cloudResult;
      }

      const newSlide: StorySlide = {
        id: `slide-${Date.now()}`,
        mediaUrl: finalMediaUrl,
        mediaType: mediaType,
        duration: 5,
        caption: [caption, activeSticker].filter(Boolean).join(' ') || undefined,
        soundTitle: selectedSound ? selectedSound.title : undefined,
        createdAt: 'Just now',
        cloudinary: cloudinaryData,
      };

      playWinChime();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00FF88', '#00E5FF', '#FFD700', '#FFFFFF'],
        });
      } catch {
        // fallback
      }

      onAddStorySlide(newSlide);
      setIsPosting(false);
      onClose();
    } catch (err: any) {
      console.error('Story upload error:', err);
      setIsPosting(false);
      alert(`Story upload error: ${err.message || 'Failed to upload media to Cloudinary'}`);
    }
  };

  const activeMedia = customMediaUrl || selectedBg;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-[430px] h-full max-h-[900px] bg-[#14161B] border border-zinc-800 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
        {/* Top Header */}
        <div className="relative z-20 px-4 pt-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X size={18} />
          </button>

          <span className="text-white text-xs font-bold tracking-wide">
            Add to Story · 24 Hours
          </span>

          {/* Sound Selector Trigger */}
          <button
            onClick={() => setShowSoundSelector(!showSoundSelector)}
            className="px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-white text-[11px] font-semibold flex items-center gap-1.5 hover:border-[#00FF88] transition-colors"
          >
            <Music size={12} className="text-[#00FF88]" />
            <span className="max-w-[100px] truncate">{selectedSound.title}</span>
          </button>
        </div>

        {/* Story Canvas Preview */}
        <div className="relative flex-1 mx-3 my-2 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-zinc-800">
          {mediaType === 'video' && customMediaUrl ? (
            <video
              src={customMediaUrl}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : activeMedia ? (
            <img
              src={activeMedia}
              alt="Story Preview"
              className="w-full h-full object-cover"
            />
          ) : null}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

          {/* Live Caption Overlay */}
          {caption && (
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center pointer-events-none">
              <span
                className="inline-block px-4 py-2 rounded-xl text-sm font-bold shadow-lg"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: textColor,
                  border: `1px solid ${textColor}40`,
                }}
              >
                {caption}
              </span>
            </div>
          )}

          {/* Sticker Overlay */}
          {activeSticker && (
            <div className="absolute top-16 right-4 z-10 pointer-events-none animate-bounce">
              <span className="px-3 py-1.5 rounded-full bg-[#00FF88] text-black font-extrabold text-xs shadow-xl">
                {activeSticker}
              </span>
            </div>
          )}

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Floating Change Device Media Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-4 left-3 z-20 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-1.5 hover:bg-black transition-colors border border-white/20 active:scale-95"
            title="Pick from file manager or gallery"
          >
            <FolderOpen size={13} className="text-[#00FF88]" />
            <span>Gallery</span>
          </button>

          {/* Direct Native Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="absolute bottom-4 right-3 z-20 px-3 py-1.5 rounded-full bg-[#00FF88] hover:bg-[#00e57a] text-black text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95"
            title="Launch native phone camera directly"
          >
            <Camera size={13} className="text-black" />
            <span>Direct Camera</span>
          </button>
        </div>

        {/* Story Creation Tools */}
        <div className="relative z-20 px-4 pb-4 space-y-3">
          {/* Caption Input */}
          <div className="relative">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add text caption to your story..."
              className="w-full h-10 pl-3.5 pr-20 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
            />
            {/* Color Palette Switcher */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {['#00FF88', '#FFD700', '#00E5FF', '#FF0055', '#FFFFFF'].map((col) => (
                <button
                  key={col}
                  onClick={() => setTextColor(col)}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    textColor === col ? 'scale-125 border-white ring-1 ring-white' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          {/* Quick Stickers */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
            <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0">Stickers:</span>
            {STICKERS.map((stk) => (
              <button
                key={stk}
                onClick={() => {
                  playClickSound();
                  setActiveSticker(activeSticker === stk ? null : stk);
                }}
                className={`px-2.5 py-1 rounded-full shrink-0 font-bold transition-colors ${
                  activeSticker === stk
                    ? 'bg-[#00FF88] text-black'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                }`}
              >
                {stk}
              </button>
            ))}
          </div>

          {/* Background Presets Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-zinc-500 text-[10px] uppercase font-bold shrink-0">Presets:</span>
            {PRESET_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => {
                  playClickSound();
                  setCustomMediaUrl(null);
                  setSelectedBg(bg.url);
                  setMediaType('image');
                }}
                className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  !customMediaUrl && selectedBg === bg.url
                    ? 'border-[#00FF88] scale-105 shadow-md'
                    : 'border-zinc-800 opacity-70 hover:opacity-100'
                }`}
              >
                <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Post to Story Action Button */}
          <button
            onClick={handlePostStory}
            disabled={isPosting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:brightness-105 active:scale-98 text-black font-extrabold text-xs tracking-wide shadow-[0_4px_20px_rgba(0,255,136,0.3)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isPosting ? (
              <span>Posting Story...</span>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Share to Your Story (स्टोरी लगाएं)</span>
              </>
            )}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Music selector modal overlay */}
        {showSoundSelector && (
          <div className="absolute inset-0 z-40 bg-black/90 p-4 flex flex-col justify-between animate-fadeIn">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-white">Select Story Music</span>
                <button
                  onClick={() => setShowSoundSelector(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Done
                </button>
              </div>

              <div className="space-y-2 mt-3 max-h-72 overflow-y-auto">
                {SOUND_TRACKS.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedSound(t);
                      setShowSoundSelector(false);
                      playClickSound();
                    }}
                    className={`p-3 rounded-xl flex items-center justify-between cursor-pointer ${
                      selectedSound.id === t.id
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-white'
                        : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">{t.title}</p>
                      <p className="text-[10px] text-zinc-400">@{t.artist}</p>
                    </div>
                    {selectedSound.id === t.id && (
                      <Check size={16} className="text-[#00FF88]" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSoundSelector(false)}
              className="w-full py-2 bg-zinc-800 text-xs font-bold text-white rounded-lg"
            >
              Confirm Music
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
