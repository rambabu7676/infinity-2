import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Search,
  Send,
  Film,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Play,
  Eye,
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Ban,
} from 'lucide-react';
import { ReelItem, UserProfile, NotificationItem, FollowListUser } from '../types';
import { playClickSound } from '../utils/audio';
import {
  searchReelsAndUsersInFirebase,
  getUserReelsFromFirebase,
  getUserFollowCountsFromFirebase,
  resolveFullUserProfileForNavigation,
} from '../firebase/services';
import { getAdaptiveThumbnailUrl, getAdaptiveVideoUrl } from '../utils/cloudinary';
import { FollowListModal } from './FollowListModal';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedUsernames?: string[];
  blockedByUsernames?: string[];
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  isOpen,
  onClose,
  blockedUsernames = [],
  blockedByUsernames = [],
}) => {
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
  const allBlockedSet = new Set<string>([...blockedUsernames, ...blockedByUsernames]);
  const isChatUserBlocked = Boolean(currentConversation && allBlockedSet.has(currentConversation.user));

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || isChatUserBlocked) return;

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

            {isChatUserBlocked ? (
              <div className="pt-2.5 border-t border-zinc-800 text-center">
                <p className="text-xs font-semibold text-rose-300">
                  आप इस यूज़र को मैसेज नहीं भेज सकते
                </p>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatNotificationTime(createdAt: number): string {
  if (!createdAt) return 'अभी';
  const diffSec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSec < 60) return 'अभी';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} मिनट पहले`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} घंटे पहले`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} दिन पहले`;
  return new Date(createdAt).toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'short',
  });
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
}) => {
  if (!isOpen) return null;

  const sortedNotifications = [...notifications].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  const renderTypeBadge = (type: NotificationItem['type']) => {
    if (type === 'like') {
      return (
        <span className="w-5 h-5 rounded-full bg-[#FF0050] text-white flex items-center justify-center border-2 border-[#1A1A1A]">
          <Heart size={10} className="fill-white" />
        </span>
      );
    }
    if (type === 'comment') {
      return (
        <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center border-2 border-[#1A1A1A]">
          <MessageCircle size={10} className="fill-white" />
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-[#00FF88] text-black flex items-center justify-center border-2 border-[#1A1A1A]">
        <UserPlus size={10} />
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-sm max-h-[520px] min-h-[340px] bg-[#1A1A1A] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-[#00FF88]" />
            <span className="font-bold text-white text-sm">नोटिफ़िकेशन</span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 p-2">
          {sortedNotifications.length > 0 ? (
            sortedNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-2.5 flex items-start gap-3 rounded-xl transition-colors ${
                  n.read ? 'hover:bg-zinc-800/40' : 'bg-zinc-900/70 hover:bg-zinc-800/60'
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  <img
                    src={
                      n.actorAvatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                        n.actorUsername || 'user'
                      )}`
                    }
                    alt={n.actorUsername}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-700 bg-zinc-900"
                  />
                  <div className="absolute -bottom-1 -right-1">{renderTypeBadge(n.type)}</div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug break-words">
                    {n.message}
                  </p>
                  {n.reelTitle && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{n.reelTitle}</p>
                  )}
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {formatNotificationTime(n.createdAt)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center px-6 py-10">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                <Bell size={20} />
              </div>
              <p className="text-sm font-bold text-zinc-300">अभी कोई नोटिफ़िकेशन नहीं</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReel: (reel: ReelItem) => void;
  currentUserProfile?: UserProfile;
  onToggleFollow?: (username: string) => void;
  blockedUsernames?: string[];
  blockedByUsernames?: string[];
  onBlockUser?: (target: {
    username: string;
    uid?: string;
    name?: string;
    avatarUrl?: string;
  }) => Promise<void> | void;
  initialSelectedUser?: UserProfile | null;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectReel,
  currentUserProfile,
  onToggleFollow,
  blockedUsernames = [],
  blockedByUsernames = [],
  onBlockUser,
  initialSelectedUser = null,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [reelResults, setReelResults] = useState<ReelItem[]>([]);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected user profile view state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserReels, setSelectedUserReels] = useState<ReelItem[]>([]);
  const [isLoadingUserReels, setIsLoadingUserReels] = useState(false);
  const [guestFollowNotice, setGuestFollowNotice] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [followListModalMode, setFollowListModalMode] = useState<'followers' | 'following' | null>(null);
  const [selectedUserFollowCounts, setSelectedUserFollowCounts] = useState<{
    followers: number;
    following: number;
  } | null>(null);

  const searchRequestSeqRef = useRef(0);
  const userRequestSeqRef = useRef(0);

  // Reset or seed selected profile when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setSelectedUserReels([]);
      setGuestFollowNotice(null);
      setShowBlockConfirm(false);
      setFollowListModalMode(null);
      setSelectedUserFollowCounts(null);
    } else if (initialSelectedUser) {
      setSelectedUser(initialSelectedUser);
      setFollowListModalMode(null);
      setGuestFollowNotice(null);
      setShowBlockConfirm(false);
    }
  }, [isOpen, initialSelectedUser]);

  // Fetch real results from Firebase (newest reels when empty, matching reels + users when typing)
  useEffect(() => {
    if (!isOpen) return;

    const seq = ++searchRequestSeqRef.current;
    const trimmed = searchTerm.trim();
    const delay = trimmed ? 250 : 0;

    setIsLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchReelsAndUsersInFirebase(trimmed);
      if (seq !== searchRequestSeqRef.current) return;
      setReelResults(results.reels);
      setUserResults(results.users);
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  // Load selected user's real Firebase reels & follow counts when tapped
  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserFollowCounts(null);
      return;
    }
    if (
      blockedUsernames.includes(selectedUser.username) ||
      blockedByUsernames.includes(selectedUser.username)
    ) {
      setSelectedUserReels([]);
      setSelectedUserFollowCounts({ followers: 0, following: 0 });
      setIsLoadingUserReels(false);
      return;
    }
    const seq = ++userRequestSeqRef.current;
    setIsLoadingUserReels(true);

    getUserReelsFromFirebase(selectedUser.username).then((fetchedReels) => {
      if (seq !== userRequestSeqRef.current) return;
      setSelectedUserReels(fetchedReels);
      setIsLoadingUserReels(false);
    });

    const targetId = selectedUser.uid || selectedUser.username;
    if (targetId) {
      getUserFollowCountsFromFirebase(targetId).then((counts) => {
        if (seq !== userRequestSeqRef.current) return;
        setSelectedUserFollowCounts(counts);
      });
    }
  }, [selectedUser, blockedUsernames, blockedByUsernames]);

  if (!isOpen) return null;

  const blockedByMeSet = new Set<string>(blockedUsernames);
  const blockedAllSet = new Set<string>([...blockedUsernames, ...blockedByUsernames]);
  const visibleUserResults = userResults.filter((u) => !blockedByMeSet.has(u.username));
  const visibleReelResults = reelResults.filter((r) => !blockedAllSet.has(r.user));

  const trimmedTerm = searchTerm.trim();
  const totalResultsCount = visibleUserResults.length + visibleReelResults.length;

  const handleOpenReel = (reel: ReelItem) => {
    playClickSound();
    onSelectReel({
      ...reel,
      videoUrl: getAdaptiveVideoUrl(reel.videoUrl),
      posterUrl: reel.posterUrl || getAdaptiveThumbnailUrl(reel.videoUrl),
    });
    onClose();
  };

  const handleSelectUserProfile = (user: UserProfile) => {
    playClickSound();
    setGuestFollowNotice(null);
    setShowBlockConfirm(false);
    setFollowListModalMode(null);
    setSelectedUserFollowCounts(null);
    setSelectedUserReels([]);
    setSelectedUser(user);
  };

  const handleToggleFollowWithCountSync = (targetUsername: string) => {
    if (!onToggleFollow) return;
    const wasFollowing = Boolean(currentUserProfile?.followingList?.includes(targetUsername));
    onToggleFollow(targetUsername);
    if (selectedUser && selectedUser.username === targetUsername) {
      setSelectedUserFollowCounts((prev) => {
        const baseFollowers = prev ? prev.followers : selectedUser.followers || 0;
        const baseFollowing = prev ? prev.following : selectedUser.following || 0;
        return {
          followers: Math.max(0, baseFollowers + (wasFollowing ? -1 : 1)),
          following: baseFollowing,
        };
      });
    }
  };

  const isFollowingSelectedUser = Boolean(
    selectedUser &&
      currentUserProfile?.followingList?.includes(selectedUser.username)
  );
  const isOwnProfile = Boolean(
    selectedUser &&
      currentUserProfile &&
      !currentUserProfile.isGuest &&
      ((currentUserProfile.uid && currentUserProfile.uid === selectedUser.uid) ||
        currentUserProfile.username === selectedUser.username)
  );

  const isSelectedUserBlocked = Boolean(
    selectedUser && blockedAllSet.has(selectedUser.username)
  );
  const displayedFollowersCount = selectedUserFollowCounts
    ? selectedUserFollowCounts.followers
    : selectedUser?.followers || 0;
  const displayedFollowingCount = selectedUserFollowCounts
    ? selectedUserFollowCounts.following
    : selectedUser?.following || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-sm h-[620px] max-h-[92vh] bg-[#121418] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
        {/* ---------------- VIEW A: TAPPED USER PROFILE ---------------- */}
        {selectedUser ? (
          <>
            {/* Profile Top Header */}
            <div className="px-3 py-3 border-b border-zinc-800 flex items-center justify-between bg-black/50 shrink-0">
              <button
                onClick={() => {
                  playClickSound();
                  setSelectedUser(null);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white px-1.5 py-1 rounded-lg hover:bg-zinc-800/80 transition-colors"
              >
                <ChevronLeft size={16} />
                <span>वापस</span>
              </button>
              <span className="text-xs font-bold text-white truncate max-w-[170px]">
                @{selectedUser.username}
              </span>
              <button
                onClick={() => {
                  playClickSound();
                  onClose();
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Body */}
            {isSelectedUserBlocked ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-rose-400">
                  <Ban size={24} />
                </div>
                <p className="text-sm font-bold text-white">यह प्रोफ़ाइल उपलब्ध नहीं है</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* User Info Card */}
                <div className="p-4 border-b border-zinc-800/80 space-y-3">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        selectedUser.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          selectedUser.username
                        )}`
                      }
                      alt={selectedUser.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#00FF88]/70 shrink-0 bg-zinc-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-white truncate">
                          {selectedUser.name || selectedUser.username}
                        </h3>
                        {selectedUser.isBlueTick && (
                          <CheckCircle2 size={14} className="fill-[#0095F6] text-white shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate">@{selectedUser.username}</p>

                      <div className="flex items-center gap-4 mt-2 text-[11px]">
                        <div>
                          <span className="font-bold text-white">{selectedUserReels.length}</span>{' '}
                          <span className="text-zinc-400">रील्स</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFollowListModalMode('followers');
                          }}
                          className="hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="font-bold text-white">{displayedFollowersCount}</span>{' '}
                          <span className="text-zinc-400 hover:text-zinc-200">फ़ॉलोअर्स</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFollowListModalMode('following');
                          }}
                          className="hover:opacity-80 active:scale-95 transition-transform cursor-pointer"
                        >
                          <span className="font-bold text-white">{displayedFollowingCount}</span>{' '}
                          <span className="text-zinc-400 hover:text-zinc-200">फ़ॉलोइंग</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedUser.bio && (
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                      {selectedUser.bio}
                    </p>
                  )}

                  {guestFollowNotice && (
                    <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                      {guestFollowNotice}
                    </div>
                  )}

                  {!isOwnProfile && (
                    <div className="flex items-center gap-2">
                      {onToggleFollow && (
                        <button
                          onClick={() => {
                            if (
                              !currentUserProfile ||
                              currentUserProfile.isGuest ||
                              !currentUserProfile.uid ||
                              currentUserProfile.uid === 'guest_user'
                            ) {
                              setGuestFollowNotice('लॉगिन करें');
                              setTimeout(() => setGuestFollowNotice(null), 3000);
                              return;
                            }
                            handleToggleFollowWithCountSync(selectedUser.username);
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            isFollowingSelectedUser
                              ? 'bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700'
                              : 'bg-[#00FF88] text-black hover:bg-[#00e57a]'
                          }`}
                        >
                          {isFollowingSelectedUser ? 'फ़ॉलो कर रहे हैं' : 'फ़ॉलो करें'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !currentUserProfile ||
                            currentUserProfile.isGuest ||
                            !currentUserProfile.uid ||
                            currentUserProfile.uid === 'guest_user'
                          ) {
                            setGuestFollowNotice('लॉगिन करें');
                            setTimeout(() => setGuestFollowNotice(null), 3000);
                            return;
                          }
                          playClickSound();
                          setShowBlockConfirm(true);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500/25 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                      >
                        <Ban size={13} />
                        <span>ब्लॉक करें</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* User's Real Firebase Reels Grid */}
                <div className="p-2.5">
                  <div className="flex items-center gap-1.5 px-1 pb-2">
                    <Film size={13} className="text-[#00FF88]" />
                    <span className="text-xs font-bold text-zinc-200">रील्स</span>
                  </div>

                  {isLoadingUserReels ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <Loader2 size={20} className="animate-spin text-[#00FF88]" />
                      <span className="text-xs">रील्स लोड हो रही हैं...</span>
                    </div>
                  ) : selectedUserReels.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {selectedUserReels.map((reel) => {
                        const thumb = getAdaptiveThumbnailUrl(reel.posterUrl || reel.videoUrl);
                        return (
                          <div
                            key={reel.id}
                            onClick={() => handleOpenReel(reel)}
                            className="relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer group border border-zinc-800/70 hover:border-[#00FF88]/60 transition-all"
                          >
                            {thumb && thumb !== reel.videoUrl ? (
                              <img
                                src={thumb}
                                alt={reel.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <video
                                src={reel.videoUrl}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white">
                              <Play size={9} className="fill-white ml-0.5" />
                            </div>
                            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold text-white drop-shadow">
                              <Eye size={10} />
                              <span>{reel.views}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                      <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2 text-zinc-500">
                        <Film size={18} />
                      </div>
                      <p className="text-xs font-semibold text-zinc-400">अभी कोई रील नहीं है</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Block Confirmation Dialog on Profile */}
            {showBlockConfirm && selectedUser && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
                <div className="w-full max-w-xs bg-[#161A1D] border border-zinc-800 rounded-2xl p-4 shadow-2xl space-y-4">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800">
                    <Ban size={18} className="text-rose-400 shrink-0" />
                    <h4 className="font-bold text-white text-sm">यूज़र को ब्लॉक करें</h4>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed">
                    क्या आप @{selectedUser.username} को ब्लॉक करना चाहते हैं? वह आपकी रीलें, स्टोरी और प्रोफ़ाइल नहीं देख पाएगा, और आप उसकी नहीं देख पाएँगे।
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
                      रद्द करें
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
                            username: selectedUser.username,
                            uid: selectedUser.uid,
                            name: selectedUser.name,
                            avatarUrl: selectedUser.avatarUrl,
                          });
                          setShowBlockConfirm(false);
                          setSelectedUser(null);
                        } finally {
                          setIsBlockingUser(false);
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {isBlockingUser ? 'ब्लॉक हो रहा है...' : 'हाँ, ब्लॉक करें'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selected User Followers / Following Modal (Privacy-Protected) */}
            {followListModalMode && (
              <FollowListModal
                isOpen={true}
                mode={followListModalMode}
                targetUid={selectedUser.uid}
                targetUsername={selectedUser.username}
                targetIsPrivate={Boolean(selectedUser.isPrivate)}
                totalCount={
                  followListModalMode === 'followers'
                    ? displayedFollowersCount
                    : displayedFollowingCount
                }
                currentUserProfile={currentUserProfile}
                blockedUsernames={blockedUsernames}
                blockedByUsernames={blockedByUsernames}
                onClose={() => setFollowListModalMode(null)}
                onToggleFollow={handleToggleFollowWithCountSync}
                onSelectUser={async (u: FollowListUser) => {
                  setFollowListModalMode(null);
                  const fullProfile = await resolveFullUserProfileForNavigation(u);
                  handleSelectUserProfile(fullProfile);
                }}
              />
            )}
          </>
        ) : (
          /* ---------------- VIEW B: REAL FIREBASE SEARCH ---------------- */
          <>
            {/* Search Input Bar */}
            <div className="p-3 border-b border-zinc-800 flex items-center gap-2 shrink-0 bg-black/50">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="रील, नाम या यूज़रनेम खोजें..."
                  className="w-full pl-8 pr-7 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      playClickSound();
                      setSearchTerm('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-zinc-800"
                    title="साफ़ करें"
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
                className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors"
              >
                बंद करें
              </button>
            </div>

            {/* Results Container */}
            <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
              {/* Section Header */}
              <div className="px-3 pt-3 pb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <Film size={13} className="text-[#00FF88]" />
                  <span className="text-[11px] font-bold text-zinc-200">
                    {trimmedTerm ? `"${trimmedTerm}" के नतीजे` : 'सबसे नई रीलें'}
                  </span>
                  {!isLoading && (
                    <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-full font-semibold">
                      {totalResultsCount}
                    </span>
                  )}
                </div>

                {trimmedTerm && (
                  <button
                    onClick={() => {
                      playClickSound();
                      setSearchTerm('');
                    }}
                    className="text-[10px] text-[#00FF88] hover:underline font-semibold"
                  >
                    साफ़ करें
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2.5 py-16 text-zinc-400">
                  <Loader2 size={24} className="animate-spin text-[#00FF88]" />
                  <p className="text-xs font-medium">Firebase से खोज रहे हैं...</p>
                </div>
              ) : totalResultsCount === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="w-16 h-16 rounded-full bg-zinc-900/90 border border-zinc-800 flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(0,255,136,0.08)]">
                    <Search size={24} className="text-zinc-500" />
                  </div>
                  <p className="text-base font-extrabold text-white mb-1">कुछ नहीं मिला</p>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-[240px]">
                    {trimmedTerm
                      ? `"${trimmedTerm}" से मेल खाती कोई रील या यूज़र नहीं मिला। कोई अन्य शब्द लिखकर देखें।`
                      : 'अभी कोई रील उपलब्ध नहीं है।'}
                  </p>
                </div>
              ) : (
                <div className="px-2.5 pb-4 space-y-4">
                  {/* Matched Users (when searching) */}
                  {visibleUserResults.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-1 pb-2">
                        <UserIcon size={12} className="text-[#00FF88]" />
                        <span className="text-[11px] font-bold text-zinc-300">यूज़र</span>
                      </div>
                      <div className="space-y-1.5">
                        {visibleUserResults.map((user) => (
                          <button
                            key={user.uid || user.username}
                            type="button"
                            onClick={() => handleSelectUserProfile(user)}
                            className="w-full p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-[#00FF88]/40 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
                          >
                            <img
                              src={
                                user.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                  user.username
                                )}`
                              }
                              alt={user.name || user.username}
                              className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0 bg-zinc-950"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-white truncate">
                                  {user.name || user.username}
                                </span>
                                {user.isBlueTick && (
                                  <CheckCircle2
                                    size={12}
                                    className="fill-[#0095F6] text-white shrink-0"
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-400 truncate">@{user.username}</p>
                            </div>
                            <ChevronRight size={16} className="text-zinc-500 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched or Newest Reels */}
                  {visibleReelResults.length > 0 && (
                    <div>
                      {visibleUserResults.length > 0 && (
                        <div className="flex items-center gap-1.5 px-1 pb-2">
                          <Film size={12} className="text-[#00FF88]" />
                          <span className="text-[11px] font-bold text-zinc-300">रील्स</span>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {visibleReelResults.map((reel) => {
                          const thumb = getAdaptiveThumbnailUrl(reel.posterUrl || reel.videoUrl);
                          return (
                            <div
                              key={reel.id}
                              onClick={() => handleOpenReel(reel)}
                              className="relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer group border border-zinc-800/60 hover:border-[#00FF88]/60 transition-all shadow-md"
                            >
                              {thumb && thumb !== reel.videoUrl ? (
                                <img
                                  src={thumb}
                                  alt={reel.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <video
                                  src={reel.videoUrl}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25" />

                              {/* Creator Handle overlay */}
                              <div className="absolute top-2 left-2 right-2 text-white">
                                <p className="text-[10px] font-bold drop-shadow truncate">
                                  @{reel.user}
                                </p>
                              </div>

                              {/* Title/Caption preview */}
                              <div className="absolute bottom-7 left-2 right-2 text-white">
                                <p className="text-[10px] text-zinc-200 line-clamp-2 leading-tight drop-shadow">
                                  {reel.title}
                                </p>
                              </div>

                              {/* Bottom-left Views Badge */}
                              <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
                                <span className="text-[#00FF88] text-[9px]">▶</span>
                                <span>{reel.views}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
