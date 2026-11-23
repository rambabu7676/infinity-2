import React, { useState, useRef, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  ChevronLeft,
  Music,
  X,
  Play,
  Pause,
  Mic,
  MicOff,
  Languages,
  ShieldCheck,
  Sparkles,
  Copy,
  EyeOff,
  ThumbsDown,
  AlertTriangle,
  Flag,
  LogIn,
  Ban,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ReelItem } from '../types';
import { playClickSound, playLikePop } from '../utils/audio';
import { ShareSheetModal } from './ShareSheetModal';
import { sanitizeComment, VOICE_SUGGESTIONS } from '../utils/moderation';
import { recordVerifiedReelView } from '../utils/monetization';
import { useLanguage } from '../i18n/LanguageContext';

interface ReelViewerModalProps {
  reels: ReelItem[];
  currentReel: ReelItem | null;
  onClose: () => void;
  onOpenSpin: () => void;
  onToggleLike: (reelId: string) => void;
  onToggleSave: (reelId: string) => void;
  onToggleFollow: (username: string) => void;
  onAddComment: (reelId: string, commentText: string) => void;
  onSelectReel: (reel: ReelItem) => void;
  onAddToStory?: (reel: ReelItem) => void;
  onReportReel?: (reelId: string, reason: string) => void;
  onDislikeReel?: (reelId: string) => void;
  isGuest?: boolean;
  onOpenAuth?: () => void;
  currentUsername?: string;
  currentUserUid?: string;
  blockedUsernames?: string[];
  blockedByUsernames?: string[];
  onBlockUser?: (target: { username: string; avatarUrl?: string }) => Promise<void> | void;
  onEditReelCaption?: (reelId: string, newCaption: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteReel?: (reelId: string) => Promise<{ success: boolean; error?: string }>;
}

export const ReelViewerModal: React.FC<ReelViewerModalProps> = ({
  reels,
  currentReel,
  onClose,
  onOpenSpin,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onAddComment,
  onSelectReel,
  onAddToStory,
  onReportReel,
  onDislikeReel,
  isGuest = false,
  onOpenAuth,
  currentUsername = '',
  currentUserUid = '',
  blockedUsernames = [],
  blockedByUsernames = [],
  onBlockUser,
  onEditReelCaption,
  onDeleteReel,
}) => {
  const { t } = useLanguage();
  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals & Drawers
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // 🚨 Report & Safety System
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReasonIdx, setSelectedReportReasonIdx] = useState(0);
  const selectedReportReason =
    t.reelViewer.reportModal.reasons[selectedReportReasonIdx] ||
    t.reelViewer.reportModal.reasons[0];
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [guestAlert, setGuestAlert] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);

  // Edit Caption & Delete Reel States (Owner-Only)
  const [showEditCaptionModal, setShowEditCaptionModal] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [captionEditError, setCaptionEditError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingReel, setIsDeletingReel] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Comment input state
  const [commentInput, setCommentInput] = useState('');

  // 🎙️ Voice-to-Text States
  const [isVoiceTyping, setIsVoiceTyping] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [interimText, setInterimText] = useState('');
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Current reel index in the reels list
  const currentIndex = currentReel ? reels.findIndex((r) => r.id === currentReel.id) : -1;

  // Video element setup & auto-play
  useEffect(() => {
    setShowEditCaptionModal(false);
    setCaptionEditError(null);
    setShowDeleteConfirm(false);
    setDeleteError(null);
    setShowMoreMenu(false);
    if (currentReel && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [currentReel?.id]);

  // Anti-Bot 3-Second Watch Time Tracking for Monetization
  useEffect(() => {
    if (!currentReel?.id) return;
    const watchStartTime = Date.now();

    return () => {
      const elapsedSeconds = (Date.now() - watchStartTime) / 1000;
      recordVerifiedReelView(currentReel.id, elapsedSeconds, true);
    };
  }, [currentReel?.id]);

  // Navigation handlers
  const handleNextReel = () => {
    if (currentIndex < reels.length - 1) {
      onSelectReel(reels[currentIndex + 1]);
    } else {
      onSelectReel(reels[0]);
    }
  };

  const handlePrevReel = () => {
    if (currentIndex > 0) {
      onSelectReel(reels[currentIndex - 1]);
    } else {
      onSelectReel(reels[reels.length - 1]);
    }
  };

  // Keyboard navigation (Arrow Up / Down, M for mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showCommentsDrawer ||
        showShareModal ||
        showMoreMenu ||
        showBlockConfirm ||
        showEditCaptionModal ||
        showDeleteConfirm
      )
        return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextReel();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevReel();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    reels,
    showCommentsDrawer,
    showShareModal,
    showMoreMenu,
    showBlockConfirm,
    showEditCaptionModal,
    showDeleteConfirm,
  ]);

  // Mouse wheel scroll to next / prev reel
  const lastScrollTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (showCommentsDrawer || showShareModal) return;
    const now = Date.now();
    if (now - lastScrollTime.current < 650) return;
    if (e.deltaY > 35) {
      lastScrollTime.current = now;
      handleNextReel();
    } else if (e.deltaY < -35) {
      lastScrollTime.current = now;
      handlePrevReel();
    }
  };

  // Touch swipe support (Up / Down)
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;
    if (diff > 55) {
      handleNextReel();
    } else if (diff < -55) {
      handlePrevReel();
    }
    touchStartY.current = null;
  };

  // Single tap: Play / Pause toggle
  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (!videoRef.current) return;

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }, 220);
  };

  // Guest Mode guard helper
  const checkGuestRestricted = (actionName: string): boolean => {
    if (isGuest) {
      setGuestAlert(t.reelViewer.guestActionAlert(actionName));
      setTimeout(() => setGuestAlert(null), 3500);
      return true;
    }
    return false;
  };

  // Double tap: Like with heart pop
  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (checkGuestRestricted(t.reelViewer.likeAction)) return;

    if (currentReel && !currentReel.isLiked) {
      playLikePop();
      onToggleLike(currentReel.id);
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  // Mute toggle (always accessible)
  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playClickSound();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  // 🎙️ Voice-to-Text in Comments Drawer
  const stopVoiceTyping = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsVoiceTyping(false);
    setInterimText('');
  };

  const toggleVoiceTyping = (requestedLang?: 'hi-IN' | 'en-IN') => {
    playClickSound();

    if (isVoiceTyping && !requestedLang) {
      stopVoiceTyping();
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const langToUse = requestedLang || voiceLanguage;
    if (requestedLang) {
      setVoiceLanguage(requestedLang);
    }

    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      const sample = VOICE_SUGGESTIONS[Math.floor(Math.random() * VOICE_SUGGESTIONS.length)];
      setCommentInput((prev) => (prev ? `${prev} ${sample}` : sample));
      setModerationNotice(t.reelViewer.voiceFallbackNotice);
      setTimeout(() => setModerationNotice(null), 3000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = langToUse;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceTyping(true);
        setInterimText('');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += item[0].transcript;
          } else {
            interimTrans += item[0].transcript;
          }
        }

        if (finalTrans) {
          setCommentInput((prev) => {
            const trimmed = prev.trim();
            const addition = finalTrans.trim();
            return trimmed ? `${trimmed} ${addition}` : addition;
          });
          setInterimText('');
        } else {
          setInterimText(interimTrans);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setModerationNotice(t.reelViewer.micPermissionNotice);
          setTimeout(() => setModerationNotice(null), 3500);
        }
        stopVoiceTyping();
      };

      recognition.onend = () => {
        setIsVoiceTyping(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      const sample = VOICE_SUGGESTIONS[Math.floor(Math.random() * VOICE_SUGGESTIONS.length)];
      setCommentInput((prev) => (prev ? `${prev} ${sample}` : sample));
      setModerationNotice(t.reelViewer.voiceAddedNotice);
      setTimeout(() => setModerationNotice(null), 2500);
    }
  };

  const allBlockedSet = new Set<string>([...blockedUsernames, ...blockedByUsernames]);

  const handleSendComment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentReel) return;
    if (isGuest) {
      setGuestAlert(t.reelViewer.guestCommentAlert);
      setTimeout(() => setGuestAlert(null), 3500);
      return;
    }
    if (allBlockedSet.has(currentReel.user)) {
      setModerationNotice(t.reelViewer.blockedCommentNotice);
      setTimeout(() => setModerationNotice(null), 3000);
      return;
    }
    const rawText = (commentInput + (interimText ? ` ${interimText}` : '')).trim();
    if (!rawText) return;

    // Content moderation against abusive words
    const { cleanedText, hasAbuse } = sanitizeComment(rawText);

    if (hasAbuse) {
      setModerationNotice(t.reelViewer.abuseFilteredNotice);
      setTimeout(() => setModerationNotice(null), 3000);
    }

    onAddComment(currentReel.id, cleanedText);
    setCommentInput('');
    setInterimText('');
    stopVoiceTyping();
    playClickSound();
  };

  if (!currentReel) return null;

  const isReelAuthorBlocked = allBlockedSet.has(currentReel.user);
  const isOwnReel = Boolean(
    !isGuest &&
      currentReel &&
      (currentReel.uid
        ? Boolean(currentUserUid && currentReel.uid === currentUserUid)
        : Boolean(currentUsername && currentReel.user === currentUsername))
  );
  const isImageMedia = Boolean(
    currentReel.cloudinary?.resourceType === 'image' ||
      /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(currentReel.videoUrl || '')
  );
  const visibleComments = (currentReel.commentsList || []).filter(
    (c) => !allBlockedSet.has(c.user)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Container constrained to mobile reel dimension */}
      <div className="relative w-full max-w-[430px] h-full max-h-[920px] bg-black overflow-hidden flex flex-col justify-between shadow-2xl">
        {/* ================= 1. VIDEO LAYER ================= */}
        <div
          className="absolute inset-0 bg-zinc-950 flex items-center justify-center cursor-pointer"
          onClick={isImageMedia ? undefined : handleVideoClick}
          onDoubleClick={handleDoubleTap}
        >
          {currentReel.videoUrl ? (
            isImageMedia ? (
              <img
                src={currentReel.videoUrl}
                alt={currentReel.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                src={currentReel.videoUrl}
                poster={currentReel.posterUrl || undefined}
                loop
                muted={isMuted}
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            )
          ) : null}

          {/* Clean gradient overlay for text readability without obscuring video */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75 pointer-events-none" />

          {/* Paused state overlay */}
          {!isPlaying && (
            <div className="absolute z-20 w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-emerald-400/40 flex items-center justify-center text-[#00FF88] shadow-2xl pointer-events-none animate-fadeIn">
              <Play size={28} className="ml-1 fill-[#00FF88]" />
            </div>
          )}

          {/* Double-tap Heart Burst */}
          {showHeartBurst && (
            <div className="absolute z-30 pointer-events-none animate-ping text-[#00FF88]">
              <Heart size={90} fill="#00FF88" strokeWidth={0} />
            </div>
          )}
        </div>

        {/* ================= 2. TOP HEADER (CLEAN ORIGINAL HEADER) ================= */}
        <header className="relative z-30 flex items-center justify-between px-4 pt-5 pb-2">
          {/* Back Button */}
          <button
            onClick={onClose}
            className="p-2 -ml-1 text-white hover:text-[#00FF88] transition-colors rounded-full bg-black/30 backdrop-blur-md active:scale-95 drop-shadow-md"
            title={t.reelViewer.backTitle}
            aria-label={t.reelViewer.backTitle}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          {/* Reels Title */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 drop-shadow-md">
            <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wide">{t.reelViewer.headerTitle}</span>
          </div>

          {/* Right Controls: Permanent Volume Button & Spin Button */}
          <div className="flex items-center gap-2">
            {/* Permanent Volume/Speaker Toggle */}
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-full backdrop-blur-md transition-all active:scale-90 border drop-shadow-md ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-black/40 border-white/15 text-white hover:text-[#00FF88]'
              }`}
              title={isMuted ? t.reelViewer.unmuteSound : t.reelViewer.muteSound}
              aria-label={isMuted ? t.reelViewer.unmuteSound : t.reelViewer.muteSound}
            >
              {isMuted ? (
                <VolumeX size={18} strokeWidth={2.2} />
              ) : (
                <Volume2 size={18} strokeWidth={2.2} />
              )}
            </button>

            {/* Spin Wheel Shortcut */}
            <button
              onClick={onOpenSpin}
              className="p-1.5 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 text-black font-extrabold transition-transform hover:scale-105 active:scale-95 shadow-md"
              title={t.reelViewer.spinTitle}
              aria-label={t.reelViewer.spinTitle}
            >
              <Sparkles size={17} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* ================= AUTO-HIDE COMMUNITY SAFETY WARNING ================= */}
        {(currentReel.isAutoHidden || (currentReel.reportsCount && currentReel.reportsCount >= 7)) && (
          <div className="relative z-30 mx-3 mt-1 p-2 rounded-xl bg-rose-950/85 border border-rose-500/60 backdrop-blur-md flex items-center gap-2 text-rose-200 shadow-lg animate-fadeIn">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <div className="text-[11px] leading-snug">
              <span className="font-bold text-white">{t.reelViewer.autoHiddenLabel}</span> {t.reelViewer.autoHiddenDesc}
            </div>
          </div>
        )}

        {/* Guest Action Prompt Toast */}
        {guestAlert && (
          <div className="absolute top-16 left-3 right-3 z-50 p-2.5 rounded-xl bg-zinc-900/95 border border-amber-400/80 shadow-2xl flex items-center justify-between gap-2 backdrop-blur-md animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              <span className="text-[11px] text-amber-200 truncate">{guestAlert}</span>
            </div>
            <button
              onClick={() => {
                setGuestAlert(null);
                onOpenAuth?.();
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-[#00FF88] text-black font-bold text-[11px] rounded-lg flex items-center gap-1 shrink-0 active:scale-95 shadow-sm"
            >
              <LogIn size={11} />
              <span>{t.reelViewer.loginBtn}</span>
            </button>
          </div>
        )}

        {/* ================= 3. FLOATING RIGHT ACTION BAR (Clean Instagram Reels Style) ================= */}
        <div className="absolute right-3 bottom-18 z-30 flex flex-col items-center gap-5">
          {/* 1. Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (checkGuestRestricted(t.reelViewer.likeAction)) return;
              playLikePop();
              onToggleLike(currentReel.id);
              if (!currentReel.isLiked) {
                setShowHeartBurst(true);
                setTimeout(() => setShowHeartBurst(false), 900);
              }
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none cursor-pointer"
            title={t.reelViewer.likeBtnTitle}
            aria-label={t.reelViewer.likeBtnTitle}
          >
            <div className="transition-transform active:scale-130 group-hover:scale-110 duration-150">
              <Heart
                size={28}
                className={`transition-all drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                  currentReel.isLiked
                    ? 'fill-[#FF0050] text-[#FF0050] scale-110 drop-shadow-[0_0_12px_rgba(255,0,80,0.5)]'
                    : 'text-white stroke-[2.2]'
                }`}
              />
            </div>
            <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-tight">
              {currentReel.likes}
            </span>
          </button>

          {/* 2. Comment Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              setShowCommentsDrawer(true);
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none cursor-pointer"
            title={t.reelViewer.commentBtnTitle}
            aria-label={t.reelViewer.commentBtnTitle}
          >
            <div className="transition-transform active:scale-120 group-hover:scale-110 duration-150">
              <MessageCircle
                size={27}
                className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] stroke-[2.2]"
              />
            </div>
            <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-tight">
              {currentReel.comments}
            </span>
          </button>

          {/* 3. Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              setShowShareModal(true);
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none cursor-pointer"
            title={t.reelViewer.shareBtnTitle}
            aria-label={t.reelViewer.shareBtnTitle}
          >
            <div className="transition-transform active:scale-120 group-hover:scale-110 duration-150">
              <Share2
                size={25}
                className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] stroke-[2.2]"
              />
            </div>
            <span className="text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] tracking-tight">
              {currentReel.shares}
            </span>
          </button>

          {/* 4. Bookmark / Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isGuest) {
                setGuestAlert(t.reelViewer.guestSaveAlert);
                setTimeout(() => setGuestAlert(null), 3500);
                return;
              }
              playClickSound();
              onToggleSave(currentReel.id);
            }}
            className="flex flex-col items-center gap-1 group focus:outline-none cursor-pointer"
            title={t.reelViewer.saveBtnTitle}
            aria-label={t.reelViewer.saveBtnTitle}
          >
            <div className="transition-transform active:scale-120 group-hover:scale-110 duration-150">
              <Bookmark
                size={25}
                className={`transition-all drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                  currentReel.isSaved
                    ? 'fill-white text-white scale-105'
                    : 'text-white stroke-[2.2]'
                }`}
              />
            </div>
          </button>

          {/* 5. More Options (•••) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              setShowMoreMenu(true);
            }}
            className="text-white hover:text-zinc-200 transition-transform active:scale-120 duration-150 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] cursor-pointer"
            title={t.reelViewer.moreBtnTitle}
            aria-label={t.reelViewer.moreBtnTitle}
          >
            <MoreHorizontal size={24} strokeWidth={2.4} />
          </button>

          {/* 6. Rotating Audio Vinyl Disc (Instagram Signature Feature) */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
            }}
            className="mt-1 w-8 h-8 rounded-full border-2 border-zinc-700 bg-black flex items-center justify-center shadow-lg cursor-pointer overflow-hidden group hover:scale-105 transition-transform"
            title={currentReel.soundTitle || t.reelViewer.originalAudio}
          >
            <div className="w-full h-full rounded-full animate-spin [animation-duration:5s] flex items-center justify-center bg-gradient-to-tr from-zinc-900 to-zinc-800">
              <img
                src={currentReel.userAvatar}
                alt="Audio cover"
                className="w-4 h-4 rounded-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ================= 4. BOTTOM-LEFT OVERLAY (CREATOR INFO, CAPTION, AUDIO) ================= */}
        <div className="relative z-30 px-4 pb-5 pr-16">
          {/* Creator Profile Row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="relative w-9 h-9 rounded-full ring-2 ring-[#00FF88] overflow-hidden shrink-0">
              <img
                src={currentReel.userAvatar}
                alt={currentReel.user}
                className="w-full h-full object-cover"
              />
            </div>

            <span className="text-white font-bold text-sm drop-shadow-md truncate max-w-[150px]">
              @{currentReel.user}
            </span>

            {/* Follow / Following Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (checkGuestRestricted(t.reelViewer.followAction)) return;
                onToggleFollow(currentReel.user);
              }}
              className={`ml-1 px-3 py-1 text-xs font-semibold rounded-full border transition-all active:scale-95 shadow-sm ${
                currentReel.isFollowing
                  ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                  : 'bg-[#00FF88] border-[#00FF88] text-black font-bold hover:bg-[#00e57a]'
              }`}
            >
              {currentReel.isFollowing ? t.reelViewer.followingBtn : t.reelViewer.followBtn}
            </button>
          </div>

          {/* Caption & Hashtags clearly visible */}
          <div className="mb-2">
            <p className="text-white text-xs leading-relaxed drop-shadow-md font-normal break-words line-clamp-3">
              {currentReel.title}
            </p>
          </div>

          {/* Audio Track directly visible with Music note */}
          <div className="flex items-center gap-1.5 text-zinc-300 text-[11px] drop-shadow-md">
            <Music size={12} className="shrink-0 text-[#00FF88] animate-pulse" />
            <span className="truncate max-w-[220px] font-medium">{currentReel.soundTitle}</span>
          </div>
        </div>

        {/* ================= 5. SLIDE-UP COMMENTS DRAWER ================= */}
        {showCommentsDrawer && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-slideUp">
            <div className="h-[72%] bg-[#14181B] border-t border-zinc-800 rounded-t-2xl flex flex-col p-4 shadow-2xl">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {t.reelViewer.commentsHeader(visibleComments.length)}
                  </span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={11} className="text-[#00FF88]" />
                    <span>{t.reelViewer.safeModeration}</span>
                  </span>
                </div>
                <button
                  onClick={() => {
                    stopVoiceTyping();
                    setShowCommentsDrawer(false);
                  }}
                  className="text-zinc-400 hover:text-white p-1 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Moderation notice */}
              {moderationNotice && (
                <div className="my-2 py-1 px-3 rounded-lg bg-zinc-900 border border-[#00FF88]/40 text-[#00FF88] text-xs flex items-center gap-2 animate-fadeIn">
                  <ShieldCheck size={13} className="shrink-0" />
                  <span>{moderationNotice}</span>
                </div>
              )}

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3">
                {visibleComments.length > 0 ? (
                  visibleComments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 text-xs">
                      <img
                        src={c.avatar}
                        alt={c.user}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-zinc-700"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">@{c.user}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0">{c.timeAgo}</span>
                        </div>
                        <p className="text-zinc-300 mt-0.5 leading-snug break-words">{c.text}</p>
                      </div>
                      <div className="flex flex-col items-center text-zinc-500 shrink-0">
                        <Heart size={12} className="hover:text-red-500 cursor-pointer" />
                        <span className="text-[10px]">{c.likes}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-500">
                      {t.reelViewer.noCommentsYet}
                    </p>
                  </div>
                )}
              </div>

              {isGuest ? (
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-amber-200">{t.reelViewer.guestCommentPrompt}</p>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      onOpenAuth?.();
                    }}
                    className="px-3.5 py-2 rounded-full bg-[#00FF88] text-black font-bold text-xs flex items-center gap-1.5 shrink-0 hover:bg-[#00e57a] active:scale-95 transition-all"
                  >
                    <LogIn size={13} />
                    <span>{t.reelViewer.loginBtn}</span>
                  </button>
                </div>
              ) : isReelAuthorBlocked ? (
                <div className="pt-3 border-t border-zinc-800 text-center">
                  <p className="text-xs font-semibold text-rose-300">
                    {t.reelViewer.blockedCommentNotice}
                  </p>
                </div>
              ) : (
                <>
                  {/* Quick Voice Suggestions */}
                  <div className="py-2 border-t border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="text-[10px] text-zinc-500 shrink-0 flex items-center gap-1">
                      <Sparkles size={11} className="text-[#00FF88]" />
                      <span>{t.reelViewer.quickLabel}</span>
                    </span>
                    {VOICE_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCommentInput(suggestion);
                          playClickSound();
                        }}
                        className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] whitespace-nowrap transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Voice-to-Text Active Status Bar */}
                  {isVoiceTyping && (
                    <div className="mb-2 p-2 rounded-xl bg-zinc-900 border border-[#00FF88]/60 flex items-center justify-between gap-2 animate-fadeIn">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88]" />
                        </span>
                        <div className="flex items-center gap-0.5 h-3">
                          {[5, 12, 8, 16, 7].map((h, i) => (
                            <span
                              key={i}
                              className="w-0.5 bg-[#00FF88] rounded-full animate-pulse"
                              style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-[#00FF88] font-medium truncate">
                          {interimText ? `"${interimText}"` : t.reelViewer.listeningSpeakNow}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleVoiceTyping(voiceLanguage === 'hi-IN' ? 'en-IN' : 'hi-IN')}
                          className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-white border border-zinc-700 flex items-center gap-1"
                        >
                          <Languages size={10} />
                          <span>{voiceLanguage === 'hi-IN' ? 'हिंदी' : 'EN'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopVoiceTyping}
                          className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-semibold text-[#00FF88] border border-zinc-700"
                        >
                          {t.reelViewer.doneBtn}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Drawer Comment Form */}
                  <form onSubmit={handleSendComment} className="pt-2 border-t border-zinc-800 flex items-center gap-2">
                    <input
                      type="text"
                      value={commentInput + (isVoiceTyping && interimText ? ` ${interimText}` : '')}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={t.reelViewer.commentPlaceholder}
                      className={`flex-1 h-9 px-3 bg-zinc-800/90 border rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none transition-all ${
                        isVoiceTyping
                          ? 'border-[#00FF88] ring-1 ring-[#00FF88]'
                          : 'border-zinc-700 focus:border-[#00FF88]'
                      }`}
                    />

                    {/* Voice Typing Mic Button */}
                    <button
                      type="button"
                      onClick={() => toggleVoiceTyping()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                        isVoiceTyping
                          ? 'bg-[#00FF88] text-black shadow-md shadow-[#00FF88]/40 animate-pulse'
                          : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-[#00FF88]'
                      }`}
                    >
                      {isVoiceTyping ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    <button
                      type="submit"
                      disabled={!commentInput.trim() && !interimText.trim()}
                      className="px-4 h-9 rounded-full bg-[#00FF88] text-black font-bold text-xs disabled:opacity-40 hover:bg-[#00e57a] transition-colors"
                    >
                      {t.reelViewer.postBtn}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= 6. MORE OPTIONS SHEET ================= */}
        {showMoreMenu && (
          <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
            <div className="bg-[#181C20] border-t border-zinc-800 rounded-t-2xl p-4 space-y-2">
              <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-3" />

              {/* Owner-Only Options: Edit Caption & Delete Reel */}
              {isOwnReel && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowMoreMenu(false);
                      setCaptionDraft(currentReel.title || '');
                      setCaptionEditError(null);
                      setShowEditCaptionModal(true);
                    }}
                    className="w-full py-2.5 px-3 text-left text-sm text-white hover:bg-zinc-800 rounded-xl flex items-center gap-3 font-medium"
                  >
                    <Pencil size={18} className="text-[#00FF88]" />
                    <span>{t.reelViewer.moreMenu.editCaption}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowMoreMenu(false);
                      setDeleteError(null);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full py-2.5 px-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-3 font-medium"
                  >
                    <Trash2 size={18} className="text-rose-400" />
                    <span>{t.reelViewer.moreMenu.deleteReel}</span>
                  </button>
                </>
              )}

              {/* Dislike Reel */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  if (isGuest) {
                    setGuestAlert(t.reelViewer.guestMoreActionAlert);
                    setTimeout(() => setGuestAlert(null), 3500);
                    return;
                  }
                  playClickSound();
                  onDislikeReel?.(currentReel.id);
                }}
                className="w-full py-2.5 px-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <ThumbsDown size={18} className={currentReel.isDisliked ? 'text-amber-400 fill-amber-400' : ''} />
                  <span>
                    {currentReel.isDisliked
                      ? t.reelViewer.moreMenu.undislikeReel
                      : t.reelViewer.moreMenu.dislikeReel}
                  </span>
                </div>
                {currentReel.isDisliked && (
                  <span className="text-[10px] text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full font-bold">
                    {t.reelViewer.moreMenu.dislikedBadge}
                  </span>
                )}
              </button>

              {/* Block Creator */}
              {!isOwnReel && (
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    if (isGuest) {
                      setGuestAlert(t.reelViewer.guestMoreActionAlert);
                      setTimeout(() => setGuestAlert(null), 3500);
                      return;
                    }
                    playClickSound();
                    setShowBlockConfirm(true);
                  }}
                  className="w-full py-2.5 px-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center gap-3"
                >
                  <Ban size={18} className="text-rose-400" />
                  <span>{t.reelViewer.moreMenu.blockCreator}</span>
                </button>
              )}

              {/* Report Reel */}
              <button
                onClick={() => {
                  playClickSound();
                  setShowMoreMenu(false);
                  setShowReportModal(true);
                  setReportSubmitted(false);
                }}
                className="w-full py-2.5 px-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-rose-400" />
                  <span>{t.reelViewer.moreMenu.reportReel}</span>
                </div>
                {(currentReel.reportsCount || 0) > 0 && (
                  <span className="text-[10px] text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-full font-bold">
                    {t.reelViewer.moreMenu.reportsBadge(currentReel.reportsCount || 0)}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShowMoreMenu(false);
                }}
                className="w-full py-2.5 px-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 rounded-xl flex items-center gap-3"
              >
                <Copy size={18} />
                <span>{t.reelViewer.moreMenu.copyLink}</span>
              </button>
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowShareModal(true);
                }}
                className="w-full py-2.5 px-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 rounded-xl flex items-center gap-3"
              >
                <Share2 size={18} />
                <span>{t.reelViewer.moreMenu.shareTo}</span>
              </button>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-full py-2.5 text-center text-sm font-semibold text-zinc-400 hover:text-white pt-2 border-t border-zinc-800"
              >
                {t.reelViewer.moreMenu.cancel}
              </button>
            </div>
          </div>
        )}

        {/* ================= 6.1 REPORT REEL MODAL ================= */}
        {showReportModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-[#161A1D] border border-zinc-800 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
                <div className="flex items-center gap-2">
                  <Flag size={18} className="text-rose-400" />
                  <h3 className="font-bold text-white text-sm">{t.reelViewer.reportModal.title}</h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {reportSubmitted ? (
                <div className="py-5 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[#00FF88] flex items-center justify-center mx-auto mb-2 text-xl font-bold">
                    ✓
                  </div>
                  <p className="text-sm font-bold text-white">{t.reelViewer.reportModal.submittedTitle}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed px-2">
                    {t.reelViewer.reportModal.submittedDesc}
                  </p>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="mt-4 px-6 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all"
                  >
                    {t.reelViewer.reportModal.okClose}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 mb-2.5">
                    {t.reelViewer.reportModal.selectReasonLabel(currentReel.user)}
                  </p>

                  <div className="space-y-1.5 mb-3.5">
                    {t.reelViewer.reportModal.reasons.map((reason, idx) => (
                      <label
                        key={idx}
                        onClick={() => setSelectedReportReasonIdx(idx)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer text-xs transition-colors ${
                          selectedReportReasonIdx === idx
                            ? 'border-rose-500 bg-rose-500/10 text-white'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          checked={selectedReportReasonIdx === idx}
                          onChange={() => setSelectedReportReasonIdx(idx)}
                          className="accent-rose-500"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 mb-3.5 leading-relaxed">
                    <strong>{t.reelViewer.reportModal.protectionNoteTitle}</strong> {t.reelViewer.reportModal.protectionNoteBody}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                    >
                      {t.reelViewer.reportModal.cancelBtn}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onReportReel?.(currentReel.id, selectedReportReason);
                        setReportSubmitted(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95"
                    >
                      {t.reelViewer.reportModal.submitBtn}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= 6.2 BLOCK USER CONFIRMATION MODAL ================= */}
        {showBlockConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-[#161A1D] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                <Ban size={18} className="text-rose-400 shrink-0" />
                <h3 className="font-bold text-white text-sm">{t.reelViewer.blockModal.title}</h3>
              </div>

              <p className="text-xs text-zinc-200 leading-relaxed">
                {t.reelViewer.blockModal.confirmText(currentReel.user)}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isBlockingUser}
                  onClick={() => {
                    playClickSound();
                    setShowBlockConfirm(false);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {t.reelViewer.blockModal.cancelBtn}
                </button>
                <button
                  type="button"
                  disabled={isBlockingUser}
                  onClick={async () => {
                    if (!onBlockUser) return;
                    playClickSound();
                    setIsBlockingUser(true);
                    try {
                      await onBlockUser({
                        username: currentReel.user,
                        avatarUrl: currentReel.userAvatar,
                      });
                      setShowBlockConfirm(false);
                    } finally {
                      setIsBlockingUser(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isBlockingUser ? t.reelViewer.blockModal.blockingBtn : t.reelViewer.blockModal.confirmBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6.3 EDIT CAPTION MODAL (OWNER ONLY) ================= */}
        {showEditCaptionModal && isOwnReel && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-[#161A1D] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Pencil size={17} className="text-[#00FF88] shrink-0" />
                  <h3 className="font-bold text-white text-sm">{t.reelViewer.editCaptionModal.title}</h3>
                </div>
                <button
                  type="button"
                  disabled={isSavingCaption}
                  onClick={() => setShowEditCaptionModal(false)}
                  className="text-zinc-400 hover:text-white p-1 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={captionDraft}
                onChange={(e) => {
                  setCaptionDraft(e.target.value);
                  if (captionEditError) setCaptionEditError(null);
                }}
                rows={4}
                maxLength={500}
                autoFocus
                placeholder={t.reelViewer.editCaptionModal.placeholder}
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-700 focus:border-[#00FF88] text-xs text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>{captionDraft.trim().length}/500</span>
              </div>

              {captionEditError && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300">
                  {captionEditError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isSavingCaption}
                  onClick={() => {
                    playClickSound();
                    setShowEditCaptionModal(false);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {t.reelViewer.editCaptionModal.cancelBtn}
                </button>
                <button
                  type="button"
                  disabled={isSavingCaption}
                  onClick={async () => {
                    const trimmed = captionDraft.trim();
                    if (!trimmed) {
                      setCaptionEditError(t.reelViewer.editCaptionModal.emptyError);
                      return;
                    }
                    if (!onEditReelCaption) return;
                    playClickSound();
                    setIsSavingCaption(true);
                    setCaptionEditError(null);
                    try {
                      const res = await onEditReelCaption(currentReel.id, trimmed);
                      if (res.success) {
                        setShowEditCaptionModal(false);
                      } else {
                        setCaptionEditError(res.error || t.reelViewer.editCaptionModal.saveFailedError);
                      }
                    } catch {
                      setCaptionEditError(t.reelViewer.editCaptionModal.saveFailedError);
                    } finally {
                      setIsSavingCaption(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00FF88] hover:bg-[#00e57a] text-black shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isSavingCaption ? t.reelViewer.editCaptionModal.savingBtn : t.reelViewer.editCaptionModal.saveBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6.4 DELETE REEL CONFIRMATION MODAL (OWNER ONLY) ================= */}
        {showDeleteConfirm && isOwnReel && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-[#161A1D] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                <Trash2 size={18} className="text-rose-400 shrink-0" />
                <h3 className="font-bold text-white text-sm">{t.reelViewer.deleteReelModal.title}</h3>
              </div>

              <p className="text-xs text-zinc-200 leading-relaxed">
                {t.reelViewer.deleteReelModal.confirmText}
              </p>

              {deleteError && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300">
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isDeletingReel}
                  onClick={() => {
                    playClickSound();
                    setShowDeleteConfirm(false);
                    setDeleteError(null);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {t.reelViewer.deleteReelModal.cancelBtn}
                </button>
                <button
                  type="button"
                  disabled={isDeletingReel}
                  onClick={async () => {
                    if (!onDeleteReel) return;
                    playClickSound();
                    setIsDeletingReel(true);
                    setDeleteError(null);
                    try {
                      const res = await onDeleteReel(currentReel.id);
                      if (res.success) {
                        setShowDeleteConfirm(false);
                      } else {
                        setDeleteError(res.error || t.reelViewer.deleteReelModal.deleteFailedError);
                      }
                    } catch {
                      setDeleteError(t.reelViewer.deleteReelModal.deleteFailedError);
                    } finally {
                      setIsDeletingReel(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isDeletingReel ? t.reelViewer.deleteReelModal.deletingBtn : t.reelViewer.deleteReelModal.confirmBtn}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 7. SHARE SHEET MODAL ================= */}
        <ShareSheetModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          reel={currentReel}
          onAddToStory={onAddToStory}
        />
      </div>
    </div>
  );
};
