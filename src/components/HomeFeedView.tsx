import React from 'react';
import {
  Search,
  Bell,
  MessageSquare,
  Plus,
  Flame,
  MoreVertical,
  Eye,
  Wifi,
  Battery,
  Users
} from 'lucide-react';
import { ReelItem, StoryItem, UserProfile, FeedType } from '../types';
import { playClickSound } from '../utils/audio';

interface HomeFeedViewProps {
  reels: ReelItem[];
  stories: StoryItem[];
  userProfile: UserProfile;
  diamonds: number;
  feedType: FeedType;
  setFeedType: (feed: FeedType) => void;
  onOpenStory: (index: number) => void;
  onOpenStoryCreate: () => void;
  onOpenSpin: () => void;
  onOpenNotifications: () => void;
  onOpenMessages: () => void;
  onOpenSearch: () => void;
  onSelectReel: (reel: ReelItem) => void;
}

export const HomeFeedView: React.FC<HomeFeedViewProps> = ({
  reels,
  stories,
  userProfile,
  diamonds,
  feedType,
  setFeedType,
  onOpenStory,
  onOpenStoryCreate,
  onOpenSpin,
  onOpenNotifications,
  onOpenMessages,
  onOpenSearch,
  onSelectReel,
}) => {
  // Filter reels: For You vs Following
  const filteredReels = reels
    .filter((r) => {
      if (feedType === 'Following') {
        const isFollowed = userProfile.followingList
          ? userProfile.followingList.includes(r.user)
          : false;
        return r.isFollowing || isFollowed;
      }
      return true;
    })
    .sort((a, b) => {
      if (feedType === 'Following') {
        return (b.timestamp || 0) - (a.timestamp || 0);
      }
      return 0;
    });

  return (
    <div className="flex-1 flex flex-col bg-black overflow-y-auto no-scrollbar pb-20 select-none">
      {/* ---------------- 0. TOP MOBILE STATUS BAR (9:41, Cellular, Wifi, 100% Battery) ---------------- */}
      <div className="pt-2 px-5 pb-1 flex items-center justify-between text-white text-xs font-bold tracking-tight select-none">
        <span>9:41</span>
        <div className="flex items-center gap-1.5 text-white">
          {/* Cellular signal bars */}
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

      {/* ---------------- 1. APP HEADER BAR (Crown + Gradient Infinity Logo + "INFINITY" on Left, Chat 3, Bell 7, Search on Right) ---------------- */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md px-4 py-2 border-b border-zinc-900/60 flex items-center justify-between">
        {/* Left: Crown + Gradient Infinity Symbol + "INFINITY" */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {/* Small golden crown on top of the loop */}
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
                <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00FF88" />
                  <stop offset="35%" stopColor="#00E5FF" />
                  <stop offset="70%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              <path
                d="M30 10 C15 10 10 25 25 35 C40 45 60 10 75 15 C90 20 90 35 75 40 C60 45 40 10 25 15 C15 20 15 35 30 40 C45 45 60 10 75 15"
                stroke="url(#infinityGrad)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Gradient text: INFINITY */}
          <span className="text-xl font-black tracking-wider bg-gradient-to-r from-[#00FF88] via-[#00E5FF] via-[#3B82F6] to-[#A855F7] bg-clip-text text-transparent">
            INFINITY
          </span>
        </div>

        {/* Right: Chat bubble (with 3 badge), Bell (with 7 badge), Search icon */}
        <div className="flex items-center gap-4">
          {/* 1. Direct Messages Icon with red badge "3" */}
          <button
            onClick={() => {
              playClickSound();
              onOpenMessages();
            }}
            className="relative text-white hover:text-zinc-300 transition-transform active:scale-90"
            aria-label="Messages"
            title="Direct Messages"
          >
            <MessageSquare size={21} className="stroke-[2]" />
            <span className="absolute -top-1.5 -right-2 bg-[#E11D48] text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 ring-2 ring-black">
              3
            </span>
          </button>

          {/* 2. Notifications Icon with red badge "7" */}
          <button
            onClick={() => {
              playClickSound();
              onOpenNotifications();
            }}
            className="relative text-white hover:text-zinc-300 transition-transform active:scale-90"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={21} className="stroke-[2]" />
            <span className="absolute -top-1.5 -right-2 bg-[#E11D48] text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 ring-2 ring-black">
              7
            </span>
          </button>

          {/* 3. Search Icon */}
          <button
            onClick={() => {
              playClickSound();
              onOpenSearch();
            }}
            className="text-white hover:text-zinc-300 transition-transform active:scale-90"
            aria-label="Search"
            title="Search"
          >
            <Search size={22} className="stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* ---------------- 2. STORIES / CREATOR CIRCLES TRAY ---------------- */}
      <div className="pt-3 pb-3 px-3 border-b border-zinc-900/60 overflow-x-auto no-scrollbar flex items-center gap-3">
        {/* Your Story Avatar with blue + badge and cyan ring */}
        <div
          onClick={() => {
            playClickSound();
            onOpenStoryCreate();
          }}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div className="relative w-15 h-15 rounded-full p-[2px] ring-2 ring-sky-400 group-hover:ring-cyan-300 transition-all">
            <img
              src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'}
              alt={userProfile.name}
              className="w-full h-full rounded-full object-cover"
            />
            {/* Blue circular + badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0088FF] text-white rounded-full flex items-center justify-center border-2 border-black font-bold shadow-md">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] text-zinc-300 font-medium tracking-tight text-center truncate w-16">
            Your Story
          </span>
        </div>

        {/* Stories from creators with Instagram gradient rings */}
        {stories
          .filter((s) => !s.isMyStory)
          .map((story, idx) => (
            <div
              key={story.id}
              onClick={() => {
                playClickSound();
                const originalIndex = stories.findIndex((s) => s.id === story.id);
                onOpenStory(originalIndex >= 0 ? originalIndex : idx);
              }}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
            >
              {/* Instagram-style gradient ring (amber to rose to fuchsia) */}
              <div className="w-15 h-15 rounded-full p-[2.5px] bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-sm group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full p-[2px] bg-black">
                  <img
                    src={story.userAvatar}
                    alt={story.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[11px] text-zinc-300 font-medium tracking-tight text-center truncate w-16 group-hover:text-white">
                {story.username}
              </span>
            </div>
          ))}
      </div>

      {/* ---------------- 3. FEED TABS (For You / Following) + "🔥 Trending" BUTTON ---------------- */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          {/* For You Tab */}
          <button
            onClick={() => {
              playClickSound();
              setFeedType('ForYou');
            }}
            className="relative pb-1 transition-colors text-base font-bold flex flex-col items-center"
          >
            <span className={feedType === 'ForYou' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}>
              For You
            </span>
            {feedType === 'ForYou' && (
              <span className="w-full h-[2.5px] bg-white rounded-full mt-1" />
            )}
          </button>

          {/* Following Tab */}
          <button
            onClick={() => {
              playClickSound();
              setFeedType('Following');
            }}
            className="relative pb-1 transition-colors text-base font-bold flex flex-col items-center"
          >
            <span className={feedType === 'Following' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}>
              Following
            </span>
            {feedType === 'Following' && (
              <span className="w-full h-[2.5px] bg-white rounded-full mt-1" />
            )}
          </button>
        </div>

        {/* Right: Trending Pill Button */}
        <button
          onClick={() => {
            playClickSound();
            onOpenSearch();
          }}
          className="flex items-center gap-1.5 bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 active:scale-95 transition-all shadow-sm"
          title="Trending Topics"
        >
          <Flame size={13} className="text-white fill-transparent" />
          <span>Trending</span>
        </button>
      </div>

      {/* ---------------- 4. THREE-COLUMN VIDEO GRID (Tight 1px Zero-Margin Instagram Search Feed Layout) ---------------- */}
      <div className="px-0 pt-0.5 pb-4">
        {filteredReels.length > 0 ? (
          <div className="grid grid-cols-3 gap-[1px] bg-black">
            {filteredReels.map((reel) => (
              <div
                key={reel.id}
                onClick={() => {
                  playClickSound();
                  onSelectReel(reel);
                }}
                className="group relative aspect-[3/4] overflow-hidden bg-zinc-950 cursor-pointer select-none active:opacity-90 transition-opacity"
              >
                {/* Video / Photo Thumbnail */}
                <img
                  src={reel.posterUrl}
                  alt={reel.title}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
                  loading="lazy"
                />

                {/* Subtle vignette gradients for readability */}
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
          <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Users size={24} className="text-[#00FF88]" />
            </div>
            <p className="text-white text-sm font-bold mb-1">
              {feedType === 'Following' ? 'No posts from accounts you follow yet' : 'No videos available'}
            </p>
            <p className="text-zinc-500 text-xs max-w-xs mb-4">
              {feedType === 'Following'
                ? 'Follow creators from the "For You" feed or search explore to see their latest reels here.'
                : 'Check back soon for new content.'}
            </p>
            {feedType === 'Following' && (
              <button
                onClick={() => {
                  playClickSound();
                  setFeedType('ForYou');
                }}
                className="px-4 py-2 rounded-full bg-[#00FF88] text-black text-xs font-bold hover:bg-[#00e57a] transition-transform active:scale-95 shadow-md shadow-[#00FF88]/20"
              >
                Discover Creators on For You
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
