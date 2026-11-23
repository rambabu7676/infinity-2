import React, { useState, useRef } from 'react';
import {
  Settings,
  Pen,
  Share2,
  Grid,
  Bookmark,
  Crown,
  CheckCircle2,
  MoreVertical,
  Eye,
  Plus,
  X,
  Wifi,
  Battery,
  Sparkles,
  Camera,
  Loader2,
  Copy,
  Gift,
  Check,
  ExternalLink,
  Heart
} from 'lucide-react';
import { FollowListUser, ReelItem, UserProfile } from '../types';
import { CreatorLikeContentItem } from '../firebase/services';
import { playClickSound, playWinChime } from '../utils/audio';
import { compressImageBeforeUpload, uploadMediaToCloudinary } from '../utils/cloudinary';
import { FollowListModal } from './FollowListModal';
import { useLanguage } from '../i18n/LanguageContext';

// Helper to format numbers cleanly with 'K' and 'M' suffixes
function formatMetricNumber(num: number): string {
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return val >= 10 ? `${Math.round(val)}M` : `${val.toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 10_000) {
    const val = num / 1_000;
    return val >= 100 ? `${Math.round(val)}K` : `${val.toFixed(1).replace(/\.0$/, '')}K`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${val.toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString();
}

interface ProfileViewProps {
  userProfile: UserProfile;
  diamonds: number;
  userReels: ReelItem[];
  savedReels: ReelItem[];
  allReels?: ReelItem[];
  allLikesItems?: CreatorLikeContentItem[];
  onOpenSettings: () => void;
  onSimulateReferral: () => void;
  onSelectReel: (reel: ReelItem) => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSaveProfileEdit?: (updates: {
    name: string;
    username: string;
    bio: string;
  }) => Promise<{ success: boolean; error?: string }>;
  onToggleFollow?: (username: string) => void;
  onOpenAuth?: () => void;
  onOpenSpin?: () => void;
  blockedUsernames?: string[];
  blockedByUsernames?: string[];
  onOpenUserProfile?: (user: FollowListUser) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  diamonds,
  userReels,
  savedReels,
  allReels,
  allLikesItems,
  onOpenSettings,
  onSimulateReferral,
  onSelectReel,
  onUpdateProfile,
  onSaveProfileEdit,
  onToggleFollow,
  onOpenAuth,
  onOpenSpin,
  blockedUsernames = [],
  blockedByUsernames = [],
  onOpenUserProfile,
}) => {
  const { t } = useLanguage();
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'saved'>('posts');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editUsername, setEditUsername] = useState(userProfile.username);
  const [editBio, setEditBio] = useState(userProfile.bio);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editGuestAlert, setEditGuestAlert] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMonetizationModal, setShowMonetizationModal] = useState(false);
  const [showDiamondsSheet, setShowDiamondsSheet] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showAllLikesModal, setShowAllLikesModal] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [copiedProfileLink, setCopiedProfileLink] = useState(false);

  const allLikesList = React.useMemo<CreatorLikeContentItem[]>(() => {
    if (userProfile.isGuest || !userProfile.username) return [];
    if (allLikesItems) {
      return [...allLikesItems].sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    }
    return (allReels || [])
      .filter((r) => r.user === userProfile.username)
      .map((r) => ({
        id: r.id,
        title: r.title || t.common.reel,
        posterUrl: r.posterUrl,
        mediaUrl: r.videoUrl,
        mediaType: 'reel' as const,
        likesCount: typeof r.likesCount === 'number' ? Math.max(0, r.likesCount) : 0,
        likes: r.likes || '0',
        views: r.views || '0',
        timestamp: r.timestamp || 0,
        reel: r,
      }))
      .sort((a, b) => {
        if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [allLikesItems, allReels, userProfile.isGuest, userProfile.username, t.common.reel]);

  const totalAllLikes = React.useMemo(
    () => allLikesList.reduce((sum, item) => sum + (item.likesCount || 0), 0),
    [allLikesList]
  );

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      playClickSound();

      // Compress client-side before upload
      const compressedBlob = await compressImageBeforeUpload(file, 800, 800, 0.85);

      // Upload to Cloudinary
      const result = await uploadMediaToCloudinary(compressedBlob, {
        folder: 'posts',
        resourceType: 'image',
        maxDimension: 800,
      });

      const newAvatarUrl = result.optimizedUrl || result.secureUrl;
      onUpdateProfile({ avatarUrl: newAvatarUrl });
      playWinChime();
    } catch (err: any) {
      console.error('Failed to upload avatar to Cloudinary:', err);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const realFollowersCount = userProfile.isGuest ? 0 : Math.max(0, userProfile.followers || 0);
  const realFollowingCount = userProfile.isGuest
    ? 0
    : Math.max(
        0,
        userProfile.followingList
          ? userProfile.followingList.length
          : userProfile.following || 0
      );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      setEditError(t.common.pleaseLogin);
      return;
    }

    const cleanName = editName.trim();
    const cleanUsername = editUsername.trim();
    const cleanBio = editBio.trim();

    if (!cleanName) {
      setEditError(t.profile.editModal.enterNameError);
      return;
    }
    if (cleanUsername.length < 3) {
      setEditError(t.profile.editModal.usernameMin3Error);
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      setEditError(t.profile.editModal.usernamePatternError);
      return;
    }
    if (cleanUsername.length > 30) {
      setEditError(t.profile.editModal.usernameMax30Error);
      return;
    }

    playClickSound();
    if (onSaveProfileEdit) {
      setIsSavingProfile(true);
      setEditError(null);
      try {
        const result = await onSaveProfileEdit({
          name: cleanName,
          username: cleanUsername,
          bio: cleanBio,
        });
        if (!result.success) {
          setEditError(result.error || t.profile.editModal.saveError);
          return;
        }
        setIsEditingProfile(false);
      } finally {
        setIsSavingProfile(false);
      }
      return;
    }

    onUpdateProfile({
      name: cleanName,
      username: cleanUsername,
      bio: cleanBio,
    });
    setIsEditingProfile(false);
  };

  // Highlights Data
  const HIGHLIGHTS = [
    {
      id: 'h-main',
      title: t.profile.highlights.highlight,
      image: userProfile.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-sky-400',
      isFirst: true,
    },
    {
      id: 'h-travel',
      title: t.profile.highlights.travel,
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-sky-400',
    },
    {
      id: 'h-food',
      title: t.profile.highlights.food,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-amber-500',
    },
    {
      id: 'h-fitness',
      title: t.profile.highlights.fitness,
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-cyan-400',
    },
    {
      id: 'h-nature',
      title: t.profile.highlights.nature,
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-emerald-400',
    },
    {
      id: 'h-friends',
      title: t.profile.highlights.friends,
      image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-rose-500',
    },
  ];

  const currentReels = activeProfileTab === 'saved' ? savedReels : (allReels && allReels.length > 0 ? allReels : userReels);

  return (
    <div className="min-h-full pb-20 select-none bg-black text-white">
      {/* ---------------- 0. TOP MOBILE STATUS BAR (9:41, Cellular, Wifi, 100% Battery) ---------------- */}
      <div className="pt-2 px-5 pb-1 flex items-center justify-between text-white text-xs font-bold tracking-tight select-none">
        <span>9:41</span>
        <div className="flex items-center gap-1.5 text-white">
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 h-1 bg-white rounded-full" />
            <span className="w-0.5 h-1.5 bg-white rounded-full" />
            <span className="w-0.5 h-2 bg-white rounded-full" />
            <span className="w-0.5 h-2.5 bg-white rounded-full" />
          </div>
          <Wifi size={13} className="text-white stroke-[2.5]" />
          <div className="flex items-center gap-0.5">
            <span className="text-[10px] font-bold">100%</span>
            <Battery size={15} className="text-white fill-white" />
          </div>
        </div>
      </div>

      {/* ---------------- 1. APP HEADER BAR (💎 1.2K +, Crown+INFINITY, Premium, Verified, ⚙️ Settings) ---------------- */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md px-3.5 py-2 border-b border-zinc-900/60 flex items-center justify-between">
        {/* Left: Diamond Balance Pill (💎 1.2K +) */}
        <button
          onClick={() => {
            playClickSound();
            setShowDiamondsSheet(true);
          }}
          className="flex items-center gap-1.5 bg-[#081524] border border-[#00E5FF]/70 hover:border-[#00E5FF] px-2.5 py-1 rounded-full text-xs font-bold text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(0,229,255,0.25)]"
          title={t.profile.diamondsTitle}
        >
          <span className="text-xs">💎</span>
          <span className="text-[12px]">{diamonds >= 1000 ? `${(diamonds / 1000).toFixed(1).replace('.0', '')}K` : diamonds}</span>
          <span className="text-[#00E5FF] text-xs font-black leading-none ml-0.5">+</span>
        </button>

        {/* Center: Golden Crown + Gradient Infinity Logo + "INFINITY" */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Crown sitting on top */}
            <span className="absolute -top-3 text-[13px] leading-none select-none drop-shadow">
              👑
            </span>

            {/* Gradient Infinity Symbol */}
            <svg
              viewBox="0 0 100 50"
              className="w-8 h-5 drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="infinityGradProfile" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00FF88" />
                  <stop offset="35%" stopColor="#00E5FF" />
                  <stop offset="70%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              <path
                d="M30 10 C15 10 10 25 25 35 C40 45 60 10 75 15 C90 20 90 35 75 40 C60 45 40 10 25 15 C15 20 15 35 30 40 C45 45 60 10 75 15"
                stroke="url(#infinityGradProfile)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-base font-black tracking-wider bg-gradient-to-r from-[#00FF88] via-[#00E5FF] via-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent leading-tight">
            INFINITY
          </span>
        </div>

        {/* Right: 👑 Premium pill, 🔵 Verified badge, ⚙️ Settings gear */}
        <div className="flex items-center gap-2">
          {/* Premium Pill */}
          <button
            onClick={() => {
              playClickSound();
              setShowMilestoneModal(true);
            }}
            className="flex items-center gap-1 bg-[#1A1406] border border-amber-500/70 hover:border-amber-400 px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#FFD700] transition-all active:scale-95 shadow-[0_0_8px_rgba(255,215,0,0.2)]"
            title={t.profile.premiumTitle}
          >
            <Crown size={11} className="fill-[#FFD700] text-[#FFD700]" />
            <span>{t.profile.premium}</span>
          </button>

          {/* Verified Blue Tick Button */}
          <button
            onClick={() => {
              playClickSound();
              setShowMilestoneModal(true);
            }}
            className="text-[#0095F6] hover:scale-110 transition-transform active:scale-95"
            title={t.profile.verifiedTitle}
          >
            <CheckCircle2 size={18} className="fill-[#0095F6] text-white" />
          </button>

          {/* Settings Icon */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSettings();
            }}
            className="text-white hover:text-zinc-300 transition-transform active:scale-90 p-0.5"
            aria-label={t.profile.settingsAria}
          >
            <Settings size={20} className="stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Hidden file input for Avatar selection */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileSelected}
      />

      {/* ---------------- 2. PROFILE HERO (Avatar on Left, Name & Handle on Right) ---------------- */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-4">
        {/* Large Avatar with Cyan-Emerald Ring or Royal Gold Ring */}
        <div
          onClick={() => {
            playClickSound();
            avatarFileInputRef.current?.click();
          }}
          className="relative shrink-0 cursor-pointer group"
          title={t.profile.changePhotoTitle}
        >
          <div className={`w-20 h-20 rounded-full p-[2.5px] ${
            userProfile.goldenThemeEnabled
              ? 'bg-gradient-to-tr from-amber-400 via-[#FFD700] to-yellow-600 shadow-[0_0_18px_rgba(255,215,0,0.45)]'
              : 'bg-gradient-to-tr from-[#00FF88] via-[#00E5FF] to-[#3B82F6] shadow-[0_0_12px_rgba(0,255,136,0.25)]'
          } relative overflow-hidden`}>
            <img
              src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'}
              alt={userProfile.name}
              className="w-full h-full rounded-full object-cover border-2 border-black group-hover:scale-105 transition-transform"
            />
            {/* Loading spinner overlay while uploading */}
            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                <Loader2 size={24} className="text-[#00FF88] animate-spin" />
              </div>
            )}
          </div>
          {/* Blue '+' Button */}
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0088FF] text-white rounded-full flex items-center justify-center border-2 border-black font-bold shadow-md group-hover:bg-[#0070d6] group-active:scale-90 transition-all">
            <Plus size={13} strokeWidth={3} />
          </div>
        </div>

        {/* Name and @username */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-white font-extrabold text-lg tracking-tight truncate">
              {userProfile.name || userProfile.username}
            </h1>
            <CheckCircle2 size={16} className="fill-[#0095F6] text-white shrink-0" />
            {userProfile.goldenThemeEnabled && (
              <Crown size={15} className="fill-[#FFD700] text-[#FFD700] shrink-0" />
            )}
          </div>
          <p className="text-zinc-400 text-xs font-medium tracking-tight mt-0.5 truncate">
            @{userProfile.username}
          </p>
          {userProfile.email && !userProfile.isGuest ? (
            <p className="text-[#00FF88] text-[10px] font-mono tracking-tight mt-0.5 truncate flex items-center gap-1">
              <span className="text-[8px]">●</span> {userProfile.email}
            </p>
          ) : (
            onOpenAuth && (
              <button
                onClick={() => {
                  playClickSound();
                  onOpenAuth();
                }}
                className="text-[#00E5FF] hover:underline text-[10px] font-semibold mt-0.5 inline-block"
              >
                {t.profile.loginSignupLink}
              </button>
            )
          )}
        </div>
      </div>

      {/* Guest Mode Alert Banner */}
      {userProfile.isGuest && (
        <div className="mx-4 my-2 p-3 bg-gradient-to-r from-blue-950/60 via-zinc-900 to-black border border-[#0095F6]/40 rounded-2xl flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{t.profile.guestBannerTitle}</span>
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {t.profile.guestBannerDesc}
            </p>
          </div>
          {onOpenAuth && (
            <button
              onClick={() => {
                playClickSound();
                onOpenAuth();
              }}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#0095F6] text-black text-xs font-bold shrink-0 active:scale-95 shadow-md"
            >
              {t.profile.loginBtn}
            </button>
          )}
        </div>
      )}

      {/* ---------------- 3. STATS ROW (Posts | Followers | Following | Total Likes) with vertical dividers ---------------- */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 divide-x divide-zinc-800 text-center items-center py-2 bg-[#090C10] rounded-xl border border-zinc-850/80">
          {/* 1. Posts */}
          <div className="flex flex-col items-center px-1">
            <p className="text-white font-black text-sm tracking-tight leading-tight">
              {formatMetricNumber(userProfile.isGuest ? 0 : Math.max(0, userProfile.postsCount ?? 0))}
            </p>
            <p className="text-zinc-400 text-[10px] font-medium tracking-tight mt-0.5">{t.profile.posts}</p>
          </div>

          {/* 2. Followers (Interactive - Real Count) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowFollowersModal(true);
            }}
            className="flex flex-col items-center px-1 hover:opacity-80 active:scale-95 transition-transform cursor-pointer group"
            title={t.profile.followersTitle}
          >
            <p className="text-white group-hover:text-[#00FF88] font-black text-sm tracking-tight leading-tight transition-colors">
              {formatMetricNumber(realFollowersCount)}
            </p>
            <p className="text-zinc-400 group-hover:text-zinc-300 text-[10px] font-medium tracking-tight mt-0.5">{t.profile.followers}</p>
          </button>

          {/* 3. Following (Interactive - Real Count) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowFollowingModal(true);
            }}
            className="flex flex-col items-center px-1 hover:opacity-80 active:scale-95 transition-transform cursor-pointer group"
            title={t.profile.followingTitle}
          >
            <p className="text-white group-hover:text-[#00FF88] font-black text-sm tracking-tight leading-tight transition-colors">
              {formatMetricNumber(realFollowingCount)}
            </p>
            <p className="text-zinc-400 group-hover:text-zinc-300 text-[10px] font-medium tracking-tight mt-0.5">{t.profile.following}</p>
          </button>

          {/* 4. All Likes (Interactive) */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowAllLikesModal(true);
            }}
            className="flex flex-col items-center px-1 hover:opacity-80 active:scale-95 transition-transform cursor-pointer group"
            title={`${t.profile.allLikes}: ${totalAllLikes.toLocaleString()}`}
          >
            <p className="text-white group-hover:text-rose-400 font-black text-sm tracking-tight leading-tight transition-colors">
              {formatMetricNumber(totalAllLikes)}
            </p>
            <p className="text-zinc-400 group-hover:text-zinc-300 text-[10px] font-medium tracking-tight mt-0.5">
              {t.profile.allLikes}
            </p>
          </button>
        </div>
      </div>

      {/* ---------------- 4. BIO SECTION ---------------- */}
      <div className="px-5 pb-3">
        <p className="text-zinc-200 text-xs font-medium leading-relaxed tracking-wide">
          {userProfile.bio || 'Dream Big  |  Create  |  Inspire ✨'}
        </p>
      </div>

      {/* Guest Edit Alert */}
      {editGuestAlert && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{editGuestAlert}</span>
          {onOpenAuth && (
            <button
              type="button"
              onClick={() => {
                setEditGuestAlert(null);
                onOpenAuth();
              }}
              className="px-2.5 py-1 rounded-lg bg-[#00FF88] text-black font-bold text-[11px] active:scale-95"
            >
              {t.common.pleaseLogin}
            </button>
          )}
        </div>
      )}

      {/* ---------------- 5. ACTION BUTTONS (Edit Profile | Share Profile) ---------------- */}
      <div className="px-4 pb-4 flex gap-3">
        {/* Edit Profile Button */}
        <button
          onClick={() => {
            playClickSound();
            if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
              setEditGuestAlert(t.common.pleaseLogin);
              setTimeout(() => setEditGuestAlert(null), 3500);
              return;
            }
            setEditName(userProfile.name || '');
            setEditUsername(userProfile.username || '');
            setEditBio(userProfile.bio || '');
            setEditError(null);
            setIsEditingProfile(true);
          }}
          className="flex-1 py-2 px-3 bg-[#0D1520] hover:bg-[#132032] border border-[#00E5FF]/40 hover:border-[#00E5FF] rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <Pen size={13} className="text-white" />
          <span>{t.profile.editProfile}</span>
        </button>

        {/* Share Profile Button */}
        <button
          onClick={() => {
            playClickSound();
            setShowShareModal(true);
          }}
          className="flex-1 py-2 px-3 bg-[#0D1520] hover:bg-[#132032] border border-[#00E5FF]/40 hover:border-[#00E5FF] rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <Share2 size={13} className="text-white" />
          <span>{t.profile.shareProfile}</span>
        </button>
      </div>

      {/* ---------------- 6. TAB SWITCHER (Posts vs Saved) ---------------- */}
      <div className="px-4 pb-3 flex gap-2.5">
        {/* Posts Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveProfileTab('posts');
          }}
          className={`flex-1 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeProfileTab === 'posts'
              ? 'bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              : 'bg-[#12161E] border border-zinc-800 text-zinc-300 hover:text-white'
          }`}
        >
          <Grid size={15} className={activeProfileTab === 'posts' ? 'text-black fill-black/20' : 'text-zinc-400'} />
          <span>{t.profile.postsTab}</span>
        </button>

        {/* Saved Tab */}
        <button
          onClick={() => {
            playClickSound();
            setActiveProfileTab('saved');
          }}
          className={`flex-1 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
            activeProfileTab === 'saved'
              ? 'bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black shadow-[0_0_15px_rgba(0,229,255,0.4)]'
              : 'bg-[#12161E] border border-zinc-800 text-zinc-300 hover:text-white'
          }`}
        >
          <Bookmark size={15} className={activeProfileTab === 'saved' ? 'text-black' : 'text-zinc-400'} />
          <span>{t.profile.savedTab}</span>
        </button>
      </div>

      {/* ---------------- 7. HIGHLIGHTS TRAY (User instructed: "जहां पे your story लिखा हे उसे बदलके highlight कर दो") ---------------- */}
      <div className="px-3 pb-4 pt-1 overflow-x-auto no-scrollbar flex items-center gap-3">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.id}
            onClick={() => {
              playClickSound();
            }}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
          >
            <div className="relative w-15 h-15 rounded-full p-[2px]">
              <div className={`w-full h-full rounded-full ${h.ringClass} p-[2px]`}>
                <img
                  src={h.image}
                  alt={h.title}
                  className="w-full h-full rounded-full object-cover border border-black"
                />
              </div>
              {/* If it's the first highlight, show blue '+' badge */}
              {h.isFirst && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#0088FF] text-white rounded-full flex items-center justify-center border-2 border-black font-bold shadow-md">
                  <Plus size={11} strokeWidth={3} />
                </div>
              )}
            </div>
            {/* Exactly as requested: First circle is labeled "Highlight", followed by Travel, Food, Fitness, Nature, Friends */}
            <span className="text-[11px] text-zinc-300 font-medium tracking-tight text-center truncate w-16 group-hover:text-white">
              {h.title}
            </span>
          </div>
        ))}
      </div>

      {/* ---------------- 8. THREE-COLUMN VIDEO GRID (Tight 1px Zero-Margin Instagram Layout) ---------------- */}
      <div className="px-0 pt-0.5 pb-4">
        {currentReels.length > 0 ? (
          <div className="grid grid-cols-3 gap-[1px] bg-black">
            {currentReels.map((reel) => (
              <div
                key={reel.id}
                onClick={() => {
                  playClickSound();
                  onSelectReel(reel);
                }}
                className="group relative aspect-[3/4] overflow-hidden bg-zinc-950 cursor-pointer select-none active:opacity-90 transition-opacity"
              >
                {/* Thumbnail Image */}
                <img
                  src={reel.posterUrl}
                  alt={reel.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                  loading="lazy"
                />

                {/* Subtle vignette gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none" />

                {/* Top-Right: Three vertical dots menu icon (⋮) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    onSelectReel(reel);
                  }}
                  className="absolute top-1.5 right-1.5 z-10 p-0.5 text-white/90 hover:text-white transition-opacity"
                  aria-label={t.home.optionsAria}
                >
                  <MoreVertical size={13} className="drop-shadow-md" />
                </button>

                {/* Bottom-Left: Eye icon (👁) + View count */}
                <div className="absolute bottom-1.5 left-2 z-10 flex items-center gap-1 text-white text-[11px] font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none pointer-events-none">
                  <Eye size={12} className="stroke-[2.5] text-white shrink-0" />
                  <span>{reel.views}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-zinc-500 text-xs">
            {t.profile.noPostsInTab}
          </div>
        )}
      </div>

      {/* ---------------- 9. MODALS ---------------- */}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">{t.profile.editModal.title}</h3>
              <button
                onClick={() => {
                  if (!isSavingProfile) setIsEditingProfile(false);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-3 space-y-3">
              {/* Photo Change Button */}
              <div className="flex flex-col items-center justify-center py-1">
                <div
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="relative cursor-pointer group"
                  title={t.profile.editModal.changePhoto}
                >
                  <div className="w-18 h-18 rounded-full p-[2px] bg-gradient-to-tr from-[#00FF88] via-[#00E5FF] to-[#3B82F6] overflow-hidden">
                    <img
                      src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'}
                      alt="Avatar"
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                    {isUploadingAvatar ? (
                      <Loader2 size={20} className="text-[#00FF88] animate-spin" />
                    ) : (
                      <Camera size={20} className="text-white drop-shadow" />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0088FF] text-white rounded-full flex items-center justify-center border border-black font-bold shadow-md">
                    <Plus size={12} strokeWidth={3} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="mt-1.5 text-xs font-bold text-[#00E5FF] hover:underline"
                >
                  {isUploadingAvatar ? t.profile.editModal.uploadingPhoto : t.profile.editModal.changePhoto}
                </button>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  {t.profile.editModal.nameLabel}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  maxLength={50}
                  placeholder={t.profile.editModal.namePlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  {t.profile.editModal.usernameLabel}
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => {
                    setEditUsername(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={30}
                  placeholder="example_123"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {t.profile.editModal.usernameHint}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  {t.profile.editModal.bioLabel}
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => {
                    setEditBio(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  maxLength={200}
                  placeholder={t.profile.editModal.bioPlaceholder}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2 bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black font-bold text-xs rounded-lg active:scale-95 disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t.profile.editModal.savingBtn}</span>
                    </>
                  ) : (
                    <span>{t.profile.editModal.saveBtn}</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 text-xs rounded-lg hover:text-white disabled:opacity-50"
                >
                  {t.profile.editModal.cancelBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Profile Modal (WhatsApp, Facebook, Instagram, Telegram, X & More) */}
      {showShareModal && (() => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://infinity.app';
        const profileShareUrl = `${baseUrl}/?creator=${encodeURIComponent(userProfile.username)}${
          userProfile.referralCode ? `&ref=${encodeURIComponent(userProfile.referralCode)}` : ''
        }`;
        const shareMessage = t.profile.shareModal.sharePromoMsg(
          userProfile.username,
          userProfile.referralCode
        );
        const encodedUrl = encodeURIComponent(profileShareUrl);
        const encodedText = encodeURIComponent(`${shareMessage}\n${profileShareUrl}`);

        const triggerShareFeedback = async (platformLabel: string) => {
          playClickSound();
          try {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(`${shareMessage}\n${profileShareUrl}`);
            }
          } catch {
            // ignore clipboard errors
          }
          setShareToast(t.profile.shareModal.linkReadyToast(platformLabel));
          setTimeout(() => setShareToast(null), 2800);
        };

        const handleCopyProfileLink = async () => {
          playClickSound();
          try {
            if (navigator.clipboard) {
              await navigator.clipboard.writeText(profileShareUrl);
            }
          } catch {
            // ignore
          }
          setCopiedProfileLink(true);
          setShareToast(t.profile.shareModal.linkCopiedToast);
          setTimeout(() => {
            setCopiedProfileLink(false);
            setShareToast(null);
          }, 2500);
        };

        const handleNativeSystemShare = async () => {
          playClickSound();
          if (typeof navigator !== 'undefined' && navigator.share) {
            try {
              await navigator.share({
                title: t.profile.shareModal.shareTitle(userProfile.username),
                text: shareMessage,
                url: profileShareUrl,
              });
              setShareToast(t.profile.shareModal.profileSharedToast);
              setTimeout(() => setShareToast(null), 2500);
              return;
            } catch {
              // user cancelled or fallback to copy
            }
          }
          await handleCopyProfileLink();
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none"
            onClick={() => setShowShareModal(false)}
          >
            <div
              className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-4 shadow-2xl space-y-4 animate-slideUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator on mobile */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto sm:hidden" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 size={16} className="text-[#00E5FF]" />
                  <h3 className="text-sm font-extrabold text-white">
                    {t.profile.shareModal.title}
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  aria-label={t.common.close}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Toast Banner */}
              {shareToast && (
                <div className="py-1.5 px-3 rounded-xl bg-[#00FF88] text-black text-xs font-bold text-center shadow-md animate-fadeIn">
                  {shareToast}
                </div>
              )}

              {/* Profile Promo Preview Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.username}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-[#00E5FF]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      @{userProfile.username}
                    </span>
                    {userProfile.isBlueTick && (
                      <CheckCircle2 size={12} className="text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {t.profile.shareModal.creatorFollowers(formatMetricNumber(userProfile.followers))}
                  </p>
                  {userProfile.referralCode && (
                    <span className="inline-block mt-0.5 text-[10px] font-bold text-[#00FF88]">
                      {t.profile.shareModal.inviteCode(userProfile.referralCode)}
                    </span>
                  )}
                </div>
              </div>

              {/* Social Apps Grid */}
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2.5 px-1">
                  {t.profile.shareModal.shareHeading}
                </span>

                <div className="grid grid-cols-4 gap-2.5 text-center">
                  {/* 1. Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(shareMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerShareFeedback('Facebook')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(24,119,242,0.4)] group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">Facebook</span>
                  </a>

                  {/* 2. WhatsApp */}
                  <a
                    href={`https://wa.me/?text=${encodedText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerShareFeedback('WhatsApp')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(37,211,102,0.4)] group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.17 8.17 0 01-1.25-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.7 8.24-8.23 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.7-.8-.23-.09-.39-.12-.56.12-.17.25-.64.8-.79.97-.15.17-.29.2-.54.07-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.76 2.68 4.25 3.76.59.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">WhatsApp</span>
                  </a>

                  {/* 3. Telegram */}
                  <a
                    href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerShareFeedback('Telegram')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#229ED9] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(34,158,217,0.4)] group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">Telegram</span>
                  </a>

                  {/* 4. Instagram */}
                  <button
                    type="button"
                    onClick={() => triggerShareFeedback('Instagram Bio / Story')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(253,29,29,0.35)] group-hover:scale-105 transition-transform">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">Instagram</span>
                  </button>

                  {/* 5. X (Twitter) */}
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => triggerShareFeedback('X (Twitter)')}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-full bg-black border border-zinc-700 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                      <span className="font-extrabold text-base font-sans">𝕏</span>
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">X (Twitter)</span>
                  </a>

                  {/* 6. Copy Link */}
                  <button
                    type="button"
                    onClick={handleCopyProfileLink}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md group-hover:scale-105 ${
                        copiedProfileLink
                          ? 'bg-[#00FF88] text-black shadow-[0_2px_10px_rgba(0,255,136,0.4)]'
                          : 'bg-zinc-800 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {copiedProfileLink ? <Check size={20} className="stroke-[3]" /> : <Copy size={18} />}
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">
                      {copiedProfileLink ? t.profile.shareModal.copied : t.profile.shareModal.copyLink}
                    </span>
                  </button>

                  {/* 7. More Apps (Native Share) */}
                  <button
                    type="button"
                    onClick={handleNativeSystemShare}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 active:scale-95 transition-all group col-span-2"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#00E5FF]/15 border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition-transform">
                      <ExternalLink size={19} />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">
                      {t.profile.shareModal.moreApps}
                    </span>
                  </button>
                </div>
              </div>

              {/* Close Footer */}
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 transition-colors"
              >
                {t.profile.shareModal.close}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Monetization / VIP Status Modal */}
      {showMonetizationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <Crown size={16} className="fill-amber-400" />
                <span>{t.profile.vipStatusModal.title}</span>
              </div>
              <button
                onClick={() => setShowMonetizationModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1.5 text-xs text-zinc-300">
              <p className="font-bold text-white">{t.profile.vipStatusModal.heading}</p>
              <p>{t.profile.vipStatusModal.bullet1}</p>
              <p>{t.profile.vipStatusModal.bullet2}</p>
              <p>{t.profile.vipStatusModal.bullet3}</p>
            </div>
            <button
              onClick={() => setShowMonetizationModal(false)}
              className="w-full py-2 bg-[#FFD700] text-black text-xs font-bold rounded-lg"
            >
              {t.profile.vipStatusModal.doneBtn}
            </button>
          </div>
        </div>
      )}

      {/* Real Firebase Following Modal */}
      <FollowListModal
        isOpen={showFollowingModal}
        mode="following"
        targetUid={userProfile.uid}
        targetUsername={userProfile.username}
        targetIsPrivate={Boolean(userProfile.isPrivate)}
        totalCount={realFollowingCount}
        currentUserProfile={userProfile}
        blockedUsernames={blockedUsernames}
        blockedByUsernames={blockedByUsernames}
        onClose={() => setShowFollowingModal(false)}
        onToggleFollow={onToggleFollow}
        onSelectUser={(user) => {
          setShowFollowingModal(false);
          onOpenUserProfile?.(user);
        }}
      />

      {/* Real Firebase Followers Modal */}
      <FollowListModal
        isOpen={showFollowersModal}
        mode="followers"
        targetUid={userProfile.uid}
        targetUsername={userProfile.username}
        targetIsPrivate={Boolean(userProfile.isPrivate)}
        totalCount={realFollowersCount}
        currentUserProfile={userProfile}
        blockedUsernames={blockedUsernames}
        blockedByUsernames={blockedByUsernames}
        onClose={() => setShowFollowersModal(false)}
        onToggleFollow={onToggleFollow}
        onSelectUser={(user) => {
          setShowFollowersModal(false);
          onOpenUserProfile?.(user);
        }}
      />

      {/* All Likes Modal */}
      {showAllLikesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
          onClick={() => setShowAllLikesModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[600px] animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Heart size={17} className="text-rose-500 fill-rose-500" />
                <h3 className="text-sm font-bold text-white">{t.profile.allLikesModal.title}</h3>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowAllLikesModal(false);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Big Total Likes Summary */}
            <div className="p-4 border-b border-zinc-800/70 bg-gradient-to-br from-rose-950/35 via-[#13161C] to-black text-center shrink-0">
              <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[11px] font-semibold mb-1.5">
                <Heart size={12} className="fill-rose-400 text-rose-400" />
                <span>{t.profile.allLikesModal.totalLikesPill}</span>
              </div>
              <p className="text-4xl font-black text-white tracking-tight">
                {formatMetricNumber(totalAllLikes)}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">
                {totalAllLikes >= 1000
                  ? t.profile.allLikesModal.totalSummaryLarge(
                      totalAllLikes.toLocaleString(),
                      allLikesList.length
                    )
                  : t.profile.allLikesModal.totalSummarySmall(allLikesList.length)}
              </p>
            </div>

            {/* Per-Reel Likes Breakdown (Highest First) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {totalAllLikes === 0 && (
                <div className="py-6 px-4 text-center rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                  <Heart size={24} className="text-zinc-600 mx-auto" />
                  <p className="text-xs font-bold text-zinc-200">
                    {t.profile.allLikesModal.emptyState}
                  </p>
                </div>
              )}

              {allLikesList.length > 0 && (
                <div className="space-y-1.5">
                  {allLikesList.map((item, idx) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        if (!item.reel) return;
                        playClickSound();
                        setShowAllLikesModal(false);
                        onSelectReel(item.reel);
                      }}
                      className={`w-full p-2.5 flex items-center justify-between gap-3 rounded-xl bg-zinc-900/70 border border-zinc-800/70 text-left transition-colors ${
                        item.reel ? 'hover:bg-zinc-800/70 cursor-pointer active:scale-[0.99]' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[11px] font-extrabold text-zinc-500 w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="w-11 h-14 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                          {item.posterUrl ? (
                            <img
                              src={item.posterUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                              <Heart size={14} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">
                            {item.title || (item.mediaType === 'post' ? t.common.post : t.common.reel)}
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">
                            {item.mediaType === 'post' ? t.common.post : t.common.reel}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 shrink-0">
                        <Heart size={12} className="text-rose-500 fill-rose-500" />
                        <span className="text-xs font-extrabold text-white">
                          {formatMetricNumber(item.likesCount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 10. DIAMONDS WALLET & REWARDS BOTTOM SHEET ---------------- */}
      {showDiamondsSheet && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center animate-fadeIn select-none">
          <div className="w-full max-w-sm bg-[#16181C] border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl animate-slideUp max-h-[85vh] overflow-y-auto space-y-4">
            {/* Grab handle */}
            <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xl">💎</span>
                <h3 className="text-base font-extrabold text-white">{t.profile.diamondsSheet.title}</h3>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowDiamondsSheet(false);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Big Balance Card */}
            <div className="p-4 bg-gradient-to-br from-[#081524] via-[#0b2138] to-[#040d18] border border-[#00E5FF]/60 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.2)] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#00E5FF]">{t.profile.diamondsSheet.currentDiamonds}</p>
                <p className="text-3xl font-black text-white mt-0.5 tracking-tight flex items-center gap-2">
                  <span>{diamonds.toLocaleString()}</span>
                  <span className="text-xl">💎</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {t.profile.diamondsSheet.valueLabel((diamonds / 100).toFixed(2))}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center text-3xl">
                💎
              </div>
            </div>

            {/* Quick Actions: Lucky Spin & Referral */}
            <div className="space-y-2.5">
              {/* Lucky Spin Button */}
              <button
                onClick={() => {
                  playClickSound();
                  setShowDiamondsSheet(false);
                  if (onOpenSpin) {
                    onOpenSpin();
                  } else {
                    onSimulateReferral();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-[#FFD700] text-black font-extrabold text-xs flex items-center justify-between active:scale-98 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🎰</span>
                  <div className="text-left">
                    <p className="font-black text-xs leading-tight">{t.profile.diamondsSheet.luckySpinTitle}</p>
                    <p className="text-[10px] text-zinc-900 font-semibold">{t.profile.diamondsSheet.luckySpinSub}</p>
                  </div>
                </div>
                <span className="text-xs font-black">{t.profile.diamondsSheet.spinNow}</span>
              </button>

              {/* Earn via Referral Button */}
              <div className="p-3.5 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-[#00FF88]" />
                    <span className="text-xs font-bold text-white">{t.profile.diamondsSheet.earnReferralTitle}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-2 py-0.5 rounded-full font-bold">
                    {t.profile.diamondsSheet.perFriendBadge}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {t.profile.diamondsSheet.earnReferralDesc}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      playClickSound();
                      onSimulateReferral();
                    }}
                    className="flex-1 py-2 rounded-lg bg-[#00FF88] text-black text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    {t.profile.diamondsSheet.simulateInviteBtn}
                  </button>
                  <button
                    onClick={() => {
                      playClickSound();
                      navigator.clipboard?.writeText(`https://infinity.app/join?ref=${userProfile.referralCode || 'RAMBABU2025'}`);
                      setCopiedReferral(true);
                      setTimeout(() => setCopiedReferral(false), 2000);
                    }}
                    className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5"
                  >
                    <Copy size={13} />
                    <span>{copiedReferral ? t.profile.diamondsSheet.copiedBtn : t.profile.diamondsSheet.copyLinkBtn}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setShowDiamondsSheet(false);
              }}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-bold rounded-xl"
            >
              {t.profile.diamondsSheet.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 11. BLUE TICK & PREMIUM MILESTONE MODAL ---------------- */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-5 shadow-2xl animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-[#FFD700]" />
                <h3 className="text-sm font-bold text-white">{t.profile.milestoneModal.title}</h3>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowMilestoneModal(false);
                }}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Blue Tick Milestone */}
            <div className="p-3.5 bg-gradient-to-r from-blue-950/50 via-zinc-900 to-black border border-[#0095F6]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="fill-[#0095F6] text-white" />
                  <span className="text-xs font-bold text-white">{t.profile.milestoneModal.blueTickTitle}</span>
                </div>
                <span className="text-[10px] font-bold bg-[#0095F6]/20 text-[#0095F6] px-2 py-0.5 rounded-full">
                  {t.profile.milestoneModal.completedOf(Math.min(userProfile.successfulReferrals || 6, 3), 3)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-200 font-semibold leading-relaxed">
                  {t.profile.milestoneModal.blueTickRule}
                </p>
                <span className="text-[9px] bg-blue-500/20 text-[#0095F6] px-2 py-0.5 rounded-full font-bold">
                  {t.profile.milestoneModal.validity31Days}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {t.profile.milestoneModal.blueTickDesc}
              </p>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0095F6] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((userProfile.successfulReferrals || 6) / 3) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* VIP Milestone */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/50 via-zinc-900 to-black border border-amber-500/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="fill-[#FFD700] text-[#FFD700]" />
                  <span className="text-xs font-bold text-white">{t.profile.milestoneModal.vipTitle}</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 text-[#FFD700] px-2 py-0.5 rounded-full">
                  {t.profile.milestoneModal.completedOf(Math.min(userProfile.successfulReferrals || 6, 6), 6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-200 font-semibold leading-relaxed">
                  {t.profile.milestoneModal.vipRule}
                </p>
                <span className="text-[9px] bg-amber-500/20 text-[#FFD700] px-2 py-0.5 rounded-full font-bold">
                  {t.profile.milestoneModal.validity31Days}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {t.profile.milestoneModal.vipDesc}
              </p>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-[#FFD700] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((userProfile.successfulReferrals || 6) / 6) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Test Action */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playClickSound();
                  onSimulateReferral();
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-[#00E5FF] text-black font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md"
              >
                {t.profile.milestoneModal.testInviteBtn}
              </button>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="px-4 py-2.5 bg-zinc-800 text-white text-xs font-bold rounded-xl"
              >
                {t.profile.milestoneModal.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
