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
  Users,
  Search,
  X,
  Wifi,
  Battery,
  Sparkles,
  Camera,
  Loader2,
  Copy,
  Gift
} from 'lucide-react';
import { ReelItem, UserProfile } from '../types';
import { playClickSound, playWinChime } from '../utils/audio';
import { compressImageBeforeUpload, uploadMediaToCloudinary } from '../utils/cloudinary';

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
  onOpenSettings: () => void;
  onSimulateReferral: () => void;
  onSelectReel: (reel: ReelItem) => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onToggleFollow?: (username: string) => void;
  onOpenAuth?: () => void;
  onOpenSpin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  diamonds,
  userReels,
  savedReels,
  allReels,
  onOpenSettings,
  onSimulateReferral,
  onSelectReel,
  onUpdateProfile,
  onToggleFollow,
  onOpenAuth,
  onOpenSpin,
}) => {
  const [activeProfileTab, setActiveProfileTab] = useState<'posts' | 'saved'>('posts');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userProfile.name);
  const [editUsername, setEditUsername] = useState(userProfile.username);
  const [editBio, setEditBio] = useState(userProfile.bio);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMonetizationModal, setShowMonetizationModal] = useState(false);
  const [showDiamondsSheet, setShowDiamondsSheet] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followingSearchQuery, setFollowingSearchQuery] = useState('');

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

  // Map creators from allReels to extract avatar and details
  const creatorsMap = React.useMemo(() => {
    const map = new Map<string, { username: string; name: string; avatar: string; bio?: string }>();
    (allReels || []).forEach((r) => {
      if (r.user && r.user !== userProfile.username) {
        if (!map.has(r.user)) {
          map.set(r.user, {
            username: r.user,
            name: r.user.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            avatar: r.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            bio: r.title ? r.title.slice(0, 45) + '...' : 'Content creator on Infinity',
          });
        }
      }
    });
    return map;
  }, [allReels, userProfile.username]);

  const followedUsernames = userProfile.followingList || [];

  // Followed creators list
  const followedCreators = followedUsernames.map((uname) => {
    const creator = creatorsMap.get(uname);
    if (creator) return creator;
    return {
      username: uname,
      name: uname.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'Content creator on Infinity',
    };
  });

  // Filtered by search
  const filteredFollowedCreators = followedCreators.filter(
    (c) =>
      c.username.toLowerCase().includes(followingSearchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(followingSearchQuery.toLowerCase())
  );

  // Suggested creators to follow (not yet followed)
  const suggestedCreators = Array.from(creatorsMap.values()).filter(
    (c) => !followedUsernames.includes(c.username)
  );

  // Sample community followers for followers modal
  const followersList = React.useMemo(() => [
    {
      username: 'rohit_flow',
      name: 'Rohit Flow',
      avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=150&auto=format&fit=crop&q=80',
      bio: 'Himalayan wanderer & visual artist 🏔️',
    },
    {
      username: 'street_flavors',
      name: 'Street Flavors',
      avatar: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80',
      bio: 'Desi street food explorer 🍛',
    },
    {
      username: 'fitness_riya',
      name: 'Riya Fitness',
      avatar: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=80',
      bio: 'Hardcore gym discipline 💪🔥',
    },
    {
      username: 'aarav_singh',
      name: 'Aarav Singh',
      avatar: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=150&auto=format&fit=crop&q=80',
      bio: 'Nature & cinematic photography 🌲',
    },
  ], []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    onUpdateProfile({
      name: editName.trim() || userProfile.name,
      username: editUsername.trim().slice(0, 20) || userProfile.username,
      bio: editBio.trim() || userProfile.bio,
    });
    setIsEditingProfile(false);
  };

  // Highlights Data: First item changed from 'Your Story' to 'Highlight' as instructed!
  const HIGHLIGHTS = [
    {
      id: 'h-main',
      title: 'Highlight', // User instruction: "नीचे में जहां पे your story लिखा हे उसे बदलके highlight कर दो"
      image: userProfile.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-sky-400',
      isFirst: true,
    },
    {
      id: 'h-travel',
      title: 'Travel',
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-sky-400',
    },
    {
      id: 'h-food',
      title: 'Food',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-amber-500',
    },
    {
      id: 'h-fitness',
      title: 'Fitness',
      image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-cyan-400',
    },
    {
      id: 'h-nature',
      title: 'Nature',
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300&auto=format&fit=crop&q=80',
      ringClass: 'p-[2px] ring-2 ring-emerald-400',
    },
    {
      id: 'h-friends',
      title: 'Friends',
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
          title="Diamonds Balance & Rewards"
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
            title="Premium VIP Status (6 Logins/Invites)"
          >
            <Crown size={11} className="fill-[#FFD700] text-[#FFD700]" />
            <span>Premium</span>
          </button>

          {/* Verified Blue Tick Button */}
          <button
            onClick={() => {
              playClickSound();
              setShowMilestoneModal(true);
            }}
            className="text-[#0095F6] hover:scale-110 transition-transform active:scale-95"
            title="Verified Creator Badge (3 Logins/Invites)"
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
            aria-label="Settings"
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
        {/* Large Avatar with Cyan-Emerald Ring and Blue '+' Button (Interactive photo upload) */}
        <div
          onClick={() => {
            playClickSound();
            avatarFileInputRef.current?.click();
          }}
          className="relative shrink-0 cursor-pointer group"
          title="Tap to change profile photo"
        >
          <div className="w-20 h-20 rounded-full p-[2.5px] bg-gradient-to-tr from-[#00FF88] via-[#00E5FF] to-[#3B82F6] shadow-[0_0_12px_rgba(0,255,136,0.25)] relative overflow-hidden">
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
              {userProfile.username}
            </h1>
            <CheckCircle2 size={16} className="fill-[#0095F6] text-white shrink-0" />
          </div>
          <p className="text-zinc-400 text-xs font-medium tracking-tight mt-0.5 truncate">
            @{userProfile.username}
          </p>
          {userProfile.email ? (
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
                + Log In / Sign Up
              </button>
            )
          )}
        </div>
      </div>

      {/* ---------------- 3. STATS ROW (Posts | Followers | Following | Total Likes) with vertical dividers ---------------- */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 divide-x divide-zinc-800 text-center items-center py-2 bg-[#090C10] rounded-xl border border-zinc-850/80">
          {/* 1. Posts */}
          <div className="flex flex-col items-center px-1">
            <p className="text-white font-black text-sm tracking-tight leading-tight">
              {formatMetricNumber(userProfile.postsCount || 1200)}
            </p>
            <p className="text-zinc-400 text-[10px] font-medium tracking-tight mt-0.5">Posts</p>
          </div>

          {/* 2. Followers (Interactive) */}
          <button
            onClick={() => {
              playClickSound();
              setShowFollowersModal(true);
            }}
            className="flex flex-col items-center px-1 hover:opacity-80 active:scale-95 transition-transform cursor-pointer group"
            title="View Followers"
          >
            <p className="text-white group-hover:text-[#00FF88] font-black text-sm tracking-tight leading-tight transition-colors">
              {formatMetricNumber(userProfile.followers || 240)}
            </p>
            <p className="text-zinc-400 group-hover:text-zinc-300 text-[10px] font-medium tracking-tight mt-0.5">Followers</p>
          </button>

          {/* 3. Following (Interactive) */}
          <button
            onClick={() => {
              playClickSound();
              setShowFollowingModal(true);
            }}
            className="flex flex-col items-center px-1 hover:opacity-80 active:scale-95 transition-transform cursor-pointer group"
            title="View Following List"
          >
            <p className="text-white group-hover:text-[#00FF88] font-black text-sm tracking-tight leading-tight transition-colors">
              {formatMetricNumber(userProfile.following || 125000)}
            </p>
            <p className="text-zinc-400 group-hover:text-zinc-300 text-[10px] font-medium tracking-tight mt-0.5">Following</p>
          </button>

          {/* 4. Total Likes */}
          <div
            className="flex flex-col items-center px-1 cursor-default"
            title={`Total All-Time Likes: ${(userProfile.totalLikes || 85400).toLocaleString()}`}
          >
            <p className="text-white font-black text-sm tracking-tight leading-tight">
              {formatMetricNumber(userProfile.totalLikes || 85400)}
            </p>
            <p className="text-zinc-400 text-[10px] font-medium tracking-tight mt-0.5">Total Likes</p>
          </div>
        </div>
      </div>

      {/* ---------------- 4. BIO SECTION (User instructed: "बायो को पोस्ट फॉलोवर फॉलोविंग लाइक्स के नीचे में कर दो") ---------------- */}
      <div className="px-5 pb-3">
        <p className="text-zinc-200 text-xs font-medium leading-relaxed tracking-wide">
          {userProfile.bio || 'Dream Big  |  Create  |  Inspire ✨'}
        </p>
      </div>

      {/* ---------------- 5. ACTION BUTTONS (Edit Profile | Share Profile) ---------------- */}
      <div className="px-4 pb-4 flex gap-3">
        {/* Edit Profile Button */}
        <button
          onClick={() => {
            playClickSound();
            setIsEditingProfile(true);
          }}
          className="flex-1 py-2 px-3 bg-[#0D1520] hover:bg-[#132032] border border-[#00E5FF]/40 hover:border-[#00E5FF] rounded-full text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <Pen size={13} className="text-white" />
          <span>Edit Profile</span>
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
          <span>Share Profile</span>
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
          <span>Posts</span>
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
          <span>Saved</span>
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
                  aria-label="Options"
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
            No posts found in this tab.
          </div>
        )}
      </div>

      {/* ---------------- 9. MODALS ---------------- */}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setIsEditingProfile(false)}
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
                  title="Change profile photo"
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
                  {isUploadingAvatar ? 'Uploading photo...' : 'Change Profile Photo'}
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                  Bio
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-[#00E5FF] to-[#0088FF] text-black font-bold text-xs rounded-lg active:scale-95"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 text-xs rounded-lg hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Profile Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Share Profile</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Share your profile link to invite friends & fans!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  setShowShareModal(false);
                }}
                className="flex-1 py-2 rounded-lg bg-[#00E5FF] text-black text-xs font-bold"
              >
                Copy Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="py-2 px-3 rounded-lg border border-zinc-800 text-xs text-zinc-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monetization / VIP Status Modal */}
      {showMonetizationModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-scaleUp">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <Crown size={16} className="fill-amber-400" />
                <span>Infinity VIP & Premium Status</span>
              </div>
              <button
                onClick={() => setShowMonetizationModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1.5 text-xs text-zinc-300">
              <p className="font-bold text-white">⭐ Verified Creator & VIP Member</p>
              <p>• Verified Blue Tick Badge Active</p>
              <p>• Royal VIP Crown Tier Enabled</p>
              <p>• 100% Monetization Revenue Share Eligibility</p>
            </div>
            <button
              onClick={() => setShowMonetizationModal(false)}
              className="w-full py-2 bg-[#FFD700] text-black text-xs font-bold rounded-lg"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[580px] animate-scaleUp">
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">Following</h3>
                <span className="text-[11px] font-semibold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                  {followedCreators.length}
                </span>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowFollowingModal(false);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-2">
              {filteredFollowedCreators.length > 0 ? (
                <div className="space-y-1">
                  {filteredFollowedCreators.map((creator) => (
                    <div
                      key={creator.username}
                      className="p-2.5 flex items-center justify-between gap-3 rounded-xl hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={creator.avatar}
                          alt={creator.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{creator.name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">@{creator.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          playClickSound();
                          onToggleFollow?.(creator.username);
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 text-zinc-300 border border-zinc-700/80 transition-all shrink-0 active:scale-95 group"
                      >
                        <span className="group-hover:hidden">Following</span>
                        <span className="hidden group-hover:inline">Unfollow</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-xs text-zinc-400">
                  Not following anyone yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[580px] animate-scaleUp">
            <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">Followers</h3>
                <span className="text-[11px] font-semibold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                  {formatMetricNumber(userProfile.followers || 240)}
                </span>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setShowFollowersModal(false);
                }}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40 p-2">
              <div className="space-y-1">
                {followersList.map((follower) => {
                  const isFollowingBack = followedUsernames.includes(follower.username);
                  return (
                    <div
                      key={follower.username}
                      className="p-2.5 flex items-center justify-between gap-3 rounded-xl hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <img
                          src={follower.avatar}
                          alt={follower.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white truncate">{follower.name}</p>
                          <p className="text-[11px] text-zinc-400 truncate">@{follower.username}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{follower.bio}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          playClickSound();
                          onToggleFollow?.(follower.username);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                          isFollowingBack
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80'
                            : 'bg-[#00E5FF] hover:bg-[#00c5df] text-black font-bold'
                        }`}
                      >
                        {isFollowingBack ? 'Following' : 'Follow back'}
                      </button>
                    </div>
                  );
                })}
              </div>
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
                <h3 className="text-base font-extrabold text-white">Diamonds Balance & Rewards</h3>
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
                <p className="text-xs font-bold text-[#00E5FF]">Current Diamonds</p>
                <p className="text-3xl font-black text-white mt-0.5 tracking-tight flex items-center gap-2">
                  <span>{diamonds.toLocaleString()}</span>
                  <span className="text-xl">💎</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Value: <span className="text-[#00FF88] font-bold">₹{(diamonds / 100).toFixed(2)}</span> (100 💎 = ₹1)
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
                    <p className="font-black text-xs leading-tight">Lucky Spin & Win</p>
                    <p className="text-[10px] text-zinc-900 font-semibold">Spin wheel to win up to 500 Diamonds daily</p>
                  </div>
                </div>
                <span className="text-xs font-black">SPIN NOW &rarr;</span>
              </button>

              {/* Earn via Referral Button */}
              <div className="p-3.5 bg-zinc-900/90 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-[#00FF88]" />
                    <span className="text-xs font-bold text-white">Earn Diamonds via Referrals</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-2 py-0.5 rounded-full font-bold">
                    +100 💎 / Friend
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Invite friends to join Infinity. Each friend signup gives you 100 Diamonds and counts towards your Blue Tick & Premium badge!
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      playClickSound();
                      onSimulateReferral();
                    }}
                    className="flex-1 py-2 rounded-lg bg-[#00FF88] text-black text-xs font-bold active:scale-95 transition-all shadow-sm"
                  >
                    Simulate Invite (+1 Friend)
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
                    <span>{copiedReferral ? 'Copied!' : 'Copy Link'}</span>
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
              Close
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
                <h3 className="text-sm font-bold text-white">Badge & VIP Milestones</h3>
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

            {/* Instruction Rule 1: 3 सफल मोबाइल लॉगिन पर ब्लू टिक */}
            <div className="p-3.5 bg-gradient-to-r from-blue-950/50 via-zinc-900 to-black border border-[#0095F6]/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="fill-[#0095F6] text-white" />
                  <span className="text-xs font-bold text-white">Verified Blue Tick Badge</span>
                </div>
                <span className="text-[10px] font-bold bg-[#0095F6]/20 text-[#0095F6] px-2 py-0.5 rounded-full">
                  {Math.min(userProfile.successfulReferrals || 6, 3)} / 3 Completed
                </span>
              </div>
              {/* EXACT USER SPECIFICATION */}
              <p className="text-xs text-blue-200 font-semibold leading-relaxed">
                "3 सफल मोबाइल लॉगिन पर ब्लू टिक"
              </p>
              <p className="text-[11px] text-zinc-400">
                अपने रेफरल लिंक से 3 सफल मोबाइल लॉगिन या नए यूजर इनवाइट पूरे होने पर आपकी प्रोफाइल पर ऑफिशियल ब्लू टिक वेरीफाइड बैच अनलॉक हो जाता है।
              </p>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#0095F6] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((userProfile.successfulReferrals || 6) / 3) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Instruction Rule 2: 6 सफल लॉगिन पर प्रीमियम गोल्डन बैच */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/50 via-zinc-900 to-black border border-amber-500/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown size={18} className="fill-[#FFD700] text-[#FFD700]" />
                  <span className="text-xs font-bold text-white">Royal Gold VIP Premium Badge</span>
                </div>
                <span className="text-[10px] font-bold bg-amber-500/20 text-[#FFD700] px-2 py-0.5 rounded-full">
                  {Math.min(userProfile.successfulReferrals || 6, 6)} / 6 Completed
                </span>
              </div>
              {/* EXACT USER SPECIFICATION */}
              <p className="text-xs text-amber-200 font-semibold leading-relaxed">
                "6 सफल लॉगिन पर प्रीमियम गोल्डन बैच"
              </p>
              <p className="text-[11px] text-zinc-400">
                6 सफल मोबाइल लॉगिन पूरे होने पर आपको रॉयल गोल्ड वीआईपी क्राउन बैच और 100% प्रायोरिटी मोनेटाइजेशन प्राप्त होता है।
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
                + Test Mobile Login / Invite (+1)
              </button>
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="px-4 py-2.5 bg-zinc-800 text-white text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
