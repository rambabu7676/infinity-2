import React, { useState, useEffect, useRef } from 'react';
import { X, Heart, Send, Volume2, VolumeX, Music, Trash2, Check, Sparkles } from 'lucide-react';
import { StoryItem } from '../types';
import { playClickSound, playLikePop } from '../utils/audio';

interface StoryViewerModalProps {
  stories: StoryItem[];
  initialStoryIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleteMySlide?: (slideId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialStoryIndex,
  isOpen,
  onClose,
  onDeleteMySlide,
}) => {
  const [currentStoryIdx, setCurrentStoryIdx] = useState(initialStoryIndex);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [sentNotice, setSentNotice] = useState(false);

  const SLIDE_DURATION = 5000; // 5 seconds per slide
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedBeforePauseRef = useRef<number>(0);

  useEffect(() => {
    setCurrentStoryIdx(initialStoryIndex);
    setCurrentSlideIdx(0);
    setProgress(0);
    elapsedBeforePauseRef.current = 0;
  }, [initialStoryIndex, isOpen]);

  const activeStory = stories[currentStoryIdx];
  const activeSlide = activeStory?.slides[currentSlideIdx];

  // Story Progress Timer
  useEffect(() => {
    if (!isOpen || !activeStory || !activeSlide || isPaused) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      return;
    }

    startTimeRef.current = Date.now() - elapsedBeforePauseRef.current;

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        handleNextSlide();
      } else {
        timerRef.current = requestAnimationFrame(updateProgress);
      }
    };

    timerRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [isOpen, currentStoryIdx, currentSlideIdx, isPaused]);

  if (!isOpen || !activeStory || !activeSlide) return null;

  const handleNextSlide = () => {
    elapsedBeforePauseRef.current = 0;
    setProgress(0);
    if (currentSlideIdx < activeStory.slides.length - 1) {
      setCurrentSlideIdx(prev => prev + 1);
    } else {
      // Go to next story user
      if (currentStoryIdx < stories.length - 1) {
        setCurrentStoryIdx(prev => prev + 1);
        setCurrentSlideIdx(0);
      } else {
        onClose();
      }
    }
  };

  const handlePrevSlide = () => {
    elapsedBeforePauseRef.current = 0;
    setProgress(0);
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(prev => prev - 1);
    } else {
      // Go to previous story user
      if (currentStoryIdx > 0) {
        setCurrentStoryIdx(prev => prev - 1);
        const prevStory = stories[currentStoryIdx - 1];
        setCurrentSlideIdx(prevStory.slides.length - 1);
      }
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - rect.left;
    const width = rect.width;

    if (tapX < width * 0.3) {
      handlePrevSlide();
    } else {
      handleNextSlide();
    }
  };

  const handleHoldStart = () => {
    setIsPaused(true);
    elapsedBeforePauseRef.current = (progress / 100) * SLIDE_DURATION;
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
  };

  const handleHoldEnd = () => {
    setIsPaused(false);
  };

  const handleSendEmoji = (emoji: string) => {
    playLikePop();
    const newEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      x: 30 + Math.random() * 40,
    };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
    }, 1800);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    playClickSound();
    setSentNotice(true);
    setReplyText('');
    setTimeout(() => setSentNotice(false), 2000);
  };

  if (!isOpen || !activeStory || !activeSlide) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 select-none animate-fadeIn">
      {/* Container simulating smartphone story view */}
      <div
        className="relative w-full max-w-[430px] h-full max-h-[920px] bg-black overflow-hidden flex flex-col justify-between shadow-2xl"
        onMouseDown={handleHoldStart}
        onMouseUp={handleHoldEnd}
        onTouchStart={handleHoldStart}
        onTouchEnd={handleHoldEnd}
      >
        {/* Story Media Background */}
        <div
          className="absolute inset-0 bg-zinc-950 flex items-center justify-center cursor-pointer"
          onClick={handleTap}
        >
          {activeSlide.mediaType === 'video' ? (
            activeSlide.mediaUrl ? (
              <video
                src={activeSlide.mediaUrl}
                autoPlay
                muted
                playsInline
                loop
                className="w-full h-full object-cover"
              />
            ) : null
          ) : (
            activeSlide.mediaUrl ? (
              <img
                src={activeSlide.mediaUrl}
                alt={activeSlide.caption || 'Story'}
                className="w-full h-full object-cover"
              />
            ) : null
          )}

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />
        </div>

        {/* Top Progress Segment Bars */}
        <div className="relative z-20 pt-4 px-3 flex gap-1.5 pointer-events-none">
          {activeStory.slides.map((slide, idx) => {
            let fillPercent = 0;
            if (idx < currentSlideIdx) fillPercent = 100;
            else if (idx === currentSlideIdx) fillPercent = progress;

            return (
              <div
                key={slide.id}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm"
              >
                <div
                  className="h-full bg-white transition-all duration-75 ease-linear rounded-full"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Header Bar */}
        <div className="relative z-20 px-4 pt-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2.5">
            {/* Creator Avatar with Story Ring */}
            <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-[#00FF88] to-cyan-400">
              {activeStory.isMyStory || !activeStory.userAvatar ? (
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[#00FF88] text-xs font-bold">
                  ∞
                </div>
              ) : (
                <img
                  src={activeStory.userAvatar}
                  alt={activeStory.username}
                  className="w-full h-full rounded-full object-cover"
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-bold tracking-wide drop-shadow">
                  {activeStory.username}
                </span>
                <span className="text-white/60 text-[10px]">·</span>
                <span className="text-white/70 text-[10px]">
                  {activeSlide.createdAt}
                </span>
              </div>
              {activeSlide.soundTitle && (
                <div className="flex items-center gap-1 text-[10px] text-zinc-300">
                  <Music size={10} className="text-[#00FF88]" />
                  <span className="truncate max-w-[140px]">{activeSlide.soundTitle}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStory.isMyStory && onDeleteMySlide && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMySlide(activeSlide.id);
                  handleNextSlide();
                }}
                className="w-8 h-8 rounded-full bg-black/40 text-red-400 hover:bg-black/60 flex items-center justify-center transition-colors"
                title="Delete story"
              >
                <Trash2 size={15} />
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Floating Heart / Emoji Burst */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            className="absolute bottom-20 z-40 text-3xl pointer-events-none animate-floatUp"
            style={{ left: `${item.x}%` }}
          >
            {item.emoji}
          </div>
        ))}

        {/* Middle Slide Caption Overlay if present */}
        {activeSlide.caption && (
          <div className="relative z-20 px-6 py-4 pointer-events-none">
            <div className="inline-block bg-black/65 backdrop-blur-md px-4 py-2 rounded-xl text-white text-xs font-medium leading-relaxed drop-shadow-md border border-white/10">
              {activeSlide.caption}
            </div>
          </div>
        )}

        {/* Bottom Interactive Reply Bar */}
        <div className="relative z-20 p-4 pb-6 space-y-3 pointer-events-auto">
          {/* Quick Reaction Emojis Row */}
          <div className="flex items-center justify-around px-2">
            {['🔥', '❤️', '😂', '👏', '😮', '💎'].map((em) => (
              <button
                key={em}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendEmoji(em);
                }}
                className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 active:scale-125 backdrop-blur-md flex items-center justify-center text-lg transition-transform"
                title={`React with ${em}`}
              >
                {em}
              </button>
            ))}
          </div>

          {/* Reply Input Form */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${activeStory.username}...`}
                className="w-full h-10 px-4 rounded-full bg-white/20 hover:bg-white/25 focus:bg-white/30 backdrop-blur-md text-xs text-white placeholder-white/70 focus:outline-none focus:ring-1 focus:ring-[#00FF88] transition-all"
              />
              {replyText.trim() && (
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00FF88]"
                >
                  <Send size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSendEmoji('❤️')}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white active:scale-110 transition-transform"
            >
              <Heart size={20} className="hover:text-red-500 hover:fill-red-500" />
            </button>
          </form>

          {sentNotice && (
            <div className="text-center text-[11px] text-[#00FF88] font-bold animate-fadeIn">
              Reply sent to @{activeStory.username} ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
