import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RotateCcw,
  Sparkles,
  Music,
  Check,
  X,
  Radio,
  Zap,
  ZapOff,
  Timer,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { CreateMode, ReelItem } from '../types';
import { SOUND_TRACKS } from '../data/mockReels';
import { playClickSound, playShutterSound } from '../utils/audio';
import { uploadMediaToCloudinary, CloudinaryUploadResult } from '../utils/cloudinary';
import { useLanguage } from '../i18n/LanguageContext';

const MAX_RECORDING_SECONDS = 60;

type TimerOption = 0 | 3 | 7;

interface CameraCreateViewProps {
  createMode: CreateMode;
  setCreateMode: (mode: CreateMode) => void;
  onPublishReel: (newReel: ReelItem) => void;
  userProfileName: string;
  userProfileUsername: string;
  onOpenUploadModal: () => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export const CameraCreateView: React.FC<CameraCreateViewProps> = ({
  createMode,
  setCreateMode,
  onPublishReel,
  userProfileUsername,
  onRecordingChange,
}) => {
  const { language } = useLanguage();
  const isHi = language === 'hi';

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(true);
  const [selectedSound, setSelectedSound] = useState(SOUND_TRACKS[0]);
  const [showSoundModal, setShowSoundModal] = useState(false);

  // Recording & Countdown states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [timerOption, setTimerOption] = useState<TimerOption>(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);

  // Camera hardware states (Front/Rear & Torch/Flash)
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [isTorchSupported, setIsTorchSupported] = useState(false);
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);

  // Filter & Preview states
  const [activeFilter, setActiveFilter] = useState<'normal' | 'cyberpunk' | 'warm' | 'vintage'>('normal');
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(null);
  const [capturedMediaType, setCapturedMediaType] = useState<'video' | 'image'>('video');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [newCaption, setNewCaption] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showLiveNotice, setShowLiveNotice] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const capturedMediaUrlRef = useRef<string | null>(null);
  const handleStopRecordRef = useRef<() => void>(() => {});

  capturedMediaUrlRef.current = capturedMediaUrl;

  const isBusyCapturing = isRecording || countdownRemaining !== null;

  useEffect(() => {
    onRecordingChange?.(isBusyCapturing);
  }, [isBusyCapturing, onRecordingChange]);

  useEffect(() => {
    return () => {
      onRecordingChange?.(false);
    };
  }, [onRecordingChange]);

  const showTempNotice = useCallback((msg: string) => {
    setCameraNotice(msg);
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setCameraNotice(null);
      noticeTimeoutRef.current = null;
    }, 2600);
  }, []);

  const revokeCapturedMediaUrl = useCallback((url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  const applyTorchConstraint = useCallback(async (enable: boolean): Promise<boolean> => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return false;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: enable } as unknown as MediaTrackConstraintSet],
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        try {
          void videoTrack.applyConstraints({
            advanced: [{ torch: false } as unknown as MediaTrackConstraintSet],
          });
        } catch {
          // ignore cleanup torch errors
        }
      }
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: 'user' | 'environment' = cameraFacingMode) => {
      setIsStartingCamera(true);
      setIsTorchEnabled(false);
      setIsTorchSupported(false);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        setHasCameraAccess(false);
        setIsStartingCamera(false);
        return;
      }

      stopCameraStream();

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: true,
        });
      } catch (err) {
        const errName = err instanceof DOMException ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          if (isMountedRef.current) {
            setHasCameraAccess(false);
            setIsStartingCamera(false);
          }
          return;
        }
        // Fallback: retry video-only if microphone permission/hardware failed
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: facing } },
            audio: false,
          });
        } catch {
          if (isMountedRef.current) {
            setHasCameraAccess(false);
            setIsStartingCamera(false);
          }
          return;
        }
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      // Detect hardware torch capability on active video track
      const videoTrack = stream.getVideoTracks()[0];
      let torchCapable = false;
      if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
        try {
          const caps = videoTrack.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
          torchCapable = Boolean(caps && caps.torch);
        } catch {
          torchCapable = false;
        }
      }
      setIsTorchSupported(torchCapable);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        void videoPreviewRef.current.play().catch(() => {});
      }

      setHasCameraAccess(true);
      setIsStartingCamera(false);
    },
    [cameraFacingMode, stopCameraStream]
  );

  // Ensure <video> always receives the stream if mounted after stream acquisition
  useEffect(() => {
    if (hasCameraAccess && streamRef.current && videoPreviewRef.current) {
      if (videoPreviewRef.current.srcObject !== streamRef.current) {
        videoPreviewRef.current.srcObject = streamRef.current;
      }
      void videoPreviewRef.current.play().catch(() => {});
    }
  }, [hasCameraAccess]);

  useEffect(() => {
    isMountedRef.current = true;
    void startCamera(cameraFacingMode);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopCameraStream();
      revokeCapturedMediaUrl(capturedMediaUrlRef.current);
    };
  }, [cameraFacingMode, startCamera, stopCameraStream, revokeCapturedMediaUrl]);

  const handleStopRecord = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    if (isTorchEnabled && isTorchSupported) {
      void applyTorchConstraint(false);
      setIsTorchEnabled(false);
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore stop failure
      }
    }
  }, [applyTorchConstraint, isTorchEnabled, isTorchSupported]);

  handleStopRecordRef.current = handleStopRecord;

  const beginActualRecording = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream || !hasCameraAccess) {
      showTempNotice(isHi ? 'कैमरा की अनुमति दें' : 'Allow camera permission first');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      showTempNotice(
        isHi
          ? 'यह ब्राउज़र वीडियो रिकॉर्डिंग सपोर्ट नहीं करता'
          : 'Video recording is not supported in this browser'
      );
      return;
    }

    if (isTorchEnabled && isTorchSupported) {
      const ok = await applyTorchConstraint(true);
      if (!ok) {
        setIsTorchSupported(false);
        setIsTorchEnabled(false);
        showTempNotice(isHi ? 'इस फ़ोन में लाइट उपलब्ध नहीं' : 'Light is not available on this phone');
      }
    }

    recordedChunksRef.current = [];
    const candidateTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    const supportedType = candidateTypes.find(
      (type) => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)
    );

    let recorder: MediaRecorder;
    try {
      recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        showTempNotice(
          isHi ? 'रिकॉर्डिंग शुरू नहीं हो पाई' : 'Could not start recording'
        );
        return;
      }
    }

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      if (!isMountedRef.current) return;
      const chunks = recordedChunksRef.current;
      recordedChunksRef.current = [];
      mediaRecorderRef.current = null;

      if (chunks.length === 0) return;

      const mimeType = recorder.mimeType || supportedType || 'video/webm';
      const blob = new Blob(chunks, { type: mimeType });
      revokeCapturedMediaUrl(capturedMediaUrlRef.current);
      const url = URL.createObjectURL(blob);
      setCapturedMediaType('video');
      setCapturedBlob(blob);
      setCapturedMediaUrl(url);
    };

    try {
      recorder.start(250);
    } catch {
      showTempNotice(isHi ? 'रिकॉर्डिंग शुरू नहीं हो पाई' : 'Could not start recording');
      return;
    }

    setIsRecording(true);
    setRecordingSeconds(0);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        if (next >= MAX_RECORDING_SECONDS) {
          window.setTimeout(() => {
            handleStopRecordRef.current();
          }, 0);
          return MAX_RECORDING_SECONDS;
        }
        return next;
      });
    }, 1000);
  }, [
    applyTorchConstraint,
    hasCameraAccess,
    handleStopRecord,
    isHi,
    isTorchEnabled,
    isTorchSupported,
    revokeCapturedMediaUrl,
    showTempNotice,
  ]);

  const handleCancelCountdown = useCallback(() => {
    playClickSound();
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownRemaining(null);
  }, []);

  const handleToggleRecord = () => {
    playShutterSound();

    if (countdownRemaining !== null) {
      handleCancelCountdown();
      return;
    }

    if (isRecording) {
      handleStopRecord();
      return;
    }

    if (!hasCameraAccess || !streamRef.current) {
      void startCamera(cameraFacingMode);
      return;
    }

    if (timerOption > 0) {
      setCountdownRemaining(timerOption);
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
      }
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              window.clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            window.setTimeout(() => {
              void beginActualRecording();
            }, 0);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      void beginActualRecording();
    }
  };

  const handleCycleTimer = () => {
    if (isBusyCapturing) return;
    playClickSound();
    setTimerOption((prev) => (prev === 0 ? 3 : prev === 3 ? 7 : 0));
  };

  const handleToggleTorch = async () => {
    playClickSound();
    if (!hasCameraAccess || !isTorchSupported) {
      showTempNotice(
        isHi ? 'इस फ़ोन में लाइट उपलब्ध नहीं' : 'Light is not available on this phone'
      );
      return;
    }

    const next = !isTorchEnabled;
    const ok = await applyTorchConstraint(next);
    if (!ok) {
      setIsTorchSupported(false);
      setIsTorchEnabled(false);
      showTempNotice(
        isHi ? 'इस फ़ोन में लाइट उपलब्ध नहीं' : 'Light is not available on this phone'
      );
      return;
    }
    setIsTorchEnabled(next);
  };

  const handleFlipCamera = () => {
    if (isBusyCapturing) return;
    playClickSound();
    setCameraFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleGalleryFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    playShutterSound();
    const isImage = file.type.startsWith('image/');
    revokeCapturedMediaUrl(capturedMediaUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    setCapturedMediaType(isImage ? 'image' : 'video');
    setCapturedBlob(file);
    setCapturedMediaUrl(objectUrl);
  };

  const handleModeChange = (mode: CreateMode) => {
    if (isBusyCapturing) return;
    playClickSound();
    if (mode === 'Live') {
      setShowLiveNotice(true);
    } else {
      setCreateMode(mode);
    }
  };

  const handleDiscardCaptured = () => {
    if (isPublishing) return;
    revokeCapturedMediaUrl(capturedMediaUrl);
    setCapturedMediaUrl(null);
    setCapturedBlob(null);
    setRecordingSeconds(0);
  };

  const handlePublish = async () => {
    if (!capturedMediaUrl || isPublishing) return;
    playClickSound();
    setIsPublishing(true);

    let finalVideoUrl = capturedMediaUrl;
    let finalPosterUrl =
      capturedMediaType === 'image'
        ? capturedMediaUrl
        : 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
    let cloudinaryData: CloudinaryUploadResult | undefined = undefined;

    try {
      const uploadBlob =
        capturedBlob ||
        (capturedMediaUrl.startsWith('blob:') || capturedMediaUrl.startsWith('data:')
          ? await (await fetch(capturedMediaUrl)).blob()
          : null);

      if (uploadBlob) {
        const result = await uploadMediaToCloudinary(uploadBlob, {
          folder: createMode === 'Post' ? 'posts' : 'reels',
          resourceType: capturedMediaType === 'image' ? 'image' : 'video',
          maxDimension: 1080,
        });

        finalVideoUrl = result.optimizedUrl || result.secureUrl;
        finalPosterUrl =
          result.thumbnailUrl ||
          (capturedMediaType === 'image' ? result.secureUrl : finalPosterUrl);
        cloudinaryData = result;
      }
    } catch (err) {
      console.warn('Cloudinary upload fallback:', err);
      if (capturedMediaType === 'image') {
        finalPosterUrl = finalVideoUrl;
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
      userAvatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
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
    if (finalVideoUrl !== capturedMediaUrl) {
      revokeCapturedMediaUrl(capturedMediaUrl);
    }
    setCapturedMediaUrl(null);
    setCapturedBlob(null);
    setNewCaption('');
    setRecordingSeconds(0);
    setIsPublishing(false);
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

  const formatTimerLabel = (opt: TimerOption) => {
    if (opt === 0) return isHi ? 'बंद' : 'Off';
    if (opt === 3) return isHi ? '3 सेकंड' : '3s';
    return isHi ? '7 सेकंड' : '7s';
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const getModeLabel = (mode: CreateMode) => {
    if (!isHi) return mode;
    switch (mode) {
      case 'Post':
        return 'पोस्ट';
      case 'Story':
        return 'स्टोरी';
      case 'Reel':
        return 'रील';
      case 'Live':
        return 'लाइव';
    }
  };

  const shutterCircumference = 238;
  const shutterProgressOffset =
    shutterCircumference - (shutterCircumference * recordingSeconds) / MAX_RECORDING_SECONDS;

  return (
    <div className="relative w-full h-full bg-[#0A0A0D] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Bar inside Camera */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-3 pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
        {/* Left: Flip Camera + Torch / Flash */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleFlipCamera}
            disabled={isBusyCapturing}
            className="w-10 h-10 rounded-full bg-black/65 border border-white/20 text-white flex items-center justify-center hover:bg-black/85 active:scale-95 transition-all disabled:opacity-40"
            title={isHi ? 'कैमरा बदलें' : 'Flip camera'}
            aria-label={isHi ? 'कैमरा बदलें' : 'Flip camera'}
          >
            <RotateCcw size={18} />
          </button>

          <button
            type="button"
            onClick={handleToggleTorch}
            className={`w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all ${
              !hasCameraAccess || !isTorchSupported
                ? 'bg-black/45 border-white/10 text-white/60 opacity-40'
                : isTorchEnabled
                ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.35)]'
                : 'bg-black/65 border-white/20 text-white hover:bg-black/85'
            }`}
            title={isHi ? 'फ़्लैश / लाइट' : 'Flash / Light'}
            aria-label={isHi ? 'फ़्लैश / लाइट' : 'Flash / Light'}
          >
            {isTorchEnabled && isTorchSupported ? <Zap size={18} /> : <ZapOff size={18} />}
          </button>
        </div>

        {/* Center: Sound Picker OR Active Recording Clock */}
        {isRecording ? (
          <div className="px-4 py-1.5 rounded-full bg-black/80 border border-[#00FF88] text-white font-mono text-xs font-bold tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.3)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-[#00FF88]">{formatSeconds(recordingSeconds)}</span>
            <span className="text-white/50">/</span>
            <span className="text-white/80">{formatSeconds(MAX_RECORDING_SECONDS)}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowSoundModal(true);
            }}
            className="px-3.5 py-2 rounded-full bg-black/65 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 border border-white/20 hover:border-white/40 active:scale-95 transition-all max-w-[155px]"
          >
            <Music size={13} className="text-[#00FF88] shrink-0" />
            <span className="truncate">{selectedSound.title}</span>
          </button>
        )}

        {/* Right: Timer Toggle (बंद / 3 सेकंड / 7 सेकंड) + Filter */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCycleTimer}
            disabled={isBusyCapturing}
            className={`h-10 px-2.5 rounded-full border text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50 ${
              timerOption > 0
                ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88] shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                : 'bg-black/65 border-white/20 text-white hover:bg-black/85'
            }`}
            title={isHi ? 'टाइमर' : 'Timer'}
            aria-label={isHi ? 'टाइमर' : 'Timer'}
          >
            <Timer size={15} />
            <span>{formatTimerLabel(timerOption)}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              const filters: ('normal' | 'cyberpunk' | 'warm' | 'vintage')[] = [
                'normal',
                'cyberpunk',
                'warm',
                'vintage',
              ];
              const nextIdx = (filters.indexOf(activeFilter) + 1) % filters.length;
              setActiveFilter(filters[nextIdx]);
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center active:scale-95 transition-all ${
              activeFilter !== 'normal'
                ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88]'
                : 'bg-black/65 border-white/20 text-white hover:bg-black/85'
            }`}
            title={`Filter: ${activeFilter}`}
            aria-label={`Filter: ${activeFilter}`}
          >
            <Sparkles size={17} />
          </button>
        </div>
      </div>

      {/* Camera Viewport / Live Preview */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Always mounted video element so stream attaches cleanly */}
        <video
          ref={videoPreviewRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${
            cameraFacingMode === 'user' ? '-scale-x-100' : ''
          } ${getFilterStyle()} ${hasCameraAccess ? 'block' : 'hidden'}`}
        />

        {/* Loading state while requesting camera */}
        {hasCameraAccess === null && isStartingCamera && (
          <div className="w-full h-full bg-[#0A0A0D] flex flex-col items-center justify-center p-6 text-center gap-3">
            <Loader2 size={36} className="text-[#00FF88] animate-spin" />
            <p className="text-sm font-bold text-white">
              {isHi ? 'कैमरा चालू हो रहा है...' : 'Starting camera...'}
            </p>
          </div>
        )}

        {/* Clear Camera Permission Denied State */}
        {hasCameraAccess === false && (
          <div className="w-full h-full bg-[#0A0A0D] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-900 border border-white/15 flex items-center justify-center mb-4">
              <Camera size={38} className="text-white" />
            </div>
            <h4 className="text-white font-extrabold text-base tracking-tight">
              {isHi ? 'कैमरा की अनुमति दें' : 'Allow Camera Permission'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mt-1.5 leading-relaxed">
              {isHi
                ? 'रील या पोस्ट रिकॉर्ड करने के लिए फ़ोन के कैमरे की अनुमति चालू करें, या नीचे गैलरी से फ़ोटो/वीडियो चुनें।'
                : 'Allow camera access to record reels or posts, or pick a photo/video from the gallery below.'}
            </p>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                void startCamera(cameraFacingMode);
              }}
              className="mt-5 px-5 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 text-xs font-extrabold transition-all shadow-lg"
            >
              {isHi ? 'कैमरा की अनुमति दें' : 'Allow Camera Permission'}
            </button>
          </div>
        )}

        {/* Inline Notice Toast (e.g., 'इस फ़ोन में लाइट उपलब्ध नहीं') */}
        {cameraNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/90 border border-white/25 text-white text-xs font-bold shadow-2xl whitespace-nowrap animate-fadeIn">
            {cameraNotice}
          </div>
        )}

        {/* Countdown Overlay (3, 2, 1...) with Cancel Button */}
        {countdownRemaining !== null && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-6">
            <div className="w-36 h-36 rounded-full border-4 border-[#00FF88] bg-black/60 flex items-center justify-center shadow-[0_0_40px_rgba(0,255,136,0.4)]">
              <span className="text-7xl font-black text-[#00FF88] tabular-nums">
                {countdownRemaining}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelCountdown}
              className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 active:scale-95 text-xs font-extrabold shadow-lg transition-all"
            >
              {isHi ? 'रद्द करें' : 'Cancel'}
            </button>
          </div>
        )}

        {/* Minimal HUD Info */}
        {hasCameraAccess && countdownRemaining === null && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-between items-center text-[10px] text-white/60 font-mono">
            <span>
              {cameraFacingMode === 'user'
                ? isHi
                  ? 'फ़्रंट कैमरा'
                  : 'FRONT CAM'
                : isHi
                ? 'रियर कैमरा'
                : 'REAR CAM'}
            </span>
            {activeFilter !== 'normal' && (
              <span className="text-[#00FF88] font-bold uppercase">
                {activeFilter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shutter & Controls Section */}
      <div className="relative z-20 pt-4 pb-2 bg-[#0A0A0D] flex flex-col items-center">
        {/* Hidden Gallery File Picker for Photos & Videos */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleGalleryFileSelected}
        />

        <div className="relative w-full px-6 flex items-center justify-between mb-3">
          {/* Bottom-Left Small Gallery Button (Photos & Videos) */}
          <button
            type="button"
            disabled={isBusyCapturing}
            onClick={() => {
              playClickSound();
              galleryInputRef.current?.click();
            }}
            className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/25 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-md disabled:opacity-40"
            title={isHi ? 'गैलरी से फ़ोटो या वीडियो चुनें' : 'Choose photo or video from gallery'}
            aria-label={isHi ? 'गैलरी' : 'Gallery'}
          >
            <ImageIcon size={18} className="text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">
              {isHi ? 'गैलरी' : 'Gallery'}
            </span>
          </button>

          {/* Center Large Round Record Button */}
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <svg className="absolute w-[88px] h-[88px] -rotate-90 pointer-events-none">
                <circle
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="4"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  stroke="#00FF88"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={shutterCircumference}
                  strokeDashoffset={shutterProgressOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
            )}

            <button
              type="button"
              onClick={handleToggleRecord}
              className={`w-[72px] h-[72px] rounded-full border-4 flex items-center justify-center transition-all active:scale-90 ${
                isRecording
                  ? 'border-[#00FF88] bg-[#00FF88]/20 shadow-[0_0_24px_rgba(0,255,136,0.45)]'
                  : countdownRemaining !== null
                  ? 'border-[#00FF88] bg-zinc-900'
                  : 'border-white bg-white/15 hover:bg-white/25 shadow-[0_0_20px_rgba(255,255,255,0.18)]'
              }`}
              aria-label={
                isRecording
                  ? isHi
                    ? 'रिकॉर्डिंग रोकें'
                    : 'Stop recording'
                  : isHi
                  ? 'रिकॉर्डिंग शुरू करें'
                  : 'Start recording'
              }
            >
              {isRecording ? (
                <div className="w-6 h-6 rounded-sm bg-[#00FF88]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white" />
              )}
            </button>
          </div>

          {/* Right: Quick Camera Flip */}
          <button
            type="button"
            disabled={isBusyCapturing}
            onClick={handleFlipCamera}
            className="w-12 h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/25 flex flex-col items-center justify-center text-white active:scale-95 transition-all shadow-md disabled:opacity-40"
            title={isHi ? 'कैमरा पलटें' : 'Flip camera'}
            aria-label={isHi ? 'कैमरा पलटें' : 'Flip camera'}
          >
            <RotateCcw size={17} className="text-white" />
            <span className="text-[9px] font-bold text-white mt-0.5">
              {isHi ? 'पलटें' : 'Flip'}
            </span>
          </button>
        </div>

        {/* Bottom Mode Selector Bar */}
        <div className="w-full h-11 flex justify-around items-center bg-[#0A0A0D] border-t border-zinc-900 px-2">
          {(['Post', 'Story', 'Reel', 'Live'] as CreateMode[]).map((mode) => {
            const isActive = createMode === mode;
            return (
              <button
                key={mode}
                type="button"
                disabled={isBusyCapturing}
                onClick={() => handleModeChange(mode)}
                className={`text-sm font-bold px-3 py-2 transition-colors relative disabled:opacity-40 ${
                  isActive ? 'text-[#00FF88]' : 'text-white/70 hover:text-white'
                }`}
              >
                {getModeLabel(mode)}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#00FF88] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Captured Clip / Gallery Media Preview Modal */}
      {capturedMediaUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121216] border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                {isHi
                  ? `प्रीव्यू और पब्लिश (${getModeLabel(createMode)})`
                  : `Preview & Publish ${createMode}`}
              </h4>
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleDiscardCaptured}
                className="p-1 text-white/70 hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative aspect-[9/12] w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {capturedMediaType === 'image' ? (
                <img
                  src={capturedMediaUrl}
                  alt="Preview"
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <video
                  src={capturedMediaUrl}
                  autoPlay
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/70 text-[10px] text-white pointer-events-none">
                🎵 {selectedSound.title}
              </div>
            </div>

            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder={
                isHi
                  ? 'कैप्शन लिखें... #Infinity #Trending'
                  : 'Write a caption... #Infinity #Trending'
              }
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
            />

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isPublishing}
                onClick={handleDiscardCaptured}
                className="flex-1 py-2.5 rounded-lg border border-white/25 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                {isHi ? 'दोबारा लें' : 'Retake'}
              </button>
              <button
                type="button"
                disabled={isPublishing}
                onClick={() => void handlePublish()}
                className="flex-1 py-2.5 rounded-lg bg-[#00FF88] text-xs font-extrabold text-black hover:bg-[#00e57a] disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {isPublishing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{isHi ? 'अपलोड हो रहा है...' : 'Publishing...'}</span>
                  </>
                ) : (
                  <span>{isHi ? 'पब्लिश करें' : 'Publish Now'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sound Picker Modal */}
      {showSoundModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-md bg-[#121216] border-t border-zinc-800 rounded-t-2xl p-4 max-h-[70vh] flex flex-col animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Music size={18} className="text-[#00FF88]" />
                <span className="font-bold text-white text-sm">
                  {isHi ? 'गाना चुनें' : 'Select Sound Track'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSoundModal(false)}
                className="text-xs font-bold text-white hover:text-[#00FF88]"
              >
                {isHi ? 'हो गया' : 'Done'}
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
                      ? 'bg-[#00FF88]/15 border border-[#00FF88]/50'
                      : 'bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-white text-xs">
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

      {/* Live Notice Modal */}
      {showLiveNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs p-5 bg-[#121216] border border-zinc-800 rounded-2xl text-center shadow-2xl">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#00FF88]/15 text-[#00FF88] flex items-center justify-center">
              <Radio size={24} />
            </div>
            <h4 className="text-base font-bold text-white mb-1">
              {isHi ? 'लाइव स्ट्रीमिंग' : 'Live Streaming'}
            </h4>
            <p className="text-xs text-zinc-300 mb-4">
              {isHi ? '💰 लाइव फ़ीचर — जल्द आ रहा है!' : '💰 Live Feature — Coming Soon!'}
            </p>
            <p className="text-[11px] text-zinc-500 mb-4">
              {isHi
                ? 'रियल-टाइम गिफ़्ट और चैट के साथ लाइव स्ट्रीमिंग अगले अपडेट में आएगी।'
                : 'Creator live streaming with real-time gifts, diamond tips, and interactive chat is scheduled in the upcoming milestone!'}
            </p>
            <button
              type="button"
              onClick={() => setShowLiveNotice(false)}
              className="w-full py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-colors"
            >
              {isHi ? 'समझ आ गया' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
