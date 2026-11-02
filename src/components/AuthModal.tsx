import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  AtSign,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import {
  signUpWithEmail,
  logInWithEmail,
  logInWithGoogle,
  resetPassword,
  getAuthErrorMessage
} from '../firebase/authService';
import { UserProfile } from '../types';
import { playClickSound, playWinChime } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    playClickSound();

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('कृपया अपना ईमेल पता दर्ज करें (Please enter your email).');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        playWinChime();
        setSuccessMsg('पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है! (Password reset link sent to your email).');
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(getAuthErrorMessage(err));
      }
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('कृपया अपना नाम दर्ज करें (Please enter your name).');
        return;
      }
      if (!username.trim()) {
        setErrorMsg('कृपया यूजरनेम चुनें (Please pick a username).');
        return;
      }
      if (!email.trim()) {
        setErrorMsg('कृपया अपना ईमेल दर्ज करें (Please enter email).');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Password must be 6+ characters).');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('दोनों पासवर्ड मेल नहीं खाते (Passwords do not match).');
        return;
      }

      setLoading(true);
      try {
        const profile = await signUpWithEmail(email, password, name, username);
        playWinChime();
        setSuccessMsg(`खाता सफलतापूर्वक बनाया गया! स्वागत है @${profile.username}!`);
        setTimeout(() => {
          onAuthSuccess(profile);
          onClose();
        }, 800);
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(getAuthErrorMessage(err));
      }
      return;
    }

    // Login mode
    if (!email.trim() || !password) {
      setErrorMsg('कृपया ईमेल और पासवर्ड दोनों दर्ज करें (Please enter both email and password).');
      return;
    }

    setLoading(true);
    try {
      const profile = await logInWithEmail(email, password);
      playWinChime();
      setSuccessMsg(`सफलतापूर्वक लॉग इन किया गया! स्वागत है ${profile.name}!`);
      setTimeout(() => {
        onAuthSuccess(profile);
        onClose();
      }, 700);
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(getAuthErrorMessage(err));
    }
  };

  const handleGoogleLogin = async () => {
    playClickSound();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const profile = await logInWithGoogle();
      playWinChime();
      setSuccessMsg(`Google से सफलतापूर्वक लॉग इन! स्वागत है ${profile.name}!`);
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
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#12151B] border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#00FF88]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#00E5FF]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00FF88] to-[#00E5FF] text-black flex items-center justify-center font-black text-sm shadow-[0_0_15px_rgba(0,255,136,0.3)]">
              ∞
            </span>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>Infinity Account</span>
                <Sparkles size={14} className="text-[#00FF88]" />
              </h3>
              <p className="text-[11px] text-zinc-400">
                {mode === 'login' && 'अपने अकाउंट में लॉग इन करें'}
                {mode === 'signup' && 'नया क्रिएटर अकाउंट बनाएं'}
                {mode === 'forgot' && 'पासवर्ड रीसेट करें'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switch Tabs (Log In vs Sign Up) */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900/90 rounded-2xl mb-4 border border-zinc-800/80 relative z-10">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'login'
                  ? 'bg-[#00FF88] text-black shadow-[0_2px_12px_rgba(0,255,136,0.25)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              लॉग इन (Log In)
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#00FF88] text-black shadow-[0_2px_12px_rgba(0,255,136,0.25)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              साइन अप (Sign Up)
            </button>
          </div>
        )}

        {/* Scrollable Form Area */}
        <div className="overflow-y-auto pr-1 flex-1 relative z-10 space-y-3">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-300 animate-shake">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                <p>{errorMsg}</p>
                {errorMsg.includes('Firebase Console') && (
                  <a
                    href="https://console.firebase.google.com/project/voltaic-isomer-bbg1d/authentication/providers"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#00FF88] hover:underline"
                  >
                    <span>Firebase Console खोलें (Enable Email/Password)</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 size={16} className="text-[#00FF88] shrink-0" />
              <span className="text-[11px] font-semibold">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <>
                {/* Full Name */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    पूरा नाम (Full Name)
                  </label>
                  <div className="relative">
                    <UserIcon
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                    यूजरनेम (Username)
                  </label>
                  <div className="relative">
                    <AtSign
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. ramesh_creator"
                      maxLength={24}
                      required
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                ईमेल (Email Address)
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                />
              </div>
            </div>

            {/* Password Field (for Login and Signup) */}
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-300">
                    पासवर्ड (Password)
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[10px] text-[#00E5FF] hover:underline"
                    >
                      पासवर्ड भूल गए?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (for Signup) */}
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  पासवर्ड की पुष्टि (Confirm Password)
                </label>
                <div className="relative">
                  <KeyRound
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00FF88] transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00FF88] to-[#00E5FF] hover:opacity-95 text-black font-extrabold text-xs shadow-[0_2px_14px_rgba(0,255,136,0.3)] disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>प्रतीक्षा करें...</span>
                </>
              ) : (
                <span>
                  {mode === 'login' && 'लॉग इन करें (Log In)'}
                  {mode === 'signup' && 'साइन अप करें (Create Account)'}
                  {mode === 'forgot' && 'रीसेट लिंक भेजें (Send Reset Link)'}
                </span>
              )}
            </button>
          </form>

          {/* Return to login from forgot password */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full text-center text-xs text-zinc-400 hover:text-white py-1 transition-colors"
            >
              ← वापस लॉग इन पर जाएं (Back to Log In)
            </button>
          )}

          {/* Social or Google Sign-In divider */}
          {mode !== 'forgot' && (
            <div className="pt-2">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-800" />
                <span className="flex-shrink mx-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                  या (Or)
                </span>
                <div className="flex-grow border-t border-zinc-800" />
              </div>

              {/* Google Sign-in button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                  />
                </svg>
                <span>Google से जारी रखें (Continue with Google)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-3 pt-3 border-t border-zinc-800/80 text-center relative z-10">
          <p className="text-[10px] text-zinc-500">
            सुरक्षित प्रमाणीकरण · Firebase Authentication &amp; Firestore
          </p>
        </div>
      </div>
    </div>
  );
};
