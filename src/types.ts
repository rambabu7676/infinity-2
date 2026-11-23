export interface ReelComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
}

export interface ReelItem {
  id: string;
  uid?: string;
  views: string;
  viewsCount: number;
  likes: string;
  likesCount: number;
  comments: string;
  shares: string;
  title: string;
  user: string;
  userAvatar: string;
  isVerified?: boolean;
  videoUrl: string;
  posterUrl: string;
  soundTitle: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
  category: 'foryou' | 'following' | 'both';
  commentsList: ReelComment[];
  timestamp?: number; // epoch ms for recency sorting
  createdAt?: string;
  reportsCount?: number; // Community reports (Auto-hides if >= 7)
  isAutoHidden?: boolean; // Hidden from public feed if reported >= 7 times
  isAccountHidden?: boolean; // Hidden while owner account is deactivated or pending deletion
  dislikesCount?: number;
  isDisliked?: boolean;
  cloudinary?: {
    publicId: string;
    resourceType: 'video' | 'image';
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    secureUrl: string;
    optimizedUrl: string;
    thumbnailUrl?: string;
    createdAt?: string;
  };
}

export interface UserProfile {
  uid?: string;
  email?: string;
  phone?: string;
  name: string;
  username: string; // Max 20 Chars
  postsCount: number;
  followers: number;
  following: number;
  isBlueTick: boolean;
  isPremium: boolean;
  badgeExpiryDate?: number; // 31-day validity timestamp
  goldenThemeEnabled?: boolean; // On/Off switch for golden profile theme
  referralCode: string;
  successfulReferrals: number;
  dailyFollows: number;
  avatarUrl: string;
  bio: string;
  isPrivate: boolean;
  followingList?: string[]; // list of usernames followed by the user
  totalLikes?: number;
  totalViews?: number;
  isGuest?: boolean;
  accountStatus?: 'active' | 'deactivated' | 'pending_deletion';
  deactivatedAt?: number | null;
  deletionScheduledAt?: number | null;
  deletionDays?: 7 | 30 | null;
  isAccountHidden?: boolean;
  preferredLanguage?: AppLanguage;
}

export type AppLanguage = 'hi' | 'en';

export interface FeedbackItem {
  id: string;
  category: 'bug' | 'feature' | 'general';
  message: string;
  userEmail?: string;
  username?: string;
  timestamp: number;
  createdAt: string;
  deviceInfo?: string;
}

export interface StorySlide {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration?: number; // seconds
  caption?: string;
  soundTitle?: string;
  createdAt: string;
  timestamp?: number; // epoch ms when posted
  expiresAt?: number; // epoch ms when story expires (timestamp + 24h)
  cloudinary?: {
    publicId: string;
    resourceType: 'video' | 'image';
    format?: string;
    bytes?: number;
    width?: number;
    height?: number;
    duration?: number;
    secureUrl: string;
    optimizedUrl: string;
  };
}

export interface StoryItem {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  isMyStory?: boolean;
  hasUnseen?: boolean;
  timestamp?: number;
  isAccountHidden?: boolean;
  slides: StorySlide[];
}

export interface NotificationItem {
  id: string;
  type: 'like' | 'comment' | 'follow';
  actorUid: string;
  actorUsername: string;
  actorName?: string;
  actorAvatar?: string;
  recipientUid: string;
  reelId?: string;
  reelTitle?: string;
  commentText?: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface BlockedUserEntry {
  blockId: string;
  blockerUid: string;
  blockerUsername: string;
  blockedUid?: string;
  blockedUsername: string;
  blockedName?: string;
  blockedAvatar?: string;
  blockedAt: number;
}

export interface FollowListUser {
  uid?: string;
  username: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  isBlueTick?: boolean;
  isPrivate?: boolean;
  followedAt?: number;
}

export type ActiveTab = 'Home' | 'Search' | 'Create' | 'Reels' | 'Profile';
export type FeedType = 'ForYou' | 'Following';
export type CreateMode = 'Post' | 'Story' | 'Reel' | 'Live';
