import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocsFromServer,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  startAfter,
  getCountFromServer,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './config';
import {
  ReelItem,
  ReelComment,
  ReelCommentReply,
  StoryItem,
  StorySlide,
  UserProfile,
  FeedbackItem,
  NotificationItem,
  BlockedUserEntry,
  FollowListUser,
  FollowRequestItem,
  AppLanguage,
} from '../types';

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

export async function updateReelCaptionInFirebase(
  reelId: string,
  newCaption: string
): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('offline');
  }
  const cleanCaption = newCaption.trim().slice(0, 500);
  if (!reelId || !cleanCaption) {
    throw new Error('invalid_caption');
  }

  const now = Date.now();
  const reelRef = doc(db, 'reels', reelId);
  await updateDoc(reelRef, {
    title: cleanCaption,
    updatedAt: now,
  });

  // Also update matching post document if this item was published as a Post
  try {
    const postRef = doc(db, 'posts', reelId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      await updateDoc(postRef, {
        caption: cleanCaption,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('Optional post caption sync warning:', err);
  }

  return cleanCaption;
}

export async function deleteReelAndAssociatedDataFromFirebase(
  reelId: string,
  uid?: string
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('offline');
  }
  if (!reelId || !uid || uid === 'guest_user') {
    throw new Error('unauthorized');
  }

  // 1. Delete likes & comments subcollections while parent reel doc still exists for owner verification
  const [likesSnap, commentsSnap] = await Promise.all([
    getDocs(collection(db, 'reels', reelId, 'likes')),
    getDocs(collection(db, 'reels', reelId, 'comments')),
  ]);

  await Promise.all([
    ...likesSnap.docs.map((d) => deleteDoc(d.ref)),
    ...commentsSnap.docs.map((d) => deleteDoc(d.ref)),
  ]);

  // 2. Delete the reel document itself
  await deleteDoc(doc(db, 'reels', reelId));

  // 3. Delete matching post document if it exists
  try {
    const postRef = doc(db, 'posts', reelId);
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      await deleteDoc(postRef);
    }
  } catch (err) {
    console.warn('Matching post delete warning:', err);
  }

  // 4. Best-effort cleanup of owner's own saved/disliked refs
  await Promise.all([
    deleteDoc(doc(db, 'users', uid, 'saved', reelId)).catch(() => {}),
    deleteDoc(doc(db, 'users', uid, 'disliked', reelId)).catch(() => {}),
  ]);
}

export async function updateUserPostsCountInFirebase(
  profile: UserProfile,
  postsCount: number
): Promise<void> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') return;
  const safeCount = Math.max(0, Math.floor(postsCount));
  const now = Date.now();
  try {
    await setDoc(
      doc(db, 'users', uid),
      { postsCount: safeCount, updatedAt: now },
      { merge: true }
    );
    if (profile.username && profile.username !== uid) {
      await setDoc(
        doc(db, 'users', profile.username),
        { postsCount: safeCount, updatedAt: now },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Failed to persist postsCount in Firebase:', err);
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

export async function refreshReelsFromFirebase(): Promise<{
  reels: ReelItem[];
  offline: boolean;
}> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { reels: [], offline: true };
  }

  try {
    let snap;
    try {
      snap = await getDocsFromServer(
        query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(50))
      );
    } catch (innerErr: unknown) {
      const codeOrMsg = String(
        (innerErr as { code?: string; message?: string })?.code ||
          (innerErr as { message?: string })?.message ||
          ''
      ).toLowerCase();
      if (
        codeOrMsg.includes('unavailable') ||
        codeOrMsg.includes('offline') ||
        codeOrMsg.includes('network')
      ) {
        return { reels: [], offline: true };
      }
      snap = await getDocsFromServer(query(collection(db, 'reels'), limit(50)));
    }

    const results: ReelItem[] = [];
    snap.forEach((d) => {
      const reel = normalizeFirebaseReel(d.id, d.data() as Partial<ReelItem>);
      if (isReelVisible(reel)) {
        results.push(reel);
      }
    });
    results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return { reels: results, offline: false };
  } catch (err) {
    console.warn('Pull-to-refresh Firebase reels failed:', err);
    return { reels: [], offline: true };
  }
}

// ======================== STORIES (PHOTOS / VIDEOS, 24H EXPIRY) ========================
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

function formatStoryTimeAgo(timestamp?: number, fallback?: string): string {
  if (!timestamp || typeof timestamp !== 'number') return fallback || 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h`;
}

export function filterActiveStorySlides(slides: StorySlide[] = [], now = Date.now()): StorySlide[] {
  if (!Array.isArray(slides)) return [];
  return slides
    .filter((slide) => {
      if (!slide || !slide.id || !slide.mediaUrl) return false;
      const ts = typeof slide.timestamp === 'number' ? slide.timestamp : 0;
      if (ts <= 0) return false; // Exclude legacy/mock slides without real timestamps
      const expiresAt =
        typeof slide.expiresAt === 'number' && slide.expiresAt > 0
          ? slide.expiresAt
          : ts + STORY_TTL_MS;
      return expiresAt > now;
    })
    .map((slide) => ({
      ...slide,
      createdAt: formatStoryTimeAgo(slide.timestamp, slide.createdAt),
    }));
}

export function getLatestSlideTimestamp(slides: StorySlide[] = []): number {
  return slides.reduce((max, s) => {
    const ts = typeof s.timestamp === 'number' ? s.timestamp : 0;
    return ts > max ? ts : max;
  }, 0);
}

function sanitizeSlidesForFirestore(slides: StorySlide[]): StorySlide[] {
  return slides.slice(0, 30).map((s) => {
    const ts = typeof s.timestamp === 'number' && s.timestamp > 0 ? s.timestamp : Date.now();
    const cleanSlide: StorySlide = {
      id: s.id,
      mediaUrl: s.mediaUrl,
      mediaType: s.mediaType === 'video' ? 'video' : 'image',
      duration: typeof s.duration === 'number' ? s.duration : 5,
      createdAt: s.createdAt || 'Just now',
      timestamp: ts,
      expiresAt: typeof s.expiresAt === 'number' && s.expiresAt > 0 ? s.expiresAt : ts + STORY_TTL_MS,
    };
    if (s.caption) cleanSlide.caption = s.caption;
    if (s.soundTitle) cleanSlide.soundTitle = s.soundTitle;
    if (s.cloudinary) cleanSlide.cloudinary = s.cloudinary;
    return cleanSlide;
  });
}

export async function saveStoryToFirebase(story: StoryItem): Promise<void> {
  if (!story.id || !story.userId || story.userId === 'guest_user' || story.id === 'guest_user') {
    return;
  }

  try {
    const storyRef = doc(db, 'stories', story.id);
    const activeSlides = sanitizeSlidesForFirestore(filterActiveStorySlides(story.slides));

    if (activeSlides.length === 0) {
      await deleteDoc(storyRef);
      return;
    }

    const latestTs = getLatestSlideTimestamp(activeSlides) || Date.now();
    await setDoc(storyRef, {
      id: story.id,
      userId: story.userId,
      username: (story.username || 'user').trim().slice(0, 60) || 'user',
      userAvatar: story.userAvatar || '',
      slides: activeSlides,
      timestamp: latestTs,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to save story to Firebase:', err);
    throw err;
  }
}

function parseActiveStoriesSnapshot(
  docs: { id: string; data: () => unknown }[],
  now = Date.now()
): StoryItem[] {
  const results: StoryItem[] = [];
  docs.forEach((d) => {
    const raw = d.data() as Partial<StoryItem> | undefined;
    if (!raw || !raw.userId || raw.userId === 'guest_user' || !raw.username) return;
    if (raw.isAccountHidden) return;
    const activeSlides = filterActiveStorySlides(raw.slides || [], now);
    if (activeSlides.length === 0) return;

    const latestTs = getLatestSlideTimestamp(activeSlides);
    results.push({
      id: raw.id || d.id,
      userId: raw.userId,
      username: raw.username,
      userAvatar:
        raw.userAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(raw.username)}`,
      timestamp: latestTs,
      slides: activeSlides,
    });
  });

  results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return results;
}

export async function getStoriesFromFirebase(): Promise<StoryItem[]> {
  try {
    const q = query(collection(db, 'stories'), limit(50));
    const querySnapshot = await getDocs(q);
    return parseActiveStoriesSnapshot(querySnapshot.docs);
  } catch (err) {
    console.warn('Failed to fetch stories from Firebase:', err);
    return [];
  }
}

export function subscribeToStoriesFromFirebase(
  onUpdate: (stories: StoryItem[]) => void
): () => void {
  const q = query(collection(db, 'stories'), limit(50));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(parseActiveStoriesSnapshot(snap.docs));
    },
    (err) => {
      console.warn('Realtime stories listener warning:', err);
    }
  );
}

export async function markStorySeenInFirebase(
  uid: string,
  storyId: string,
  latestSlideTs: number
): Promise<void> {
  if (!uid || uid === 'guest_user' || !storyId || storyId === 'guest_user') return;
  try {
    await setDoc(doc(db, 'users', uid, 'seenStories', storyId), {
      storyId,
      seenAt: Date.now(),
      latestSlideTs: Math.max(0, latestSlideTs),
    });
  } catch (err) {
    console.warn('Failed to mark story as seen in Firebase:', err);
  }
}

export async function getSeenStoriesFromFirebase(
  uid: string
): Promise<Record<string, number>> {
  if (!uid || uid === 'guest_user') return {};
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'seenStories'));
    const map: Record<string, number> = {};
    snap.forEach((d) => {
      const data = d.data();
      const sid = (data?.storyId as string) || d.id;
      const ts = typeof data?.latestSlideTs === 'number' ? data.latestSlideTs : 0;
      map[sid] = ts;
    });
    return map;
  } catch (err) {
    console.warn('Failed to load seen stories from Firebase:', err);
    return {};
  }
}

// ======================== POSTS (GALLERY PHOTOS / VIDEOS) ========================
export interface PostItem {
  id: string;
  uid?: string;
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

export interface CreatorLikeContentItem {
  id: string;
  title: string;
  posterUrl: string;
  mediaUrl: string;
  mediaType: 'reel' | 'post';
  likesCount: number;
  likes: string;
  views: string;
  timestamp: number;
  reel?: ReelItem;
}

export function subscribeToCreatorLikesInFirebase(
  username: string,
  onUpdate: (items: CreatorLikeContentItem[]) => void
): () => void {
  const cleanUsername = username.trim();
  if (!cleanUsername) {
    onUpdate([]);
    return () => {};
  }

  let latestReelsDocs: ReelItem[] = [];
  let latestPostsDocs: PostItem[] = [];

  const emitMerged = () => {
    const byId = new Map<string, CreatorLikeContentItem>();

    latestPostsDocs.forEach((p) => {
      if (!p.id) return;
      const likesCount = typeof p.likesCount === 'number' ? Math.max(0, p.likesCount) : 0;
      byId.set(p.id, {
        id: p.id,
        title: p.caption || 'पोस्ट',
        posterUrl: p.posterUrl || p.mediaUrl || '',
        mediaUrl: p.mediaUrl || '',
        mediaType: 'post',
        likesCount,
        likes: String(likesCount),
        views: '0',
        timestamp: typeof p.timestamp === 'number' ? p.timestamp : 0,
      });
    });

    latestReelsDocs.forEach((r) => {
      if (!r.id) return;
      const likesCount = typeof r.likesCount === 'number' ? Math.max(0, r.likesCount) : 0;
      const existing = byId.get(r.id);
      byId.set(r.id, {
        id: r.id,
        title: r.title || existing?.title || 'रील',
        posterUrl: r.posterUrl || existing?.posterUrl || '',
        mediaUrl: r.videoUrl || existing?.mediaUrl || '',
        mediaType: existing?.mediaType || 'reel',
        likesCount,
        likes: r.likes || String(likesCount),
        views: r.views || '0',
        timestamp: typeof r.timestamp === 'number' ? r.timestamp : existing?.timestamp || 0,
        reel: r,
      });
    });

    const sorted = Array.from(byId.values()).sort((a, b) => {
      if (b.likesCount !== a.likesCount) return b.likesCount - a.likesCount;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
    onUpdate(sorted);
  };

  const reelsQ = query(collection(db, 'reels'), where('user', '==', cleanUsername), limit(100));
  const postsQ = query(collection(db, 'posts'), where('user', '==', cleanUsername), limit(100));

  const unsubReels = onSnapshot(
    reelsQ,
    (snap) => {
      const list: ReelItem[] = [];
      snap.forEach((d) => {
        list.push(normalizeFirebaseReel(d.id, d.data() as Partial<ReelItem>));
      });
      latestReelsDocs = list;
      emitMerged();
    },
    (err) => {
      console.warn('Creator reels likes listener warning:', err);
    }
  );

  const unsubPosts = onSnapshot(
    postsQ,
    (snap) => {
      const list: PostItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<PostItem>;
        list.push({
          id: data.id || d.id,
          caption: data.caption || '',
          user: data.user || cleanUsername,
          userAvatar: data.userAvatar || '',
          mediaUrl: data.mediaUrl || '',
          mediaType: data.mediaType === 'image' ? 'image' : 'video',
          posterUrl: data.posterUrl,
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          commentsCount: typeof data.commentsCount === 'number' ? data.commentsCount : 0,
          timestamp: typeof data.timestamp === 'number' ? data.timestamp : 0,
          createdAt: data.createdAt || '',
          cloudinary: data.cloudinary,
        });
      });
      latestPostsDocs = list;
      emitMerged();
    },
    (err) => {
      console.warn('Creator posts likes listener warning:', err);
    }
  );

  return () => {
    unsubReels();
    unsubPosts();
  };
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

export async function saveUserLanguageToFirebase(
  profile: UserProfile,
  language: AppLanguage
): Promise<void> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') return;
  const now = Date.now();
  const safeUsername = (profile.username || '').trim() || uid;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        username: safeUsername,
        preferredLanguage: language,
        updatedAt: now,
      },
      { merge: true }
    );
    if (profile.username && profile.username !== uid) {
      await setDoc(
        doc(db, 'users', profile.username),
        {
          username: safeUsername,
          preferredLanguage: language,
          updatedAt: now,
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Failed to save user language to Firebase:', err);
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

export async function updateUserProfileDetailsInFirebase(
  currentProfile: UserProfile,
  updates: { name: string; username: string; bio: string }
): Promise<{ success: boolean; profile?: UserProfile; error?: string }> {
  const uid = currentProfile.uid;
  if (currentProfile.isGuest || !uid || uid === 'guest_user') {
    return { success: false, error: 'लॉगिन करें' };
  }

  const cleanName = updates.name.trim();
  const cleanUsername = updates.username.trim();
  const cleanBio = updates.bio.trim();

  if (!cleanName) {
    return { success: false, error: 'कृपया अपना नाम दर्ज करें।' };
  }
  if (cleanUsername.length < 3) {
    return { success: false, error: 'यूज़रनेम कम से कम 3 अक्षरों का होना चाहिए।' };
  }
  if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'यूज़रनेम में सिर्फ़ छोटे अंग्रेज़ी अक्षर (a-z), अंक (0-9) और अंडरस्कोर (_) चलेंगे।',
    };
  }
  if (cleanUsername.length > 30) {
    return { success: false, error: 'यूज़रनेम 30 अक्षरों से ज़्यादा नहीं हो सकता।' };
  }

  try {
    // Check uniqueness if username changed (or not yet claimed)
    if (cleanUsername !== currentProfile.username) {
      const usernameClaimRef = doc(db, 'usernames', cleanUsername);
      const claimSnap = await getDoc(usernameClaimRef);
      if (claimSnap.exists()) {
        const claimUid = claimSnap.data()?.uid as string | undefined;
        if (claimUid && claimUid !== uid) {
          return { success: false, error: 'यह यूज़रनेम पहले से किसी और का है' };
        }
      }

      const usersQ = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const usersSnap = await getDocs(usersQ);
      let isTaken = false;
      usersSnap.forEach((d) => {
        const data = d.data();
        const ownerUid = (data?.uid as string | undefined) || d.id;
        if (ownerUid !== uid) {
          isTaken = true;
        }
      });
      if (isTaken) {
        return { success: false, error: 'यह यूज़रनेम पहले से किसी और का है' };
      }

      const mirrorSnap = await getDoc(doc(db, 'users', cleanUsername));
      if (mirrorSnap.exists()) {
        const mirrorData = mirrorSnap.data();
        const mirrorUid = (mirrorData?.uid as string | undefined) || mirrorSnap.id;
        if (mirrorUid !== uid && mirrorData?.username === cleanUsername) {
          return { success: false, error: 'यह यूज़रनेम पहले से किसी और का है' };
        }
      }
    }

    const now = Date.now();
    const updatedProfile: UserProfile = {
      ...currentProfile,
      name: cleanName,
      username: cleanUsername,
      bio: cleanBio,
    };

    // Save primary profile document by uid
    await setDoc(
      doc(db, 'users', uid),
      {
        ...updatedProfile,
        updatedAt: now,
      },
      { merge: true }
    );

    // Claim username in usernames/{cleanUsername}
    await setDoc(doc(db, 'usernames', cleanUsername), {
      uid,
      username: cleanUsername,
      updatedAt: now,
    });

    // Mirror updated profile under users/{cleanUsername}
    if (cleanUsername !== uid) {
      await setDoc(
        doc(db, 'users', cleanUsername),
        {
          ...updatedProfile,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    // Release old username claim and stale mirror doc if username changed
    const oldUsername = currentProfile.username;
    if (oldUsername && oldUsername !== cleanUsername) {
      try {
        const oldClaimRef = doc(db, 'usernames', oldUsername);
        const oldClaimSnap = await getDoc(oldClaimRef);
        if (oldClaimSnap.exists() && oldClaimSnap.data()?.uid === uid) {
          await deleteDoc(oldClaimRef);
        }
      } catch {
        // ignore old claim cleanup failure
      }

      if (oldUsername !== uid) {
        try {
          const oldMirrorRef = doc(db, 'users', oldUsername);
          const oldMirrorSnap = await getDoc(oldMirrorRef);
          if (oldMirrorSnap.exists() && oldMirrorSnap.data()?.uid === uid) {
            await setDoc(oldMirrorRef, { username: '', updatedAt: now }, { merge: true });
          }
        } catch {
          // ignore old mirror cleanup failure
        }
      }
    }

    // Keep Firebase Auth displayName synced if signed in with Firebase Auth
    if (auth.currentUser && auth.currentUser.uid === uid) {
      try {
        await updateProfile(auth.currentUser, { displayName: cleanName });
      } catch {
        // ignore Auth displayName sync failure
      }
    }

    return { success: true, profile: updatedProfile };
  } catch (err) {
    console.error('Failed to update user profile details in Firebase:', err);
    return { success: false, error: 'प्रोफ़ाइल सेव करने में समस्या आई। कृपया पुनः प्रयास करें।' };
  }
}

// ======================== FEEDBACK & REPORTS ========================
export async function saveFeedbackToFirebase(feedback: FeedbackItem): Promise<void> {
  try {
    const feedbackRef = doc(db, 'feedback', feedback.id);
    await setDoc(feedbackRef, {
      ...feedback,
      submittedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to save feedback to Firebase:', err);
    // Don't throw, let local UI continue gracefully
  }
}

export async function reportReelInFirebase(
  reelId: string,
  reporterId: string,
  reason: string
): Promise<{ reportsCount: number; isAutoHidden: boolean }> {
  try {
    const reportDocId = `${reelId}_${reporterId}`;
    await setDoc(doc(db, 'reel_reports', reportDocId), {
      reelId,
      reporterId,
      reason,
      reportedAt: Date.now(),
    });

    const reelRef = doc(db, 'reels', reelId);
    const snap = await getDoc(reelRef);
    const currentData = snap.exists() ? snap.data() : {};
    const currentReports = (currentData.reportsCount || 0) + 1;
    const isAutoHidden = currentReports >= 7;

    await setDoc(
      reelRef,
      {
        reportsCount: currentReports,
        isAutoHidden,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return { reportsCount: currentReports, isAutoHidden };
  } catch (err) {
    console.warn('Failed to record reel report in Firebase:', err);
    return { reportsCount: 1, isAutoHidden: false };
  }
}

// ======================== LIKES, SAVED & FOLLOWS SUBCOLLECTIONS ========================

export async function toggleReelLikeInFirebase(
  reel: ReelItem,
  uid: string,
  isLiked: boolean,
  newLikesCount: number,
  formattedLikes: string
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reel.id) return;
  try {
    const likeDocRef = doc(db, 'reels', reel.id, 'likes', uid);
    if (isLiked) {
      await setDoc(likeDocRef, {
        uid,
        reelId: reel.id,
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(likeDocRef);
    }

    // Also persist likesCount on parent reel document
    const reelRef = doc(db, 'reels', reel.id);
    await setDoc(
      reelRef,
      {
        id: reel.id,
        title: reel.title || '',
        user: reel.user || '',
        videoUrl: reel.videoUrl || '',
        likesCount: newLikesCount,
        likes: formattedLikes,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync reel like in Firebase:', err);
  }
}

export async function toggleReelDislikeInFirebase(
  reel: ReelItem,
  uid: string,
  isDisliked: boolean,
  newDislikesCount: number
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reel.id) return;
  try {
    const dislikedDocRef = doc(db, 'users', uid, 'disliked', reel.id);
    if (isDisliked) {
      await setDoc(dislikedDocRef, {
        reelId: reel.id,
        uid,
        dislikedAt: Date.now(),
      });
    } else {
      await deleteDoc(dislikedDocRef);
    }

    // Also persist dislikesCount on parent reel document
    const reelRef = doc(db, 'reels', reel.id);
    await setDoc(
      reelRef,
      {
        id: reel.id,
        title: reel.title || '',
        user: reel.user || '',
        videoUrl: reel.videoUrl || '',
        dislikesCount: newDislikesCount,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to sync reel dislike in Firebase:', err);
  }
}

export async function toggleSavedReelInFirebase(
  reelId: string,
  uid: string,
  isSaved: boolean
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reelId) return;
  try {
    const savedDocRef = doc(db, 'users', uid, 'saved', reelId);
    if (isSaved) {
      await setDoc(savedDocRef, {
        reelId,
        uid,
        savedAt: Date.now(),
      });
    } else {
      await deleteDoc(savedDocRef);
    }
  } catch (err) {
    console.warn('Failed to sync saved reel in Firebase:', err);
  }
}

export async function getReelsByIdsFromFirebase(reelIds: string[]): Promise<ReelItem[]> {
  if (!reelIds.length) return [];
  const results: ReelItem[] = [];
  await Promise.all(
    reelIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(db, 'reels', id));
        if (snap.exists()) {
          results.push(snap.data() as ReelItem);
        }
      } catch {
        // ignore individual reel lookup failure
      }
    })
  );
  return results;
}

export async function toggleFollowUserInFirebase(
  targetUsername: string,
  uid: string,
  isFollowing: boolean,
  followerProfile?: Partial<UserProfile>
): Promise<void> {
  if (!uid || uid === 'guest_user' || !targetUsername) return;
  const now = Date.now();
  try {
    const targetUid = await resolveRecipientUidByUsername(targetUsername);
    let targetName = '';
    let targetAvatar = '';

    if (isFollowing) {
      try {
        const lookupId = targetUid || targetUsername;
        const targetSnap = await getDoc(doc(db, 'users', lookupId));
        if (targetSnap.exists()) {
          const data = targetSnap.data() as Partial<UserProfile>;
          targetName = (data.name || '').trim().slice(0, 80);
          targetAvatar = (data.avatarUrl || '').trim().slice(0, 500);
        }
      } catch {
        // ignore optional metadata enrichment
      }
    }

    const followDocRef = doc(db, 'users', uid, 'following', targetUsername);
    if (isFollowing) {
      await setDoc(followDocRef, {
        username: targetUsername,
        uid,
        ...(targetUid ? { targetUid: targetUid.slice(0, 128) } : {}),
        ...(targetName ? { name: targetName } : {}),
        ...(targetAvatar ? { avatarUrl: targetAvatar } : {}),
        followedAt: now,
      });
    } else {
      await deleteDoc(followDocRef);
    }

    // Mirror bidirectional follower entry under target user's followers subcollection
    if (targetUid && targetUid !== 'guest_user' && targetUid !== uid) {
      const followerDocRef = doc(db, 'users', targetUid, 'followers', uid);
      if (isFollowing) {
        const cleanFollowerUsername =
          (followerProfile?.username || 'user').trim().slice(0, 60) || 'user';
        const cleanFollowerName =
          (followerProfile?.name || cleanFollowerUsername).trim().slice(0, 80) ||
          cleanFollowerUsername;
        const cleanFollowerAvatar = (followerProfile?.avatarUrl || '').slice(0, 500);
        await setDoc(followerDocRef, {
          uid,
          username: cleanFollowerUsername,
          ...(cleanFollowerName ? { name: cleanFollowerName } : {}),
          ...(cleanFollowerAvatar ? { avatarUrl: cleanFollowerAvatar } : {}),
          followedAt: now,
        });
      } else {
        await deleteDoc(followerDocRef);
      }
    }
  } catch (err) {
    console.warn('Failed to sync follow state in Firebase:', err);
  }
}

export async function getUserFollowCountsFromFirebase(
  uidOrUsername: string
): Promise<{ followers: number; following: number }> {
  const clean = (uidOrUsername || '').trim();
  if (!clean || clean === 'guest_user') {
    return { followers: 0, following: 0 };
  }

  try {
    let targetUid = clean;
    const directSnap = await getDoc(doc(db, 'users', clean)).catch(() => null);
    if (!directSnap || !directSnap.exists()) {
      const resolved = await resolveRecipientUidByUsername(clean);
      if (resolved) targetUid = resolved;
    } else {
      const data = directSnap.data() as Partial<UserProfile>;
      if (data?.uid) targetUid = data.uid;
    }

    const [followersCountSnap, followingCountSnap] = await Promise.all([
      getCountFromServer(collection(db, 'users', targetUid, 'followers')).catch(() => null),
      getCountFromServer(collection(db, 'users', targetUid, 'following')).catch(() => null),
    ]);

    return {
      followers: followersCountSnap ? followersCountSnap.data().count : 0,
      following: followingCountSnap ? followingCountSnap.data().count : 0,
    };
  } catch (err) {
    console.warn('Failed to fetch real follow counts from Firebase:', err);
    return { followers: 0, following: 0 };
  }
}

export function subscribeToUserFollowCounts(
  uid: string,
  onUpdate: (counts: { followers: number; following: number }) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate({ followers: 0, following: 0 });
    return () => {};
  }

  let followersCount = 0;
  let followingCount = 0;
  let followersLoaded = false;
  let followingLoaded = false;

  const emit = () => {
    if (!followersLoaded && !followingLoaded) return;
    onUpdate({
      followers: followersCount,
      following: followingCount,
    });
  };

  // Seed immediately with server count in case cache is empty
  void getUserFollowCountsFromFirebase(uid).then((initial) => {
    if (!followersLoaded) followersCount = initial.followers;
    if (!followingLoaded) followingCount = initial.following;
    onUpdate({ followers: followersCount, following: followingCount });
  });

  const unsubFollowers = onSnapshot(
    collection(db, 'users', uid, 'followers'),
    (snap) => {
      followersLoaded = true;
      followersCount = snap.size;
      emit();
    },
    (err) => {
      console.warn('Followers count listener warning:', err);
    }
  );

  const unsubFollowing = onSnapshot(
    collection(db, 'users', uid, 'following'),
    (snap) => {
      followingLoaded = true;
      followingCount = snap.size;
      emit();
    },
    (err) => {
      console.warn('Following count listener warning:', err);
    }
  );

  return () => {
    unsubFollowers();
    unsubFollowing();
  };
}

export interface FollowListPageResult {
  users: FollowListUser[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  isPrivateRestricted: boolean;
  usedFallbackOrder?: boolean;
}

export async function getFollowListPageFromFirebase(params: {
  targetUid?: string;
  targetUsername: string;
  type: 'followers' | 'following';
  viewerUid?: string;
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  useFallbackOrder?: boolean;
}): Promise<FollowListPageResult> {
  const {
    targetUid,
    targetUsername,
    type,
    viewerUid,
    pageSize = 30,
    cursor = null,
    useFallbackOrder = false,
  } = params;

  const cleanUsername = (targetUsername || '').trim();
  let resolvedUid = (targetUid || '').trim();
  if (!resolvedUid && cleanUsername) {
    resolvedUid = (await resolveRecipientUidByUsername(cleanUsername)) || '';
  }

  if (!resolvedUid || resolvedUid === 'guest_user') {
    return { users: [], lastDoc: null, hasMore: false, isPrivateRestricted: false };
  }

  try {
    // Enforce privacy: non-followers cannot view private user's followers/following lists
    const profileSnap = await getDoc(doc(db, 'users', resolvedUid)).catch(() => null);
    const profileData = profileSnap?.exists()
      ? (profileSnap.data() as Partial<UserProfile>)
      : null;
    const isOwner = Boolean(viewerUid && viewerUid === resolvedUid);
    let isApprovedFollower = false;
    if (profileData?.isPrivate && !isOwner && viewerUid && viewerUid !== 'guest_user') {
      const followerSnap = await getDoc(
        doc(db, 'users', resolvedUid, 'followers', viewerUid)
      ).catch(() => null);
      isApprovedFollower = Boolean(followerSnap?.exists());
    }
    if (profileData?.isPrivate && !isOwner && !isApprovedFollower) {
      return { users: [], lastDoc: null, hasMore: false, isPrivateRestricted: true };
    }

    const colRef = collection(db, 'users', resolvedUid, type);
    let activeFallbackOrder = useFallbackOrder;
    let snap;

    if (!activeFallbackOrder) {
      try {
        const q = cursor
          ? query(colRef, orderBy('followedAt', 'desc'), startAfter(cursor), limit(pageSize))
          : query(colRef, orderBy('followedAt', 'desc'), limit(pageSize));
        snap = await getDocs(q);
      } catch {
        activeFallbackOrder = true;
        const fallbackQ = cursor
          ? query(colRef, startAfter(cursor), limit(pageSize))
          : query(colRef, limit(pageSize));
        snap = await getDocs(fallbackQ);
      }
      // On first page, if ordered query is empty, double-check unordered in case docs lack followedAt
      if (!cursor && snap.empty) {
        const fallbackQ = query(colRef, limit(pageSize));
        const fallbackSnap = await getDocs(fallbackQ);
        if (!fallbackSnap.empty) {
          activeFallbackOrder = true;
          snap = fallbackSnap;
        }
      }
    } else {
      const fallbackQ = cursor
        ? query(colRef, startAfter(cursor), limit(pageSize))
        : query(colRef, limit(pageSize));
      snap = await getDocs(fallbackQ);
    }

    const rawEntries: FollowListUser[] = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const uname =
        type === 'following'
          ? ((data.username as string) || d.id || '').trim()
          : ((data.username as string) || '').trim();
      if (!uname) return;

      const entryUid =
        type === 'following'
          ? ((data.targetUid as string) || '').trim()
          : ((data.uid as string) || d.id || '').trim();

      rawEntries.push({
        uid: entryUid || undefined,
        username: uname,
        name: ((data.name as string) || '').trim() || uname,
        avatarUrl: ((data.avatarUrl as string) || '').trim(),
        followedAt: typeof data.followedAt === 'number' ? data.followedAt : 0,
      });
    });

    // Enrich each user with current profile metadata (photo, name, blueTick, privacy)
    const enrichedUsers = await Promise.all(
      rawEntries.map(async (entry) => {
        try {
          let lookupSnap = entry.uid
            ? await getDoc(doc(db, 'users', entry.uid)).catch(() => null)
            : null;
          if (!lookupSnap || !lookupSnap.exists()) {
            const byNameUid = await resolveRecipientUidByUsername(entry.username);
            if (byNameUid) {
              lookupSnap = await getDoc(doc(db, 'users', byNameUid)).catch(() => null);
            }
          }
          if (!lookupSnap || !lookupSnap.exists()) {
            lookupSnap = await getDoc(doc(db, 'users', entry.username)).catch(() => null);
          }

          if (lookupSnap && lookupSnap.exists()) {
            const profile = lookupSnap.data() as Partial<UserProfile>;
            if (
              profile.isAccountHidden ||
              profile.accountStatus === 'deactivated' ||
              profile.accountStatus === 'pending_deletion'
            ) {
              return null;
            }
            return {
              uid: profile.uid || entry.uid || lookupSnap.id,
              username: profile.username || entry.username,
              name: (profile.name || '').trim() || entry.name || entry.username,
              avatarUrl:
                profile.avatarUrl ||
                entry.avatarUrl ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                  entry.username
                )}`,
              bio: profile.bio || '',
              isBlueTick: Boolean(profile.isBlueTick),
              isPrivate: Boolean(profile.isPrivate),
              followedAt: entry.followedAt,
            } as FollowListUser;
          }
        } catch {
          // ignore individual user enrichment failure
        }

        return {
          ...entry,
          avatarUrl:
            entry.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(entry.username)}`,
        } as FollowListUser;
      })
    );

    const visibleUsers = enrichedUsers.filter((u): u is FollowListUser => Boolean(u));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

    return {
      users: visibleUsers,
      lastDoc,
      hasMore: snap.docs.length === pageSize,
      isPrivateRestricted: false,
      usedFallbackOrder: activeFallbackOrder,
    };
  } catch (err) {
    console.warn(`Failed to load ${type} list page from Firebase:`, err);
    return { users: [], lastDoc: null, hasMore: false, isPrivateRestricted: false };
  }
}

export async function resolveFullUserProfileForNavigation(
  user: FollowListUser
): Promise<UserProfile> {
  const cleanUsername = (user.username || '').trim();
  let resolvedUid = (user.uid || '').trim();
  if (!resolvedUid && cleanUsername) {
    resolvedUid = (await resolveRecipientUidByUsername(cleanUsername)) || '';
  }

  let dbProfile: UserProfile | null = null;
  if (resolvedUid) {
    dbProfile = await getUserProfileFromFirebase(resolvedUid);
  }
  if (!dbProfile && cleanUsername) {
    dbProfile = await getUserProfileFromFirebase(cleanUsername);
  }

  const countTarget = dbProfile?.uid || resolvedUid || cleanUsername;
  const counts = countTarget
    ? await getUserFollowCountsFromFirebase(countTarget)
    : { followers: 0, following: 0 };

  if (dbProfile) {
    return {
      ...dbProfile,
      uid: dbProfile.uid || resolvedUid || undefined,
      followers: counts.followers,
      following: counts.following,
    };
  }

  return {
    uid: resolvedUid || undefined,
    name: user.name || cleanUsername,
    username: cleanUsername,
    postsCount: 0,
    followers: counts.followers,
    following: counts.following,
    isBlueTick: Boolean(user.isBlueTick),
    isPremium: false,
    referralCode: '',
    successfulReferrals: 0,
    dailyFollows: 0,
    avatarUrl:
      user.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanUsername)}`,
    bio: user.bio || '',
    isPrivate: Boolean(user.isPrivate),
    followingList: [],
    isGuest: false,
  };
}

export interface UserInteractionsData {
  likedReelIds: Set<string>;
  savedReelIds: Set<string>;
  dislikedReelIds: Set<string>;
  followingUsernames: string[];
}

export async function getUserInteractionsFromFirebase(
  uid: string,
  reelIds: string[]
): Promise<UserInteractionsData> {
  const likedReelIds = new Set<string>();
  const savedReelIds = new Set<string>();
  const dislikedReelIds = new Set<string>();
  const followingUsernames: string[] = [];

  if (!uid || uid === 'guest_user') {
    return { likedReelIds, savedReelIds, dislikedReelIds, followingUsernames };
  }

  try {
    const [savedSnap, dislikedSnap, followingSnap] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'saved')),
      getDocs(collection(db, 'users', uid, 'disliked')),
      getDocs(collection(db, 'users', uid, 'following')),
    ]);

    savedSnap.forEach((d) => {
      savedReelIds.add(d.id);
    });

    dislikedSnap.forEach((d) => {
      dislikedReelIds.add(d.id);
    });

    followingSnap.forEach((d) => {
      const data = d.data();
      followingUsernames.push((data?.username as string) || d.id);
    });

    // Check reels/{reelId}/likes/{uid} for each loaded reel
    await Promise.all(
      reelIds.map(async (reelId) => {
        try {
          const likeDoc = await getDoc(doc(db, 'reels', reelId, 'likes', uid));
          if (likeDoc.exists()) {
            likedReelIds.add(reelId);
          }
        } catch {
          // ignore individual reel read failures
        }
      })
    );
  } catch (err) {
    console.warn('Failed to fetch user interactions from Firebase:', err);
  }

  return { likedReelIds, savedReelIds, dislikedReelIds, followingUsernames };
}

// ======================== COMMENTS SUBCOLLECTION ========================

function formatCommentTimeAgo(createdAt?: number, fallback?: string): string {
  if (!createdAt || typeof createdAt !== 'number') return fallback || 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export async function saveReelCommentToFirebase(
  reel: ReelItem,
  comment: ReelComment,
  uid: string,
  updatedCommentsCount?: string
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reel.id || !comment.id) return;

  const cleanText = comment.text.trim().slice(0, 1000);
  if (!cleanText) return;

  const cleanUser = (comment.user || 'user').trim().slice(0, 60) || 'user';
  const cleanAvatar = (comment.avatar || '').slice(0, 500);
  const createdAt = typeof comment.createdAt === 'number' && comment.createdAt > 0 ? comment.createdAt : Date.now();

  try {
    const commentDocRef = doc(db, 'reels', reel.id, 'comments', comment.id);
    await setDoc(commentDocRef, {
      id: comment.id,
      reelId: reel.id,
      uid,
      user: cleanUser,
      avatar: cleanAvatar,
      text: cleanText,
      timeAgo: comment.timeAgo || 'Just now',
      likes: typeof comment.likes === 'number' ? Math.max(0, comment.likes) : 0,
      repliesCount: typeof comment.repliesCount === 'number' ? Math.max(0, comment.repliesCount) : 0,
      createdAt,
    });

    const reelRef = doc(db, 'reels', reel.id);
    await setDoc(
      reelRef,
      {
        id: reel.id,
        title: reel.title || '',
        user: reel.user || '',
        videoUrl: reel.videoUrl || '',
        ...(updatedCommentsCount !== undefined ? { comments: updatedCommentsCount } : {}),
        updatedAt: createdAt,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to save comment to Firebase:', err);
  }
}

async function hydrateCommentsLikes(
  reelId: string,
  comments: ReelComment[],
  viewerUid?: string
): Promise<ReelComment[]> {
  if (!viewerUid || viewerUid === 'guest_user' || comments.length === 0) {
    return comments;
  }

  const likedFlags = await Promise.all(
    comments.map(async (c) => {
      try {
        const likeSnap = await getDoc(doc(db, 'reels', reelId, 'comments', c.id, 'likes', viewerUid));
        return likeSnap.exists();
      } catch {
        return false;
      }
    })
  );

  return comments.map((c, idx) => ({
    ...c,
    isLiked: likedFlags[idx],
  }));
}

function mapDocToReelComment(d: QueryDocumentSnapshot<DocumentData>, reelId: string): ReelComment {
  const data = d.data();
  const createdAt = typeof data.createdAt === 'number' ? data.createdAt : undefined;
  return {
    id: (data.id as string) || d.id,
    reelId: (data.reelId as string) || reelId,
    ...(typeof data.uid === 'string' && data.uid ? { uid: data.uid } : {}),
    user: (data.user as string) || 'user',
    avatar: (data.avatar as string) || '',
    text: (data.text as string) || '',
    timeAgo: formatCommentTimeAgo(createdAt, data.timeAgo as string | undefined),
    likes: typeof data.likes === 'number' ? Math.max(0, data.likes) : 0,
    repliesCount: typeof data.repliesCount === 'number' ? Math.max(0, data.repliesCount) : 0,
    ...(createdAt !== undefined ? { createdAt } : {}),
  };
}

export async function getReelCommentsPageFromFirebase(
  reelId: string,
  viewerUid?: string,
  pageSize = 20,
  cursor?: QueryDocumentSnapshot<DocumentData> | null
): Promise<{
  comments: ReelComment[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  if (!reelId) return { comments: [], lastDoc: null, hasMore: false };
  try {
    const q = cursor
      ? query(
          collection(db, 'reels', reelId, 'comments'),
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(pageSize)
        )
      : query(
          collection(db, 'reels', reelId, 'comments'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
    const snap = await getDocs(q);
    const rawComments: ReelComment[] = snap.docs.map((d) => mapDocToReelComment(d, reelId));
    const hydrated = await hydrateCommentsLikes(reelId, rawComments, viewerUid);
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return {
      comments: hydrated,
      lastDoc,
      hasMore: snap.docs.length === pageSize,
    };
  } catch (err) {
    console.warn('Failed to fetch paginated reel comments from Firebase:', err);
    return { comments: [], lastDoc: null, hasMore: false };
  }
}

export async function getReelCommentsFromFirebase(
  reelId: string,
  viewerUid?: string
): Promise<ReelComment[]> {
  const { comments } = await getReelCommentsPageFromFirebase(reelId, viewerUid, 20, null);
  return comments;
}

export async function getAllReelsCommentsFromFirebase(
  reelIds: string[],
  viewerUid?: string
): Promise<Record<string, ReelComment[]>> {
  const result: Record<string, ReelComment[]> = {};
  if (!reelIds.length) return result;

  await Promise.all(
    reelIds.map(async (reelId) => {
      const fetched = await getReelCommentsFromFirebase(reelId, viewerUid);
      if (fetched.length > 0) {
        result[reelId] = fetched;
      }
    })
  );

  return result;
}

export function subscribeToReelComments(
  reelId: string,
  onUpdate: (comments: ReelComment[]) => void,
  viewerUid?: string
): () => void {
  if (!reelId) return () => {};
  const q = query(
    collection(db, 'reels', reelId, 'comments'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    async (snap) => {
      const rawComments: ReelComment[] = snap.docs.map((d) => mapDocToReelComment(d, reelId));
      const hydrated = await hydrateCommentsLikes(reelId, rawComments, viewerUid);
      onUpdate(hydrated);
    },
    (err) => {
      console.warn('Realtime comments listener warning:', err);
    }
  );
}

async function ensureParentCommentDoc(reel: ReelItem, comment: ReelComment): Promise<void> {
  const commentRef = doc(db, 'reels', reel.id, 'comments', comment.id);
  const snap = await getDoc(commentRef);
  if (snap.exists()) return;

  const fallbackCreatedAt =
    typeof comment.createdAt === 'number' && comment.createdAt > 0
      ? comment.createdAt
      : Date.now() - 86400000;

  await setDoc(commentRef, {
    id: comment.id,
    reelId: reel.id,
    uid: comment.uid || 'seed_creator',
    user: (comment.user || 'user').trim().slice(0, 60) || 'user',
    avatar: (comment.avatar || '').slice(0, 500),
    text: (comment.text || '').trim().slice(0, 1000) || 'Comment',
    timeAgo: (comment.timeAgo || '1h').slice(0, 50),
    likes: typeof comment.likes === 'number' ? Math.max(0, comment.likes) : 0,
    repliesCount: typeof comment.repliesCount === 'number' ? Math.max(0, comment.repliesCount) : 0,
    createdAt: fallbackCreatedAt,
  });
}

export async function toggleCommentLikeInFirebase(
  reel: ReelItem,
  comment: ReelComment,
  uid: string,
  nextIsLiked: boolean,
  nextLikesCount: number
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reel.id || !comment.id) return;

  try {
    await ensureParentCommentDoc(reel, comment);

    const likeRef = doc(db, 'reels', reel.id, 'comments', comment.id, 'likes', uid);
    if (nextIsLiked) {
      await setDoc(likeRef, {
        uid,
        commentId: comment.id,
        reelId: reel.id,
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(likeRef);
    }

    const commentRef = doc(db, 'reels', reel.id, 'comments', comment.id);
    await updateDoc(commentRef, {
      likes: Math.max(0, nextLikesCount),
    });
  } catch (err) {
    console.warn('Failed to toggle comment like in Firebase:', err);
  }
}

export async function getCommentRepliesFromFirebase(
  reelId: string,
  commentId: string,
  viewerUid?: string
): Promise<ReelCommentReply[]> {
  if (!reelId || !commentId) return [];
  try {
    const q = query(
      collection(db, 'reels', reelId, 'comments', commentId, 'replies'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const rawReplies: ReelCommentReply[] = snap.docs.map((d) => {
      const data = d.data();
      const createdAt = typeof data.createdAt === 'number' ? data.createdAt : undefined;
      return {
        id: (data.id as string) || d.id,
        commentId: (data.commentId as string) || commentId,
        reelId: (data.reelId as string) || reelId,
        ...(typeof data.uid === 'string' && data.uid ? { uid: data.uid } : {}),
        user: (data.user as string) || 'user',
        avatar: (data.avatar as string) || '',
        text: (data.text as string) || '',
        ...(typeof data.replyToUsername === 'string' && data.replyToUsername
          ? { replyToUsername: data.replyToUsername }
          : {}),
        timeAgo: formatCommentTimeAgo(createdAt, data.timeAgo as string | undefined),
        likes: typeof data.likes === 'number' ? Math.max(0, data.likes) : 0,
        ...(createdAt !== undefined ? { createdAt } : {}),
      };
    });

    if (!viewerUid || viewerUid === 'guest_user' || rawReplies.length === 0) {
      return rawReplies;
    }

    const likedFlags = await Promise.all(
      rawReplies.map(async (r) => {
        try {
          const likeSnap = await getDoc(
            doc(db, 'reels', reelId, 'comments', commentId, 'replies', r.id, 'likes', viewerUid)
          );
          return likeSnap.exists();
        } catch {
          return false;
        }
      })
    );

    return rawReplies.map((r, idx) => ({
      ...r,
      isLiked: likedFlags[idx],
    }));
  } catch (err) {
    console.warn('Failed to fetch comment replies from Firebase:', err);
    return [];
  }
}

export async function saveCommentReplyToFirebase(
  reel: ReelItem,
  parentComment: ReelComment,
  reply: ReelCommentReply,
  uid: string,
  nextRepliesCount: number
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reel.id || !parentComment.id || !reply.id) return;

  const cleanText = reply.text.trim().slice(0, 1000);
  if (!cleanText) return;

  const cleanUser = (reply.user || 'user').trim().slice(0, 60) || 'user';
  const cleanAvatar = (reply.avatar || '').slice(0, 500);
  const createdAt = typeof reply.createdAt === 'number' && reply.createdAt > 0 ? reply.createdAt : Date.now();

  try {
    await ensureParentCommentDoc(reel, parentComment);

    const replyRef = doc(db, 'reels', reel.id, 'comments', parentComment.id, 'replies', reply.id);
    await setDoc(replyRef, {
      id: reply.id,
      reelId: reel.id,
      commentId: parentComment.id,
      uid,
      user: cleanUser,
      avatar: cleanAvatar,
      text: cleanText,
      ...(reply.replyToUsername ? { replyToUsername: reply.replyToUsername.slice(0, 60) } : {}),
      timeAgo: reply.timeAgo || 'Just now',
      likes: typeof reply.likes === 'number' ? Math.max(0, reply.likes) : 0,
      createdAt,
    });

    const parentRef = doc(db, 'reels', reel.id, 'comments', parentComment.id);
    await updateDoc(parentRef, {
      repliesCount: Math.max(0, nextRepliesCount),
    });
  } catch (err) {
    console.warn('Failed to save comment reply to Firebase:', err);
  }
}

export async function toggleReplyLikeInFirebase(
  reelId: string,
  commentId: string,
  reply: ReelCommentReply,
  uid: string,
  nextIsLiked: boolean,
  nextLikesCount: number
): Promise<void> {
  if (!uid || uid === 'guest_user' || !reelId || !commentId || !reply.id) return;

  try {
    const likeRef = doc(
      db,
      'reels',
      reelId,
      'comments',
      commentId,
      'replies',
      reply.id,
      'likes',
      uid
    );

    if (nextIsLiked) {
      await setDoc(likeRef, {
        uid,
        replyId: reply.id,
        commentId,
        reelId,
        createdAt: Date.now(),
      });
    } else {
      await deleteDoc(likeRef);
    }

    const replyRef = doc(db, 'reels', reelId, 'comments', commentId, 'replies', reply.id);
    await updateDoc(replyRef, {
      likes: Math.max(0, nextLikesCount),
    });
  } catch (err) {
    console.warn('Failed to toggle reply like in Firebase:', err);
  }
}

export async function deleteReelCommentFromFirebase(
  reelId: string,
  commentId: string,
  updatedCommentsCount?: string
): Promise<void> {
  if (!reelId || !commentId) return;

  try {
    // 1. Delete subcollection docs (likes & replies + reply likes)
    const [commentLikesSnap, repliesSnap] = await Promise.all([
      getDocs(collection(db, 'reels', reelId, 'comments', commentId, 'likes')),
      getDocs(collection(db, 'reels', reelId, 'comments', commentId, 'replies')),
    ]);

    await Promise.all([
      ...commentLikesSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})),
      ...repliesSnap.docs.map(async (replyDoc) => {
        try {
          const replyLikesSnap = await getDocs(
            collection(db, 'reels', reelId, 'comments', commentId, 'replies', replyDoc.id, 'likes')
          );
          await Promise.all(replyLikesSnap.docs.map((ld) => deleteDoc(ld.ref).catch(() => {})));
        } catch {
          // ignore
        }
        await deleteDoc(replyDoc.ref).catch(() => {});
      }),
    ]);

    // 2. Delete the comment document itself
    await deleteDoc(doc(db, 'reels', reelId, 'comments', commentId));

    // 3. Update parent reel comment count if numeric
    if (updatedCommentsCount !== undefined) {
      try {
        await updateDoc(doc(db, 'reels', reelId), {
          comments: updatedCommentsCount,
          updatedAt: Date.now(),
        });
      } catch {
        // Reel doc may be a mock seed reel without a Firestore parent doc
      }
    }
  } catch (err) {
    console.warn('Failed to delete comment from Firebase:', err);
  }
}

export async function deleteCommentReplyFromFirebase(
  reelId: string,
  commentId: string,
  replyId: string,
  nextRepliesCount: number
): Promise<void> {
  if (!reelId || !commentId || !replyId) return;

  try {
    const replyLikesSnap = await getDocs(
      collection(db, 'reels', reelId, 'comments', commentId, 'replies', replyId, 'likes')
    );
    await Promise.all(replyLikesSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));

    await deleteDoc(doc(db, 'reels', reelId, 'comments', commentId, 'replies', replyId));

    await updateDoc(doc(db, 'reels', reelId, 'comments', commentId), {
      repliesCount: Math.max(0, nextRepliesCount),
    });
  } catch (err) {
    console.warn('Failed to delete comment reply from Firebase:', err);
  }
}

// ======================== REAL FIREBASE SEARCH ========================

const SEARCH_RESULTS_LIMIT = 20;

function normalizeFirebaseReel(docId: string, raw: Partial<ReelItem>): ReelItem {
  return {
    id: raw.id || docId,
    ...(raw.uid ? { uid: raw.uid } : {}),
    title: raw.title || '',
    user: raw.user || 'creator',
    userAvatar:
      raw.userAvatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(raw.user || 'creator')}`,
    videoUrl: raw.videoUrl || '',
    posterUrl: raw.posterUrl || raw.cloudinary?.thumbnailUrl || '',
    views: raw.views || (typeof raw.viewsCount === 'number' ? String(raw.viewsCount) : '0'),
    viewsCount: typeof raw.viewsCount === 'number' ? raw.viewsCount : 0,
    likes: raw.likes || (typeof raw.likesCount === 'number' ? String(raw.likesCount) : '0'),
    likesCount: typeof raw.likesCount === 'number' ? raw.likesCount : 0,
    comments: raw.comments || '0',
    shares: raw.shares || '0',
    soundTitle: raw.soundTitle || 'Original Audio',
    category: raw.category || 'both',
    isLiked: false,
    isDisliked: false,
    isSaved: false,
    isFollowing: false,
    timestamp: raw.timestamp || 0,
    createdAt: raw.createdAt || '',
    cloudinary: raw.cloudinary,
    dislikesCount: raw.dislikesCount || 0,
    reportsCount: raw.reportsCount || 0,
    isAutoHidden: Boolean(raw.isAutoHidden),
    isAccountHidden: Boolean(raw.isAccountHidden),
    commentsList: raw.commentsList || [],
  };
}

function isReelVisible(reel: ReelItem): boolean {
  if (!reel.id || !reel.videoUrl) return false;
  if (reel.isAutoHidden || (reel.reportsCount && reel.reportsCount >= 7)) return false;
  if (reel.isAccountHidden) return false;
  return true;
}

export interface FirebaseSearchResults {
  reels: ReelItem[];
  users: UserProfile[];
}

export async function searchReelsAndUsersInFirebase(
  searchTerm: string
): Promise<FirebaseSearchResults> {
  const term = searchTerm.trim().toLowerCase();

  try {
    // When search box is empty, return newest reels from Firebase (max 20)
    if (!term) {
      let snap;
      try {
        snap = await getDocs(
          query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(SEARCH_RESULTS_LIMIT))
        );
      } catch {
        snap = await getDocs(query(collection(db, 'reels'), limit(SEARCH_RESULTS_LIMIT)));
      }

      const newestReels: ReelItem[] = [];
      snap.forEach((d) => {
        const reel = normalizeFirebaseReel(d.id, d.data() as Partial<ReelItem>);
        if (isReelVisible(reel)) {
          newestReels.push(reel);
        }
      });

      newestReels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return {
        reels: newestReels.slice(0, SEARCH_RESULTS_LIMIT),
        users: [],
      };
    }

    // Non-empty query: fetch real reels & real users from Firebase in parallel
    const [reelsSnap, usersSnap] = await Promise.all([
      (async () => {
        try {
          return await getDocs(
            query(collection(db, 'reels'), orderBy('timestamp', 'desc'), limit(100))
          );
        } catch {
          return await getDocs(query(collection(db, 'reels'), limit(100)));
        }
      })(),
      getDocs(query(collection(db, 'users'), limit(100))),
    ]);

    // Match reels by caption (title)
    const matchedReels: ReelItem[] = [];
    reelsSnap.forEach((d) => {
      const reel = normalizeFirebaseReel(d.id, d.data() as Partial<ReelItem>);
      if (!isReelVisible(reel)) return;
      if (reel.title.toLowerCase().includes(term)) {
        matchedReels.push(reel);
      }
    });
    matchedReels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Deduplicate user documents (primary users/{uid} vs mirror users/{username})
    const usersByKey = new Map<string, UserProfile>();
    usersSnap.forEach((d) => {
      const data = d.data() as Partial<UserProfile>;
      if (!data) return;
      if (data.isGuest || data.uid === 'guest_user') return;
      if (
        data.isAccountHidden ||
        data.accountStatus === 'deactivated' ||
        data.accountStatus === 'pending_deletion'
      ) {
        return;
      }
      const username = (data.username || '').trim();
      const name = (data.name || '').trim();
      if (!username) return;

      const key = data.uid || d.id;
      const existing = usersByKey.get(key);
      if (!existing || d.id === data.uid) {
        usersByKey.set(key, {
          uid: data.uid || d.id,
          email: data.email,
          phone: data.phone,
          name: name || username,
          username,
          postsCount: data.postsCount || 0,
          followers: data.followers || 0,
          following: data.following || 0,
          isBlueTick: Boolean(data.isBlueTick),
          isPremium: Boolean(data.isPremium),
          referralCode: data.referralCode || '',
          successfulReferrals: data.successfulReferrals || 0,
          dailyFollows: data.dailyFollows || 0,
          avatarUrl:
            data.avatarUrl ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
          bio: data.bio || '',
          isPrivate: Boolean(data.isPrivate),
          totalLikes: data.totalLikes || 0,
          totalViews: data.totalViews || 0,
          followingList: data.followingList || [],
          isGuest: false,
        });
      }
    });

    // Match users by username or name
    const matchedUsers: UserProfile[] = [];
    usersByKey.forEach((u) => {
      const uname = (u.username || '').toLowerCase();
      const fullName = (u.name || '').toLowerCase();
      if (uname.includes(term) || fullName.includes(term)) {
        matchedUsers.push(u);
      }
    });

    // Cap total combined results to maximum 20
    let finalUsers = matchedUsers;
    let finalReels = matchedReels;
    if (finalUsers.length + finalReels.length > SEARCH_RESULTS_LIMIT) {
      const userCap =
        finalReels.length === 0 ? SEARCH_RESULTS_LIMIT : Math.min(finalUsers.length, 10);
      finalUsers = finalUsers.slice(0, userCap);
      finalReels = finalReels.slice(0, SEARCH_RESULTS_LIMIT - finalUsers.length);
    }

    return {
      reels: finalReels,
      users: finalUsers,
    };
  } catch (err) {
    console.warn('Firebase search error:', err);
    return { reels: [], users: [] };
  }
}

export async function getUserReelsFromFirebase(username: string): Promise<ReelItem[]> {
  if (!username) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'reels'), where('user', '==', username), limit(SEARCH_RESULTS_LIMIT))
    );
    const list: ReelItem[] = [];
    snap.forEach((d) => {
      const reel = normalizeFirebaseReel(d.id, d.data() as Partial<ReelItem>);
      if (isReelVisible(reel)) {
        list.push(reel);
      }
    });
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list.slice(0, SEARCH_RESULTS_LIMIT);
  } catch (err) {
    console.warn('Failed to fetch user reels from Firebase:', err);
    return [];
  }
}

// ======================== REAL-TIME USER NOTIFICATIONS ========================

async function resolveRecipientUidByUsername(username: string): Promise<string | null> {
  const clean = username.trim();
  if (!clean) return null;

  try {
    // 1. Check usernames/{username} claim index first
    const claimSnap = await getDoc(doc(db, 'usernames', clean));
    if (claimSnap.exists()) {
      const uid = claimSnap.data()?.uid as string | undefined;
      if (uid && uid !== 'guest_user') return uid;
    }

    // 2. Query users collection by username field
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('username', '==', clean), limit(3))
    );
    let resolvedUid: string | null = null;
    usersSnap.forEach((d) => {
      if (resolvedUid) return;
      const data = d.data() as Partial<UserProfile>;
      if (data?.isGuest || data?.uid === 'guest_user') return;
      resolvedUid = data?.uid || d.id;
    });
    if (resolvedUid) return resolvedUid;

    // 3. Direct lookup users/{username} fallback
    const directSnap = await getDoc(doc(db, 'users', clean));
    if (directSnap.exists()) {
      const data = directSnap.data() as Partial<UserProfile>;
      if (!data?.isGuest && data?.uid !== 'guest_user') {
        return data?.uid || directSnap.id;
      }
    }
  } catch (err) {
    console.warn('Failed to resolve recipient uid for notification:', err);
  }

  return null;
}

export async function createUserNotificationInFirebase(params: {
  type: 'like' | 'comment' | 'follow';
  actor: UserProfile;
  targetUsername: string;
  reel?: ReelItem;
  commentText?: string;
}): Promise<void> {
  const { type, actor, targetUsername, reel, commentText } = params;
  const actorUid = actor.uid;

  if (!actorUid || actor.isGuest || actorUid === 'guest_user' || !targetUsername) {
    return;
  }

  // Never notify yourself
  if (targetUsername === actor.username) {
    return;
  }

  const recipientUid = await resolveRecipientUidByUsername(targetUsername);
  if (!recipientUid || recipientUid === 'guest_user' || recipientUid === actorUid) {
    return;
  }

  const actorUsername = (actor.username || actor.name || 'user').trim().slice(0, 60) || 'user';
  const actorName = (actor.name || actorUsername).trim().slice(0, 80);
  const actorAvatar = (actor.avatarUrl || '').slice(0, 500);
  const actorHandle = `@${actorUsername}`;

  const cleanReelTitle = (reel?.title || '').trim().slice(0, 200);
  const cleanComment = (commentText || '').trim().slice(0, 200);

  let message = '';
  if (type === 'like') {
    message = `${actorHandle} ने आपकी रील को लाइक किया`;
  } else if (type === 'comment') {
    message = cleanComment
      ? `${actorHandle} ने आपकी रील पर कमेंट किया: "${cleanComment}"`
      : `${actorHandle} ने आपकी रील पर कमेंट किया`;
  } else {
    message = `${actorHandle} ने आपको फ़ॉलो किया`;
  }

  const notificationId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAt = Date.now();

  const payload: NotificationItem = {
    id: notificationId,
    type,
    actorUid,
    actorUsername,
    ...(actorName ? { actorName } : {}),
    ...(actorAvatar ? { actorAvatar } : {}),
    recipientUid,
    ...(reel?.id ? { reelId: reel.id.slice(0, 128) } : {}),
    ...(cleanReelTitle ? { reelTitle: cleanReelTitle } : {}),
    ...(cleanComment ? { commentText: cleanComment } : {}),
    message: message.slice(0, 500),
    read: false,
    createdAt,
  };

  try {
    await setDoc(doc(db, 'users', recipientUid, 'notifications', notificationId), payload);
  } catch (err) {
    console.warn('Failed to create notification in Firebase:', err);
  }
}

export function subscribeToUserNotifications(
  uid: string,
  onUpdate: (notifications: NotificationItem[]) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items: NotificationItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<NotificationItem>;
        if (!data || !data.type || !data.message) return;
        items.push({
          id: data.id || d.id,
          type: data.type,
          actorUid: data.actorUid || '',
          actorUsername: data.actorUsername || 'user',
          actorName: data.actorName,
          actorAvatar: data.actorAvatar,
          recipientUid: data.recipientUid || uid,
          reelId: data.reelId,
          reelTitle: data.reelTitle,
          commentText: data.commentText,
          message: data.message,
          read: Boolean(data.read),
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : 0,
        });
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (err) => {
      console.warn('Realtime notifications listener warning:', err);
    }
  );
}

export async function markAllNotificationsReadInFirebase(
  uid: string,
  notificationIds: string[]
): Promise<void> {
  if (!uid || uid === 'guest_user' || notificationIds.length === 0) return;

  try {
    const batch = writeBatch(db);
    notificationIds.forEach((id) => {
      if (!id) return;
      batch.update(doc(db, 'users', uid, 'notifications', id), { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to mark notifications as read in Firebase:', err);
  }
}

// ======================== ACCOUNT DEACTIVATION & SCHEDULED DELETION ========================

async function setUserAccountContentVisibility(
  uid: string,
  username: string,
  hidden: boolean
): Promise<void> {
  const now = Date.now();
  const tasks: Promise<unknown>[] = [];

  if (username) {
    tasks.push(
      (async () => {
        try {
          const reelsSnap = await getDocs(
            query(collection(db, 'reels'), where('user', '==', username), limit(200))
          );
          if (!reelsSnap.empty) {
            const batch = writeBatch(db);
            reelsSnap.forEach((d) => {
              batch.set(d.ref, { isAccountHidden: hidden, updatedAt: now }, { merge: true });
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn('Failed to update reels account visibility:', err);
        }
      })()
    );

    tasks.push(
      (async () => {
        try {
          const postsSnap = await getDocs(
            query(collection(db, 'posts'), where('user', '==', username), limit(200))
          );
          if (!postsSnap.empty) {
            const batch = writeBatch(db);
            postsSnap.forEach((d) => {
              batch.set(d.ref, { isAccountHidden: hidden, updatedAt: now }, { merge: true });
            });
            await batch.commit();
          }
        } catch (err) {
          console.warn('Failed to update posts account visibility:', err);
        }
      })()
    );
  }

  if (uid && uid !== 'guest_user') {
    tasks.push(
      (async () => {
        try {
          const storyRef = doc(db, 'stories', uid);
          const storySnap = await getDoc(storyRef);
          if (storySnap.exists()) {
            await setDoc(storyRef, { isAccountHidden: hidden, updatedAt: now }, { merge: true });
          }
        } catch (err) {
          console.warn('Failed to update story account visibility:', err);
        }
      })()
    );
  }

  await Promise.all(tasks);
}

async function persistAccountLifecycleFields(
  profile: UserProfile,
  fields: Partial<UserProfile>
): Promise<UserProfile> {
  const uid = profile.uid;
  const updated: UserProfile = {
    ...profile,
    ...fields,
  };

  if (!uid || profile.isGuest || uid === 'guest_user') {
    return updated;
  }

  const now = Date.now();
  await setDoc(doc(db, 'users', uid), { ...updated, updatedAt: now }, { merge: true });

  if (profile.username && profile.username !== uid) {
    await setDoc(
      doc(db, 'users', profile.username),
      { ...updated, updatedAt: now },
      { merge: true }
    );
  }

  return updated;
}

export async function deactivateUserAccountInFirebase(
  profile: UserProfile
): Promise<UserProfile> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') {
    throw new Error('लॉगिन आवश्यक है।');
  }

  const now = Date.now();
  const updated = await persistAccountLifecycleFields(profile, {
    accountStatus: 'deactivated',
    deactivatedAt: now,
    isAccountHidden: true,
  });

  await setUserAccountContentVisibility(uid, profile.username, true);
  return updated;
}

export async function reactivateUserAccountInFirebase(
  profile: UserProfile
): Promise<UserProfile> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') {
    return profile;
  }

  const updated = await persistAccountLifecycleFields(profile, {
    accountStatus: 'active',
    deactivatedAt: null,
    isAccountHidden: false,
  });

  await setUserAccountContentVisibility(uid, profile.username, false);
  return updated;
}

export async function scheduleAccountDeletionInFirebase(
  profile: UserProfile,
  days: 7 | 30
): Promise<UserProfile> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') {
    throw new Error('लॉगिन आवश्यक है।');
  }

  const now = Date.now();
  const deletionScheduledAt = now + days * 24 * 60 * 60 * 1000;

  const updated = await persistAccountLifecycleFields(profile, {
    accountStatus: 'pending_deletion',
    deletionScheduledAt,
    deletionDays: days,
    deactivatedAt: null,
    isAccountHidden: true,
  });

  await setUserAccountContentVisibility(uid, profile.username, true);
  return updated;
}

export async function cancelAccountDeletionInFirebase(
  profile: UserProfile
): Promise<UserProfile> {
  const uid = profile.uid;
  if (!uid || profile.isGuest || uid === 'guest_user') {
    return profile;
  }

  const updated = await persistAccountLifecycleFields(profile, {
    accountStatus: 'active',
    deletionScheduledAt: null,
    deletionDays: null,
    deactivatedAt: null,
    isAccountHidden: false,
  });

  await setUserAccountContentVisibility(uid, profile.username, false);
  return updated;
}

async function deleteCollectionDocs(pathSegments: [string, ...string[]]): Promise<void> {
  try {
    const colRef = collection(db, ...pathSegments);
    const snap = await getDocs(colRef);
    if (snap.empty) return;
    await Promise.all(
      snap.docs.map((d) =>
        deleteDoc(d.ref).catch((err) => {
          console.warn('Subcollection doc delete skipped:', d.ref.path, err);
        })
      )
    );
  } catch (err) {
    console.warn('Collection delete warning:', pathSegments.join('/'), err);
  }
}

export async function permanentlyDeleteUserAccountInFirebase(
  profile: UserProfile
): Promise<void> {
  const uid = profile.uid;
  const username = (profile.username || '').trim();
  if (!uid || profile.isGuest || uid === 'guest_user') return;

  // 1. Delete user subcollections
  await Promise.all([
    deleteCollectionDocs(['users', uid, 'saved']),
    deleteCollectionDocs(['users', uid, 'disliked']),
    deleteCollectionDocs(['users', uid, 'following']),
    deleteCollectionDocs(['users', uid, 'followers']),
    deleteCollectionDocs(['users', uid, 'notifications']),
    deleteCollectionDocs(['users', uid, 'seenStories']),
    deleteCollectionDocs(['users', uid, 'blocked']),
  ]);

  // 2. Delete user's reels (and their comments & likes subcollections)
  if (username) {
    try {
      const reelsSnap = await getDocs(
        query(collection(db, 'reels'), where('user', '==', username), limit(200))
      );
      await Promise.all(
        reelsSnap.docs.map(async (reelDoc) => {
          await deleteCollectionDocs(['reels', reelDoc.id, 'likes']);
          await deleteCollectionDocs(['reels', reelDoc.id, 'comments']);
          await deleteDoc(reelDoc.ref).catch((err) => {
            console.warn('Reel delete skipped:', reelDoc.id, err);
          });
        })
      );
    } catch (err) {
      console.warn('Failed to delete user reels during permanent deletion:', err);
    }

    // 3. Delete user's posts
    try {
      const postsSnap = await getDocs(
        query(collection(db, 'posts'), where('user', '==', username), limit(200))
      );
      await Promise.all(
        postsSnap.docs.map((postDoc) =>
          deleteDoc(postDoc.ref).catch((err) => {
            console.warn('Post delete skipped:', postDoc.id, err);
          })
        )
      );
    } catch (err) {
      console.warn('Failed to delete user posts during permanent deletion:', err);
    }
  }

  // 4. Delete user's story doc
  try {
    await deleteDoc(doc(db, 'stories', uid));
  } catch {
    // ignore if no story exists
  }

  // 5. Delete username reservation
  if (username) {
    try {
      const claimRef = doc(db, 'usernames', username);
      const claimSnap = await getDoc(claimRef);
      if (claimSnap.exists() && claimSnap.data()?.uid === uid) {
        await deleteDoc(claimRef);
      }
    } catch (err) {
      console.warn('Failed to delete username claim:', err);
    }
  }

  // 6. Delete user mirror & primary docs
  if (username && username !== uid) {
    try {
      const mirrorRef = doc(db, 'users', username);
      const mirrorSnap = await getDoc(mirrorRef);
      if (mirrorSnap.exists() && (!mirrorSnap.data()?.uid || mirrorSnap.data()?.uid === uid)) {
        await deleteDoc(mirrorRef);
      }
    } catch (err) {
      console.warn('Failed to delete user mirror doc:', err);
    }
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    console.warn('Failed to delete primary user doc:', err);
  }
}

// ======================== USER BLOCK / UNBLOCK SYSTEM ========================

export function toSafeBlockDocKey(username: string): string {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return (cleaned || 'user').slice(0, 60);
}

async function removeFollowingReferenceForUser(
  ownerUid: string,
  ownerUsername: string | undefined,
  usernameToRemove: string
): Promise<void> {
  if (!ownerUid || ownerUid === 'guest_user' || !usernameToRemove) return;
  try {
    await deleteDoc(doc(db, 'users', ownerUid, 'following', usernameToRemove));
  } catch (err) {
    console.warn('Following doc cleanup warning:', err);
  }

  const removeFromProfileDoc = async (docId: string) => {
    try {
      const ref = doc(db, 'users', docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as Partial<UserProfile>;
      if (!data.username) return;
      const list = Array.isArray(data.followingList) ? data.followingList : [];
      if (!list.includes(usernameToRemove)) return;
      const nextList = list.filter((u) => u !== usernameToRemove);
      await setDoc(
        ref,
        {
          username: data.username,
          followingList: nextList,
          following: nextList.length,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('FollowingList profile cleanup warning:', docId, err);
    }
  };

  await removeFromProfileDoc(ownerUid);
  if (ownerUsername && ownerUsername !== ownerUid) {
    await removeFromProfileDoc(ownerUsername);
  }
}

export async function blockUserInFirebase(
  blocker: UserProfile,
  target: {
    username: string;
    uid?: string;
    name?: string;
    avatarUrl?: string;
  }
): Promise<BlockedUserEntry> {
  const blockerUid = blocker.uid;
  const blockerUsername = (blocker.username || '').trim();
  const targetUsername = (target.username || '').trim();

  if (!blockerUid || blocker.isGuest || blockerUid === 'guest_user') {
    throw new Error('लॉगिन करें');
  }
  if (!targetUsername || targetUsername === blockerUsername) {
    throw new Error('अमान्य यूज़र');
  }

  const safeTargetKey = toSafeBlockDocKey(targetUsername);
  const blockId = `${blockerUid}__${safeTargetKey}`;
  const now = Date.now();

  let resolvedBlockedUid = (target.uid || '').trim();
  if (!resolvedBlockedUid) {
    resolvedBlockedUid = (await resolveRecipientUidByUsername(targetUsername)) || '';
  }

  let resolvedName = (target.name || '').trim();
  let resolvedAvatar = (target.avatarUrl || '').trim();
  if (!resolvedName || !resolvedAvatar) {
    try {
      const lookupId = resolvedBlockedUid || targetUsername;
      const snap = await getDoc(doc(db, 'users', lookupId));
      if (snap.exists()) {
        const data = snap.data() as Partial<UserProfile>;
        if (!resolvedName && data.name) resolvedName = data.name;
        if (!resolvedAvatar && data.avatarUrl) resolvedAvatar = data.avatarUrl;
      }
    } catch {
      // ignore optional enrichment failure
    }
  }

  const blockedEntry: BlockedUserEntry = {
    blockId,
    blockerUid,
    blockerUsername: (blockerUsername || 'user').slice(0, 60),
    blockedUid: resolvedBlockedUid.slice(0, 128),
    blockedUsername: targetUsername.slice(0, 60),
    blockedName: (resolvedName || targetUsername).slice(0, 80),
    blockedAvatar: resolvedAvatar.slice(0, 500),
    blockedAt: now,
  };

  // 1. Save in user's own blocked list and mutual /blocks index
  await Promise.all([
    setDoc(doc(db, 'users', blockerUid, 'blocked', safeTargetKey), blockedEntry),
    setDoc(doc(db, 'blocks', blockId), {
      blockId,
      blockerUid,
      blockerUsername: blockedEntry.blockerUsername,
      blockedUid: blockedEntry.blockedUid || '',
      blockedUsername: blockedEntry.blockedUsername,
      createdAt: now,
    }),
  ]);

  // 2. Mutual unfollow immediately (both following & followers subcollections)
  await removeFollowingReferenceForUser(blockerUid, blockerUsername, targetUsername);
  if (resolvedBlockedUid && resolvedBlockedUid !== 'guest_user' && blockerUsername) {
    await removeFollowingReferenceForUser(resolvedBlockedUid, targetUsername, blockerUsername);
  }
  if (resolvedBlockedUid && resolvedBlockedUid !== 'guest_user') {
    await Promise.all([
      deleteDoc(doc(db, 'users', resolvedBlockedUid, 'followers', blockerUid)).catch(() => {}),
      deleteDoc(doc(db, 'users', blockerUid, 'followers', resolvedBlockedUid)).catch(() => {}),
    ]);
  }

  return blockedEntry;
}

export async function unblockUserInFirebase(
  blocker: UserProfile,
  targetUsername: string
): Promise<void> {
  const blockerUid = blocker.uid;
  const cleanTarget = targetUsername.trim();
  if (!blockerUid || blocker.isGuest || blockerUid === 'guest_user' || !cleanTarget) {
    return;
  }

  const safeTargetKey = toSafeBlockDocKey(cleanTarget);
  const blockId = `${blockerUid}__${safeTargetKey}`;

  await Promise.all([
    deleteDoc(doc(db, 'users', blockerUid, 'blocked', safeTargetKey)).catch((err) => {
      console.warn('Failed to delete blocked entry under user:', err);
    }),
    deleteDoc(doc(db, 'blocks', blockId)).catch((err) => {
      console.warn('Failed to delete mutual block doc:', err);
    }),
  ]);
}

export function subscribeToUserBlockedList(
  uid: string,
  onUpdate: (blocked: BlockedUserEntry[]) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate([]);
    return () => {};
  }

  const q = query(collection(db, 'users', uid, 'blocked'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const list: BlockedUserEntry[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<BlockedUserEntry>;
        if (!data || !data.blockedUsername) return;
        list.push({
          blockId: data.blockId || `${uid}__${d.id}`,
          blockerUid: data.blockerUid || uid,
          blockerUsername: data.blockerUsername || '',
          blockedUid: data.blockedUid || '',
          blockedUsername: data.blockedUsername,
          blockedName: data.blockedName,
          blockedAvatar: data.blockedAvatar,
          blockedAt: typeof data.blockedAt === 'number' ? data.blockedAt : 0,
        });
      });
      list.sort((a, b) => (b.blockedAt || 0) - (a.blockedAt || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Realtime blocked list listener warning:', err);
    }
  );
}

export function subscribeToBlockedByUsers(
  uid: string,
  username: string,
  onUpdate: (blockerUsernames: string[]) => void
): () => void {
  const cleanUid = (uid || '').trim();
  const cleanUsername = (username || '').trim();
  if ((!cleanUid || cleanUid === 'guest_user') && !cleanUsername) {
    onUpdate([]);
    return () => {};
  }

  let byUsernameSet = new Set<string>();
  let byUidSet = new Set<string>();

  const emitMerged = () => {
    const merged = new Set<string>([...byUsernameSet, ...byUidSet]);
    onUpdate(Array.from(merged));
  };

  const unsubs: (() => void)[] = [];

  if (cleanUsername) {
    const qByName = query(
      collection(db, 'blocks'),
      where('blockedUsername', '==', cleanUsername),
      limit(200)
    );
    unsubs.push(
      onSnapshot(
        qByName,
        (snap) => {
          const next = new Set<string>();
          snap.forEach((d) => {
            const data = d.data();
            const blockerUname = (data?.blockerUsername as string | undefined)?.trim();
            if (blockerUname && blockerUname !== cleanUsername) {
              next.add(blockerUname);
            }
          });
          byUsernameSet = next;
          emitMerged();
        },
        (err) => {
          console.warn('Blocked-by-username listener warning:', err);
        }
      )
    );
  }

  if (cleanUid && cleanUid !== 'guest_user') {
    const qByUid = query(
      collection(db, 'blocks'),
      where('blockedUid', '==', cleanUid),
      limit(200)
    );
    unsubs.push(
      onSnapshot(
        qByUid,
        (snap) => {
          const next = new Set<string>();
          snap.forEach((d) => {
            const data = d.data();
            const blockerUname = (data?.blockerUsername as string | undefined)?.trim();
            if (blockerUname && blockerUname !== cleanUsername) {
              next.add(blockerUname);
            }
          });
          byUidSet = next;
          emitMerged();
        },
        (err) => {
          console.warn('Blocked-by-uid listener warning:', err);
        }
      )
    );
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}

// ======================== PRIVATE ACCOUNTS & FOLLOW REQUESTS ========================

export function subscribeToPrivateUsernames(
  onUpdate: (usernames: string[]) => void
): () => void {
  const q = query(collection(db, 'users'), where('isPrivate', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const set = new Set<string>();
      snap.forEach((d) => {
        const data = d.data() as Partial<UserProfile>;
        if (!data || data.isGuest || data.uid === 'guest_user') return;
        const uname = (data.username || '').trim();
        if (uname) set.add(uname);
      });
      onUpdate(Array.from(set));
    },
    (err) => {
      console.warn('Private usernames listener warning:', err);
    }
  );
}

export function subscribeToUserFollowing(
  uid: string,
  onUpdate: (usernames: string[]) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users', uid, 'following'),
    (snap) => {
      const list: string[] = [];
      snap.forEach((d) => {
        const data = d.data() as { username?: string };
        const uname = (data?.username || d.id || '').trim();
        if (uname) list.push(uname);
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('User following listener warning:', err);
    }
  );
}

export function subscribeToIncomingFollowRequests(
  uid: string,
  onUpdate: (requests: FollowRequestItem[]) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'users', uid, 'followRequests'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items: FollowRequestItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as Partial<FollowRequestItem>;
        const requesterUid = (data?.requesterUid || d.id || '').trim();
        const requesterUsername = (data?.requesterUsername || '').trim();
        if (!requesterUid || !requesterUsername) return;
        items.push({
          id: data?.id || d.id,
          requesterUid,
          requesterUsername,
          requesterName: (data?.requesterName || '').trim() || requesterUsername,
          requesterAvatar:
            (data?.requesterAvatar || '').trim() ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
              requesterUsername
            )}`,
          targetUid: data?.targetUid || uid,
          targetUsername: data?.targetUsername || '',
          createdAt: typeof data?.createdAt === 'number' ? data.createdAt : 0,
        });
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onUpdate(items);
    },
    (err) => {
      console.warn('Incoming follow requests listener warning:', err);
    }
  );
}

export function subscribeToSentFollowRequests(
  uid: string,
  onUpdate: (targetUsernames: string[]) => void
): () => void {
  if (!uid || uid === 'guest_user') {
    onUpdate([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'users', uid, 'sentFollowRequests'),
    (snap) => {
      const set = new Set<string>();
      snap.forEach((d) => {
        const data = d.data() as { targetUsername?: string };
        const uname = (data?.targetUsername || '').trim();
        if (uname) set.add(uname);
      });
      onUpdate(Array.from(set));
    },
    (err) => {
      console.warn('Sent follow requests listener warning:', err);
    }
  );
}

export async function sendFollowRequestInFirebase(
  targetUsername: string,
  requesterProfile: UserProfile
): Promise<{ sent: boolean; autoFollowed?: boolean }> {
  const requesterUid = requesterProfile.uid;
  const cleanTargetUsername = (targetUsername || '').trim();
  if (
    !requesterUid ||
    requesterProfile.isGuest ||
    requesterUid === 'guest_user' ||
    !cleanTargetUsername ||
    cleanTargetUsername === requesterProfile.username
  ) {
    return { sent: false };
  }

  try {
    const targetUid = await resolveRecipientUidByUsername(cleanTargetUsername);
    if (!targetUid || targetUid === 'guest_user' || targetUid === requesterUid) {
      return { sent: false };
    }

    const targetSnap = await getDoc(doc(db, 'users', targetUid)).catch(() => null);
    const targetData = targetSnap?.exists()
      ? (targetSnap.data() as Partial<UserProfile>)
      : null;

    // If the target account is actually public, follow immediately instead of sending request
    if (targetData && !targetData.isPrivate) {
      await toggleFollowUserInFirebase(cleanTargetUsername, requesterUid, true, requesterProfile);
      return { sent: false, autoFollowed: true };
    }

    const now = Date.now();
    const cleanRequesterUsername =
      (requesterProfile.username || 'user').trim().slice(0, 60) || 'user';
    const cleanRequesterName =
      (requesterProfile.name || cleanRequesterUsername).trim().slice(0, 80) ||
      cleanRequesterUsername;
    const cleanRequesterAvatar = (requesterProfile.avatarUrl || '').trim().slice(0, 500);
    const cleanTargetName = (targetData?.name || cleanTargetUsername).trim().slice(0, 80);
    const cleanTargetAvatar = (targetData?.avatarUrl || '').trim().slice(0, 500);

    await setDoc(doc(db, 'users', targetUid, 'followRequests', requesterUid), {
      id: requesterUid,
      requesterUid,
      requesterUsername: cleanRequesterUsername,
      ...(cleanRequesterName ? { requesterName: cleanRequesterName } : {}),
      ...(cleanRequesterAvatar ? { requesterAvatar: cleanRequesterAvatar } : {}),
      targetUid,
      targetUsername: cleanTargetUsername.slice(0, 60),
      createdAt: now,
    });

    await setDoc(doc(db, 'users', requesterUid, 'sentFollowRequests', targetUid), {
      id: targetUid,
      requesterUid,
      targetUid,
      targetUsername: cleanTargetUsername.slice(0, 60),
      ...(cleanTargetName ? { targetName: cleanTargetName } : {}),
      ...(cleanTargetAvatar ? { targetAvatar: cleanTargetAvatar } : {}),
      createdAt: now,
    });

    return { sent: true };
  } catch (err) {
    console.warn('Failed to send follow request in Firebase:', err);
    return { sent: false };
  }
}

export async function cancelFollowRequestInFirebase(
  targetUsername: string,
  requesterUid: string
): Promise<boolean> {
  const cleanTargetUsername = (targetUsername || '').trim();
  if (!requesterUid || requesterUid === 'guest_user' || !cleanTargetUsername) {
    return false;
  }

  try {
    const targetUid = await resolveRecipientUidByUsername(cleanTargetUsername);
    if (targetUid && targetUid !== 'guest_user') {
      await Promise.all([
        deleteDoc(doc(db, 'users', targetUid, 'followRequests', requesterUid)).catch(() => {}),
        deleteDoc(doc(db, 'users', requesterUid, 'sentFollowRequests', targetUid)).catch(() => {}),
      ]);
    }

    // Fallback cleanup by targetUsername in sentFollowRequests
    const sentSnap = await getDocs(
      query(
        collection(db, 'users', requesterUid, 'sentFollowRequests'),
        where('targetUsername', '==', cleanTargetUsername)
      )
    ).catch(() => null);
    if (sentSnap && !sentSnap.empty) {
      await Promise.all(sentSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
    }
    return true;
  } catch (err) {
    console.warn('Failed to cancel follow request in Firebase:', err);
    return false;
  }
}

export async function acceptFollowRequestInFirebase(
  ownerProfile: UserProfile,
  request: FollowRequestItem
): Promise<boolean> {
  const ownerUid = ownerProfile.uid;
  const ownerUsername = (ownerProfile.username || '').trim();
  const requesterUid = (request.requesterUid || '').trim();
  const requesterUsername = (request.requesterUsername || '').trim();

  if (
    !ownerUid ||
    ownerProfile.isGuest ||
    ownerUid === 'guest_user' ||
    !ownerUsername ||
    !requesterUid ||
    requesterUid === 'guest_user' ||
    !requesterUsername
  ) {
    return false;
  }

  const now = Date.now();
  const cleanRequesterName =
    (request.requesterName || requesterUsername).trim().slice(0, 80) || requesterUsername;
  const cleanRequesterAvatar = (request.requesterAvatar || '').trim().slice(0, 500);
  const cleanOwnerName = (ownerProfile.name || ownerUsername).trim().slice(0, 80) || ownerUsername;
  const cleanOwnerAvatar = (ownerProfile.avatarUrl || '').trim().slice(0, 500);

  try {
    // 1. Add requester to owner's followers subcollection
    await setDoc(doc(db, 'users', ownerUid, 'followers', requesterUid), {
      uid: requesterUid,
      username: requesterUsername.slice(0, 60),
      ...(cleanRequesterName ? { name: cleanRequesterName } : {}),
      ...(cleanRequesterAvatar ? { avatarUrl: cleanRequesterAvatar } : {}),
      followedAt: now,
    });

    // 2. Add owner to requester's following subcollection (while followRequests/{requesterUid} still exists for rule validation)
    await setDoc(doc(db, 'users', requesterUid, 'following', ownerUsername), {
      username: ownerUsername.slice(0, 60),
      uid: requesterUid,
      targetUid: ownerUid.slice(0, 128),
      ...(cleanOwnerName ? { name: cleanOwnerName } : {}),
      ...(cleanOwnerAvatar ? { avatarUrl: cleanOwnerAvatar } : {}),
      followedAt: now,
    });

    // 3. Delete incoming & outgoing request markers
    await Promise.all([
      deleteDoc(doc(db, 'users', ownerUid, 'followRequests', requesterUid)).catch(() => {}),
      deleteDoc(doc(db, 'users', requesterUid, 'sentFollowRequests', ownerUid)).catch(() => {}),
    ]);

    // 4. Best-effort sync of requester's followingList array
    try {
      const reqUserRef = doc(db, 'users', requesterUid);
      const reqSnap = await getDoc(reqUserRef);
      if (reqSnap.exists()) {
        const data = reqSnap.data() as Partial<UserProfile>;
        if (data?.username) {
          const list = Array.isArray(data.followingList) ? data.followingList : [];
          if (!list.includes(ownerUsername)) {
            const nextList = [...list, ownerUsername];
            await setDoc(
              reqUserRef,
              {
                username: data.username,
                followingList: nextList,
                following: nextList.length,
                updatedAt: now,
              },
              { merge: true }
            );
          }
        }
      }
    } catch {
      // non-fatal; subcollection users/{requesterUid}/following is authoritative
    }

    return true;
  } catch (err) {
    console.warn('Failed to accept follow request in Firebase:', err);
    return false;
  }
}

export async function declineFollowRequestInFirebase(
  ownerUid: string,
  _ownerUsername: string,
  requesterUid: string
): Promise<boolean> {
  if (!ownerUid || ownerUid === 'guest_user' || !requesterUid || requesterUid === 'guest_user') {
    return false;
  }

  try {
    await Promise.all([
      deleteDoc(doc(db, 'users', ownerUid, 'followRequests', requesterUid)).catch(() => {}),
      deleteDoc(doc(db, 'users', requesterUid, 'sentFollowRequests', ownerUid)).catch(() => {}),
    ]);
    return true;
  } catch (err) {
    console.warn('Failed to decline follow request in Firebase:', err);
    return false;
  }
}

export async function removeFollowerInFirebase(
  ownerUid: string,
  ownerUsername: string,
  followerUid: string | undefined,
  followerUsername: string
): Promise<boolean> {
  const cleanOwnerUsername = (ownerUsername || '').trim();
  const cleanFollowerUsername = (followerUsername || '').trim();
  if (!ownerUid || ownerUid === 'guest_user' || !cleanOwnerUsername || !cleanFollowerUsername) {
    return false;
  }

  try {
    let resolvedFollowerUid = (followerUid || '').trim();
    if (!resolvedFollowerUid) {
      resolvedFollowerUid = (await resolveRecipientUidByUsername(cleanFollowerUsername)) || '';
    }

    if (resolvedFollowerUid && resolvedFollowerUid !== 'guest_user') {
      await deleteDoc(doc(db, 'users', ownerUid, 'followers', resolvedFollowerUid)).catch(
        () => {}
      );
      await removeFollowingReferenceForUser(
        resolvedFollowerUid,
        cleanFollowerUsername,
        cleanOwnerUsername
      );
    }

    // Fallback: remove any follower doc matched by username in case doc ID differed
    const byUsernameSnap = await getDocs(
      query(
        collection(db, 'users', ownerUid, 'followers'),
        where('username', '==', cleanFollowerUsername)
      )
    ).catch(() => null);
    if (byUsernameSnap && !byUsernameSnap.empty) {
      await Promise.all(
        byUsernameSnap.docs.map(async (d) => {
          const data = d.data() as { uid?: string };
          const docUid = (data?.uid || d.id || '').trim();
          await deleteDoc(d.ref).catch(() => {});
          if (docUid && docUid !== 'guest_user' && docUid !== resolvedFollowerUid) {
            await removeFollowingReferenceForUser(
              docUid,
              cleanFollowerUsername,
              cleanOwnerUsername
            );
          }
        })
      );
    }

    return true;
  } catch (err) {
    console.warn('Failed to remove follower in Firebase:', err);
    return false;
  }
}

export async function updateAccountPrivacyInFirebase(
  profile: UserProfile,
  nextIsPrivate: boolean
): Promise<{ approvedCount: number }> {
  const uid = profile.uid;
  const cleanUsername = (profile.username || '').trim();
  if (!uid || profile.isGuest || uid === 'guest_user' || !cleanUsername) {
    return { approvedCount: 0 };
  }

  const now = Date.now();
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        username: cleanUsername,
        isPrivate: nextIsPrivate,
        updatedAt: now,
      },
      { merge: true }
    );
    if (cleanUsername !== uid) {
      await setDoc(
        doc(db, 'users', cleanUsername),
        {
          username: cleanUsername,
          isPrivate: nextIsPrivate,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    let approvedCount = 0;
    if (!nextIsPrivate) {
      const reqSnap = await getDocs(collection(db, 'users', uid, 'followRequests')).catch(
        () => null
      );
      if (reqSnap && !reqSnap.empty) {
        const pendingRequests: FollowRequestItem[] = [];
        reqSnap.forEach((d) => {
          const data = d.data() as Partial<FollowRequestItem>;
          const requesterUid = (data?.requesterUid || d.id || '').trim();
          const requesterUsername = (data?.requesterUsername || '').trim();
          if (!requesterUid || !requesterUsername) return;
          pendingRequests.push({
            id: data?.id || d.id,
            requesterUid,
            requesterUsername,
            requesterName: (data?.requesterName || '').trim() || requesterUsername,
            requesterAvatar: (data?.requesterAvatar || '').trim(),
            targetUid: data?.targetUid || uid,
            targetUsername: data?.targetUsername || cleanUsername,
            createdAt: typeof data?.createdAt === 'number' ? data.createdAt : now,
          });
        });

        for (const req of pendingRequests) {
          const ok = await acceptFollowRequestInFirebase(profile, req);
          if (ok) approvedCount += 1;
        }
      }
    }

    return { approvedCount };
  } catch (err) {
    console.warn('Failed to update account privacy in Firebase:', err);
    return { approvedCount: 0 };
  }
}




