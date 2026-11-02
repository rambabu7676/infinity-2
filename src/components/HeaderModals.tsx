import React, { useState } from 'react';
import { X, Search, Heart, MessageCircle, UserPlus, Send, Sparkles, Film } from 'lucide-react';
import { ReelItem } from '../types';
import { playClickSound } from '../utils/audio';
import { TrendingVisualization } from './TrendingVisualization';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({ isOpen, onClose }) => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [chats, setChats] = useState([
    {
      id: 'm1',
      user: 'themandlaexplorer',
      name: 'Mandla Explorer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Awesome reel about the cosmic mystery! 🌌',
      time: '10m',
      unread: true,
      history: [
        { sender: 'them', text: 'Hey Baburam ji! Loved your latest reel!' },
        { sender: 'me', text: 'Thank you! Exploring the 0-∞ concepts.' },
        { sender: 'them', text: 'Awesome reel about the cosmic mystery! 🌌' }
      ]
    },
    {
      id: 'm2',
      user: 'energy.108',
      name: 'Energy Studio',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Shall we collaborate on a funny animation clip?',
      time: '2h',
      unread: false,
      history: [
        { sender: 'them', text: 'Shall we collaborate on a funny animation clip?' }
      ]
    },
    {
      id: 'm3',
      user: 'urban_wanderer',
      name: 'Aman Sharma',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      lastMessage: 'Nice shots! Which camera preset did you use?',
      time: '1d',
      unread: false,
      history: [
        { sender: 'them', text: 'Nice shots! Which camera preset did you use?' }
      ]
    }
  ]);

  if (!isOpen) return null;

  const currentConversation = chats.find(c => c.id === activeChat);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    setChats(prev =>
      prev.map(c => {
        if (c.id === activeChat) {
          return {
            ...c,
            lastMessage: messageText,
            time: 'Just now',
            history: [...c.history, { sender: 'me', text: messageText }]
          };
        }
        return c;
      })
    );
    setMessageText('');
    playClickSound();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm h-[520px] bg-[#1A1A1A] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeChat && (
              <button
                onClick={() => setActiveChat(null)}
                className="text-zinc-400 hover:text-white mr-1 text-sm font-bold"
              >
                ‹
              </button>
            )}
            <span className="font-bold text-white text-sm">
              {activeChat ? currentConversation?.name : 'Direct Messages'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {!activeChat ? (
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => {
                  playClickSound();
                  setActiveChat(chat.id);
                }}
                className="p-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <div className="relative">
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                  {chat.unread && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00FF88] border-2 border-[#1A1A1A] rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white truncate">{chat.name}</span>
                    <span className="text-[10px] text-zinc-500">{chat.time}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{chat.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between p-3 bg-zinc-950">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {currentConversation?.history.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-xs ${
                      msg.sender === 'me'
                        ? 'bg-[#00FF88] text-black font-medium'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Message..."
                className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="p-2 bg-[#00FF88] text-black rounded-full disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [notifications] = useState([
    {
      id: 'n1',
      icon: '💎',
      title: 'Referral Bonus Received',
      text: 'You received +10 Test Diamonds for inviting a genuine creator.',
      time: '5m ago',
      color: 'text-[#FFD700]'
    },
    {
      id: 'n2',
      icon: '❤️',
      title: 'themandlaexplorer liked your clip',
      text: 'Science & Cosmos Mystery 🌌',
      time: '25m ago',
      color: 'text-[#FF0050]'
    },
    {
      id: 'n3',
      icon: '👤',
      title: 'New Follower',
      text: 'urban_wanderer started following your profile.',
      time: '1h ago',
      color: 'text-[#00FF88]'
    },
    {
      id: 'n4',
      icon: '💬',
      title: 'astro_guru commented',
      text: '"The concept of shunya as zero and infinity simultaneously..."',
      time: '3h ago',
      color: 'text-sky-400'
    }
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm max-h-[500px] bg-[#1A1A1A] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <span className="font-bold text-white text-sm">Notifications</span>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-2">
          {notifications.map(n => (
            <div key={n.id} className="p-2.5 flex items-start gap-3 hover:bg-zinc-800/40 rounded-xl transition-colors">
              <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">{n.title}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{n.text}</p>
                <span className="text-[10px] text-zinc-500 mt-1 block">{n.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  reels: ReelItem[];
  onSelectReel: (reel: ReelItem) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  reels,
  onSelectReel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showVisual, setShowVisual] = useState(true);

  if (!isOpen) return null;

  const filteredReels = reels.filter((r) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      r.title.toLowerCase().includes(term) ||
      r.user.toLowerCase().includes(term) ||
      r.soundTitle?.toLowerCase().includes(term) ||
      (r.category && r.category.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm h-[600px] max-h-[92vh] bg-[#16181C] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2 shrink-0 bg-black/40">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reels, creators, hashtags..."
              className="w-full pl-8 pr-7 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  playClickSound();
                  setSearchTerm('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-zinc-800"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-xs text-zinc-400 hover:text-white px-1.5 py-1 rounded hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Scrollable Container containing D3 Trending Visual and Reels Results */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {/* D3.js Interactive Trending Topics Visualization */}
          {(!searchTerm || showVisual) && (
            <div className="shrink-0">
              <TrendingVisualization
                onSelectTopic={(tag) => {
                  setSearchTerm(tag);
                }}
              />
            </div>
          )}

          {/* Results Section Header */}
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between shrink-0 bg-[#16181C]">
            <div className="flex items-center gap-1.5">
              <Film size={12} className="text-[#00FF88]" />
              <span className="text-[11px] font-bold text-zinc-200">
                {searchTerm ? `Results for "${searchTerm}"` : 'Trending & Suggested Reels'}
              </span>
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded-full font-medium">
                {filteredReels.length}
              </span>
            </div>

            {searchTerm && (
              <button
                onClick={() => {
                  playClickSound();
                  setSearchTerm('');
                }}
                className="text-[10px] text-[#00FF88] hover:underline font-semibold"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Results Grid */}
          <div className="flex-1 p-2">
            {filteredReels.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {filteredReels.map((reel) => (
                  <div
                    key={reel.id}
                    onClick={() => {
                      playClickSound();
                      onSelectReel(reel);
                      onClose();
                    }}
                    className="relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer group border border-zinc-800/60 hover:border-[#00FF88]/50 transition-all shadow-md"
                  >
                    <img
                      src={reel.posterUrl}
                      alt={reel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                    {/* Bottom-left Views Badge */}
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                      <span className="text-[#00FF88] text-[9px]">▶</span>
                      <span>{reel.views}</span>
                    </div>

                    {/* Creator Handle overlay */}
                    <div className="absolute top-2 left-2 right-2 text-white">
                      <p className="text-[10px] font-bold drop-shadow truncate">@{reel.user}</p>
                    </div>

                    {/* Title preview on bottom */}
                    <div className="absolute bottom-8 left-2 right-2 text-white">
                      <p className="text-[10px] text-zinc-300 truncate leading-tight drop-shadow">
                        {reel.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs">
                <p className="text-sm font-semibold text-zinc-400 mb-1">No reels matched</p>
                <p className="text-[11px] text-zinc-500">
                  Try searching for another topic or tap one of the trending bubbles above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

