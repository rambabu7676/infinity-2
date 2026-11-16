import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Phone,
  Smartphone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Gift,
  ArrowRight,
  Shield,
  Check,
  KeyRound
} from 'lucide-react';
import {
  signUpWithEmail,
  logInWithEmail,
  logInWithGoogle,
  resetPassword,
  signInWithPhoneAuto,
  getAuthErrorMessage
} from '../firebase/authService';
import { UserProfile } from '../types';
import { playClickSound, playWinChime } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  onContinueAsGuest?: () => void;
  onOpenPrivacy?: () => void;
  onAddBonusDiamonds?: (amount: number) => void;
  initialMode?: 'phone' | 'google' | 'email';
}

// Simulated device SIMs for Hint Picker / Auto-Detect
const DETECTED_SIMS = [
  { number: '+91 98765 43210', operator: 'Jio 5G (SIM 1)', carrier: 'Jio' },
  { number: '+91 91234 56789', operator: 'Airtel (SIM 2)', carrier: 'Airtel' },
];

// Simulated device Google Accounts for 1-Tap Google Sign-In
const DETECTED_GOOGLE_ACCOUNTS = [
  {
    name: 'Sonali Singh',
    email: 'sonalisonalsingh7@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    name: 'Infinity Social Creator',
    email: 'infinity.creator@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
  },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onContinueAsGuest,
  onOpenPrivacy,
  onAddBonusDiamonds,
  initialMode = 'phone',
}) => {
  const [authMethod, setAuthMethod] = useState<'phone' | 'google' | 'email'>(initialMode);
  const [emailMode, setEmailMode] = useState<'login' | 'signup' | 'forgot'>('login');

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSimPicker, setShowSimPicker] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isAutoReadingOtp, setIsAutoReadingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(30);

  // Referral code state (Optional +1,000 Diamonds)
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // Email Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Common Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // When Phone tab opens, show SIM hint picker suggestion automatically
  useEffect(() => {
    if (isOpen && authMethod === 'phone' && !phoneNumber) {
      setShowSimPicker(true);
    }
  }, [isOpen, authMethod, phoneNumber]);

  // Handle OTP countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((c) => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, otpCountdown]);

  if (!isOpen) return null;

  // ---------------- 1. PHONE AUTH (SIM Picker & Auto-OTP) ----------------
  const handleSelectSim = (selectedNum: string) => {
    playClickSound();
    setPhoneNumber(selectedNum);
    setShowSimPicker(false);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanNum = phoneNumber.trim().replace(/[^0-9]/g, '');
    if (cleanNum.length < 10) {
      setErrorMsg('कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें (Please enter a valid 10-digit mobile number).');
      return;
    }

    playClickSound();
    setLoading(true);

    // Simulate OTP dispatch and auto-read from SMS
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setOtpCountdown(30);
      setIsAutoReadingOtp(true);
      setSuccessMsg(`ओटीपी भेजा गया (+91 ${cleanNum.slice(-10)})। ऑटो-रीड चालू है...`);

      // Auto-detect and fill OTP simulation after 1.2 seconds
      setTimeout(async () => {
        const autoOtp = '749216';
        setOtpValue(autoOtp);
        setIsAutoReadingOtp(false);
        playWinChime();
        setSuccessMsg('✅ एसएमएस ओटीपी ऑटोमैटिक डिटेक्ट कर लिया गया (Auto-read OTP: 749216)!');

        // Automatically complete login
        setTimeout(() => {
          handleVerifyOtp(autoOtp);
        }, 800);
      }, 1400);
    }, 600);
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue;
    if (!code || code.length < 4) {
      setErrorMsg('कृपया ओटीपी दर्ज करें (Please enter the OTP).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Auto-generate profile and register verified creator
      const profile = await signInWithPhoneAuto(phoneNumber, referralCode);

      // Check if welcome referral bonus applies
      if (referralCode.trim()) {
        onAddBonusDiamonds?.(1000);
      }

      playWinChime();
      setSuccessMsg(`लॉगिन सफल! स्वागत है @${profile.username}!`);

      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(profile);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'ओटीपी सत्यापन विफल हुआ। कृपया पुनः प्रयास करें।');
    }
  };

  // ---------------- 2. ONE-TAP GOOGLE SIGN-IN ----------------
  const handleSelectGoogleAccount = async (accEmail: string, accName: string) => {
    playClickSound();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Try real popup first, or build fast instant profile from detected account
      try {
        const profile = await logInWithGoogle();
        playWinChime();
        setSuccessMsg(`Google से सफलतापूर्वक लॉग इन! स्वागत है ${profile.name}!`);
        setTimeout(() => {
          onAuthSuccess(profile);
          onClose();
        }, 700);
        return;
      } catch (popupErr: any) {
        console.warn('Google popup error, falling back to one-tap profile:', popupErr);
      }

      // Fast one-tap account creator without friction
      const usernameDerived = accEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
      const oneTapProfile: UserProfile = {
        uid: `google_${usernameDerived}`,
        email: accEmail,
        name: accName,
        username: usernameDerived,
        postsCount: 0,
        followers: 0,
        following: 0,
        isBlueTick: false,
        isPremium: false,
        referralCode: Math.floor(10000 + Math.random() * 90000).toString(),
        successfulReferrals: 0,
        dailyFollows: 0,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${usernameDerived}`,
        bio: 'Infinity Creator ✨ | Verified User',
        isPrivate: false,
        followingList: [],
        totalLikes: 0,
        totalViews: 0,
        isGuest: false,
      };

      if (referralCode.trim()) {
        onAddBonusDiamonds?.(1000);
      }

      playWinChime();
      setSuccessMsg(`वन-टैप Google लॉगिन सफल! स्वागत है ${accName}!`);
      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(oneTapProfile);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(getAuthErrorMessage(err));
    }
  };

  // ---------------- 3. EMAIL / PASSWORD FLOW ----------------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    playClickSound();

    if (emailMode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('कृपया अपना ईमेल दर्ज करें।');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        playWinChime();
        setSuccessMsg('पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है!');
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(getAuthErrorMessage(err));
      }
      return;
    }

    if (emailMode === 'signup') {
      if (!name.trim() || !username.trim() || !email.trim()) {
        setErrorMsg('कृपया सभी फ़ील्ड भरें।');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('दोनों पासवर्ड मेल नहीं खाते।');
        return;
      }

      setLoading(true);
      try {
        const profile = await signUpWithEmail(email, password, name, username);
        if (referralCode.trim()) {
          onAddBonusDiamonds?.(1000);
        }
        playWinChime();
        setSuccessMsg(`खाता बनाया गया! स्वागत है @${profile.username}!`);
        setTimeout(() => {
          onAuthSuccess(profile);
          onClose();
        }, 700);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(getAuthErrorMessage(err));
      }
      return;
    }

    // Login
    if (!email.trim() || !password) {
      setErrorMsg('कृपया ईमेल और पासवर्ड दर्ज करें।');
      return;
    }

    setLoading(true);
    try {
      const profile = await logInWithEmail(email, password);
      playWinChime();
      setSuccessMsg(`सफलतापूर्वक लॉग इन! स्वागत है ${profile.name}!`);
      setTimeout(() => {
        onAuthSuccess(profile);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(getAuthErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#12151B] border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#00FF88]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#00E5FF]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00FF88] to-[#00E5FF] text-black flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              ∞
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>INFINITY Sign In</span>
                <Sparkles size={13} className="text-[#00FF88]" />
              </h3>
              <p className="text-[11px] text-zinc-400">
                ऑटो-नंबर व वन-टैप फास्ट लॉगिन
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        {/* Method Switcher Tabs (1. Mobile Number | 2. Google 1-Tap | 3. Email) */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-900/90 rounded-2xl mb-3 border border-zinc-800/80 relative z-10 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod('phone');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'phone'
                ? 'bg-gradient-to-r from-[#00FF88] to-[#00E5FF] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Phone size={13} />
            <span>मोबाइल नंबर</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod('google');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'google'
                ? 'bg-gradient-to-r from-[#00FF88] to-[#00E5FF] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod('email');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'email'
                ? 'bg-gradient-to-r from-[#00FF88] to-[#00E5FF] text-black shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mail size={13} />
            <span>ईमेल / Pass</span>
          </button>
        </div>

        {/* Alerts / Success Message */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-xs text-red-300 animate-shake">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-2 text-xs text-[#00FF88] animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#00FF88] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 relative z-10 no-scrollbar">

          {/* ===================== OPTION 1: MOBILE NUMBER LOGIN (HINT PICKER & AUTO-OTP) ===================== */}
          {authMethod === 'phone' && (
            <div className="space-y-3">
              {/* SIM Card Hint Picker Dropdown / Suggestions */}
              {showSimPicker && (
                <div className="p-3 bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-black border border-[#00E5FF]/40 rounded-2xl shadow-lg animate-slideDown">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#00E5FF]">
                      <Smartphone size={14} />
                      <span>सिम कार्ड नंबर चुनें (Tap SIM to Auto-Fill)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSimPicker(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {DETECTED_SIMS.map((sim) => (
                      <button
                        key={sim.number}
                        type="button"
                        onClick={() => handleSelectSim(sim.number)}
                        className="w-full p-2 rounded-xl bg-zinc-900/90 hover:bg-[#00E5FF]/15 border border-zinc-800 hover:border-[#00E5FF]/50 text-left flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📶</span>
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-[#00E5FF]">
                              {sim.number}
                            </p>
                            <p className="text-[10px] text-zinc-400">{sim.operator}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-semibold group-hover:bg-[#00E5FF] group-hover:text-black">
                          चुनें
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Number Input Form */}
              <form onSubmit={otpSent ? (e) => { e.preventDefault(); handleVerifyOtp(); } : handleSendOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-zinc-300">
                      मोबाइल नंबर (Mobile Number)
                    </label>
                    {!showSimPicker && (
                      <button
                        type="button"
                        onClick={() => setShowSimPicker(true)}
                        className="text-[10px] text-[#00E5FF] hover:underline flex items-center gap-1"
                      >
                        <Smartphone size={11} />
                        <span>सिम से चुनें</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      <span>🇮🇳 +91</span>
                      <span className="text-zinc-600">|</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber.replace('+91', '').trim()}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setOtpSent(false);
                      }}
                      placeholder="98765 43210"
                      maxLength={14}
                      required
                      className="w-full pl-18 pr-4 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                  </div>
                </div>

                {/* OTP Input Field (Shows after OTP is dispatched) */}
                {otpSent && (
                  <div className="p-3 bg-zinc-900/90 border border-emerald-500/30 rounded-2xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-white flex items-center gap-1">
                        <span>एसएमएस ओटीपी (SMS OTP)</span>
                        {isAutoReadingOtp && (
                          <span className="text-[10px] text-[#00FF88] font-normal animate-pulse">
                            ● ऑटो-डिटेक्ट हो रहा है...
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-zinc-400">
                        {otpCountdown > 0 ? `${otpCountdown}s में पुनः भेजें` : 'पुनः भेजें'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value)}
                        placeholder="6 अंकों का OTP दर्ज करें"
                        maxLength={6}
                        className="w-full px-3 py-2.5 bg-black/80 border border-zinc-700 rounded-xl text-center text-base tracking-[0.4em] font-mono font-black text-[#00FF88] focus:outline-none focus:border-[#00FF88]"
                      />
                    </div>
                  </div>
                )}

                {/* Optional Referral Code Box (+1,000 Diamonds) */}
                <div className="pt-0.5">
                  {!showReferralInput ? (
                    <button
                      type="button"
                      onClick={() => setShowReferralInput(true)}
                      className="text-[11px] text-[#FFD700] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Gift size={12} />
                      <span>दोस्त का रेफरल कोड है? (+1,000 Diamonds पाएं)</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-[#1B180A] border border-amber-500/30 rounded-xl space-y-1 animate-fadeIn">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#FFD700]">
                        <span className="flex items-center gap-1">
                          <Gift size={12} />
                          <span>रेफरल कोड (1,000 Diamonds Bonus)</span>
                        </span>
                        <span className="text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
                          वैकल्पिक (Optional)
                        </span>
                      </div>
                      <input
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        placeholder="जैसे: RAMBABU2025"
                        className="w-full px-3 py-1.5 bg-black/60 border border-amber-500/40 rounded-lg text-xs font-mono font-bold text-white placeholder-zinc-500 uppercase focus:outline-none focus:border-[#FFD700]"
                      />
                    </div>
                  )}
                </div>

                {/* Action Button: Send OTP or Verify OTP */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 text-black font-extrabold text-xs shadow-[0_2px_14px_rgba(0,255,136,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all mt-1"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>प्रतीक्षा करें...</span>
                    </>
                  ) : otpSent ? (
                    <span>सत्यापित करें और लॉगिन करें (Verify & Login)</span>
                  ) : (
                    <span>ओटीपी भेजें (Send OTP) &rarr;</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ===================== OPTION 2: ONE-TAP GOOGLE SIGN-IN ===================== */}
          {authMethod === 'google' && (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-900/80 rounded-2xl border border-zinc-800 space-y-2">
                <p className="text-xs font-bold text-white">
                  डिवाइस में मौजूद Google अकाउंट्स (1-Tap Sign-In):
                </p>
                <div className="space-y-1.5">
                  {DETECTED_GOOGLE_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                      disabled={loading}
                      className="w-full p-2.5 rounded-xl bg-black/60 hover:bg-zinc-800 border border-zinc-700/80 text-left flex items-center gap-3 transition-all active:scale-98 group"
                    >
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-600 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white group-hover:text-[#00FF88] truncate">
                          {acc.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate font-mono">
                          {acc.email}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#00E5FF] font-bold shrink-0">
                        लॉगिन करें &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Standard Google Popup Button */}
              <button
                type="button"
                onClick={() => handleSelectGoogleAccount('sonalisonalsingh7@gmail.com', 'Google User')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                </svg>
                <span>अन्य Google खाते से जारी रखें</span>
              </button>
            </div>
          )}

          {/* ===================== OPTION 3: EMAIL & PASSWORD ===================== */}
          {authMethod === 'email' && (
            <div className="space-y-3">
              <div className="flex gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setEmailMode('login')}
                  className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
                    emailMode === 'login' ? 'text-[#00FF88] border-[#00FF88]' : 'text-zinc-500 border-transparent'
                  }`}
                >
                  लॉग इन (Log In)
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className={`text-xs font-bold pb-1 border-b-2 transition-colors ${
                    emailMode === 'signup' ? 'text-[#00FF88] border-[#00FF88]' : 'text-zinc-500 border-transparent'
                  }`}
                >
                  नया अकाउंट (Sign Up)
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                {emailMode === 'signup' && (
                  <>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">नाम (Full Name)</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="जैसे: राहुल शर्मा"
                        required
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">यूजरनेम (Username)</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="जैसे: rahul_007"
                        required
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">ईमेल पता (Email)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">पासवर्ड (Password)</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-3 pr-9 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {emailMode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1">पासवर्ड कन्फर्म करें</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 text-black font-extrabold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
                >
                  {loading ? 'प्रतीक्षा करें...' : emailMode === 'login' ? 'लॉग इन करें' : 'साइन अप करें'}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* ===================== GUEST MODE (बिना लॉगिन के रील्स देखें) ===================== */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-2 relative z-10">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (onContinueAsGuest) {
                onContinueAsGuest();
              }
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#0f325c] border border-[#0095F6]/60 hover:border-[#0095F6] text-[#00E5FF] font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,149,246,0.2)]"
          >
            <span>👀 बिना लॉगिन के रील्स देखें (Guest Mode)</span>
            <ArrowRight size={14} />
          </button>
          <p className="text-[10px] text-zinc-500 text-center">
            गेस्ट मोड में वीडियो देखें (लाइक/कमेंट/अपलोड के लिए लॉगिन आवश्यक)
          </p>

          {/* Privacy Policy & Terms Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenPrivacy?.();
              }}
              className="text-[10px] text-zinc-400 hover:text-white underline"
            >
              🛡️ प्राइवेसी पॉलिसी व सेवा की शर्तें (Privacy Policy &amp; Terms)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
