import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Gift,
  Eye,
} from 'lucide-react';
import {
  logInWithGoogle,
  signInWithPhoneAuto,
  getAuthErrorMessage,
} from '../firebase/authService';
import { AppLanguage, UserProfile } from '../types';
import { playClickSound, playWinChime } from '../utils/audio';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  onContinueAsGuest?: () => void;
  onOpenPrivacy?: () => void;
  onAddBonusDiamonds?: (amount: number) => void;
  initialMode?: 'phone' | 'google';
  canClose?: boolean;
  onLanguageChange?: (lang: AppLanguage) => void;
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
  canClose = true,
  onLanguageChange,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [authMethod, setAuthMethod] = useState<'phone' | 'google'>(initialMode);

  // Phone Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSimPicker, setShowSimPicker] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [isAutoReadingOtp, setIsAutoReadingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(30);

  // Optional Referral code state
  const [referralCode, setReferralCode] = useState('');

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

  const handleSelectLanguage = (nextLang: AppLanguage) => {
    playClickSound();
    if (onLanguageChange) {
      onLanguageChange(nextLang);
    } else {
      setLanguage(nextLang);
    }
  };

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
      setErrorMsg(t.auth.invalidPhoneError);
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
      setSuccessMsg(t.auth.otpSentMsg(cleanNum.slice(-10)));

      // Auto-detect and fill OTP simulation
      setTimeout(async () => {
        const autoOtp = '749216';
        setOtpValue(autoOtp);
        setIsAutoReadingOtp(false);
        playWinChime();
        setSuccessMsg(t.auth.otpAutoDetectedMsg);

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
      setErrorMsg(t.auth.enterOtpError);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const profile = await signInWithPhoneAuto(phoneNumber, referralCode);

      if (referralCode.trim()) {
        onAddBonusDiamonds?.(1000);
      }

      playWinChime();
      setSuccessMsg(t.auth.loginSuccessUser(profile.username));

      setTimeout(() => {
        setLoading(false);
        onAuthSuccess(profile);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || t.auth.otpFailedError);
    }
  };

  // ---------------- 2. ONE-TAP GOOGLE SIGN-IN (Preserved Exactly) ----------------
  const handleSelectGoogleAccount = async (accEmail: string, accName: string) => {
    playClickSound();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Try real popup first, or build fast instant profile from detected account
      try {
        const profile = await logInWithGoogle();
        if (referralCode.trim()) {
          onAddBonusDiamonds?.(1000);
        }
        playWinChime();
        setSuccessMsg(t.auth.googleSuccessMsg(profile.name));
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
      setSuccessMsg(t.auth.oneTapGoogleSuccessMsg(accName));
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

  // ---------------- 3. GUEST MODE (Direct to Reels, No Name or ID) ----------------
  const handleGuestDirect = () => {
    playClickSound();
    onContinueAsGuest?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-fadeIn">
      <div className="relative w-full max-w-sm sm:max-w-md bg-black border border-zinc-800 rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] text-white">
        {/* Top Header with Top-Corner Language Toggle */}
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-zinc-800 mb-3 relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-[#00FF88] text-black flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(0,255,136,0.3)] shrink-0">
              ∞
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate">{t.auth.title}</span>
                <Sparkles size={13} className="text-[#00FF88] shrink-0" />
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                {t.auth.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compact Top-Corner 'हिंदी | English' Switcher */}
            <div
              className="inline-flex items-center bg-zinc-900 border border-zinc-700/80 rounded-full p-0.5 text-[10px] font-bold"
              role="group"
              aria-label="Language"
            >
              {SUPPORTED_LANGUAGES.map((opt, idx) => {
                const isActive = language === opt.code;
                return (
                  <React.Fragment key={opt.code}>
                    {idx > 0 && (
                      <span className="text-zinc-600 px-0.5 select-none">|</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectLanguage(opt.code)}
                      className={`px-2 py-0.5 rounded-full transition-all ${
                        isActive
                          ? 'bg-[#00FF88] text-black shadow-sm'
                          : 'text-zinc-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {canClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white hover:text-[#00FF88] rounded-full bg-zinc-900 border border-zinc-800 transition-colors"
                aria-label={t.common.close}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 3 Options Only: Mobile | Google | Guest */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-2xl mb-3 border border-zinc-800 relative z-10 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod('phone');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'phone'
                ? 'bg-[#00FF88] text-black shadow-md'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <Phone size={13} />
            <span className="truncate">{t.auth.phoneTab}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClickSound();
              setAuthMethod('google');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-2.5 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMethod === 'google'
                ? 'bg-[#00FF88] text-black shadow-md'
                : 'bg-zinc-900 text-white hover:bg-zinc-800'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
            </svg>
            <span className="truncate">{t.auth.googleTab}</span>
          </button>

          <button
            type="button"
            onClick={handleGuestDirect}
            className="py-2.5 px-2 rounded-xl bg-[#00FF88] hover:bg-[#00e57a] text-black font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Eye size={13} />
            <span className="truncate">{t.auth.guestTab}</span>
          </button>
        </div>

        {/* Alerts / Success Message */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-white animate-shake">
            <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 bg-emerald-950/60 border border-[#00FF88]/50 rounded-xl flex items-start gap-2 text-xs text-white animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#00FF88] shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto pr-0.5 space-y-3 relative z-10 no-scrollbar">

          {/* Small Optional Referral Code Box at Top of Both Mobile & Google Sections */}
          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
            <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <Gift size={12} className="text-[#00FF88]" />
              <span>{t.auth.referralLabel}</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder={t.auth.referralPlaceholder}
              className="w-full px-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-xs font-mono font-bold text-white placeholder-zinc-500 uppercase focus:outline-none focus:border-[#00FF88]"
            />
          </div>

          {/* ===================== OPTION 1: MOBILE ===================== */}
          {authMethod === 'phone' && (
            <div className="space-y-3">
              {/* SIM Card Hint Picker Dropdown / Suggestions */}
              {showSimPicker && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-lg animate-slideDown">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Smartphone size={14} className="text-[#00FF88]" />
                      <span>{t.auth.simPickerTitle}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSimPicker(false)}
                      className="text-zinc-400 hover:text-white text-xs"
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
                        className="w-full p-2 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-[#00FF88] text-left flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">📶</span>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {sim.number}
                            </p>
                            <p className="text-[10px] text-zinc-400">{sim.operator}</p>
                          </div>
                        </div>
                        <span className="text-[10px] bg-[#00FF88] text-black px-2.5 py-0.5 rounded-full font-bold">
                          {t.auth.simChoose}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile Number Input Form */}
              <form
                onSubmit={otpSent ? (e) => { e.preventDefault(); handleVerifyOtp(); } : handleSendOtp}
                className="space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-white">
                      {t.auth.mobileLabel}
                    </label>
                    {!showSimPicker && (
                      <button
                        type="button"
                        onClick={() => setShowSimPicker(true)}
                        className="text-[10px] text-[#00FF88] hover:underline flex items-center gap-1 font-bold"
                      >
                        <Smartphone size={11} />
                        <span>{t.auth.chooseFromSim}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-white">
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
                      className="w-full pl-18 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                  </div>
                </div>

                {/* OTP Input Field */}
                {otpSent && (
                  <div className="p-3 bg-zinc-950 border border-[#00FF88]/40 rounded-2xl space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-white flex items-center gap-1">
                        <span>{t.auth.smsOtpLabel}</span>
                        {isAutoReadingOtp && (
                          <span className="text-[10px] text-[#00FF88] font-normal animate-pulse">
                            {t.auth.autoDetectingOtp}
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] text-zinc-400">
                        {otpCountdown > 0 ? `${otpCountdown}s` : t.auth.resend}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={otpValue}
                      onChange={(e) => setOtpValue(e.target.value)}
                      placeholder={t.auth.otpPlaceholder}
                      maxLength={6}
                      className="w-full px-3 py-2.5 bg-black border border-zinc-800 rounded-xl text-center text-base tracking-[0.4em] font-mono font-black text-[#00FF88] focus:outline-none focus:border-[#00FF88]"
                    />
                  </div>
                )}

                {/* Green Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#00e57a] text-black font-extrabold text-xs shadow-[0_2px_14px_rgba(0,255,136,0.25)] disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>{t.auth.pleaseWait}</span>
                    </>
                  ) : otpSent ? (
                    <span>{t.auth.verifyAndLogin}</span>
                  ) : (
                    <span>{t.auth.sendOtp}</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ===================== OPTION 2: GOOGLE ===================== */}
          {authMethod === 'google' && (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                <p className="text-xs font-bold text-white">
                  {t.auth.detectedGoogleTitle}
                </p>
                <div className="space-y-1.5">
                  {DETECTED_GOOGLE_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(acc.email, acc.name)}
                      disabled={loading}
                      className="w-full p-2.5 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-800 hover:border-[#00FF88] text-left flex items-center gap-3 transition-all active:scale-98 group"
                    >
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">
                          {acc.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate font-mono">
                          {acc.email}
                        </p>
                      </div>
                      <span className="text-[10px] bg-[#00FF88] text-black px-2.5 py-1 rounded-lg font-extrabold shrink-0">
                        {t.auth.loginArrow}
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
                className="w-full py-2.5 rounded-xl bg-[#00FF88] hover:bg-[#00e57a] text-black font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-[0_2px_14px_rgba(0,255,136,0.25)] disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z" />
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                </svg>
                <span>{t.auth.continueWithGoogle}</span>
              </button>
            </div>
          )}

        </div>

        {/* Privacy Policy Footer */}
        {onOpenPrivacy && (
          <div className="mt-3 pt-2 border-t border-zinc-800 text-center relative z-10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onOpenPrivacy();
              }}
              className="text-[10px] text-zinc-400 hover:text-white underline"
            >
              {t.auth.privacyLink}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
