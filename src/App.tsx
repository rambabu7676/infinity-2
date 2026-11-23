import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  MessageCircle,
  Bell,
  Search,
  Home as HomeIcon,
  User as UserIcon,
  CircleUser,
  Play,
  Upload,
  Smartphone,
  Monitor,
  Eye,
  Plus,
  Sparkles,
  Clapperboard,
  PlusSquare
} from 'lucide-react';
import { INITIAL_REELS } from './data/mockReels';
import { ActiveTab, AppLanguage, CreateMode, FeedType, ReelComment, ReelItem, StoryItem, StorySlide, UserProfile, NotificationItem, BlockedUserEntry, FollowListUser } from './types';
import { useLanguage } from './i18n/LanguageContext';
import { translations } from './i18n/translations';
import { HomeFeedView } from './components/HomeFeedView';
import { ExploreView } from './components/ExploreView';
import { ShareSheetModal } from './components/ShareSheetModal';
import { SpinWheelModal } from './components/SpinWheelModal';
import { ReelViewerModal } from './components/ReelViewerModal';
import { CameraCreateView } from './components/CameraCreateView';
import { ProfileView } from './components/ProfileView';
import { SettingsModal } from './components/SettingsModal';
import { VideoUploadModal } from './components/VideoUploadModal';
import { StoryViewerModal } from './components/StoryViewerModal';
import { StoryCreateModal } from './components/StoryCreateModal';
import { AuthModal } from './components/AuthModal';
import { MessagesModal, NotificationsModal, SearchModal } from './components/HeaderModals';
import { playClickSound, playWinChime, playLikePop } from './utils/audio';
import { RefreshResultStatus } from './hooks/usePullToRefresh';
import {
  saveReelToFirebase,
  getReelsFromFirebase,
  refreshReelsFromFirebase,
  saveStoryToFirebase,
  subscribeToStoriesFromFirebase,
  markStorySeenInFirebase,
  getSeenStoriesFromFirebase,
  filterActiveStorySlides,
  getLatestSlideTimestamp,
  STORY_TTL_MS,
  savePostToFirebase,
  saveUserProfileToFirebase,
  getUserProfileFromFirebase,
  updateUserProfileDetailsInFirebase,
  reportReelInFirebase,
  toggleReelLikeInFirebase,
  toggleReelDislikeInFirebase,
  toggleSavedReelInFirebase,
  toggleFollowUserInFirebase,
  getUserInteractionsFromFirebase,
  saveReelCommentToFirebase,
  getAllReelsCommentsFromFirebase,
  subscribeToReelComments,
  getReelsByIdsFromFirebase,
  createUserNotificationInFirebase,
  subscribeToUserNotifications,
  markAllNotificationsReadInFirebase,
  CreatorLikeContentItem,
  subscribeToCreatorLikesInFirebase,
  deactivateUserAccountInFirebase,
  reactivateUserAccountInFirebase,
  scheduleAccountDeletionInFirebase,
  cancelAccountDeletionInFirebase,
  permanentlyDeleteUserAccountInFirebase,
  blockUserInFirebase,
  unblockUserInFirebase,
  subscribeToUserBlockedList,
  subscribeToBlockedByUsers,
  subscribeToUserFollowCounts,
  resolveFullUserProfileForNavigation,
  updateReelCaptionInFirebase,
  deleteReelAndAssociatedDataFromFirebase,
  updateUserPostsCountInFirebase,
  saveUserLanguageToFirebase,
} from './firebase/services';
import {
  subscribeToAuthState,
  fetchUserProfile,
  logOutUser,
  createGuestProfile,
  reauthenticateWithGoogleForAccountAction,
  deleteFirebaseAuthUserIfSignedIn,
  isGoogleReauthInProgress,
} from './firebase/authService';

export default function App() {
  const { language, setLanguage, t } = useLanguage();
  const languageRef = useRef<AppLanguage>(language);
  languageRef.current = language;
  const userChangedLanguageLocallyRef = useRef<boolean>(false);
  const syncedLangUidRef = useRef<string | null>(null);

  // Navigation & Screen States
  const MAIN_SWIPE_TABS: readonly ('Home' | 'Create' | 'Profile')[] = ['Home', 'Create', 'Profile'];
  const [activeTab, setActiveTab] = useState<ActiveTab>('Home'); // Home | Search | Create | Reels | Profile
  const [pageSlideDirection, setPageSlideDirection] = useState<'forward' | 'backward' | null>(null);
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const pageSwipeTouchRef = useRef<{ startX: number; startY: number; blocked: boolean } | null>(null);
  const [feedType, setFeedType] = useState<FeedType>('ForYou'); // ForYou | Following
  const [createMode, setCreateMode] = useState<CreateMode>('Reel'); // Post | Story | Reel | Live

  // View Layout Mode (Mobile Device Frame vs Wide Responsive)
  const [isMobileFrame, setIsMobileFrame] = useState(true);

  // Modals & Selected Items
  const [selectedVideo, setSelectedVideo] = useState<ReelItem | null>(null);
  const [shareSheetReel, setShareSheetReel] = useState<ReelItem | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [spinModalVisible, setSpinModalVisible] = useState(false);
  const [videoUploadModalVisible, setVideoUploadModalVisible] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserEntry[]>([]);
  const [blockedByUsernames, setBlockedByUsernames] = useState<string[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchInitialUser, setSearchInitialUser] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  // Creator All Likes real-time list from Firebase (reels + posts)
  const [firebaseCreatorLikeItems, setFirebaseCreatorLikeItems] = useState<CreatorLikeContentItem[]>([]);

  // Story System States (Real Firebase stories only — no mock stories)
  const [firebaseStories, setFirebaseStories] = useState<StoryItem[]>([]);
  const [seenStoriesMap, setSeenStoriesMap] = useState<Record<string, number>>({});
  const [storyNowTick, setStoryNowTick] = useState<number>(() => Date.now());
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyCreateOpen, setStoryCreateOpen] = useState(false);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // Empty Profile Template (cleared on initial unauthenticated load & on logout)
  const EMPTY_PROFILE: UserProfile = {
    uid: undefined,
    email: undefined,
    phone: undefined,
    name: '',
    username: '',
    postsCount: 0,
    followers: 0,
    following: 0,
    isBlueTick: false,
    isPremium: false,
    referralCode: '',
    successfulReferrals: 0,
    dailyFollows: 0,
    avatarUrl: '',
    bio: '',
    isPrivate: false,
    totalLikes: 0,
    totalViews: 0,
    followingList: [],
    isGuest: false,
  };

  // User Profile Data (starts empty until user logs in or chooses Guest)
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const userProfileRef = useRef<UserProfile>(userProfile);
  userProfileRef.current = userProfile;

  const handleChangeLanguage = (nextLang: AppLanguage) => {
    userChangedLanguageLocallyRef.current = true;
    setLanguage(nextLang);
    const current = userProfileRef.current;
    if (!current.isGuest && current.uid && current.uid !== 'guest_user') {
      const updated = { ...current, preferredLanguage: nextLang };
      setUserProfile((prev) =>
        prev.uid === current.uid && !prev.isGuest
          ? { ...prev, preferredLanguage: nextLang }
          : prev
      );
      void saveUserLanguageToFirebase(updated, nextLang);
    }
  };

  const syncLanguageAfterSignIn = (resolvedProfile: UserProfile): UserProfile => {
    const uid = resolvedProfile.uid;
    if (!uid || resolvedProfile.isGuest || uid === 'guest_user') {
      return resolvedProfile;
    }

    if (syncedLangUidRef.current === uid) {
      return {
        ...resolvedProfile,
        preferredLanguage: languageRef.current,
      };
    }

    syncedLangUidRef.current = uid;

    if (userChangedLanguageLocallyRef.current) {
      userChangedLanguageLocallyRef.current = false;
      const chosenLang = languageRef.current;
      const updated = { ...resolvedProfile, preferredLanguage: chosenLang };
      void saveUserLanguageToFirebase(updated, chosenLang);
      return updated;
    }

    const dbLang = resolvedProfile.preferredLanguage;
    if (dbLang === 'hi' || dbLang === 'en') {
      setLanguage(dbLang);
      return resolvedProfile;
    }

    const activeLang = languageRef.current;
    const updated = { ...resolvedProfile, preferredLanguage: activeLang };
    void saveUserLanguageToFirebase(updated, activeLang);
    return updated;
  };

  const [diamonds, setDiamonds] = useState(0);
  const [reels, setReels] = useState<ReelItem[]>(() =>
    INITIAL_REELS.map((r) => ({ ...r, isLiked: false, isDisliked: false, isSaved: false, isFollowing: false }))
  );
  const [reelsHydratedFromDb, setReelsHydratedFromDb] = useState(false);
  const reelsRef = useRef<ReelItem[]>(reels);
  reelsRef.current = reels;
  const INITIAL_REEL_IDS = React.useMemo(() => new Set(INITIAL_REELS.map((r) => r.id)), []);
  const syncedPostsCountUidRef = useRef<string | null>(null);

  // Sync saved Reels and Auth State from Firebase
  useEffect(() => {
    const initFirebaseData = async () => {
      try {
        const savedReels = await getReelsFromFirebase();

        if (savedReels && savedReels.length > 0) {
          setReels((prev) => {
            const sanitizedSaved = savedReels.map((r) => ({
              ...r,
              isLiked: false,
              isDisliked: false,
              isSaved: false,
              isFollowing: false,
            }));
            const savedIds = new Set(sanitizedSaved.map((r) => r.id));
            const remaining = prev.filter((r) => !savedIds.has(r.id));
            return [...sanitizedSaved, ...remaining];
          });
        }
      } catch (err) {
        console.warn('Could not load data from Firebase:', err);
      } finally {
        setReelsHydratedFromDb(true);
      }
    };
    initFirebaseData();

    // Listen for Firebase Auth user state changes
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (isGoogleReauthInProgress()) {
        return;
      }
      if (user) {
        try {
          const profile = await fetchUserProfile(user.uid);
          const fallbackUsername = (user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '');

          const candidateProfile: UserProfile = profile
            ? {
                ...EMPTY_PROFILE,
                ...profile,
                uid: user.uid,
                email: user.email || profile.email,
              }
            : {
                ...EMPTY_PROFILE,
                uid: user.uid,
                email: user.email || undefined,
                name: user.displayName || fallbackUsername,
                username: fallbackUsername,
                avatarUrl:
                  user.photoURL ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${fallbackUsername}`,
              };

          const resolved = await resolveAccountStatusOnSignIn(candidateProfile);
          if (resolved.action === 'deleted') {
            return;
          }

          const langSyncedProfile = syncLanguageAfterSignIn(resolved.profile);
          setUserProfile(langSyncedProfile);
          setHasEnteredApp(true);
          setAuthModalOpen(false);
          if (resolved.toastTitle && resolved.toastDesc) {
            showToast(resolved.toastTitle, resolved.toastDesc);
          }
        } catch (err) {
          console.warn('Could not sync user profile on auth change:', err);
          setUserProfile((prev) => ({
            ...prev,
            uid: user.uid,
            email: user.email || undefined,
          }));
          setHasEnteredApp(true);
          setAuthModalOpen(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user's Likes, Saved reels, and Following list from Firebase subcollections
  useEffect(() => {
    const uid = userProfile.uid;
    if (!uid || userProfile.isGuest) return;

    let isCancelled = false;
    const loadUserInteractions = async () => {
      const currentReelIds = reelsRef.current.map((r) => r.id);
      const { likedReelIds, savedReelIds, dislikedReelIds, followingUsernames } =
        await getUserInteractionsFromFirebase(uid, currentReelIds);

      if (isCancelled) return;

      const followingSet = new Set(followingUsernames);
      const existingIds = new Set(reelsRef.current.map((r) => r.id));
      const missingSavedIds = Array.from(savedReelIds).filter((id) => !existingIds.has(id));
      const extraSavedReels =
        missingSavedIds.length > 0 ? await getReelsByIdsFromFirebase(missingSavedIds) : [];

      if (isCancelled) return;

      setReels((prev) => {
        const updatedPrev = prev.map((r) => ({
          ...r,
          isLiked: likedReelIds.has(r.id),
          isDisliked: dislikedReelIds.has(r.id),
          isSaved: savedReelIds.has(r.id),
          isFollowing: followingSet.has(r.user),
        }));
        if (extraSavedReels.length === 0) return updatedPrev;
        const prevIds = new Set(updatedPrev.map((r) => r.id));
        const normalizedExtra = extraSavedReels
          .filter((r) => !prevIds.has(r.id))
          .map((r) => ({
            ...r,
            isLiked: likedReelIds.has(r.id),
            isDisliked: dislikedReelIds.has(r.id),
            isSaved: true,
            isFollowing: followingSet.has(r.user),
          }));
        return [...updatedPrev, ...normalizedExtra];
      });

      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              isLiked: likedReelIds.has(prev.id),
              isDisliked: dislikedReelIds.has(prev.id),
              isSaved: savedReelIds.has(prev.id),
              isFollowing: followingSet.has(prev.user),
            }
          : null
      );

      setUserProfile((prev) => {
        if (prev.uid !== uid || prev.isGuest) return prev;
        return {
          ...prev,
          followingList: followingUsernames,
          following: followingUsernames.length,
        };
      });
    };

    loadUserInteractions();
    return () => {
      isCancelled = true;
    };
  }, [userProfile.uid, userProfile.isGuest, reelsHydratedFromDb]);

  // Subscribe to real-time followers & following counts for the logged-in user
  useEffect(() => {
    const uid = userProfile.uid;
    if (!uid || userProfile.isGuest || uid === 'guest_user') {
      return;
    }

    const unsubscribe = subscribeToUserFollowCounts(uid, (counts) => {
      setUserProfile((prev) => {
        if (prev.uid !== uid || prev.isGuest) return prev;
        if (prev.followers === counts.followers && prev.following === counts.following) {
          return prev;
        }
        return {
          ...prev,
          followers: counts.followers,
          following: counts.following,
        };
      });
    });

    return () => unsubscribe();
  }, [userProfile.uid, userProfile.isGuest]);

  // Subscribe to real-time notifications for the logged-in user
  useEffect(() => {
    const uid = userProfile.uid;
    if (!uid || userProfile.isGuest || uid === 'guest_user') {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToUserNotifications(uid, (items) => {
      setNotifications(items);
    });

    return () => unsubscribe();
  }, [userProfile.uid, userProfile.isGuest]);

  const blockedByMeUsernames = React.useMemo(
    () => blockedUsers.map((b) => b.blockedUsername).filter(Boolean),
    [blockedUsers]
  );

  const allBlockedUsernamesSet = React.useMemo(
    () => new Set<string>([...blockedByMeUsernames, ...blockedByUsernames]),
    [blockedByMeUsernames, blockedByUsernames]
  );

  // Subscribe to users I blocked & users who blocked me from Firebase
  useEffect(() => {
    const uid = userProfile.uid;
    const uname = (userProfile.username || '').trim();
    if (!uid || userProfile.isGuest || uid === 'guest_user') {
      setBlockedUsers([]);
      setBlockedByUsernames([]);
      return;
    }

    const unsubBlocked = subscribeToUserBlockedList(uid, (items) => {
      setBlockedUsers(items);
    });
    const unsubBlockedBy = subscribeToBlockedByUsers(uid, uname, (blockers) => {
      setBlockedByUsernames(blockers);
    });

    return () => {
      unsubBlocked();
      unsubBlockedBy();
    };
  }, [userProfile.uid, userProfile.username, userProfile.isGuest]);

  // Enforce mutual unfollow whenever block list changes (from either side)
  useEffect(() => {
    if (allBlockedUsernamesSet.size === 0) return;
    const uid = userProfile.uid;
    const currentFollowing = userProfile.followingList || [];
    const toUnfollow = currentFollowing.filter((u) => allBlockedUsernamesSet.has(u));

    if (toUnfollow.length > 0) {
      setUserProfile((prev) => {
        const nextList = (prev.followingList || []).filter((u) => !allBlockedUsernamesSet.has(u));
        return {
          ...prev,
          followingList: nextList,
          following: nextList.length,
        };
      });

      if (uid && !userProfile.isGuest && uid !== 'guest_user') {
        toUnfollow.forEach((uname) => {
          void toggleFollowUserInFirebase(uname, uid, false);
        });
      }
    }

    setReels((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (r.isFollowing && allBlockedUsernamesSet.has(r.user)) {
          changed = true;
          return { ...r, isFollowing: false };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [allBlockedUsernamesSet, userProfile.uid, userProfile.isGuest, userProfile.followingList]);

  // Close currently open reel viewer if its creator gets blocked
  useEffect(() => {
    if (selectedVideo && allBlockedUsernamesSet.has(selectedVideo.user)) {
      setSelectedVideo(null);
    }
  }, [selectedVideo, allBlockedUsernamesSet]);

  // Subscribe to real-time active stories (<24h) from Firebase and auto-expire every minute
  useEffect(() => {
    const unsubscribe = subscribeToStoriesFromFirebase((loadedStories) => {
      setFirebaseStories(loadedStories);
      setStoryNowTick(Date.now());
    });

    const expiryTimer = window.setInterval(() => {
      setStoryNowTick(Date.now());
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(expiryTimer);
    };
  }, []);

  // Load seen stories map for the logged-in user
  useEffect(() => {
    const uid = userProfile.uid;
    if (!uid || userProfile.isGuest || uid === 'guest_user') {
      setSeenStoriesMap({});
      return;
    }

    let isCancelled = false;
    getSeenStoriesFromFirebase(uid).then((map) => {
      if (!isCancelled) {
        setSeenStoriesMap(map);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [userProfile.uid, userProfile.isGuest]);

  // Subscribe to real-time likes across all reels & posts owned by the logged-in user
  useEffect(() => {
    const uname = (userProfile.username || '').trim();
    if (!uname || userProfile.isGuest || userProfile.uid === 'guest_user') {
      setFirebaseCreatorLikeItems([]);
      return;
    }

    const unsubscribe = subscribeToCreatorLikesInFirebase(uname, (items) => {
      setFirebaseCreatorLikeItems(items);

      // Sync remote likesCount updates onto matching reels in state
      if (items.length > 0) {
        const countsById = new Map(items.map((item) => [item.id, item]));
        setReels((prev) =>
          prev.map((r) => {
            const match = countsById.get(r.id);
            if (!match || match.likesCount === r.likesCount) return r;
            return {
              ...r,
              likesCount: match.likesCount,
              likes: formatCompactCount(match.likesCount),
            };
          })
        );
      }
    });

    return () => unsubscribe();
  }, [userProfile.username, userProfile.isGuest, userProfile.uid]);

  const mergeCommentsList = (
    dbComments: ReelComment[],
    existingComments: ReelComment[] = []
  ): ReelComment[] => {
    const dbIds = new Set(dbComments.map((c) => c.id));
    const remaining = existingComments.filter((c) => !dbIds.has(c.id));
    return [...dbComments, ...remaining];
  };

  // Load persisted comments for all reels on app boot
  useEffect(() => {
    if (!reelsHydratedFromDb) return;
    let isCancelled = false;

    const loadAllComments = async () => {
      const reelIds = reelsRef.current.map((r) => r.id);
      const commentsByReel = await getAllReelsCommentsFromFirebase(reelIds);
      if (isCancelled || Object.keys(commentsByReel).length === 0) return;

      setReels((prev) =>
        prev.map((r) => {
          const dbComments = commentsByReel[r.id];
          if (!dbComments || dbComments.length === 0) return r;
          const merged = mergeCommentsList(dbComments, r.commentsList);
          return {
            ...r,
            commentsList: merged,
            comments: /^\d+$/.test(r.comments || '') ? String(merged.length) : r.comments,
          };
        })
      );

      setSelectedVideo((prev) => {
        if (!prev) return null;
        const dbComments = commentsByReel[prev.id];
        if (!dbComments || dbComments.length === 0) return prev;
        const merged = mergeCommentsList(dbComments, prev.commentsList);
        return {
          ...prev,
          commentsList: merged,
          comments: /^\d+$/.test(prev.comments || '') ? String(merged.length) : prev.comments,
        };
      });
    };

    loadAllComments();
    return () => {
      isCancelled = true;
    };
  }, [reelsHydratedFromDb]);

  // Subscribe to realtime comments while viewing a reel so other users' comments appear live
  useEffect(() => {
    const reelId = selectedVideo?.id;
    if (!reelId) return;

    const unsubscribe = subscribeToReelComments(reelId, (dbComments) => {
      setReels((prev) =>
        prev.map((r) => {
          if (r.id !== reelId) return r;
          const merged = mergeCommentsList(dbComments, r.commentsList);
          return {
            ...r,
            commentsList: merged,
            comments: /^\d+$/.test(r.comments || '') ? String(merged.length) : r.comments,
          };
        })
      );

      setSelectedVideo((prev) => {
        if (!prev || prev.id !== reelId) return prev;
        const merged = mergeCommentsList(dbComments, prev.commentsList);
        return {
          ...prev,
          commentsList: merged,
          comments: /^\d+$/.test(prev.comments || '') ? String(merged.length) : prev.comments,
        };
      });
    });

    return () => unsubscribe();
  }, [selectedVideo?.id]);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 🎲 WEIGHTED SPIN LOGIC: 80% (10 to 50) | 20% (60 to 100)
  const handleSpinWin = (win: number) => {
    setDiamonds((prev) => prev + win);
    showToast(t.toasts.spinWinTitle, t.toasts.spinWinDesc(win));
  };

  // 👥 Referral Simulation (5 = Blue Tick | 6 = Premium)
  const handleSimulateReferral = () => {
    playClickSound();
    const nextCount = userProfile.successfulReferrals + 1;
    let blue = userProfile.isBlueTick;
    let gold = userProfile.isPremium;

    if (nextCount >= 5) blue = true;
    if (nextCount >= 6) gold = true;

    setUserProfile((prev) => ({
      ...prev,
      successfulReferrals: nextCount,
      isBlueTick: blue,
      isPremium: gold,
    }));

    setDiamonds((prev) => prev + 10);
    playWinChime();

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#00FF88', '#FFD700', '#FFFFFF'],
      });
    } catch {
      // fallback
    }

    let milestoneNote = '';
    if (nextCount === 5) {
      milestoneNote = t.toasts.blueTickUnlockedNote;
    } else if (nextCount === 6) {
      milestoneNote = t.toasts.goldenThemeUnlockedNote;
    }

    showToast(
      t.toasts.referralTitle,
      t.toasts.referralDesc(nextCount, milestoneNote)
    );
  };

  const handleLogout = async () => {
    setSettingsVisible(false);
    setSelectedVideo(null);
    setShareSheetReel(null);
    setSpinModalVisible(false);
    setVideoUploadModalVisible(false);
    setMessagesVisible(false);
    setNotificationsVisible(false);
    setSearchVisible(false);
    setSearchInitialUser(null);
    setStoryViewerOpen(false);
    setStoryCreateOpen(false);
    try {
      await logOutUser();
    } catch {
      // ignore signOut errors and still clear local profile
    }
    syncedLangUidRef.current = null;
    userChangedLanguageLocallyRef.current = false;
    setUserProfile(EMPTY_PROFILE);
    setNotifications([]);
    setBlockedUsers([]);
    setBlockedByUsernames([]);
    setSeenStoriesMap({});
    setReels((prev) =>
      prev.map((r) => ({ ...r, isLiked: false, isDisliked: false, isSaved: false, isFollowing: false }))
    );
    setDiamonds(0);
    setActiveTab('Home');
    setHasEnteredApp(false);
    setAuthModalOpen(true);
    showToast(t.toasts.logoutTitle, t.toasts.logoutDesc);
  };

  const formatCompactCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    }
    return `${count}`;
  };

  // Likes, saves, comments, follow interactions
  const handleToggleLike = (reelId: string) => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.toasts.likeLoginTitle, t.toasts.likeLoginDesc);
      return;
    }

    const targetReel = reels.find((r) => r.id === reelId);
    if (!targetReel) return;

    const nextIsLiked = !targetReel.isLiked;
    const nextLikesCount = nextIsLiked
      ? targetReel.likesCount + 1
      : Math.max(0, targetReel.likesCount - 1);
    const formattedLikes = formatCompactCount(nextLikesCount);

    const shouldRemoveDislike = nextIsLiked && Boolean(targetReel.isDisliked);
    const nextDislikesCount = shouldRemoveDislike
      ? Math.max(0, (targetReel.dislikesCount || 0) - 1)
      : targetReel.dislikesCount;

    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? {
              ...r,
              isLiked: nextIsLiked,
              likesCount: nextLikesCount,
              likes: formattedLikes,
              ...(shouldRemoveDislike
                ? { isDisliked: false, dislikesCount: nextDislikesCount }
                : {}),
            }
          : r
      )
    );
    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              isLiked: nextIsLiked,
              likesCount: nextLikesCount,
              likes: formattedLikes,
              ...(shouldRemoveDislike
                ? { isDisliked: false, dislikesCount: nextDislikesCount }
                : {}),
            }
          : null
      );
    }

    void toggleReelLikeInFirebase(
      targetReel,
      userProfile.uid,
      nextIsLiked,
      nextLikesCount,
      formattedLikes
    );

    if (shouldRemoveDislike) {
      void toggleReelDislikeInFirebase(
        targetReel,
        userProfile.uid,
        false,
        nextDislikesCount || 0
      );
    }

    if (nextIsLiked && targetReel.user !== userProfile.username) {
      void createUserNotificationInFirebase({
        type: 'like',
        actor: userProfile,
        targetUsername: targetReel.user,
        reel: targetReel,
      });
    }
  };

  const handleToggleSave = (reelId: string) => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.toasts.saveLoginTitle, t.toasts.saveLoginDesc);
      return;
    }

    const targetReel = reels.find((r) => r.id === reelId);
    const nextIsSaved = targetReel ? !targetReel.isSaved : true;

    setReels((prev) =>
      prev.map((r) => (r.id === reelId ? { ...r, isSaved: nextIsSaved } : r))
    );
    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) => (prev ? { ...prev, isSaved: nextIsSaved } : null));
    }
    showToast(
      nextIsSaved ? t.toasts.savedTitle : t.toasts.unsavedTitle,
      nextIsSaved ? t.toasts.savedDesc : t.toasts.unsavedDesc
    );

    void toggleSavedReelInFirebase(reelId, userProfile.uid, nextIsSaved);
  };

  const handleToggleFollow = (username: string) => {
    if (userProfile.isGuest || !userProfile.uid) {
      showToast(t.toasts.followLoginTitle, t.toasts.followLoginDesc);
      return;
    }
    if (allBlockedUsernamesSet.has(username)) {
      return;
    }

    playClickSound();
    const targetReel = reels.find((r) => r.user === username);
    const isCurrentlyFollowing = targetReel
      ? Boolean(targetReel.isFollowing)
      : (userProfile.followingList || []).includes(username);
    const willFollow = !isCurrentlyFollowing;

    setReels((prev) =>
      prev.map((r) => (r.user === username ? { ...r, isFollowing: willFollow } : r))
    );

    if (selectedVideo && selectedVideo.user === username) {
      setSelectedVideo((prev) => (prev ? { ...prev, isFollowing: willFollow } : null));
    }

    setUserProfile((prev) => {
      const currentList = prev.followingList || [];
      const updatedList = willFollow
        ? currentList.includes(username)
          ? currentList
          : [...currentList, username]
        : currentList.filter((u) => u !== username);

      return {
        ...prev,
        dailyFollows: willFollow ? Math.min(200, prev.dailyFollows + 1) : prev.dailyFollows,
        following: updatedList.length,
        followingList: updatedList,
      };
    });

    showToast(
      willFollow ? t.toasts.followTitle : t.toasts.unfollowTitle,
      willFollow ? t.toasts.followDesc(username) : t.toasts.unfollowDesc(username)
    );

    void toggleFollowUserInFirebase(username, userProfile.uid, willFollow, userProfile);

    if (willFollow && username !== userProfile.username) {
      void createUserNotificationInFirebase({
        type: 'follow',
        actor: userProfile,
        targetUsername: username,
      });
    }
  };

  const handleAddComment = (reelId: string, commentText: string) => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.toasts.commentLoginTitle, t.toasts.commentLoginDesc);
      return;
    }

    const cleanText = commentText.trim();
    if (!cleanText) return;

    const targetReel =
      reels.find((r) => r.id === reelId) ||
      (selectedVideo?.id === reelId ? selectedVideo : undefined);

    if (targetReel && allBlockedUsernamesSet.has(targetReel.user)) {
      showToast(t.toasts.commentBlockedTitle, t.toasts.commentBlockedDesc);
      return;
    }

    const commentAuthor = userProfile.username || userProfile.name || 'user';
    const newComment: ReelComment = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user: commentAuthor,
      avatar:
        userProfile.avatarUrl ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(commentAuthor)}`,
      text: cleanText,
      timeAgo: 'Just now',
      likes: 0,
    };

    const existingCount = targetReel?.commentsList?.length || 0;
    const nextCommentsStr =
      targetReel && /^\d+$/.test(targetReel.comments || '')
        ? String(Math.max(Number(targetReel.comments) + 1, existingCount + 1))
        : undefined;

    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const updatedList = [newComment, ...(r.commentsList || [])];
          return {
            ...r,
            commentsList: updatedList,
            ...(nextCommentsStr !== undefined ? { comments: nextCommentsStr } : {}),
          };
        }
        return r;
      })
    );

    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              commentsList: [newComment, ...(prev.commentsList || [])],
              ...(nextCommentsStr !== undefined ? { comments: nextCommentsStr } : {}),
            }
          : null
      );
    }

    if (targetReel) {
      void saveReelCommentToFirebase(targetReel, newComment, userProfile.uid, nextCommentsStr);
      if (targetReel.user !== userProfile.username) {
        void createUserNotificationInFirebase({
          type: 'comment',
          actor: userProfile,
          targetUsername: targetReel.user,
          reel: targetReel,
          commentText: cleanText,
        });
      }
    }

    showToast(t.toasts.commentPostedTitle, t.toasts.commentPostedDesc(selectedVideo?.user || 'reel'));
  };

  // 👎 Dislike Reel
  const handleDislikeReel = (reelId: string) => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.common.loginRequiredTitle, t.common.pleaseLogin);
      return;
    }

    const targetReel =
      reels.find((r) => r.id === reelId) ||
      (selectedVideo?.id === reelId ? selectedVideo : undefined);
    if (!targetReel) return;

    playClickSound();
    const nextDisliked = !targetReel.isDisliked;
    const currentDislikes = targetReel.dislikesCount || 0;
    const nextDislikesCount = nextDisliked
      ? currentDislikes + 1
      : Math.max(0, currentDislikes - 1);

    const shouldRemoveLike = nextDisliked && Boolean(targetReel.isLiked);
    const nextLikesCount = shouldRemoveLike
      ? Math.max(0, targetReel.likesCount - 1)
      : targetReel.likesCount;
    const formattedLikes = shouldRemoveLike
      ? formatCompactCount(nextLikesCount)
      : targetReel.likes;

    setReels((prev) =>
      prev.map((r) =>
        r.id === reelId
          ? {
              ...r,
              isDisliked: nextDisliked,
              dislikesCount: nextDislikesCount,
              ...(shouldRemoveLike
                ? { isLiked: false, likesCount: nextLikesCount, likes: formattedLikes }
                : {}),
            }
          : r
      )
    );

    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) =>
        prev
          ? {
              ...prev,
              isDisliked: nextDisliked,
              dislikesCount: nextDislikesCount,
              ...(shouldRemoveLike
                ? { isLiked: false, likesCount: nextLikesCount, likes: formattedLikes }
                : {}),
            }
          : null
      );
    }

    void toggleReelDislikeInFirebase(
      targetReel,
      userProfile.uid,
      nextDisliked,
      nextDislikesCount
    );

    if (shouldRemoveLike) {
      void toggleReelLikeInFirebase(
        targetReel,
        userProfile.uid,
        false,
        nextLikesCount,
        formattedLikes
      );
    }
  };

  // ⚠️ Report Reel & 7-Reports Auto-Hide
  const handleReportReel = async (reelId: string, reason: string) => {
    let isHidden = false;
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const count = (r.reportsCount || 0) + 1;
          const autoHide = count >= 7;
          if (autoHide) isHidden = true;
          return {
            ...r,
            reportsCount: count,
            isAutoHidden: autoHide,
          };
        }
        return r;
      })
    );

    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) => {
        if (!prev) return null;
        const count = (prev.reportsCount || 0) + 1;
        return {
          ...prev,
          reportsCount: count,
          isAutoHidden: count >= 7,
        };
      });
    }

    try {
      await reportReelInFirebase(reelId, userProfile.uid || 'anonymous', reason);
    } catch (err) {
      console.warn('Could not record report in Firebase:', err);
    }

    if (isHidden) {
      showToast(t.toasts.reportSafetyTitle, t.toasts.reportSafetyDesc);
    } else {
      showToast(t.toasts.reportSavedTitle, t.toasts.reportSavedDesc);
    }
  };

  // 👑 Royal Gold VIP Theme Toggle
  const handleToggleGoldenTheme = () => {
    playClickSound();
    setUserProfile((prev) => {
      const next = { ...prev, goldenThemeEnabled: !prev.goldenThemeEnabled };
      saveUserProfileToFirebase(next);
      return next;
    });
  };

  // 👤 Guest Mode Handler
  const handleContinueAsGuest = () => {
    playClickSound();
    const guestProfile = createGuestProfile();
    setUserProfile(guestProfile);
    setHasEnteredApp(true);
    setActiveTab('Home');
    setAuthModalOpen(false);
    showToast(t.toasts.guestActiveTitle, t.toasts.guestActiveDesc);
  };

  // Media Upload & Publishing (Reels and Posts)
  const handlePublishReel = async (newReel: ReelItem, format: 'Reel' | 'Post' = 'Reel') => {
    const isRealUser = Boolean(!userProfile.isGuest && userProfile.uid && userProfile.uid !== 'guest_user');
    const reelWithTimestamp: ReelItem = {
      ...newReel,
      ...(isRealUser && userProfile.uid ? { uid: userProfile.uid } : {}),
      timestamp: newReel.timestamp || Date.now(),
      createdAt: newReel.createdAt || 'Just now',
    };
    const nextPostsCount = Math.max(0, userProfile.postsCount || 0) + 1;
    setReels((prev) => [reelWithTimestamp, ...prev]);
    setUserProfile((prev) => ({
      ...prev,
      postsCount: Math.max(0, prev.postsCount || 0) + 1,
    }));
    setActiveTab('Home');
    showToast(t.toasts.publishedTitle, t.toasts.publishedDesc(format));

    try {
      if (format === 'Post') {
        const isImg = Boolean(
          reelWithTimestamp.cloudinary?.resourceType === 'image' ||
          reelWithTimestamp.videoUrl?.match(/\.(jpg|jpeg|png|webp)/i)
        );
        await savePostToFirebase(
          {
            id: reelWithTimestamp.id,
            ...(reelWithTimestamp.uid ? { uid: reelWithTimestamp.uid } : {}),
            caption: reelWithTimestamp.title,
            user: reelWithTimestamp.user,
            userAvatar: reelWithTimestamp.userAvatar,
            mediaUrl: reelWithTimestamp.videoUrl,
            mediaType: isImg ? 'image' : 'video',
            posterUrl: reelWithTimestamp.posterUrl,
            likesCount: reelWithTimestamp.likesCount,
            commentsCount: 0,
            timestamp: reelWithTimestamp.timestamp || Date.now(),
            createdAt: reelWithTimestamp.createdAt || 'Just now',
            cloudinary: reelWithTimestamp.cloudinary,
          },
          reelWithTimestamp.cloudinary
        );
      }
      // Also persist to reels collection and update postsCount
      await saveReelToFirebase(reelWithTimestamp, reelWithTimestamp.cloudinary);
      if (isRealUser) {
        await updateUserPostsCountInFirebase(userProfile, nextPostsCount);
      }
    } catch (err) {
      console.warn('Firebase persist warning:', err);
    }
  };

  // Story System Derived Data & Handlers (24h expiry, follow-only, unseen ring, owner-only delete, guest guard)
  const isGuestUser = Boolean(
    userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user'
  );
  const myUid = !isGuestUser && userProfile.uid ? userProfile.uid : '';

  const myDbStory = myUid
    ? firebaseStories.find((s) => s.userId === myUid || s.id === myUid)
    : undefined;
  const myActiveSlides = myDbStory
    ? filterActiveStorySlides(myDbStory.slides, storyNowTick)
    : [];
  const myLatestSlideTs = getLatestSlideTimestamp(myActiveSlides);
  const mySeenSlideTs = myUid ? seenStoriesMap[myUid] || 0 : 0;

  const myStoryItem: StoryItem = {
    id: myUid || 'my_story',
    userId: myUid,
    username: userProfile.username || t.home.yourStory,
    userAvatar: userProfile.avatarUrl || '',
    isMyStory: true,
    hasUnseen: myActiveSlides.length > 0 && myLatestSlideTs > mySeenSlideTs,
    timestamp: myLatestSlideTs,
    slides: myActiveSlides,
  };

  const followingSet = new Set(userProfile.followingList || []);
  const followedStoryItems: StoryItem[] = isGuestUser
    ? []
    : firebaseStories
        .filter((s) => {
          if (s.userId === myUid || s.id === myUid) return false;
          if (allBlockedUsernamesSet.has(s.username)) return false;
          if (!followingSet.has(s.username)) return false;
          return filterActiveStorySlides(s.slides, storyNowTick).length > 0;
        })
        .map((s) => {
          const activeSlides = filterActiveStorySlides(s.slides, storyNowTick);
          const latestTs = getLatestSlideTimestamp(activeSlides);
          const seenTs = seenStoriesMap[s.id] || 0;
          return {
            ...s,
            isMyStory: false,
            slides: activeSlides,
            timestamp: latestTs,
            hasUnseen: latestTs > seenTs,
          };
        })
        .sort((a, b) => {
          if (Boolean(a.hasUnseen) !== Boolean(b.hasUnseen)) {
            return a.hasUnseen ? -1 : 1;
          }
          return (b.timestamp || 0) - (a.timestamp || 0);
        });

  const trayStories: StoryItem[] = [myStoryItem, ...followedStoryItems];
  const viewableStories: StoryItem[] = trayStories.filter((s) => s.slides.length > 0);

  const handleOpenStoryCreate = () => {
    playClickSound();
    if (isGuestUser) {
      showToast(t.common.loginRequiredTitle, t.toasts.storyLoginDesc);
      return;
    }
    setStoryCreateOpen(true);
  };

  const handleOpenStory = (index: number) => {
    playClickSound();
    const story = trayStories[index];
    if (!story) return;
    if (story.isMyStory && story.slides.length === 0) {
      if (isGuestUser) {
        showToast(t.common.loginRequiredTitle, t.toasts.storyLoginDesc);
        return;
      }
      setStoryCreateOpen(true);
      return;
    }

    const viewerIdx = viewableStories.findIndex((s) => s.id === story.id);
    if (viewerIdx >= 0) {
      setActiveStoryIndex(viewerIdx);
      setStoryViewerOpen(true);
    }
  };

  const handleMarkStorySeen = (story: StoryItem) => {
    if (isGuestUser || !myUid) return;
    const latestTs = getLatestSlideTimestamp(story.slides);
    if (latestTs <= 0) return;

    setSeenStoriesMap((prev) => {
      if ((prev[story.id] || 0) >= latestTs) return prev;
      return { ...prev, [story.id]: latestTs };
    });

    void markStorySeenInFirebase(myUid, story.id, latestTs);
  };

  const handleAddStorySlide = async (slide: StorySlide) => {
    if (isGuestUser || !myUid) {
      showToast('लॉगिन करें', 'स्टोरी लगाने के लिए कृपया पहले लॉगिन करें।');
      return;
    }

    const now = Date.now();
    const stampedSlide: StorySlide = {
      ...slide,
      timestamp: typeof slide.timestamp === 'number' && slide.timestamp > 0 ? slide.timestamp : now,
      expiresAt:
        typeof slide.expiresAt === 'number' && slide.expiresAt > 0
          ? slide.expiresAt
          : now + STORY_TTL_MS,
      createdAt: slide.createdAt || 'Just now',
    };

    const existingSlides = filterActiveStorySlides(myDbStory?.slides || [], now);
    const updatedStory: StoryItem = {
      id: myUid,
      userId: myUid,
      username: userProfile.username || userProfile.name || 'user',
      userAvatar: userProfile.avatarUrl || '',
      timestamp: stampedSlide.timestamp,
      slides: [stampedSlide, ...existingSlides],
    };

    setFirebaseStories((prev) => {
      const others = prev.filter((s) => s.id !== myUid && s.userId !== myUid);
      return [updatedStory, ...others];
    });
    showToast('स्टोरी लग गई! ✨', 'आपकी स्टोरी Firebase में सेव हो गई है (24 घंटे तक दिखेगी)।');

    try {
      await saveStoryToFirebase(updatedStory);
    } catch (err) {
      console.warn('Failed to save story to Firebase:', err);
      showToast('त्रुटि', 'स्टोरी सेव करने में समस्या आई।');
    }
  };

  const handleDeleteMySlide = async (storyId: string, slideId: string) => {
    if (isGuestUser || !myUid) {
      showToast('लॉगिन करें', 'लॉगिन करें');
      return;
    }

    const targetStory = firebaseStories.find(
      (s) => s.id === storyId && s.userId === myUid
    );
    if (!targetStory || targetStory.userId !== myUid) {
      return;
    }

    const remainingSlides = targetStory.slides.filter((slide) => slide.id !== slideId);
    const updatedStory: StoryItem = {
      ...targetStory,
      slides: remainingSlides,
    };

    setFirebaseStories((prev) => {
      if (remainingSlides.length === 0) {
        return prev.filter((s) => s.id !== targetStory.id);
      }
      return prev.map((s) => (s.id === targetStory.id ? updatedStory : s));
    });
    showToast('स्टोरी हटाई गई', 'आपकी स्टोरी सफलतापूर्वक हटा दी गई है।');

    try {
      await saveStoryToFirebase(updatedStory);
    } catch (err) {
      console.warn('Failed to delete story slide from Firebase:', err);
    }
  };

  // Filter reels for For You vs Following (7-Reports Auto-Hide, Deactivated/Pending-Deletion & Block Rules)
  const filteredReels = reels.filter((r) => {
    // 7+ reports auto-hide rule: automatically hidden from public discovery
    if (r.isAutoHidden || (r.reportsCount && r.reportsCount >= 7)) {
      return false;
    }
    if (r.isAccountHidden && (isGuestUser || r.user !== userProfile.username)) {
      return false;
    }
    if (allBlockedUsernamesSet.has(r.user)) {
      return false;
    }
    if (feedType === 'ForYou') {
      return r.category === 'foryou' || r.category === 'both';
    }
    if (feedType === 'Following') {
      return r.category === 'following' || r.isFollowing || r.category === 'both';
    }
    return true;
  });

  const userReels = reels.filter((r) => r.user === userProfile.username || r.id === '3');
  const savedReels = reels.filter((r) => r.isSaved);

  const creatorLikeItems: CreatorLikeContentItem[] = React.useMemo(() => {
    if (isGuestUser || !userProfile.username) return [];
    const byId = new Map<string, CreatorLikeContentItem>();

    // Seed with local user-owned reels so newly posted / optimistically liked items appear immediately
    reels.forEach((r) => {
      if (r.user !== userProfile.username) return;
      const count = typeof r.likesCount === 'number' ? Math.max(0, r.likesCount) : 0;
      byId.set(r.id, {
        id: r.id,
        title: r.title || t.common.reel,
        posterUrl: r.posterUrl,
        mediaUrl: r.videoUrl,
        mediaType: 'reel',
        likesCount: count,
        likes: r.likes || formatCompactCount(count),
        views: r.views || '0',
        timestamp: r.timestamp || 0,
        reel: r,
      });
    });

    // Merge real-time Firebase reels & posts data
    firebaseCreatorLikeItems.forEach((fbItem) => {
      const localMatch = reels.find((r) => r.id === fbItem.id);
      byId.set(fbItem.id, {
        ...fbItem,
        reel: localMatch || fbItem.reel,
      });
    });

    return Array.from(byId.values()).sort((a, b) => {
      if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [isGuestUser, userProfile.username, reels, firebaseCreatorLikeItems, t.common.reel]);

  const handleRefreshFeedReels = async (): Promise<RefreshResultStatus> => {
    const { reels: freshReels, offline } = await refreshReelsFromFirebase();
    if (offline) {
      return 'offline';
    }

    const existingIds = new Set(reelsRef.current.map((r) => r.id));
    const newReels = freshReels.filter((r) => !existingIds.has(r.id));

    if (newReels.length === 0) {
      return 'no-new';
    }

    const followingListSet = new Set(userProfile.followingList || []);
    let likedIds = new Set<string>();
    let savedIds = new Set<string>();
    let dislikedIds = new Set<string>();

    if (!isGuestUser && userProfile.uid) {
      const interactions = await getUserInteractionsFromFirebase(
        userProfile.uid,
        newReels.map((r) => r.id)
      );
      likedIds = interactions.likedReelIds;
      savedIds = interactions.savedReelIds;
      dislikedIds = interactions.dislikedReelIds;
    }

    const hydratedNewReels = newReels.map((r) => ({
      ...r,
      isLiked: likedIds.has(r.id),
      isDisliked: dislikedIds.has(r.id),
      isSaved: savedIds.has(r.id),
      isFollowing: followingListSet.has(r.user),
    }));

    setReels((prev) => {
      const currentIds = new Set(prev.map((item) => item.id));
      const uniqueNew = hydratedNewReels.filter((item) => !currentIds.has(item.id));
      if (uniqueNew.length === 0) return prev;
      return [...uniqueNew, ...prev];
    });

    return 'updated';
  };

  // Sync real uploaded postsCount once on boot if stored postsCount was 0 while user already has uploaded reels
  useEffect(() => {
    if (!reelsHydratedFromDb || isGuestUser || !userProfile.uid || !userProfile.username) {
      return;
    }
    if (syncedPostsCountUidRef.current === userProfile.uid) {
      return;
    }
    syncedPostsCountUidRef.current = userProfile.uid;

    const myUploadedCount = reelsRef.current.filter(
      (r) =>
        !INITIAL_REEL_IDS.has(r.id) &&
        (r.uid ? r.uid === userProfile.uid : r.user === userProfile.username)
    ).length;

    if ((userProfile.postsCount || 0) === 0 && myUploadedCount > 0) {
      setUserProfile((prev) => {
        if (prev.uid !== userProfile.uid || prev.isGuest || (prev.postsCount || 0) > 0) {
          return prev;
        }
        return { ...prev, postsCount: myUploadedCount };
      });
      void updateUserPostsCountInFirebase(userProfile, myUploadedCount);
    }
  }, [reelsHydratedFromDb, isGuestUser, userProfile.uid, userProfile.username, INITIAL_REEL_IDS]);

  const isOwnerOfReel = (reel: ReelItem | null | undefined): boolean => {
    if (!reel || isGuestUser) return false;
    if (reel.uid) {
      return Boolean(userProfile.uid && reel.uid === userProfile.uid);
    }
    return Boolean(userProfile.username && reel.user === userProfile.username);
  };

  const handleEditReelCaption = async (
    reelId: string,
    newCaption: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetReel = reelsRef.current.find((r) => r.id === reelId) || selectedVideo;
    if (!targetReel || !isOwnerOfReel(targetReel)) {
      return { success: false, error: t.toasts.captionOnlyOwnError };
    }

    const clean = newCaption.trim();
    if (!clean) {
      return { success: false, error: t.toasts.captionEmptyError };
    }

    try {
      const savedCaption = await updateReelCaptionInFirebase(reelId, clean);
      setReels((prev) =>
        prev.map((r) => (r.id === reelId ? { ...r, title: savedCaption } : r))
      );
      setSelectedVideo((prev) =>
        prev && prev.id === reelId ? { ...prev, title: savedCaption } : prev
      );
      setShareSheetReel((prev) =>
        prev && prev.id === reelId ? { ...prev, title: savedCaption } : prev
      );
      showToast(t.toasts.captionSavedTitle, t.toasts.captionSavedDesc);
      return { success: true };
    } catch (err) {
      console.warn('Failed to update reel caption:', err);
      return { success: false, error: t.toasts.captionSaveError };
    }
  };

  const handleDeleteReel = async (
    reelId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetReel = reelsRef.current.find((r) => r.id === reelId) || selectedVideo;
    if (!targetReel || !isOwnerOfReel(targetReel) || !userProfile.uid) {
      return { success: false, error: t.toasts.reelDeleteError };
    }

    try {
      await deleteReelAndAssociatedDataFromFirebase(reelId, userProfile.uid);

      setReels((prev) => prev.filter((r) => r.id !== reelId));
      setFirebaseCreatorLikeItems((prev) => prev.filter((item) => item.id !== reelId));
      setSelectedVideo((prev) => (prev && prev.id === reelId ? null : prev));
      setShareSheetReel((prev) => (prev && prev.id === reelId ? null : prev));

      const nextPostsCount = Math.max(0, (userProfile.postsCount || 0) - 1);
      setUserProfile((prev) => ({
        ...prev,
        postsCount: Math.max(0, (prev.postsCount || 0) - 1),
      }));
      await updateUserPostsCountInFirebase(userProfile, nextPostsCount);

      showToast(t.toasts.reelDeletedTitle, t.toasts.reelDeletedDesc);
      return { success: true };
    } catch (err) {
      console.warn('Failed to delete reel from Firebase:', err);
      showToast(t.common.error, t.toasts.reelDeleteError);
      return { success: false, error: t.toasts.reelDeleteError };
    }
  };

  const inFlightLifecycleRef = useRef<Record<string, Promise<{ action: 'proceed' | 'deleted'; profile: UserProfile; toastTitle?: string; toastDesc?: string }>>>({});

  const resolveAccountStatusOnSignIn = async (
    profile: UserProfile
  ): Promise<{ action: 'proceed' | 'deleted'; profile: UserProfile; toastTitle?: string; toastDesc?: string }> => {
    const uid = profile.uid;
    if (!uid || profile.isGuest || uid === 'guest_user') {
      return { action: 'proceed', profile };
    }

    const existingPromise = inFlightLifecycleRef.current[uid];
    if (existingPromise) {
      return existingPromise;
    }

    const run = (async (): Promise<{ action: 'proceed' | 'deleted'; profile: UserProfile; toastTitle?: string; toastDesc?: string }> => {
      try {
        const isPastDeletionDeadline = Boolean(
          profile.accountStatus === 'pending_deletion' &&
            typeof profile.deletionScheduledAt === 'number' &&
            profile.deletionScheduledAt > 0 &&
            Date.now() >= profile.deletionScheduledAt
        );

        if (isPastDeletionDeadline) {
          await permanentlyDeleteUserAccountInFirebase(profile);
          await deleteFirebaseAuthUserIfSignedIn();

          setReels((prev) => prev.filter((r) => r.user !== profile.username));
          setFirebaseStories((prev) => prev.filter((s) => s.userId !== uid));
          setUserProfile(EMPTY_PROFILE);
          setNotifications([]);
          setBlockedUsers([]);
          setBlockedByUsernames([]);
          setSeenStoriesMap({});
          setDiamonds(0);
          setActiveTab('Home');
          setHasEnteredApp(false);
          setAuthModalOpen(true);

          showToast(
            'खाता हमेशा के लिए मिटाया गया',
            'तय तारीख़ पूरी होने के कारण आपका खाता और सभी डेटा हमेशा के लिए मिटा दिए गए हैं।'
          );
          return { action: 'deleted', profile };
        }

        if (profile.accountStatus === 'deactivated') {
          const reactivated = await reactivateUserAccountInFirebase(profile);
          setReels((prev) =>
            prev.map((r) =>
              r.user === reactivated.username ? { ...r, isAccountHidden: false } : r
            )
          );
          return {
            action: 'proceed',
            profile: reactivated,
            toastTitle: 'खाता चालू हो गया',
            toastDesc: 'वापस आने पर स्वागत है, आपका खाता चालू है',
          };
        }

        return { action: 'proceed', profile };
      } finally {
        window.setTimeout(() => {
          delete inFlightLifecycleRef.current[uid];
        }, 1500);
      }
    })();

    inFlightLifecycleRef.current[uid] = run;
    return run;
  };

  const handleDeactivateAccount = async () => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      return;
    }

    await deactivateUserAccountInFirebase(userProfile);

    setReels((prev) =>
      prev.map((r) =>
        r.user === userProfile.username
          ? { ...r, isAccountHidden: true, isLiked: false, isDisliked: false, isSaved: false, isFollowing: false }
          : { ...r, isLiked: false, isDisliked: false, isSaved: false, isFollowing: false }
      )
    );
    setFirebaseStories((prev) => prev.filter((s) => s.userId !== userProfile.uid));

    setSettingsVisible(false);
    setSelectedVideo(null);
    setShareSheetReel(null);
    setSpinModalVisible(false);
    setVideoUploadModalVisible(false);
    setMessagesVisible(false);
    setNotificationsVisible(false);
    setSearchVisible(false);
    setSearchInitialUser(null);
    setStoryViewerOpen(false);
    setStoryCreateOpen(false);

    try {
      await logOutUser();
    } catch {
      // ignore signOut errors
    }

    setUserProfile(EMPTY_PROFILE);
    syncedLangUidRef.current = null;
    userChangedLanguageLocallyRef.current = false;
    setNotifications([]);
    setBlockedUsers([]);
    setBlockedByUsernames([]);
    setSeenStoriesMap({});
    setDiamonds(0);
    setActiveTab('Home');
    setHasEnteredApp(false);
    setAuthModalOpen(true);
    showToast(t.toasts.deactivatedTitle, t.toasts.deactivatedDesc);
  };

  const handleScheduleAccountDeletion = async (
    days: 7 | 30
  ): Promise<{ success: boolean; error?: string }> => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      return { success: false, error: t.common.pleaseLogin };
    }

    const reauthResult = await reauthenticateWithGoogleForAccountAction(userProfile);
    if (!reauthResult.verified) {
      return {
        success: false,
        error: reauthResult.error || t.settings.accountClosureModal.googleAuthError,
      };
    }

    const updated = await scheduleAccountDeletionInFirebase(userProfile, days);
    setUserProfile(updated);
    setReels((prev) =>
      prev.map((r) => (r.user === updated.username ? { ...r, isAccountHidden: true } : r))
    );
    setFirebaseStories((prev) => prev.filter((s) => s.userId !== updated.uid));

    setSettingsVisible(false);
    setActiveTab('Home');
    showToast(
      t.toasts.deletionScheduledTitle,
      t.toasts.deletionScheduledDesc(days)
    );
    return { success: true };
  };

  const handleCancelAccountDeletion = async () => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      return;
    }

    const updated = await cancelAccountDeletionInFirebase(userProfile);
    setUserProfile(updated);
    setReels((prev) =>
      prev.map((r) => (r.user === updated.username ? { ...r, isAccountHidden: false } : r))
    );
    showToast(t.toasts.accountSafeTitle, t.toasts.accountSafeDesc);
  };

  const handleBlockUser = async (target: {
    username: string;
    uid?: string;
    name?: string;
    avatarUrl?: string;
  }) => {
    if (isGuestUser || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.common.loginRequiredTitle, t.common.pleaseLogin);
      return;
    }

    const targetUsername = (target.username || '').trim();
    if (!targetUsername || targetUsername === userProfile.username) return;

    const optimisticEntry: BlockedUserEntry = {
      blockId: `${userProfile.uid}__${targetUsername}`,
      blockerUid: userProfile.uid,
      blockerUsername: userProfile.username || 'user',
      blockedUid: target.uid || '',
      blockedUsername: targetUsername,
      blockedName: target.name || targetUsername,
      blockedAvatar: target.avatarUrl || '',
      blockedAt: Date.now(),
    };

    setBlockedUsers((prev) => {
      const remaining = prev.filter((b) => b.blockedUsername !== targetUsername);
      return [optimisticEntry, ...remaining];
    });

    setReels((prev) =>
      prev.map((r) => (r.user === targetUsername ? { ...r, isFollowing: false } : r))
    );

    setUserProfile((prev) => {
      const list = prev.followingList || [];
      if (!list.includes(targetUsername)) return prev;
      const nextList = list.filter((u) => u !== targetUsername);
      return { ...prev, followingList: nextList, following: nextList.length };
    });

    if (selectedVideo && selectedVideo.user === targetUsername) {
      setSelectedVideo(null);
    }

    try {
      await blockUserInFirebase(userProfile, target);
      showToast(t.toasts.blockedTitle, t.toasts.blockedDesc(targetUsername));
    } catch (err) {
      console.warn('Failed to block user in Firebase:', err);
      showToast(t.common.error, t.toasts.blockErrorDesc);
    }
  };

  const handleUnblockUser = async (targetUsername: string) => {
    if (isGuestUser || !userProfile.uid || userProfile.uid === 'guest_user') return;
    const clean = targetUsername.trim();
    if (!clean) return;

    setBlockedUsers((prev) => prev.filter((b) => b.blockedUsername !== clean));

    try {
      await unblockUserInFirebase(userProfile, clean);
      showToast(t.toasts.unblockedTitle, t.toasts.unblockedDesc(clean));
    } catch (err) {
      console.warn('Failed to unblock user in Firebase:', err);
      showToast(t.common.error, t.toasts.unblockErrorDesc);
    }
  };

  const handleAuthComplete = async (newProfile: UserProfile, redirectHome: boolean) => {
    let finalProfile = newProfile;
    if (newProfile.uid && newProfile.uid !== 'guest_user') {
      const existingDbProfile = await getUserProfileFromFirebase(newProfile.uid);
      if (existingDbProfile) {
        finalProfile = {
          ...newProfile,
          ...existingDbProfile,
          uid: newProfile.uid,
        };
      } else {
        const profileWithLang = { ...newProfile, preferredLanguage: languageRef.current };
        await saveUserProfileToFirebase(profileWithLang);
        finalProfile = profileWithLang;
      }
    }

    const resolved = await resolveAccountStatusOnSignIn({
      ...EMPTY_PROFILE,
      ...finalProfile,
    });
    if (resolved.action === 'deleted') {
      return;
    }

    const langSyncedProfile = syncLanguageAfterSignIn(resolved.profile);
    const activeBundle = translations[languageRef.current];
    setUserProfile(langSyncedProfile);
    setHasEnteredApp(true);
    if (redirectHome) {
      setActiveTab('Home');
    }
    setAuthModalOpen(false);
    if (resolved.toastTitle && resolved.toastDesc) {
      showToast(resolved.toastTitle, resolved.toastDesc);
    } else {
      showToast(
        activeBundle.toasts.welcomeTitle,
        activeBundle.toasts.welcomeDesc(langSyncedProfile.name || langSyncedProfile.username)
      );
    }
  };

  const handleSaveProfileEdit = async (updates: {
    name: string;
    username: string;
    bio: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (userProfile.isGuest || !userProfile.uid || userProfile.uid === 'guest_user') {
      showToast(t.common.loginRequiredTitle, t.toasts.profileEditLoginDesc);
      return { success: false, error: t.common.pleaseLogin };
    }

    const result = await updateUserProfileDetailsInFirebase(userProfile, updates);
    if (!result.success || !result.profile) {
      return { success: false, error: result.error || t.toasts.profileSaveError };
    }

    setUserProfile(result.profile);
    showToast(t.toasts.profileUpdatedTitle, t.toasts.profileUpdatedDesc);
    return { success: true };
  };

  // Full-Screen Login Page Gate: shown on initial launch if not logged in & after logout until user selects Mobile, Google, or Guest
  if (!hasEnteredApp) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-center selection:bg-[#00FF88] selection:text-black font-sans antialiased">
        {toastMessage && (
          <div className="fixed top-4 left-4 right-4 max-w-md mx-auto z-[70] bg-[#1A231D] border border-emerald-500/40 rounded-xl p-3 shadow-2xl flex items-start gap-2.5 animate-slideDown">
            <Sparkles size={16} className="text-[#00FF88] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{toastMessage.title}</p>
              <p className="text-[11px] text-zinc-200">{toastMessage.desc}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <AuthModal
          isOpen={true}
          canClose={false}
          onClose={() => {
            // Cannot dismiss login screen until user chooses Mobile Number, Google, or Guest
          }}
          onContinueAsGuest={handleContinueAsGuest}
          onAddBonusDiamonds={(amount) => setDiamonds((prev) => prev + amount)}
          onLanguageChange={handleChangeLanguage}
          onAuthSuccess={(newProfile) => {
            void handleAuthComplete(newProfile, true);
          }}
        />
      </div>
    );
  }

  const isSwipeBlockedByOverlay =
    selectedVideo !== null ||
    Boolean(shareSheetReel) ||
    settingsVisible ||
    spinModalVisible ||
    videoUploadModalVisible ||
    messagesVisible ||
    notificationsVisible ||
    searchVisible ||
    authModalOpen ||
    storyViewerOpen ||
    storyCreateOpen ||
    isCameraRecording;

  const shouldIgnorePageSwipeTarget = (
    target: EventTarget | null,
    boundary: HTMLElement | null
  ): boolean => {
    let cur = target instanceof HTMLElement ? target : null;
    while (cur && cur !== boundary) {
      if (
        cur.dataset.noPageSwipe === 'true' ||
        cur.matches('.fixed.inset-0, [role="dialog"], input, textarea, select')
      ) {
        return true;
      }
      const overflowX = window.getComputedStyle(cur).overflowX;
      if ((overflowX === 'auto' || overflowX === 'scroll') && cur.scrollWidth > cur.clientWidth + 2) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  };

  const switchMainTab = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    const currIdx = MAIN_SWIPE_TABS.indexOf(activeTab as 'Home' | 'Create' | 'Profile');
    const nextIdx = MAIN_SWIPE_TABS.indexOf(nextTab as 'Home' | 'Create' | 'Profile');
    if (currIdx !== -1 && nextIdx !== -1) {
      setPageSlideDirection(nextIdx > currIdx ? 'forward' : 'backward');
    } else {
      setPageSlideDirection(null);
    }
    setActiveTab(nextTab);
  };

  const handlePageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isSwipeBlockedByOverlay || e.touches.length !== 1) {
      pageSwipeTouchRef.current = null;
      return;
    }
    const touch = e.touches[0];
    const blocked = shouldIgnorePageSwipeTarget(e.target, e.currentTarget);
    pageSwipeTouchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      blocked,
    };
  };

  const handlePageTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 1 && pageSwipeTouchRef.current) {
      pageSwipeTouchRef.current.blocked = true;
    }
  };

  const handlePageTouchCancel = () => {
    pageSwipeTouchRef.current = null;
  };

  const handlePageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = pageSwipeTouchRef.current;
    pageSwipeTouchRef.current = null;
    if (!start || start.blocked || isSwipeBlockedByOverlay) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.startX;
    const dy = touch.clientY - start.startY;

    if (Math.abs(dx) < 80 || Math.abs(dx) <= Math.abs(dy)) {
      return;
    }

    const currentIndex = MAIN_SWIPE_TABS.indexOf(activeTab as 'Home' | 'Create' | 'Profile');
    if (currentIndex === -1) return;

    if (dx < 0 && currentIndex < MAIN_SWIPE_TABS.length - 1) {
      switchMainTab(MAIN_SWIPE_TABS[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      switchMainTab(MAIN_SWIPE_TABS[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090D] text-white flex flex-col items-center justify-start selection:bg-[#00FF88] selection:text-black font-sans antialiased">
      {/* Top Desktop App Control Toolbar */}
      <header className="w-full bg-[#0D1117] border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-[#00FF88]">
            <span className="w-6 h-6 rounded-md bg-[#00FF88] text-black flex items-center justify-center font-extrabold text-xs">
              ∞
            </span>
            <span>Infinity Social</span>
          </div>
          <span className="text-zinc-600 text-xs hidden sm:inline">|</span>
          <span className="text-zinc-400 text-xs hidden sm:inline">
            {t.nav.tagline}
          </span>
        </div>

        {/* Quick Action Controls in Toolbar */}
        <div className="flex items-center gap-2">
          {/* Post Story Button Shortcut */}
          <button
            onClick={handleOpenStoryCreate}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#00FF88] text-xs font-bold flex items-center gap-1.5 transition-all"
            title={t.nav.addStory}
          >
            <Plus size={13} />
            <span className="hidden sm:inline">{t.nav.addStory}</span>
          </button>

          {/* Direct Upload Video Button */}
          <button
            onClick={() => {
              playClickSound();
              setVideoUploadModalVisible(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#00FF88] hover:bg-[#00e57a] text-black text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            title={t.nav.uploadVideo}
          >
            <Upload size={13} />
            <span className="hidden sm:inline">{t.nav.uploadVideo}</span>
            <span className="sm:hidden">{t.nav.uploadShort}</span>
          </button>

          {/* Spin To Win Trigger */}
          <button
            onClick={() => {
              playClickSound();
              setSpinModalVisible(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            title={t.nav.spinWinTitle}
          >
            <span>💎</span>
            <span className="hidden md:inline">{diamonds}</span>
          </button>

          {/* Mobile Frame Toggle */}
          <button
            onClick={() => {
              playClickSound();
              setIsMobileFrame(!isMobileFrame);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isMobileFrame
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title={isMobileFrame ? t.nav.switchToFull : t.nav.switchToMobile}
          >
            {isMobileFrame ? <Smartphone size={13} /> : <Monitor size={13} />}
            <span className="hidden sm:inline">{isMobileFrame ? t.nav.mobile : t.nav.full}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main
        className={`w-full transition-all duration-300 relative flex flex-col ${
          isMobileFrame
            ? 'max-w-[430px] my-0 sm:my-3 sm:rounded-3xl border-0 sm:border-4 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden min-h-screen sm:min-h-[860px] sm:max-h-[920px] bg-black'
            : 'max-w-2xl min-h-[calc(100vh-50px)] bg-black'
        }`}
      >

        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="absolute top-12 left-4 right-4 z-40 bg-[#1A231D] border border-emerald-500/40 rounded-xl p-3 shadow-2xl flex items-start gap-2.5 animate-slideDown">
            <Sparkles size={16} className="text-[#00FF88] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white">{toastMessage.title}</p>
              <p className="text-[11px] text-zinc-300">{toastMessage.desc}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div
          className="flex-1 min-h-0 flex flex-col overflow-x-hidden"
          onTouchStart={handlePageTouchStart}
          onTouchMove={handlePageTouchMove}
          onTouchEnd={handlePageTouchEnd}
          onTouchCancel={handlePageTouchCancel}
        >
          <div
            key={activeTab}
            className={`flex-1 min-h-0 flex flex-col ${
              pageSlideDirection === 'forward'
                ? 'animate-page-slide-left'
                : pageSlideDirection === 'backward'
                ? 'animate-page-slide-right'
                : ''
            }`}
          >
            {/* ---------------- 1. HOME SCREEN (INFINITY FEED) ---------------- */}
            {activeTab === 'Home' && (
              <HomeFeedView
                reels={filteredReels}
                stories={trayStories}
                userProfile={userProfile}
                diamonds={diamonds}
                feedType={feedType}
                setFeedType={setFeedType}
                onOpenStory={handleOpenStory}
                onOpenStoryCreate={handleOpenStoryCreate}
                onOpenSpin={() => setSpinModalVisible(true)}
                unreadNotificationsCount={notifications.filter((n) => !n.read).length}
                onOpenNotifications={() => {
                  setNotificationsVisible(true);
                  const uid = userProfile.uid;
                  if (!uid || userProfile.isGuest || uid === 'guest_user') return;
                  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
                  if (unreadIds.length > 0) {
                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    void markAllNotificationsReadInFirebase(uid, unreadIds);
                  }
                }}
                onOpenMessages={() => setMessagesVisible(true)}
                onOpenSearch={() => setSearchVisible(true)}
                onSelectReel={(reel) => setSelectedVideo(reel)}
                onRefreshFeed={handleRefreshFeedReels}
                deletionScheduledAt={userProfile.deletionScheduledAt}
                onCancelDeletion={handleCancelAccountDeletion}
              />
            )}

            {/* ---------------- 2. SEARCH / EXPLORE SCREEN ---------------- */}
            {activeTab === 'Search' && (
              <ExploreView
                reels={reels.filter(
                  (r) =>
                    !r.isAutoHidden &&
                    (r.reportsCount || 0) < 7 &&
                    !allBlockedUsernamesSet.has(r.user) &&
                    (!r.isAccountHidden || (!isGuestUser && r.user === userProfile.username))
                )}
                onSelectReel={(reel) => setSelectedVideo(reel)}
                onRefreshFeed={handleRefreshFeedReels}
              />
            )}

            {/* ---------------- 3. CREATE / CAMERA SCREEN ---------------- */}
            {activeTab === 'Create' && (
              <div className="flex-1 min-h-0 flex flex-col bg-[#111] overflow-hidden">
                <CameraCreateView
                  createMode={createMode}
                  setCreateMode={setCreateMode}
                  onPublishReel={handlePublishReel}
                  userProfileName={userProfile.name}
                  userProfileUsername={userProfile.username}
                  onOpenUploadModal={() => setVideoUploadModalVisible(true)}
                  onRecordingChange={setIsCameraRecording}
                />
              </div>
            )}

            {/* ---------------- 4. PROFILE SCREEN ---------------- */}
            {activeTab === 'Profile' && (
              <div className="flex-1 min-h-0 flex flex-col bg-black overflow-y-auto">
                <ProfileView
                  userProfile={userProfile}
                  diamonds={diamonds}
                  userReels={userReels}
                  savedReels={savedReels}
                  allReels={reels}
                  allLikesItems={creatorLikeItems}
                  onOpenSettings={() => setSettingsVisible(true)}
                  onSimulateReferral={handleSimulateReferral}
                  onSelectReel={(reel) => setSelectedVideo(reel)}
                  onUpdateProfile={(updated) => {
                    const next = { ...userProfile, ...updated };
                    setUserProfile(next);
                    saveUserProfileToFirebase(next);
                  }}
                  onSaveProfileEdit={handleSaveProfileEdit}
                  onToggleFollow={handleToggleFollow}
                  onOpenAuth={() => setAuthModalOpen(true)}
                  onOpenSpin={() => setSpinModalVisible(true)}
                  blockedUsernames={blockedByMeUsernames}
                  blockedByUsernames={blockedByUsernames}
                  onOpenUserProfile={async (targetUser: FollowListUser) => {
                    const fullProfile = await resolveFullUserProfileForNavigation(targetUser);
                    setSearchInitialUser(fullProfile);
                    setSearchVisible(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- 5. BOTTOM NAVIGATION BAR (Home, Plus, Profile) ---------------- */}
        <nav className="h-16 bg-black border-t border-zinc-900/80 flex items-center justify-around px-8 shrink-0 select-none z-20">
          {/* 1. Home Button */}
          <button
            onClick={() => {
              playClickSound();
              switchMainTab('Home');
            }}
            className="flex flex-col items-center justify-center gap-1 transition-transform active:scale-90"
            aria-label={t.nav.home}
          >
            <HomeIcon
              size={24}
              className={activeTab === 'Home' ? 'fill-white text-white' : 'text-zinc-500 hover:text-white'}
            />
            <span
              className={`text-[10px] ${
                activeTab === 'Home' ? 'font-bold text-white' : 'font-medium text-zinc-500'
              }`}
            >
              {t.nav.home}
            </span>
          </button>

          {/* 2. Center Floating Create (+) Button with Rainbow Gradient Ring */}
          <button
            onClick={() => {
              playClickSound();
              switchMainTab('Create');
            }}
            className="p-[2.5px] bg-gradient-to-tr from-[#00FF88] via-[#00E5FF] via-[#3B82F6] to-[#A855F7] rounded-full shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:scale-105 active:scale-95 transition-all"
            aria-label={t.nav.createAria}
          >
            <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center">
              <Plus size={24} strokeWidth={2.5} className="text-white" />
            </div>
          </button>

          {/* 3. Profile Button */}
          <button
            onClick={() => {
              playClickSound();
              switchMainTab('Profile');
            }}
            className="flex flex-col items-center justify-center gap-1 transition-transform active:scale-90"
            aria-label={t.nav.profile}
          >
            <CircleUser
              size={25}
              className={
                activeTab === 'Profile'
                  ? 'text-white stroke-[2.2]'
                  : 'text-zinc-400 hover:text-white stroke-[1.8]'
              }
            />
            <span
              className={`text-[10px] ${
                activeTab === 'Profile' ? 'font-bold text-white' : 'font-medium text-zinc-400'
              }`}
            >
              {t.nav.profile}
            </span>
          </button>
        </nav>

        {/* ---------------- MODALS & DRAWERS ---------------- */}

        {/* SHARE SHEET MODAL */}
        {shareSheetReel && (
          <ShareSheetModal
            isOpen={!!shareSheetReel}
            onClose={() => setShareSheetReel(null)}
            reel={shareSheetReel}
            onAddToStory={(reelToShare) => {
              if (isGuestUser) {
                showToast(t.common.loginRequiredTitle, t.toasts.storyLoginDesc);
                return;
              }
              const now = Date.now();
              void handleAddStorySlide({
                id: `slide-${now}`,
                mediaUrl: reelToShare.posterUrl,
                mediaType: 'image',
                duration: 5,
                caption: `Shared Reel: ${reelToShare.title} by @${reelToShare.user}`,
                soundTitle: reelToShare.soundTitle,
                createdAt: 'Just now',
                timestamp: now,
                expiresAt: now + STORY_TTL_MS,
              });
            }}
          />
        )}

        {/* REEL VIEWER */}
        {selectedVideo && (
          <ReelViewerModal
            reels={reels.filter((r) => !allBlockedUsernamesSet.has(r.user))}
            currentReel={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onOpenSpin={() => setSpinModalVisible(true)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onToggleFollow={handleToggleFollow}
            onAddComment={handleAddComment}
            onSelectReel={(r) => setSelectedVideo(r)}
            onReportReel={handleReportReel}
            onDislikeReel={handleDislikeReel}
            isGuest={Boolean(userProfile.isGuest)}
            onOpenAuth={() => setAuthModalOpen(true)}
            currentUsername={userProfile.username}
            currentUserUid={userProfile.uid}
            blockedUsernames={blockedByMeUsernames}
            blockedByUsernames={blockedByUsernames}
            onBlockUser={handleBlockUser}
            onEditReelCaption={handleEditReelCaption}
            onDeleteReel={handleDeleteReel}
            onAddToStory={(reelToShare) => {
              if (isGuestUser) {
                showToast(t.common.loginRequiredTitle, t.toasts.storyLoginDesc);
                return;
              }
              const now = Date.now();
              void handleAddStorySlide({
                id: `slide-${now}`,
                mediaUrl: reelToShare.posterUrl,
                mediaType: 'image',
                duration: 5,
                caption: `Shared Reel: ${reelToShare.title} by @${reelToShare.user}`,
                soundTitle: reelToShare.soundTitle,
                createdAt: 'Just now',
                timestamp: now,
                expiresAt: now + STORY_TTL_MS,
              });
            }}
          />
        )}

        {/* STORY VIEWER MODAL ("स्टोरी देखने का ऑप्शन") */}
        <StoryViewerModal
          stories={viewableStories}
          initialStoryIndex={activeStoryIndex}
          isOpen={storyViewerOpen}
          onClose={() => setStoryViewerOpen(false)}
          currentUserUid={userProfile.uid}
          onMarkStorySeen={handleMarkStorySeen}
          onDeleteMySlide={handleDeleteMySlide}
        />

        {/* STORY CREATOR MODAL ("स्टोरी लगाने का ऑप्शन") */}
        <StoryCreateModal
          isOpen={storyCreateOpen}
          onClose={() => setStoryCreateOpen(false)}
          onAddStorySlide={handleAddStorySlide}
          username={userProfile.username}
        />

        {/* SETTINGS & PRIVACY MODAL */}
        <SettingsModal
          isOpen={settingsVisible}
          onClose={() => setSettingsVisible(false)}
          onLogout={handleLogout}
          dailyFollows={userProfile.dailyFollows}
          isPrivate={userProfile.isPrivate}
          userProfile={userProfile}
          goldenThemeEnabled={Boolean(userProfile.goldenThemeEnabled)}
          onToggleGoldenTheme={handleToggleGoldenTheme}
          onDeactivateAccount={handleDeactivateAccount}
          onScheduleDeletion={handleScheduleAccountDeletion}
          onCancelDeletion={handleCancelAccountDeletion}
          blockedUsers={blockedUsers}
          onUnblockUser={handleUnblockUser}
          onLanguageChange={handleChangeLanguage}
          onOpenAuth={() => {
            setSettingsVisible(false);
            setAuthModalOpen(true);
          }}
          onTogglePrivacy={() =>
            setUserProfile((prev) => {
              const next = { ...prev, isPrivate: !prev.isPrivate };
              saveUserProfileToFirebase(next);
              return next;
            })
          }
        />

        {/* AUTHENTICATION MODAL */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onContinueAsGuest={handleContinueAsGuest}
          onAddBonusDiamonds={(amount) => setDiamonds((prev) => prev + amount)}
          onLanguageChange={handleChangeLanguage}
          onAuthSuccess={(newProfile) => {
            void handleAuthComplete(newProfile, false);
          }}
        />

        {/* SPIN TO WIN MODAL */}
        <SpinWheelModal
          isOpen={spinModalVisible}
          onClose={() => setSpinModalVisible(false)}
          onWin={handleSpinWin}
          currentDiamonds={diamonds}
        />

        {/* VIDEO UPLOAD FEATURE FROM DEVICE GALLERY */}
        <VideoUploadModal
          isOpen={videoUploadModalVisible}
          onClose={() => setVideoUploadModalVisible(false)}
          onPublish={handlePublishReel}
          username={userProfile.username}
          userAvatar={userProfile.avatarUrl}
        />

        {/* DIRECT MESSAGES MODAL */}
        <MessagesModal
          isOpen={messagesVisible}
          onClose={() => setMessagesVisible(false)}
          blockedUsernames={blockedByMeUsernames}
          blockedByUsernames={blockedByUsernames}
        />

        {/* NOTIFICATIONS MODAL */}
        <NotificationsModal
          isOpen={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
          notifications={notifications}
        />

        {/* SEARCH & EXPLORE MODAL */}
        <SearchModal
          isOpen={searchVisible}
          onClose={() => {
            setSearchVisible(false);
            setSearchInitialUser(null);
          }}
          initialSelectedUser={searchInitialUser}
          currentUserProfile={userProfile}
          onToggleFollow={handleToggleFollow}
          blockedUsernames={blockedByMeUsernames}
          blockedByUsernames={blockedByUsernames}
          onBlockUser={handleBlockUser}
          onSelectReel={(r) => {
            const existing = reels.find((item) => item.id === r.id);
            const reelToPlay = existing
              ? { ...r, ...existing }
              : {
                  ...r,
                  isLiked: false,
                  isDisliked: false,
                  isSaved: false,
                  isFollowing: Boolean(userProfile.followingList?.includes(r.user)),
                };
            if (!existing) {
              setReels((prev) => [reelToPlay, ...prev]);
            }
            setSelectedVideo(reelToPlay);
          }}
        />
      </main>
    </div>
  );
}
