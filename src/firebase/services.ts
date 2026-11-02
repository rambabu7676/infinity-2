import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './config';
import { ReelItem, StoryItem, UserProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface CloudinaryMetadata {
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
}

// ======================== REELS (VIDEOS) ========================
export async function saveReelToFirebase(
  reel: ReelItem,
  cloudinaryMeta?: CloudinaryMetadata
): Promise<void> {
  try {
    const reelRef = doc(db, 'reels', reel.id);
    const dataToSave = {
      ...reel,
      timestamp: reel.timestamp || Date.now(),
      createdAt: reel.createdAt || 'Just now',
      cloudinary: cloudinaryMeta || null,
      updatedAt: Date.now(),
    };
    await setDoc(reelRef, dataToSave, { merge: true });
  } catch (err) {
    console.error('Failed to save reel to Firebase:', err);
    throw err;
  }
}

export async function getReelsFromFirebase(): Promise<ReelItem[]> {
  try {
    const q = query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(50));
    const querySnapshot = await getDocs(q);
    const results: ReelItem[] = [];
    querySnapshot.forEach((d) => {
      results.push(d.data() as ReelItem);
    });
    return results;
  } catch (err) {
    console.warn('Failed to fetch reels from Firebase, returning fallback:', err);
    return [];
  }
}

// ======================== STORIES (PHOTOS / VIDEOS) ========================
export async function saveStoryToFirebase(story: StoryItem): Promise<void> {
  try {
    const storyRef = doc(db, 'stories', story.id);
    await setDoc(
      storyRef,
      {
        ...story,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save story to Firebase:', err);
    throw err;
  }
}

export async function getStoriesFromFirebase(): Promise<StoryItem[]> {
  try {
    const q = query(collection(db, 'stories'), limit(30));
    const querySnapshot = await getDocs(q);
    const results: StoryItem[] = [];
    querySnapshot.forEach((d) => {
      results.push(d.data() as StoryItem);
    });
    return results;
  } catch (err) {
    console.warn('Failed to fetch stories from Firebase:', err);
    return [];
  }
}

// ======================== POSTS (GALLERY PHOTOS / VIDEOS) ========================
export interface PostItem {
  id: string;
  caption: string;
  user: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  posterUrl?: string;
  likesCount: number;
  commentsCount: number;
  timestamp: number;
  createdAt: string;
  cloudinary?: CloudinaryMetadata;
}

export async function savePostToFirebase(
  post: PostItem,
  cloudinaryMeta?: CloudinaryMetadata
): Promise<void> {
  try {
    const postRef = doc(db, 'posts', post.id);
    await setDoc(
      postRef,
      {
        ...post,
        timestamp: post.timestamp || Date.now(),
        cloudinary: cloudinaryMeta || null,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to save post to Firebase:', err);
    throw err;
  }
}

// ======================== USER PROFILES ========================
export async function saveUserProfileToFirebase(profile: UserProfile): Promise<void> {
  try {
    const docId = profile.uid || profile.username;
    const userRef = doc(db, 'users', docId);
    await setDoc(userRef, { ...profile, updatedAt: Date.now() }, { merge: true });

    // Also mirror to username if saving by uid for handle discovery
    if (profile.uid && profile.username) {
      await setDoc(doc(db, 'users', profile.username), { ...profile, updatedAt: Date.now() }, { merge: true });
    }
  } catch (err) {
    console.error('Failed to save user profile to Firebase:', err);
  }
}

export async function getUserProfileFromFirebase(uidOrUsername: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uidOrUsername);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Failed to fetch user profile from Firebase:', err);
    return null;
  }
}
