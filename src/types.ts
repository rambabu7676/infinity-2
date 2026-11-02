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
  name: string;
  username: string; // Max 20 Chars
  postsCount: number;
  followers: number;
  following: number;
  isBlueTick: boolean;
  isPremium: boolean;
  referralCode: string;
  successfulReferrals: number;
  dailyFollows: number;
  avatarUrl: string;
  bio: string;
  isPrivate: boolean;
  followingList?: string[]; // list of usernames followed by the user
  totalLikes?: number;
  totalViews?: number;
}

export interface StorySlide {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration?: number; // seconds
  caption?: string;
  soundTitle?: string;
  createdAt: string;
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
  slides: StorySlide[];
}

export type ActiveTab = 'Home' | 'Search' | 'Create' | 'Reels' | 'Profile';
export type FeedType = 'ForYou' | 'Following';
export type CreateMode = 'Post' | 'Story' | 'Reel' | 'Live';
