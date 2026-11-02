import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Music,
  Check,
  X,
  Volume2,
  AlertCircle,
  Radio,
  Zap,
  Sliders
} from 'lucide-react';
import { CreateMode, ReelItem } from '../types';
import { SOUND_TRACKS } from '../data/mockReels';
import { playClickSound, playShutterSound } from '../utils/audio';
import { uploadMediaToCloudinary } from '../utils/cloudinary';

interface CameraCreateViewProps {
  createMode: CreateMode;
  setCreateMode: (mode: CreateMode) => void;
  onPublishReel: (newReel: ReelItem) => void;
  userProfileName: string;
  userProfileUsername: string;
  onOpenUploadModal: () => void;
}

export const CameraCreateView: React.FC<CameraCreateViewProps> = ({
  createMode,
  setCreateMode,
  onPublishReel,
  userProfileName,
  userProfileUsername,
  onOpenUploadModal,
}) => {
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [selectedSound, setSelectedSound] = useState(SOUND_TRACKS[0]);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [capturedVideo, setCapturedVideo] = useState<string | null>(null);
  const [newCaption, setNewCaption] = useState('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [activeFilter, setActiveFilter] = useState<'normal' | 'cyberpunk' | 'warm' | 'vintage'>('normal');
  const [showLiveNotice, setShowLiveNotice] = useState(false);
  const [liveStreamActive, setLiveStreamActive] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const handleNativeFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playShutterSound();
    const objectUrl = URL.createObjectURL(file);
    setCapturedVideo(objectUrl);
  };

  // Initialize camera if possible
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setHasCameraAccess(true);
    } catch {
      setHasCameraAccess(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [cameraFacingMode]);

  // Handle Recording logic
  const handleToggleRecord = () => {
    playShutterSound();

    if (!isRecording) {
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            handleStopRecord();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      handleStopRecord();
    }
  };

  const handleStopRecord = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    // Simulate captured recording ready for publishing
    setCapturedVideo(
      'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-playing-a-synthesizer-41617-large.mp4'
    );
  };

  const handleModeChange = (mode: CreateMode) => {
    playClickSound();
    if (mode === 'Live') {
      setShowLiveNotice(true);
    } else {
      setCreateMode(mode);
    }
  };

  const handleFlipCamera = () => {
    playClickSound();
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handlePublish = async () => {
    playClickSound();

    let finalVideoUrl = capturedVideo || 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-man-playing-a-synthesizer-41617-large.mp4';
    let finalPosterUrl = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
    let cloudinaryData = undefined;

    if (capturedVideo && (capturedVideo.startsWith('blob:') || capturedVideo.startsWith('data:'))) {
      try {
        const response = await fetch(capturedVideo);
        const blob = await response.blob();
        const result = await uploadMediaToCloudinary(blob, {
          folder: createMode === 'Post' ? 'posts' : 'reels',
          resourceType: 'video',
          maxDimension: 1080,
        });

        finalVideoUrl = result.optimizedUrl || result.secureUrl;
        finalPosterUrl = result.thumbnailUrl || finalPosterUrl;
        cloudinaryData = result;
      } catch (err) {
        console.warn('Cloudinary upload fallback:', err);
      }
    }

    const newReelItem: ReelItem = {
      id: Date.now().toString(),
      views: '1',
      viewsCount: 1,
      likes: '1',
      likesCount: 1,
      comments: '0',
      shares: '0',
      title: newCaption.trim() || `${createMode} by @${userProfileUsername} ✨`,
      user: userProfileUsername,
      userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      isVerified: false,
      videoUrl: finalVideoUrl,
      posterUrl: finalPosterUrl,
      soundTitle: selectedSound.title,
      category: 'both',
      isLiked: true,
      isSaved: false,
      isFollowing: false,
      commentsList: [],
      timestamp: Date.now(),
      createdAt: 'Just now',
      cloudinary: cloudinaryData,
    };

    onPublishReel(newReelItem);
    setCapturedVideo(null);
    setNewCaption('');
    setRecordingSeconds(0);
  };

  const getFilterStyle = () => {
    switch (activeFilter) {
      case 'cyberpunk':
        return 'contrast-125 saturate-200 hue-rotate-15';
      case 'warm':
        return 'sepia-[.25] saturate-150 brightness-105';
      case 'vintage':
        return 'grayscale contrast-125';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full h-full bg-[#111] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar inside Camera */}
      <div className="relative z-20 flex items-center justify-between p-4 pt-5">
        <button
          onClick={handleFlipCamera}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all"
          title="Flip camera"
        >
          <RotateCcw size={18} />
        </button>

        {/* Sound Picker Button matching prompt */}
        <button
          onClick={() => {
            playClickSound();
            setShowSoundModal(true);
          }}
          className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/10 hover:border-white/30 active:scale-95 transition-all"
        >
          <Music size={13} className="text-[#00FF88]" />
          <span className="max-w-[150px] truncate">{selectedSound.title}</span>
        </button>

        {/* Filter / Preset Picker */}
        <button
          onClick={() => {
            playClickSound();
            const filters: ('normal' | 'cyberpunk' | 'warm' | 'vintage')[] = ['normal', 'cyberpunk', 'warm', 'vintage'];
            const nextIdx = (filters.indexOf(activeFilter) + 1) % filters.length;
            setActiveFilter(filters[nextIdx]);
          }}
          className={`w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all ${
            activeFilter !== 'normal' ? 'ring-2 ring-[#00FF88]' : ''
          }`}
          title={`Filter: ${activeFilter}`}
        >
          <Sparkles size={18} className={activeFilter !== 'normal' ? 'text-[#00FF88]' : ''} />
        </button>
      </div>

      {/* Camera Viewport / Live Preview */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {hasCameraAccess ? (
          <video
            ref={videoPreviewRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${getFilterStyle()}`}
          />
        ) : (
          /* High-Tech Animated Studio Viewfinder Fallback */
          <div className="w-full h-full bg-gradient-to-b from-[#181822] via-[#0E1015] to-[#0A0B0E] flex flex-col items-center justify-center p-6 text-center">
            <div className="relative w-48 h-48 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center mb-4">
              <div className="absolute inset-2 rounded-full border border-emerald-500/10 animate-ping opacity-30" />
              <Camera size={52} className="text-[#00FF88] opacity-80" />
            </div>
            <h4 className="text-white font-bold text-sm tracking-wide">Studio Camera Preview</h4>
            <p className="text-xs text-zinc-400 max-w-xs mt-1">
              Webcam simulated viewfinder. Ready to record high-frame rate {createMode}!
            </p>
            <button
              onClick={startCamera}
              className="mt-3 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-200 text-xs transition-colors"
            >
              Request Camera Permission
            </button>
          </div>
        )}

        {/* Viewfinder crosshairs and HUD */}
        <div className="absolute inset-4 pointer-events-none border border-white/10 rounded-2xl flex flex-col justify-between p-3">
          <div className="flex justify-between items-center text-[10px] text-white/50 font-mono">
            <span>ISO 400 · 4K 60FPS</span>
            <span>0-∞ INFINITY CAM</span>
          </div>

          {/* Recording Timer Banner */}
          {isRecording && (
            <div className="self-center px-4 py-1.5 rounded-full bg-red-600/90 text-white font-mono text-xs font-bold tracking-widest flex items-center gap-2 animate-pulse shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              00:{recordingSeconds.toString().padStart(2, '0')} / 00:15
            </div>
          )}

          <div className="flex justify-between items-center text-[10px] text-white/50 font-mono">
            <span>FILTER: {activeFilter.toUpperCase()}</span>
            <span>AUDIO: SYNC</span>
          </div>
        </div>
      </div>

      {/* Shutter & Controls Section */}
      <div className="relative z-20 py-4 flex flex-col items-center">
        {/* Shutter Button Matching React Native specs + Device Gallery Upload Button */}
        <div className="relative flex items-center justify-center gap-7 mb-3">
          {/* Gallery Upload Button (Device Video) */}
          {/* Hidden input for Native Camera direct launch */}
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={handleNativeFileSelected}
          />

          {/* Left Gallery Button */}
          <button
            onClick={() => {
              playClickSound();
              onOpenUploadModal();
            }}
            className="w-10 h-10 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 flex flex-col items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all shadow-md group"
            title="Upload video from device gallery"
          >
            <div className="w-4 h-4 rounded border border-dashed border-emerald-400/80 flex items-center justify-center mb-0.5">
              <span className="text-[9px] text-emerald-400 font-bold">+</span>
            </div>
            <span className="text-[8px] font-semibold text-zinc-400 group-hover:text-white">Gallery</span>
          </button>

          {/* Direct Native Camera Button (Instant Phone Camera Launch) */}
          <button
            onClick={() => {
              playClickSound();
              nativeCameraInputRef.current?.click();
            }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-400/50 flex flex-col items-center justify-center text-emerald-300 hover:text-white active:scale-95 transition-all shadow-md group"
            title="Launch native device camera directly"
          >
            <Camera size={15} className="text-[#00FF88] group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-bold text-[#00FF88] mt-0.5">Camera</span>
          </button>

          {/* Center Shutter Button */}
          <div className="relative flex items-center justify-center">
            {/* Progress Ring during recording */}
            {isRecording && (
              <svg className="absolute w-[86px] h-[86px] -rotate-90 pointer-events-none">
                <circle
                  cx="43"
                  cy="43"
                  r="38"
                  fill="none"
                  stroke="#00FF88"
                  strokeWidth="4"
                  strokeDasharray="238"
                  strokeDashoffset={238 - (238 * recordingSeconds) / 15}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            )}

            <button
              onClick={handleToggleRecord}
              className={`w-[70px] h-[70px] rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 shadow-[0_0_20px_rgba(255,0,80,0.5)] ${
                isRecording ? 'bg-red-600 scale-105' : 'bg-[#FF0050]'
              }`}
              aria-label="Record button"
            >
              {isRecording ? (
                <div className="w-6 h-6 rounded-sm bg-white" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-white opacity-40" />
              )}
            </button>
          </div>

          {/* Quick Flip camera button */}
          <button
            onClick={handleFlipCamera}
            className="w-11 h-11 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 flex flex-col items-center justify-center text-zinc-300 hover:text-white active:scale-95 transition-all shadow-md"
            title="Flip camera"
          >
            <RotateCcw size={16} />
            <span className="text-[9px] font-semibold text-zinc-400 mt-0.5">Flip</span>
          </button>
        </div>

        {/* Bottom Mode Selector Bar matching React Native code: ['Post', 'Story', 'Reel', 'Live'] */}
        <div className="w-full h-12 flex justify-around items-center bg-black border-t border-zinc-900 px-2">
          {(['Post', 'Story', 'Reel', 'Live'] as CreateMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`text-sm font-bold px-3 py-2 transition-colors relative ${
                createMode === mode ? 'text-white' : 'text-[#777] hover:text-zinc-400'
              }`}
            >
              {mode}
              {createMode === mode && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Captured Clip / Post Preview Modal */}
      {capturedVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Preview & Publish {createMode}</h4>
              <button
                onClick={() => setCapturedVideo(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-[9/12] w-full rounded-xl overflow-hidden bg-black">
              {capturedVideo ? (
                <video
                  src={capturedVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/60 text-[10px] text-white">
                🎵 {selectedSound.title}
              </div>
            </div>

            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Write a caption... #Infinity #Trending"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setCapturedVideo(null)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-700 text-xs font-bold text-zinc-300 hover:bg-zinc-800"
              >
                Retake
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 py-2.5 rounded-lg bg-[#00FF88] text-xs font-bold text-black hover:bg-[#00e57a]"
              >
                Publish Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎵 Add Sound Picker Modal */}
      {showSoundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-[#1A1A1A] border-t border-zinc-800 rounded-t-2xl p-4 max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-[#00FF88]" />
                <span className="font-bold text-white text-sm">Select Sound Track</span>
              </div>
              <button
                onClick={() => setShowSoundModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Done
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-2">
              {SOUND_TRACKS.map((track) => (
                <div
                  key={track.id}
                  onClick={() => {
                    playClickSound();
                    setSelectedSound(track);
                    setShowSoundModal(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedSound.id === track.id
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-zinc-800/50 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-700 flex items-center justify-center text-white text-xs">
                      🎵
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{track.title}</p>
                      <p className="text-[10px] text-zinc-400">
                        @{track.artist} · {track.plays} uses
                      </p>
                    </div>
                  </div>
                  {selectedSound.id === track.id && (
                    <Check size={16} className="text-[#00FF88]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Notice Modal matching Alert.alert('Live Streaming', '💰 Live Feature — Coming Soon!') */}
      {showLiveNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs p-5 bg-[#1A1A1A] border border-zinc-800 rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Radio size={24} />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Live Streaming</h4>
            <p className="text-xs text-zinc-300 mb-4">
              💰 Live Feature — Coming Soon!
            </p>
            <p className="text-[11px] text-zinc-500 mb-4">
              Creator live streaming with real-time gifts, diamond tips, and interactive chat is scheduled in the upcoming milestone!
            </p>
            <button
              onClick={() => setShowLiveNotice(false)}
              className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
