import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { X, Search, Users, Lock, Loader2, CheckCircle2 } from 'lucide-react';
import { FollowListUser, UserProfile } from '../types';
import { getFollowListPageFromFirebase } from '../firebase/services';
import { playClickSound } from '../utils/audio';

const PAGE_SIZE = 30;

interface FollowListModalProps {
  isOpen: boolean;
  mode: 'followers' | 'following';
  targetUid?: string;
  targetUsername: string;
  targetIsPrivate?: boolean;
  totalCount?: number;
  currentUserProfile?: UserProfile;
  blockedUsernames?: string[];
  blockedByUsernames?: string[];
  sentFollowRequestUsernames?: string[];
  onClose: () => void;
  onToggleFollow?: (username: string) => void;
  onRemoveFollower?: (follower: FollowListUser) => Promise<void> | void;
  onSelectUser?: (user: FollowListUser) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  mode,
  targetUid,
  targetUsername,
  targetIsPrivate = false,
  totalCount,
  currentUserProfile,
  blockedUsernames = [],
  blockedByUsernames = [],
  sentFollowRequestUsernames = [],
  onClose,
  onToggleFollow,
  onRemoveFollower,
  onSelectUser,
}) => {
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [usedFallbackOrder, setUsedFallbackOrder] = useState(false);
  const [isPrivateRestricted, setIsPrivateRestricted] = useState(false);
  const [guestNotice, setGuestNotice] = useState<string | null>(null);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);

  const requestSeqRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isGuest = Boolean(
    !currentUserProfile ||
      currentUserProfile.isGuest ||
      !currentUserProfile.uid ||
      currentUserProfile.uid === 'guest_user'
  );

  const isOwner = Boolean(
    !isGuest &&
      currentUserProfile &&
      ((currentUserProfile.uid && targetUid && currentUserProfile.uid === targetUid) ||
        (currentUserProfile.username &&
          targetUsername &&
          currentUserProfile.username === targetUsername))
  );

  const viewerIsFollowingTarget = Boolean(
    !isGuest &&
      targetUsername &&
      currentUserProfile?.followingList?.includes(targetUsername)
  );

  const blockedAllSet = React.useMemo(
    () => new Set<string>([...blockedUsernames, ...blockedByUsernames]),
    [blockedUsernames, blockedByUsernames]
  );

  // Initial page load (30 users per batch)
  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery('');
    setGuestNotice(null);
    setRemovingUsername(null);
    setUsers([]);
    setLastDoc(null);
    setHasMore(false);
    setUsedFallbackOrder(false);

    if (targetIsPrivate && !isOwner && !viewerIsFollowingTarget) {
      setIsPrivateRestricted(true);
      setIsLoading(false);
      return;
    }

    setIsPrivateRestricted(false);

    if (!targetUid && !targetUsername) {
      setIsLoading(false);
      return;
    }

    // If owner is guest, list is empty
    if (isOwner && isGuest) {
      setIsLoading(false);
      return;
    }

    const seq = ++requestSeqRef.current;
    setIsLoading(true);

    getFollowListPageFromFirebase({
      targetUid,
      targetUsername,
      type: mode,
      viewerUid: !isGuest ? currentUserProfile?.uid : undefined,
      pageSize: PAGE_SIZE,
      cursor: null,
    })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        if (res.isPrivateRestricted) {
          setIsPrivateRestricted(true);
          setUsers([]);
          setHasMore(false);
          setLastDoc(null);
          return;
        }
        setUsers(res.users);
        setLastDoc(res.lastDoc);
        setHasMore(res.hasMore);
        setUsedFallbackOrder(Boolean(res.usedFallbackOrder));
      })
      .finally(() => {
        if (seq === requestSeqRef.current) {
          setIsLoading(false);
        }
      });
  }, [
    isOpen,
    mode,
    targetUid,
    targetUsername,
    targetIsPrivate,
    isOwner,
    viewerIsFollowingTarget,
    isGuest,
    currentUserProfile?.uid,
  ]);

  const loadMore = useCallback(async () => {
    if (
      !isOpen ||
      isLoading ||
      isLoadingMore ||
      !hasMore ||
      !lastDoc ||
      isPrivateRestricted
    ) {
      return;
    }

    const seq = requestSeqRef.current;
    setIsLoadingMore(true);

    try {
      const res = await getFollowListPageFromFirebase({
        targetUid,
        targetUsername,
        type: mode,
        viewerUid: !isGuest ? currentUserProfile?.uid : undefined,
        pageSize: PAGE_SIZE,
        cursor: lastDoc,
        useFallbackOrder: usedFallbackOrder,
      });

      if (seq !== requestSeqRef.current) return;

      setUsers((prev) => {
        const seen = new Set(prev.map((u) => u.username));
        const uniqueNew = res.users.filter((u) => !seen.has(u.username));
        return [...prev, ...uniqueNew];
      });
      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } finally {
      if (seq === requestSeqRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [
    isOpen,
    isLoading,
    isLoadingMore,
    hasMore,
    lastDoc,
    isPrivateRestricted,
    targetUid,
    targetUsername,
    mode,
    isGuest,
    currentUserProfile?.uid,
    usedFallbackOrder,
  ]);

  // If user is searching in a large list (>30), load next pages automatically until matches are searched
  useEffect(() => {
    if (!isOpen || !searchQuery.trim() || !hasMore || isLoading || isLoadingMore) return;
    const timer = window.setTimeout(() => {
      void loadMore();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen, searchQuery, hasMore, isLoading, isLoadingMore, loadMore]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) {
      void loadMore();
    }
  };

  if (!isOpen) return null;

  const visibleUsers = users.filter((u) => !blockedAllSet.has(u.username));
  const trimmedSearch = searchQuery.trim().toLowerCase();
  const filteredUsers = trimmedSearch
    ? visibleUsers.filter(
        (u) =>
          u.username.toLowerCase().includes(trimmedSearch) ||
          (u.name || '').toLowerCase().includes(trimmedSearch)
      )
    : visibleUsers;

  const displayCount =
    typeof totalCount === 'number' ? Math.max(0, totalCount) : visibleUsers.length;
  const headerTitle = mode === 'followers' ? 'फ़ॉलोअर्स' : 'फ़ॉलोइंग';
  const followingSet = new Set(currentUserProfile?.followingList || []);
  const sentRequestSet = new Set(sentFollowRequestUsernames || []);

  const handleActionClick = (username: string) => {
    if (isGuest) {
      setGuestNotice('लॉगिन करें');
      setTimeout(() => setGuestNotice(null), 3000);
      return;
    }
    playClickSound();
    onToggleFollow?.(username);
  };

  const handleRemoveClick = async (follower: FollowListUser) => {
    if (!onRemoveFollower || removingUsername) return;
    playClickSound();
    setRemovingUsername(follower.username);
    try {
      await onRemoveFollower(follower);
      setUsers((prev) => prev.filter((u) => u.username !== follower.username));
    } finally {
      setRemovingUsername(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden h-[560px] max-h-[85vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={17} className="text-[#00E5FF] shrink-0" />
            <h3 className="text-sm font-bold text-white truncate">{headerTitle}</h3>
            {!isPrivateRestricted && (
              <span className="text-[11px] font-semibold bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full shrink-0">
                {displayCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="बंद करें"
          >
            <X size={18} />
          </button>
        </div>

        {/* Private Account Guard */}
        {isPrivateRestricted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">
              <Lock size={24} />
            </div>
            <p className="text-sm font-bold text-white mb-1">यह प्रोफ़ाइल प्राइवेट है</p>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-[230px]">
              प्राइवेट प्रोफ़ाइल की {headerTitle} सूची दूसरे नहीं देख सकते।
            </p>
          </div>
        ) : (
          <>
            {/* Search Box */}
            <div className="p-3 border-b border-zinc-800/60 shrink-0 bg-black/25">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="नाम या यूज़रनेम खोजें..."
                  className="w-full pl-8 pr-7 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                    aria-label="खोज साफ़ करें"
                  >
                    ✕
                  </button>
                )}
              </div>
              {guestNotice && (
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold text-center">
                  {guestNotice}
                </div>
              )}
            </div>

            {/* Scrollable List (30 per batch) */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar"
            >
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400 py-12">
                  <Loader2 size={22} className="animate-spin text-[#00FF88]" />
                  <span className="text-xs">सूची लोड हो रही है...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                    <Users size={20} />
                  </div>
                  <p className="text-sm font-bold text-zinc-300">
                    {trimmedSearch ? 'कोई नहीं मिला' : 'अभी कोई नहीं'}
                  </p>
                </div>
              ) : (
                <>
                  {filteredUsers.map((item) => {
                    const isMe = Boolean(
                      !isGuest &&
                        currentUserProfile &&
                        ((currentUserProfile.uid && item.uid && currentUserProfile.uid === item.uid) ||
                          currentUserProfile.username === item.username)
                    );
                    const isFollowingItem = followingSet.has(item.username);
                    const isSentRequestItem =
                      !isFollowingItem && Boolean(item.isPrivate) && sentRequestSet.has(item.username);
                    const isRemovingThis = removingUsername === item.username;

                    return (
                      <div
                        key={item.uid || item.username}
                        className="p-2.5 flex items-center justify-between gap-2.5 rounded-xl hover:bg-zinc-800/45 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            onSelectUser?.(item);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <img
                            src={
                              item.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                item.username
                              )}`
                            }
                            alt={item.name || item.username}
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-zinc-700 shrink-0 bg-zinc-900"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-bold text-white truncate">
                                {item.name || item.username}
                              </p>
                              {item.isBlueTick && (
                                <CheckCircle2
                                  size={12}
                                  className="fill-[#0095F6] text-white shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">
                              @{item.username}
                            </p>
                          </div>
                        </button>

                        {!isMe && mode === 'followers' && isOwner && onRemoveFollower ? (
                          <button
                            type="button"
                            disabled={isRemovingThis}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRemoveClick(item);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95 bg-black hover:bg-zinc-900 text-white border border-zinc-700 disabled:opacity-50"
                          >
                            {isRemovingThis ? '...' : 'हटाएँ'}
                          </button>
                        ) : (
                          !isMe &&
                          onToggleFollow && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick(item.username);
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                                isFollowingItem || isSentRequestItem
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700/80'
                                  : 'bg-[#00FF88] hover:bg-[#00e57a] text-black font-bold'
                              }`}
                            >
                              {isFollowingItem
                                ? 'फ़ॉलोइंग'
                                : isSentRequestItem
                                ? 'रिक्वेस्ट भेजी गई'
                                : item.isPrivate
                                ? 'रिक्वेस्ट भेजें'
                                : 'फ़ॉलो करें'}
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}

                  {isLoadingMore && (
                    <div className="py-3 flex items-center justify-center gap-2 text-zinc-400">
                      <Loader2 size={16} className="animate-spin text-[#00FF88]" />
                      <span className="text-[11px]">और लोग लोड हो रहे हैं...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
