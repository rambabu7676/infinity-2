import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  reauthenticateWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  deleteUser,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from './services';

// Standardized error message translator
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'यह ईमेल पहले से रजिस्टर्ड है। कृपया लॉग इन करें। (Email is already registered. Please log in).';
    case 'auth/invalid-email':
      return 'कृपया एक वैध ईमेल पता दर्ज करें। (Please enter a valid email address).';
    case 'auth/weak-password':
      return 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए। (Password must be at least 6 characters).';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'ईमेल या पासवर्ड अमान्य है। (Incorrect email or password).';
    case 'auth/operation-not-allowed':
      return 'Firebase Console में Email/Password प्रदाता अभी सक्षम नहीं है। कृपया Firebase Console > Authentication > Sign-in Method में जाकर Email/Password चालू करें। (Email/Password is not enabled in Firebase Console yet).';
    case 'auth/too-many-requests':
      return 'बहुत सारे असफल प्रयास। कृपया थोड़ी देर बाद पुनः प्रयास करें। (Too many attempts. Try again later).';
    case 'auth/popup-closed-by-user':
      return 'लॉग इन पॉपअप बंद कर दिया गया। (Sign-in popup was closed).';
    default:
      return error.message || 'Authentication failed. Please check your credentials.';
  }
}

// Generate default avatar URL
export function generateDefaultAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

// Sign Up with Email and Password
export async function signUpWithEmail(
  email: string,
  pass: string,
  name: string,
  username: string
): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${Date.now().toString().slice(-4)}`;
  const cleanName = name.trim() || cleanUsername;

  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  const defaultAvatar = generateDefaultAvatar(cleanUsername);

  try {
    await updateProfile(user, {
      displayName: cleanName,
      photoURL: defaultAvatar,
    });
  } catch (err) {
    console.warn('Could not update Auth profile displayName/photoURL:', err);
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    email: cleanEmail,
    name: cleanName,
    username: cleanUsername,
    postsCount: 0,
    followers: 0,
    following: 0,
    isBlueTick: false,
    isPremium: false,
    referralCode: Math.floor(10000 + Math.random() * 90000).toString(),
    successfulReferrals: 0,
    dailyFollows: 0,
    avatarUrl: defaultAvatar,
    bio: 'Dream Big | Create | Inspire ✨',
    isPrivate: false,
    followingList: [],
    totalLikes: 0,
    totalViews: 0,
  };

  const userDocRef = doc(db, 'users', user.uid);
  try {
    await setDoc(userDocRef, { ...newProfile, createdAt: Date.now(), updatedAt: Date.now() }, { merge: true });
    // Also save under username for legacy lookup
    await setDoc(doc(db, 'users', cleanUsername), { ...newProfile, updatedAt: Date.now() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }

  return newProfile;
}

// Log In with Email and Password
export async function logInWithEmail(email: string, pass: string): Promise<UserProfile> {
  const cleanEmail = email.trim().toLowerCase();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  // Retrieve user profile from Firestore
  let profile = await fetchUserProfile(user.uid);

  if (!profile) {
    // Bootstrap profile if missing
    profile = {
      uid: user.uid,
      email: cleanEmail,
      name: user.displayName || cleanEmail.split('@')[0],
      username: (user.displayName || cleanEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, ''),
      postsCount: 0,
      followers: 0,
      following: 0,
      isBlueTick: false,
      isPremium: false,
      referralCode: Math.floor(10000 + Math.random() * 90000).toString(),
      successfulReferrals: 0,
      dailyFollows: 0,
      avatarUrl: user.photoURL || generateDefaultAvatar(user.uid),
      bio: 'Dream Big | Create | Inspire ✨',
      isPrivate: false,
      followingList: [],
      totalLikes: 0,
      totalViews: 0,
    };
    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }

  return profile;
}

// Log In with Google (Popup)
export async function logInWithGoogle(): Promise<UserProfile> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;

  let profile = await fetchUserProfile(user.uid);

  if (!profile) {
    const rawUsername = (user.email?.split('@')[0] || `user_${user.uid.slice(0, 6)}`)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    profile = {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || rawUsername,
      username: rawUsername,
      postsCount: 0,
      followers: 0,
      following: 0,
      isBlueTick: false,
      isPremium: false,
      referralCode: Math.floor(10000 + Math.random() * 90000).toString(),
      successfulReferrals: 0,
      dailyFollows: 0,
      avatarUrl: user.photoURL || generateDefaultAvatar(rawUsername),
      bio: 'Dream Big | Create | Inspire ✨',
      isPrivate: false,
      followingList: [],
      totalLikes: 0,
      totalViews: 0,
    };

    try {
      await setDoc(doc(db, 'users', user.uid), { ...profile, createdAt: Date.now(), updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }

  return profile;
}

// Log Out
export async function logOutUser(): Promise<void> {
  await signOut(auth);
}

// Reset Password
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

// Fetch User Profile from Firestore by UID or username
export async function fetchUserProfile(uidOrUsername: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uidOrUsername);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uidOrUsername}`);
    return null;
  }
}

// Auth State Observer
export function subscribeToAuthState(
  onUserChanged: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, onUserChanged);
}

// Auto Phone login with SIM hint & auto-generated verified profile
export async function signInWithPhoneAuto(
  phoneNumber: string,
  referralCode?: string
): Promise<UserProfile> {
  const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
  const phoneSuffix = cleanPhone.slice(-4) || Math.floor(1000 + Math.random() * 9000).toString();
  const generatedUsername = `user_${phoneSuffix}`;
  const generatedUid = `phone_${cleanPhone.replace('+', '')}`;

  // Check if profile exists already
  let profile = await fetchUserProfile(generatedUid);

  if (!profile) {
    // 31 days validity in milliseconds: 31 * 24 * 60 * 60 * 1000
    const now = Date.now();
    const expiry31Days = now + 31 * 24 * 60 * 60 * 1000;

    profile = {
      uid: generatedUid,
      phone: cleanPhone,
      email: `${generatedUsername}@infinity.app`,
      name: `Infinity Creator`,
      username: generatedUsername,
      postsCount: 0,
      followers: 0,
      following: 0,
      isBlueTick: false,
      isPremium: false,
      badgeExpiryDate: expiry31Days,
      goldenThemeEnabled: false,
      referralCode: Math.floor(10000 + Math.random() * 90000).toString(),
      successfulReferrals: 0,
      dailyFollows: 0,
      avatarUrl: generateDefaultAvatar(generatedUsername),
      bio: 'Infinity Verified Creator ✨ | Short Videos & Reels',
      isPrivate: false,
      followingList: [],
      totalLikes: 0,
      totalViews: 0,
      isGuest: false,
    };

    try {
      await setDoc(doc(db, 'users', generatedUid), { ...profile, createdAt: Date.now(), updatedAt: Date.now() }, { merge: true });
      await setDoc(doc(db, 'users', generatedUsername), { ...profile, updatedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.warn('Could not persist phone user to firestore, using local profile:', err);
    }
  }

  return profile;
}

// Guest Mode Profile Generator
export function createGuestProfile(): UserProfile {
  return {
    uid: 'guest_user',
    name: 'Guest User',
    username: 'guest',
    postsCount: 0,
    followers: 0,
    following: 0,
    isBlueTick: false,
    isPremium: false,
    referralCode: '',
    successfulReferrals: 0,
    dailyFollows: 0,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    bio: 'Browsing Infinity in Guest Mode (लॉगिन करें लाइक और कमेंट के लिए)',
    isPrivate: false,
    followingList: [],
    totalLikes: 0,
    totalViews: 0,
    isGuest: true,
  };
}

let googleReauthInProgress = false;

export function isGoogleReauthInProgress(): boolean {
  return googleReauthInProgress;
}

export async function reauthenticateWithGoogleForAccountAction(
  currentProfile?: UserProfile
): Promise<{ verified: boolean; error?: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  googleReauthInProgress = true;
  try {
    const existingAuthUser = auth.currentUser;
    const isGoogleAuthLinked = Boolean(
      existingAuthUser?.providerData?.some((p) => p.providerId === 'google.com')
    );

    const credential =
      existingAuthUser && isGoogleAuthLinked
        ? await reauthenticateWithPopup(existingAuthUser, provider)
        : await signInWithPopup(auth, provider);

    const verifiedEmail = credential.user.email?.trim().toLowerCase() || '';
    const profileEmail = currentProfile?.email?.trim().toLowerCase() || '';

    if (
      profileEmail &&
      !profileEmail.endsWith('@infinity.app') &&
      verifiedEmail &&
      profileEmail !== verifiedEmail
    ) {
      return {
        verified: false,
        error: 'कृपया उसी Google खाते से लॉगिन करें जिससे यह खाता जुड़ा है।',
      };
    }

    // If a phone/local session verified via Google popup, don't leave a mismatched Auth session active
    if (
      currentProfile?.uid &&
      (currentProfile.uid.startsWith('phone_') || currentProfile.uid.startsWith('google_')) &&
      credential.user.uid !== currentProfile.uid
    ) {
      try {
        await signOut(auth);
      } catch {
        // ignore transient cleanup failure
      }
    }

    return { verified: true };
  } catch (err: any) {
    const code = err?.code || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return {
        verified: false,
        error: 'Google लॉगिन रद्द कर दिया गया। खाता मिटाने के लिए दोबारा Google लॉगिन ज़रूरी है।',
      };
    }
    if (code === 'auth/user-mismatch') {
      return {
        verified: false,
        error: 'कृपया उसी Google खाते से लॉगिन करें जिससे यह खाता जुड़ा है।',
      };
    }
    if (code === 'auth/popup-blocked') {
      return {
        verified: false,
        error: 'पॉपअप ब्लॉक हो गया है। कृपया ब्राउज़र में पॉपअप की अनुमति देकर दोबारा प्रयास करें।',
      };
    }
    return {
      verified: false,
      error: 'Google सत्यापन पूरा नहीं हो सका। कृपया दोबारा प्रयास करें।',
    };
  } finally {
    googleReauthInProgress = false;
  }
}

export async function deleteFirebaseAuthUserIfSignedIn(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (err) {
    console.warn('Could not delete Firebase Auth user directly, signing out instead:', err);
    try {
      await signOut(auth);
    } catch {
      // ignore signOut fallback failure
    }
  }
}

