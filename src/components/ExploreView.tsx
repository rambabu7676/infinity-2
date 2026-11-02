import React, { useState } from 'react';
import { Search, Play, Eye, Flame, Music2, Sparkles, X } from 'lucide-react';
import { ReelItem } from '../types';
import { playClickSound } from '../utils/audio';

interface ExploreViewProps {
  reels: ReelItem[];
  onSelectReel: (reel: ReelItem) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ reels, onSelectReel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const tags = ['All', 'Trending 🔥', 'Dance ⚡️', 'Food 🍲', 'Music 🎧', 'Comedy 😂', 'Art ✨'];

  const filteredReels = reels.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.soundTitle?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedTag === 'All') return matchesSearch;
    if (selectedTag.includes('Dance')) return matchesSearch && (r.title.includes('#Dance') || r.category === 'both');
    if (selectedTag.includes('Food')) return matchesSearch && (r.title.includes('#Food') || r.title.includes('#StreetFood'));
    if (selectedTag.includes('Music')) return matchesSearch && (r.soundTitle?.length > 0);
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col bg-black text-white overflow-y-auto no-scrollbar pb-16">
      {/* Top Search Bar */}
      <div className="p-3 sticky top-0 bg-black/95 backdrop-blur-md z-20 border-b border-zinc-900">
        <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-xl px-3 py-2 border border-zinc-800">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search accounts, audio, reels..."
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                playClickSound();
                setSelectedTag(tag);
              }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                selectedTag === tag
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Discover Grid (Tight 1px Instagram Search Feed Layout) */}
      <div className="grid grid-cols-3 gap-[1px] p-0 flex-1 bg-black">
        {filteredReels.map((item, idx) => {
          // Dynamic tile sizing: featured tiles or standard square
          const isLarge = idx % 7 === 1;

          return (
            <div
              key={item.id}
              onClick={() => {
                playClickSound();
                onSelectReel(item);
              }}
              className={`relative bg-zinc-950 overflow-hidden cursor-pointer group select-none active:opacity-90 transition-opacity ${
                isLarge ? 'row-span-2 col-span-1 aspect-[9/19]' : 'aspect-square'
              }`}
            >
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
              />

              <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />

              {/* Reel Play Badge at Top-Right */}
              <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white">
                <Play size={8} className="fill-white ml-0.5" />
              </div>

              {/* Views count pill at Bottom-Left */}
              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-sm bg-black/60 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1">
                <Eye size={9} className="text-white" />
                <span>{item.views}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
