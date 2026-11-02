import React, { useState, useEffect } from 'react';
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
import { INITIAL_STORIES } from './data/mockStories';
import { ActiveTab, CreateMode, FeedType, ReelComment, ReelItem, StoryItem, StorySlide, UserProfile } from './types';
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
import {
  saveReelToFirebase,
  getReelsFromFirebase,
  saveStoryToFirebase,
  getStoriesFromFirebase,
  savePostToFirebase,
  saveUserProfileToFirebase,
} from './firebase/services';
import {
  subscribeToAuthState,
  fetchUserProfile,
  logOutUser
} from './firebase/authService';

export default function App() {
  // Navigation & Screen States
  const [activeTab, setActiveTab] = useState<ActiveTab>('Home'); // Home | Search | Create | Reels | Profile
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
  const [searchVisible, setSearchVisible] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Story System States
  const [stories, setStories] = useState<StoryItem[]>(INITIAL_STORIES);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyCreateOpen, setStoryCreateOpen] = useState(false);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  // User Profile Data matching specs
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'rambabu_official',
    username: 'rambabu_official',
    postsCount: 1200,
    followers: 240,
    following: 125000,
    isBlueTick: true,
    isPremium: true,
    referralCode: '48271',
    successfulReferrals: 6,
    dailyFollows: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    bio: 'Dream Big  |  Create  |  Inspire ✨',
    isPrivate: false,
    totalLikes: 85400,
    totalViews: 1200000,
    followingList: ['street_flavors', 'himalayan_wanderer'],
  });

  const [diamonds, setDiamonds] = useState(1200);
  const [reels, setReels] = useState<ReelItem[]>(INITIAL_REELS);

  // Sync saved Reels, Stories, and Auth State from Firebase
  useEffect(() => {
    const initFirebaseData = async () => {
      try {
        const [savedReels, savedStories] = await Promise.all([
          getReelsFromFirebase(),
          getStoriesFromFirebase(),
        ]);

        if (savedReels && savedReels.length > 0) {
          setReels((prev) => {
            const savedIds = new Set(savedReels.map((r) => r.id));
            const remaining = prev.filter((r) => !savedIds.has(r.id));
            return [...savedReels, ...remaining];
          });
        }

        if (savedStories && savedStories.length > 0) {
          setStories((prev) => {
            const storyMap = new Map(savedStories.map((s) => [s.id, s]));
            return prev.map((s) => storyMap.get(s.id) || s);
          });
        }
      } catch (err) {
        console.warn('Could not load data from Firebase:', err);
      }
    };
    initFirebaseData();

    // Listen for Firebase Auth user state changes
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        try {
          const profile = await fetchUserProfile(user.uid);
          if (profile) {
            setUserProfile((prev) => ({
              ...prev,
              ...profile,
              uid: user.uid,
              email: user.email || profile.email,
            }));
          } else {
            setUserProfile((prev) => ({
              ...prev,
              uid: user.uid,
              email: user.email || undefined,
            }));
          }
        } catch (err) {
          console.warn('Could not sync user profile on auth change:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 🎲 WEIGHTED SPIN LOGIC: 80% (10 to 50) | 20% (60 to 100)
  const handleSpinWin = (win: number) => {
    setDiamonds((prev) => prev + win);
    showToast('Spin To Win! 🎉', `बधाई हो! आपने जीते 💎 ${win} Test Diamonds!`);
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
      milestoneNote = ' 🔵 Blue Tick Verified Badge Unlocked!';
    } else if (nextCount === 6) {
      milestoneNote = ' 👑 Royal Gold VIP Theme Unlocked!';
    }

    showToast(
      'सफल इनवाइट!',
      `सफल रेफरल: ${nextCount}। आपको 💎 +10 Test Diamonds मिले!${milestoneNote}`
    );
  };

  const handleLogout = async () => {
    setSettingsVisible(false);
    try {
      await logOutUser();
      setUserProfile((prev) => ({
        ...prev,
        uid: undefined,
        email: undefined,
      }));
      showToast('लॉगआउट', 'आप अपने अकाउंट से सफलतापूर्वक लॉगआउट हो गए हैं।');
    } catch {
      showToast('लॉगआउट', 'लॉगआउट हो गया।');
    }
  };

  // Likes, saves, comments, follow interactions
  const handleToggleLike = (reelId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const isLiked = !r.isLiked;
          const likesCount = isLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1);
          return {
            ...r,
            isLiked,
            likesCount,
            likes: `${(likesCount / 1000).toFixed(0)}K`,
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
              isLiked: !prev.isLiked,
              likesCount: !prev.isLiked ? prev.likesCount + 1 : prev.likesCount - 1,
            }
          : null
      );
    }
  };

  const handleToggleSave = (reelId: string) => {
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          return { ...r, isSaved: !r.isSaved };
        }
        return r;
      })
    );
    if (selectedVideo && selectedVideo.id === reelId) {
      setSelectedVideo((prev) =>
        prev ? { ...prev, isSaved: !prev.isSaved } : null
      );
    }
    showToast('Bookmark', 'Reel updated in saved collection.');
  };

  const handleToggleFollow = (username: string) => {
    playClickSound();
    let willFollow = false;
    setReels((prev) => {
      const target = prev.find((r) => r.user === username);
      willFollow = target ? !target.isFollowing : true;
      return prev.map((r) => {
        if (r.user === username) {
          return { ...r, isFollowing: willFollow };
        }
        return r;
      });
    });

    if (selectedVideo && selectedVideo.user === username) {
      setSelectedVideo((prev) =>
        prev ? { ...prev, isFollowing: willFollow } : null
      );
    }

    setUserProfile((prev) => {
      const currentList = prev.followingList || [];
      const updatedList = willFollow
        ? currentList.includes(username) ? currentList : [...currentList, username]
        : currentList.filter((u) => u !== username);

      return {
        ...prev,
        dailyFollows: willFollow ? Math.min(200, prev.dailyFollows + 1) : prev.dailyFollows,
        following: willFollow ? prev.following + 1 : Math.max(0, prev.following - 1),
        followingList: updatedList,
      };
    });

    showToast(
      willFollow ? 'Follow' : 'Unfollow',
      willFollow ? `You are now following @${username}` : `Unfollowed @${username}`
    );
  };

  const handleAddComment = (reelId: string, commentText: string) => {
    const newComment: ReelComment = {
      id: Date.now().toString(),
      user: userProfile.username,
      avatar: userProfile.avatarUrl,
      text: commentText,
      timeAgo: 'Just now',
      likes: 0,
    };

    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          return {
            ...r,
            commentsList: [newComment, ...(r.commentsList || [])],
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
            }
          : null
      );
    }
    showToast('Comment Posted', `Added comment to @${selectedVideo?.user || 'reel'}`);
  };

  // Media Upload & Publishing (Reels and Posts)
  const handlePublishReel = async (newReel: ReelItem, format: 'Reel' | 'Post' = 'Reel') => {
    const reelWithTimestamp: ReelItem = {
      ...newReel,
      timestamp: newReel.timestamp || Date.now(),
      createdAt: newReel.createdAt || 'Just now',
    };
    setReels((prev) => [reelWithTimestamp, ...prev]);
    setUserProfile((prev) => ({
      ...prev,
      postsCount: prev.postsCount + 1,
    }));
    setActiveTab('Home');
    showToast('Published! 🚀', `Your media has been posted as a ${format}.`);

    try {
      if (format === 'Post') {
        const isImg = Boolean(
          reelWithTimestamp.cloudinary?.resourceType === 'image' ||
          reelWithTimestamp.videoUrl?.match(/\.(jpg|jpeg|png|webp)/i)
        );
        await savePostToFirebase(
          {
            id: reelWithTimestamp.id,
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
      // Also persist to reels collection
      await saveReelToFirebase(reelWithTimestamp, reelWithTimestamp.cloudinary);
    } catch (err) {
      console.warn('Firebase persist warning:', err);
    }
  };

  // Story System Handlers
  const handleOpenStory = (index: number) => {
    playClickSound();
    const story = stories[index];
    if (story.isMyStory && story.slides.length === 0) {
      setStoryCreateOpen(true);
    } else {
      setActiveStoryIndex(index);
      setStoryViewerOpen(true);
    }
  };

  const handleAddStorySlide = async (slide: StorySlide) => {
    let updatedStory: StoryItem | null = null;
    setStories((prev) =>
      prev.map((s) => {
        if (s.isMyStory) {
          const updated = {
            ...s,
            slides: [slide, ...s.slides],
          };
          updatedStory = updated;
          return updated;
        }
        return s;
      })
    );
    showToast('Story Posted! ✨', 'आपकी स्टोरी सफलतापूर्वक पोस्ट हो गई है (24 घंटे उपलब्ध)।');

    if (updatedStory) {
      try {
        await saveStoryToFirebase(updatedStory);
      } catch (err) {
        console.warn('Failed to save story to Firebase:', err);
      }
    }
  };

  const handleDeleteMySlide = async (slideId: string) => {
    let updatedStory: StoryItem | null = null;
    setStories((prev) =>
      prev.map((s) => {
        if (s.isMyStory) {
          const updated = {
            ...s,
            slides: s.slides.filter((slide) => slide.id !== slideId),
          };
          updatedStory = updated;
          return updated;
        }
        return s;
      })
    );
    showToast('Story Deleted', 'Slide removed from your story.');

    if (updatedStory) {
      try {
        await saveStoryToFirebase(updatedStory);
      } catch (err) {
        console.warn('Failed to delete story slide from Firebase:', err);
      }
    }
  };

  // Filter reels for For You vs Following
  const filteredReels = reels.filter((r) => {
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

  const myStory = stories.find((s) => s.isMyStory);

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
            Your world, in motion
          </span>
        </div>

        {/* Quick Action Controls in Toolbar */}
        <div className="flex items-center gap-2">
          {/* Post Story Button Shortcut */}
          <button
            onClick={() => {
              playClickSound();
              setStoryCreateOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#00FF88] text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Add a new story"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Add Story</span>
          </button>

          {/* Direct Upload Video Button */}
          <button
            onClick={() => {
              playClickSound();
              setVideoUploadModalVisible(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#00FF88] hover:bg-[#00e57a] text-black text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
            title="Upload video from gallery"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Upload Video</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* Spin To Win Trigger */}
          <button
            onClick={() => {
              playClickSound();
              setSpinModalVisible(true);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#FFD700]/15 hover:bg-[#FFD700]/25 text-[#FFD700] border border-[#FFD700]/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Spin to Win Diamonds"
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
            title={isMobileFrame ? 'Switch to Full Width View' : 'Switch to Mobile Frame'}
          >
            {isMobileFrame ? <Smartphone size={13} /> : <Monitor size={13} />}
            <span className="hidden sm:inline">{isMobileFrame ? 'Mobile' : 'Full'}</span>
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

        {/* ---------------- 1. HOME SCREEN (INFINITY FEED) ---------------- */}
        {activeTab === 'Home' && (
          <HomeFeedView
            reels={reels}
            stories={stories}
            userProfile={userProfile}
            diamonds={diamonds}
            feedType={feedType}
            setFeedType={setFeedType}
            onOpenStory={handleOpenStory}
            onOpenStoryCreate={() => setStoryCreateOpen(true)}
            onOpenSpin={() => setSpinModalVisible(true)}
            onOpenNotifications={() => setNotificationsVisible(true)}
            onOpenMessages={() => setMessagesVisible(true)}
            onOpenSearch={() => setSearchVisible(true)}
            onSelectReel={(reel) => setSelectedVideo(reel)}
          />
        )}

        {/* ---------------- 2. SEARCH / EXPLORE SCREEN ---------------- */}
        {activeTab === 'Search' && (
          <ExploreView
            reels={reels}
            onSelectReel={(reel) => setSelectedVideo(reel)}
          />
        )}

        {/* ---------------- 3. CREATE / CAMERA SCREEN ---------------- */}
        {activeTab === 'Create' && (
          <div className="flex-1 flex flex-col bg-[#111] overflow-hidden">
            <CameraCreateView
              createMode={createMode}
              setCreateMode={setCreateMode}
              onPublishReel={handlePublishReel}
              userProfileName={userProfile.name}
              userProfileUsername={userProfile.username}
              onOpenUploadModal={() => setVideoUploadModalVisible(true)}
            />
          </div>
        )}

        {/* ---------------- 4. PROFILE SCREEN ---------------- */}
        {activeTab === 'Profile' && (
          <div className="flex-1 flex flex-col bg-black overflow-y-auto">
            <ProfileView
              userProfile={userProfile}
              diamonds={diamonds}
              userReels={userReels}
              savedReels={savedReels}
              allReels={reels}
              onOpenSettings={() => setSettingsVisible(true)}
              onSimulateReferral={handleSimulateReferral}
              onSelectReel={(reel) => setSelectedVideo(reel)}
              onUpdateProfile={(updated) => {
                const next = { ...userProfile, ...updated };
                setUserProfile(next);
                saveUserProfileToFirebase(next);
              }}
              onToggleFollow={handleToggleFollow}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenSpin={() => setSpinModalVisible(true)}
            />
          </div>
        )}

        {/* ---------------- 5. BOTTOM NAVIGATION BAR (Home, Plus, Profile) ---------------- */}
        <nav className="h-16 bg-black border-t border-zinc-900/80 flex items-center justify-around px-8 shrink-0 select-none z-20">
          {/* 1. Home Button */}
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('Home');
            }}
            className="flex flex-col items-center justify-center gap-1 transition-transform active:scale-90"
            aria-label="Home Feed"
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
              Home
            </span>
          </button>

          {/* 2. Center Floating Create (+) Button with Rainbow Gradient Ring */}
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('Create');
            }}
            className="p-[2.5px] bg-gradient-to-tr from-[#00FF88] via-[#00E5FF] via-[#3B82F6] to-[#A855F7] rounded-full shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:scale-105 active:scale-95 transition-all"
            aria-label="Create Reel or Post"
          >
            <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center">
              <Plus size={24} strokeWidth={2.5} className="text-white" />
            </div>
          </button>

          {/* 3. Profile Button */}
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('Profile');
            }}
            className="flex flex-col items-center justify-center gap-1 transition-transform active:scale-90"
            aria-label="Profile"
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
              Profile
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
              handleAddStorySlide({
                id: `slide-${Date.now()}`,
                mediaUrl: reelToShare.posterUrl,
                mediaType: 'image',
                duration: 5,
                caption: `Shared Reel: ${reelToShare.title} by @${reelToShare.user}`,
                soundTitle: reelToShare.soundTitle,
                createdAt: 'Just now',
              });
              showToast('Added to Story! 📸', `Reel by @${reelToShare.user} was added to your story.`);
            }}
          />
        )}

        {/* REEL VIEWER */}
        {selectedVideo && (
          <ReelViewerModal
            reels={reels}
            currentReel={selectedVideo}
            onClose={() => setSelectedVideo(null)}
            onOpenSpin={() => setSpinModalVisible(true)}
            onToggleLike={handleToggleLike}
            onToggleSave={handleToggleSave}
            onToggleFollow={handleToggleFollow}
            onAddComment={handleAddComment}
            onSelectReel={(r) => setSelectedVideo(r)}
            onAddToStory={(reelToShare) => {
              handleAddStorySlide({
                id: `slide-${Date.now()}`,
                mediaUrl: reelToShare.posterUrl,
                mediaType: 'image',
                duration: 5,
                caption: `Shared Reel: ${reelToShare.title} by @${reelToShare.user}`,
                soundTitle: reelToShare.soundTitle,
                createdAt: 'Just now'
              });
              showToast('Added to Story! 📸', `Reel by @${reelToShare.user} was added to your 24h story.`);
            }}
          />
        )}

        {/* STORY VIEWER MODAL ("स्टोरी देखने का ऑप्शन") */}
        <StoryViewerModal
          stories={stories}
          initialStoryIndex={activeStoryIndex}
          isOpen={storyViewerOpen}
          onClose={() => setStoryViewerOpen(false)}
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

        {/* AUTHENTICATION MODAL (EMAIL/PASSWORD SIGN UP & LOG IN) */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={(newProfile) => {
            setUserProfile((prev) => ({
              ...prev,
              ...newProfile,
            }));
            saveUserProfileToFirebase(newProfile);
            showToast('सफलता!', `नमस्ते ${newProfile.name}! आपका अकाउंट सक्रिय है।`);
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
        />

        {/* NOTIFICATIONS MODAL */}
        <NotificationsModal
          isOpen={notificationsVisible}
          onClose={() => setNotificationsVisible(false)}
        />

        {/* SEARCH & EXPLORE MODAL */}
        <SearchModal
          isOpen={searchVisible}
          onClose={() => setSearchVisible(false)}
          reels={reels}
          onSelectReel={(r) => setSelectedVideo(r)}
        />
      </main>
    </div>
  );
}
