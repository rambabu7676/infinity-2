import React, { useState } from 'react';
import {
  X,
  Search,
  Check,
  Copy,
  Download,
  Share2,
  Sparkles,
  QrCode,
  Sliders,
  ExternalLink,
  MessageCircle,
  EyeOff,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { ReelItem } from '../types';
import { playClickSound, playWinChime } from '../utils/audio';

interface ShareSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: ReelItem;
  onAddToStory?: (reel: ReelItem) => void;
}

interface FriendContact {
  id: string;
  name: string;
  username: string;
  avatar: string;
}

const DEFAULT_FRIENDS: FriendContact[] = [
  {
    id: 'f1',
    name: 'Rohit Flow',
    username: 'rohit_flow',
    avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'f2',
    name: 'Delhi Streetfood',
    username: 'street_flavors',
    avatar: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'f3',
    name: 'Riya Fitness',
    username: 'fitness_riya',
    avatar: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'f4',
    name: 'Aman Sharma',
    username: 'urban_wanderer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'f5',
    name: 'Mandla Explorer',
    username: 'themandlaexplorer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'f6',
    name: 'Energy Studio',
    username: 'energy.108',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
];

export const ShareSheetModal: React.FC<ShareSheetModalProps> = ({
  isOpen,
  onClose,
  reel,
  onAddToStory,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchFriend, setSearchFriend] = useState('');
  const [sentFriendIds, setSentFriendIds] = useState<string[]>([]);
  const [activeSubView, setActiveSubView] = useState<'main' | 'qr-code' | 'downloading'>('main');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#reel-${reel.id}`;
  const shareText = `Check out this reel by @${reel.user} on Infinity: "${reel.title}"`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Copy Link handler
  const handleCopyLink = async () => {
    playClickSound();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      showToast('Link copied to clipboard! 📋');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Link ready to copy');
    }
  };

  // 2. WhatsApp handler
  const handleWhatsAppShare = () => {
    playClickSound();
    handleCopyLink();
    showToast('Reel link copied! Share on WhatsApp 💬');
  };

  // 3. Social Share
  const handleInstagramShare = () => {
    playClickSound();
    handleCopyLink();
    showToast('Reel link copied! Ready to share 🚀');
  };

  // 4. Telegram handler
  const handleTelegramShare = () => {
    playClickSound();
    handleCopyLink();
    showToast('Reel link copied! Share on Telegram ✈️');
  };

  // 5. X / Twitter handler
  const handleTwitterShare = () => {
    playClickSound();
    handleCopyLink();
    showToast('Reel link copied! Share on X / Twitter 🐦');
  };

  // 6. Facebook handler
  const handleFacebookShare = () => {
    playClickSound();
    showToast('Opening Facebook... 🌐');
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank');
  };

  // 7. System / Native Web Share
  const handleSystemShare = async () => {
    playClickSound();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Infinity Reel by @${reel.user}`,
          text: reel.title,
          url: shareUrl,
        });
        showToast('Shared successfully!');
      } catch {
        // user cancelled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  // 8. Direct send to friend
  const handleSendToFriend = (friendId: string, friendName: string) => {
    playClickSound();
    setSentFriendIds((prev) =>
      prev.includes(friendId) ? prev : [...prev, friendId]
    );
    showToast(`Sent reel to ${friendName} ✓`);
  };

  // 9. Download Simulation
  const handleDownloadVideo = () => {
    playClickSound();
    setActiveSubView('downloading');
    setDownloadProgress(10);
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          playWinChime();
          setTimeout(() => {
            setActiveSubView('main');
            showToast('Video saved to gallery! 📥');
          }, 600);
          return 100;
        }
        return prev + 25;
      });
    }, 250);
  };

  const filteredFriends = DEFAULT_FRIENDS.filter(
    (f) =>
      f.name.toLowerCase().includes(searchFriend.toLowerCase()) ||
      f.username.toLowerCase().includes(searchFriend.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-[#16181D] border-t border-zinc-800 rounded-t-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-slideUp text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Bar */}
        <div className="w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>

        {/* Toast inside sheet */}
        {toastMessage && (
          <div className="mx-4 my-1 py-1.5 px-3 bg-[#00FF88] text-black text-xs font-bold rounded-lg text-center animate-fadeIn shadow-md">
            {toastMessage}
          </div>
        )}

        {/* ---------------- 1. MAIN SHARE VIEW ---------------- */}
        {activeSubView === 'main' && (
          <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4 no-scrollbar">
            {/* Header: Title + Close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-[#00FF88]" />
                <h3 className="font-extrabold text-sm tracking-tight text-white">
                  Share Reel
                </h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* Reel Quick Preview Card */}
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80">
              <div className="relative w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0">
                <img
                  src={reel.posterUrl}
                  alt={reel.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-white truncate block">
                  @{reel.user}
                </span>
                <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                  {reel.title}
                </p>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  ▶ {reel.views} views · ❤️ {reel.likes}
                </span>
              </div>
            </div>

            {/* Search Friends Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchFriend}
                onChange={(e) => setSearchFriend(e.target.value)}
                placeholder="Search friends to send..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
              />
            </div>

            {/* Direct Send Friends Horizontal Row */}
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-1">
                Direct Share
              </span>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
                {filteredFriends.map((friend) => {
                  const isSent = sentFriendIds.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      className="flex flex-col items-center shrink-0 w-16 text-center"
                    >
                      <div className="relative mb-1">
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="w-12 h-12 rounded-full object-cover border border-zinc-700"
                        />
                        {isSent && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00FF88] text-black flex items-center justify-center font-bold text-[9px] shadow">
                            ✓
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-300 font-medium truncate w-full">
                        {friend.name.split(' ')[0]}
                      </span>
                      <button
                        onClick={() => handleSendToFriend(friend.id, friend.name)}
                        className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold transition-all w-full ${
                          isSent
                            ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#00FF88] hover:bg-[#00e57a] text-black active:scale-95'
                        }`}
                      >
                        {isSent ? 'Sent' : 'Send'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Media Platforms Grid / Row */}
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-1">
                Share to Apps
              </span>
              <div className="grid grid-cols-4 gap-2.5 text-center">
                {/* 1. WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(37,211,102,0.35)] group-hover:scale-105 transition-transform">
                    {/* WhatsApp Icon */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 01-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.15.17-.29.2-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    WhatsApp
                  </span>
                </button>

                {/* 2. Instagram */}
                <button
                  onClick={handleInstagramShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(253,29,29,0.35)] group-hover:scale-105 transition-transform">
                    {/* Instagram Icon */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    Instagram
                  </span>
                </button>

                {/* 3. Copy Link */}
                <button
                  onClick={handleCopyLink}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md group-hover:scale-105 ${
                      copiedLink
                        ? 'bg-[#00FF88] text-black shadow-[0_2px_10px_rgba(0,255,136,0.4)]'
                        : 'bg-zinc-800 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {copiedLink ? <Check size={22} className="stroke-[3]" /> : <Copy size={20} />}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </span>
                </button>

                {/* 4. Telegram */}
                <button
                  onClick={handleTelegramShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#229ED9] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(34,158,217,0.35)] group-hover:scale-105 transition-transform">
                    {/* Telegram Paper Plane */}
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    Telegram
                  </span>
                </button>

                {/* 5. X / Twitter */}
                <button
                  onClick={handleTwitterShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-black border border-zinc-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                    {/* X Logo */}
                    <span className="font-extrabold text-base font-sans">𝕏</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    X (Twitter)
                  </span>
                </button>

                {/* 6. Facebook */}
                <button
                  onClick={handleFacebookShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(24,119,242,0.35)] group-hover:scale-105 transition-transform">
                    {/* Facebook Icon */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    Facebook
                  </span>
                </button>

                {/* 7. QR Code */}
                <button
                  onClick={() => {
                    playClickSound();
                    setActiveSubView('qr-code');
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <QrCode size={20} className="text-[#00FF88]" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    QR Code
                  </span>
                </button>

                {/* 8. More / System Share */}
                <button
                  onClick={handleSystemShare}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                    <ExternalLink size={20} className="text-zinc-300" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200">
                    More...
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Reel Utility Actions */}
            <div className="pt-1 border-t border-zinc-800/80 space-y-1">
              {/* Add to Story */}
              {onAddToStory && (
                <button
                  onClick={() => {
                    playClickSound();
                    onAddToStory(reel);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900/90 text-xs font-semibold transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00FF88] to-cyan-400 p-0.5 flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] text-[#00FF88] font-bold">
                        ∞
                      </div>
                    </div>
                    <span>Add to your story</span>
                  </div>
                  <span className="text-[10px] text-[#00FF88] font-bold">24h</span>
                </button>
              )}

              {/* Download / Save Video */}
              <button
                onClick={handleDownloadVideo}
                className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-900/90 text-xs font-semibold transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <Download size={14} />
                  </div>
                  <span>Save video to device</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">1080p HD</span>
              </button>

              {/* Not interested */}
              <button
                onClick={() => {
                  playClickSound();
                  showToast('Feed updated: fewer reels like this');
                  setTimeout(onClose, 800);
                }}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-zinc-900/90 text-xs font-semibold text-zinc-400 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                  <EyeOff size={14} />
                </div>
                <span>Not interested</span>
              </button>
            </div>
          </div>
        )}



        {/* ---------------- 3. QR CODE SCAN VIEW ---------------- */}
        {activeSubView === 'qr-code' && (
          <div className="p-6 flex flex-col items-center text-center space-y-4 animate-scaleUp">
            <h4 className="font-extrabold text-base text-white flex items-center gap-2">
              <QrCode size={18} className="text-[#00FF88]" />
              <span>Scan to Watch Reel</span>
            </h4>

            <div className="p-4 bg-white rounded-2xl shadow-2xl flex flex-col items-center">
              {/* High Contrast Stylized QR Mockup */}
              <div className="w-44 h-44 bg-black p-3 rounded-xl flex flex-col justify-between items-center">
                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-4 border-[#00FF88] rounded" />
                  <div className="w-8 h-8 border-4 border-[#00FF88] rounded" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[#00FF88] font-mono text-2xl font-black">
                    ∞
                  </span>
                  <span className="text-[10px] text-zinc-300 font-bold tracking-widest mt-1">
                    INFINITY REEL
                  </span>
                </div>
                <div className="w-full flex justify-between">
                  <div className="w-8 h-8 border-4 border-[#00FF88] rounded" />
                  <div className="w-4 h-4 bg-[#00FF88] rounded-full self-end" />
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 max-w-xs">
              Point your camera or phone scanner at the code to view <strong>@{reel.user}'s</strong> reel instantly.
            </p>

            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-xl bg-[#00FF88] text-black font-bold text-xs"
              >
                Copy Link Instead
              </button>
              <button
                onClick={() => setActiveSubView('main')}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs hover:bg-zinc-700"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ---------------- 4. DOWNLOADING PROGRESS VIEW ---------------- */}
        {activeSubView === 'downloading' && (
          <div className="p-8 flex flex-col items-center text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-[#00FF88] flex items-center justify-center animate-pulse">
              <Download size={26} />
            </div>

            <div>
              <h4 className="font-extrabold text-base text-white">
                Saving Video... {downloadProgress}%
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Optimizing HD audio and video for your camera roll
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00FF88] to-cyan-400 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
