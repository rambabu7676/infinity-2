import React, { useState } from 'react';
import {
  X,
  Lock,
  Shield,
  BarChart3,
  Gem,
  LogOut,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Coins,
  MessageSquare,
  Send,
  Crown,
  Sparkles,
  Bug,
  Lightbulb,
  UserX,
  Trash2,
  PauseCircle,
  ShieldCheck,
  Clock,
  Ban,
  Languages,
} from 'lucide-react';
import { playClickSound, playWinChime } from '../utils/audio';
import { getCloudinaryConfig, uploadMediaToCloudinary, CloudinaryUploadResult } from '../utils/cloudinary';
import { saveFeedbackToFirebase } from '../firebase/services';
import { UserProfile, FeedbackItem, BlockedUserEntry, AppLanguage } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  dailyFollows: number;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
  userProfile?: UserProfile;
  onOpenAuth?: () => void;
  goldenThemeEnabled?: boolean;
  onToggleGoldenTheme?: () => void;
  onDeactivateAccount?: () => Promise<void>;
  onScheduleDeletion?: (days: 7 | 30) => Promise<{ success: boolean; error?: string }>;
  onCancelDeletion?: () => Promise<void>;
  blockedUsers?: BlockedUserEntry[];
  onUnblockUser?: (username: string) => Promise<void> | void;
  onLanguageChange?: (lang: AppLanguage) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onLogout,
  dailyFollows,
  isPrivate,
  onTogglePrivacy,
  userProfile,
  onOpenAuth,
  goldenThemeEnabled = false,
  onToggleGoldenTheme,
  onDeactivateAccount,
  onScheduleDeletion,
  onCancelDeletion,
  blockedUsers = [],
  onUnblockUser,
  onLanguageChange,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeSubModal, setActiveSubModal] = useState<
    | 'privacy-policy'
    | 'daily-limits'
    | 'diamonds-rules'
    | 'cloudinary-settings'
    | 'creator-monetization'
    | 'support-feedback'
    | 'account-closure'
    | 'blocked-users'
    | null
  >(null);
  const [unblockingUsername, setUnblockingUsername] = useState<string | null>(null);
  const [accountClosureStep, setAccountClosureStep] = useState<
    'choice' | 'deactivate-confirm' | 'delete-duration' | 'delete-confirm'
  >('choice');
  const [selectedDeleteDays, setSelectedDeleteDays] = useState<7 | 30>(7);
  const [accountActionLoading, setAccountActionLoading] = useState(false);
  const [accountActionError, setAccountActionError] = useState('');
  const [testResult, setTestResult] = useState<CloudinaryUploadResult | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Support & Feedback Form States
  const [feedbackCategory, setFeedbackCategory] = useState<'bug' | 'feature' | 'general'>('general');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackContact, setFeedbackContact] = useState(userProfile?.email || userProfile?.phone || '');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Helper to count words (max 300 words)
  const getWordCount = (str: string) => {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };
  const wordCount = getWordCount(feedbackText);

  const isGuestUser = Boolean(
    userProfile?.isGuest || !userProfile?.uid || userProfile?.uid === 'guest_user'
  );
  const hasPendingDeletion = Boolean(
    !isGuestUser &&
      userProfile?.accountStatus === 'pending_deletion' &&
      userProfile?.deletionScheduledAt &&
      userProfile.deletionScheduledAt > Date.now()
  );

  const formattedDeleteTargetDate = React.useMemo(() => {
    const targetTs = Date.now() + selectedDeleteDays * 24 * 60 * 60 * 1000;
    return new Date(targetTs).toLocaleDateString(language === 'en' ? 'en-IN' : 'hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDeleteDays, activeSubModal, accountClosureStep, language]);

  const openAccountClosureModal = () => {
    setAccountClosureStep('choice');
    setAccountActionError('');
    setAccountActionLoading(false);
    setActiveSubModal('account-closure');
  };

  const handleSelectLanguage = (nextLang: AppLanguage) => {
    playClickSound();
    if (onLanguageChange) {
      onLanguageChange(nextLang);
    } else {
      setLanguage(nextLang);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#1A1A1A] border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slideUp max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
          <h3 className="text-base font-bold text-white">{t.settings.title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full"
            aria-label={t.common.close}
          >
            <X size={18} />
          </button>
        </div>

        {/* User Account Status Box */}
        <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'}
              alt={userProfile?.username || 'User'}
              className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {userProfile?.name || t.settings.infinityUser}
              </p>
              <p className="text-[11px] text-[#00FF88] truncate font-mono">
                @{userProfile?.username || 'creator'}
              </p>
              {userProfile?.email && (
                <p className="text-[10px] text-zinc-400 truncate">
                  {userProfile.email}
                </p>
              )}
            </div>
          </div>
          {onOpenAuth && (
            <button
              onClick={() => {
                playClickSound();
                onOpenAuth();
              }}
              className="ml-2 px-2.5 py-1.5 rounded-xl bg-[#00FF88]/15 hover:bg-[#00FF88]/25 text-[#00FF88] text-[11px] font-bold shrink-0 transition-colors border border-[#00FF88]/30"
            >
              {userProfile?.email ? t.settings.switchAuth : t.settings.logIn}
            </button>
          )}
        </div>

        {/* Language Section ('भाषा' / 'Language') */}
        <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Languages size={18} className="text-[#00FF88] shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {t.settings.languageSectionTitle}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {t.settings.languageSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {SUPPORTED_LANGUAGES.map((opt) => {
              const isActive = language === opt.code;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelectLanguage(opt.code)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isActive
                      ? 'bg-[#00FF88] border-[#00FF88] text-black shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          {/* Account Privacy Toggle */}
          <div
            onClick={() => {
              playClickSound();
              onTogglePrivacy();
            }}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-zinc-400" />
              <span className="text-sm text-zinc-200">{t.settings.accountPrivacy}</span>
            </div>
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                isPrivate ? 'bg-[#00FF88]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black transition-transform ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Privacy Policy & Terms */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('privacy-policy');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <Shield size={18} className="text-zinc-400" />
            <span className="text-sm text-zinc-200">{t.settings.privacyPolicy}</span>
          </div>

          {/* Daily Limits */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('daily-limits');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <BarChart3 size={18} className="text-zinc-400" />
            <div className="flex-1">
              <span className="text-sm text-zinc-200">{t.settings.dailyLimits}</span>
              <p className="text-[11px] text-zinc-500">{t.settings.dailyLimitsSub}</p>
            </div>
          </div>

          {/* Test Diamonds Rules */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('diamonds-rules');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <Gem size={18} className="text-[#FFD700]" />
            <span className="text-sm text-zinc-200">{t.settings.diamondsRules}</span>
          </div>

          {/* Creator Monetization & Anti-Fraud Shield */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('creator-monetization');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <Coins size={18} className="text-[#00FF88]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-100">{t.settings.creatorMonetization}</span>
                <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-1.5 py-0.5 rounded font-mono font-bold">₹1 / 1K</span>
              </div>
              <p className="text-[11px] text-zinc-400">{t.settings.creatorMonetizationSub}</p>
            </div>
          </div>

          {/* Royal Golden Look Switch */}
          <div
            onClick={() => {
              playClickSound();
              onToggleGoldenTheme?.();
            }}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Crown size={18} className="text-[#FFD700]" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">{t.settings.royalGoldenLook}</span>
                  <span className="text-[9px] bg-amber-500/20 text-[#FFD700] px-1.5 py-0.2 rounded font-bold">
                    {t.settings.vipBadge}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400">
                  {userProfile?.isPremium || (userProfile?.successfulReferrals || 0) >= 6
                    ? t.settings.goldenActiveSub
                    : t.settings.goldenLockedSub}
                </p>
              </div>
            </div>
            <div
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                goldenThemeEnabled ? 'bg-gradient-to-r from-amber-500 to-[#FFD700]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black transition-transform ${
                  goldenThemeEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* INFINITY Support & Feedback */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('support-feedback');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors border border-cyan-500/20 bg-cyan-950/15"
          >
            <MessageSquare size={18} className="text-[#00E5FF]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{t.settings.supportFeedback}</span>
                <span className="text-[10px] bg-cyan-500/20 text-[#00E5FF] px-1.5 py-0.5 rounded font-bold">
                  {t.settings.newBadge}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">{t.settings.supportFeedbackSub}</p>
            </div>
          </div>

          {/* Cloudinary & Media Storage */}
          <div
            onClick={() => {
              playClickSound();
              setActiveSubModal('cloudinary-settings');
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
          >
            <Cloud size={18} className="text-[#00E5FF]" />
            <div className="flex-1">
              <span className="text-sm text-zinc-200">{t.settings.cloudinaryCloud}</span>
              <p className="text-[11px] text-zinc-500">{t.settings.cloudinarySub}</p>
            </div>
          </div>

          {/* Blocked Users Management (Hidden for Guest Users) */}
          {!isGuestUser && (
            <div
              onClick={() => {
                playClickSound();
                setActiveSubModal('blocked-users');
              }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <Ban size={18} className="text-rose-400" />
                <span className="text-sm font-medium text-zinc-200">{t.settings.blockedUsers}</span>
              </div>
              {blockedUsers.length > 0 && (
                <span className="text-[11px] font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full">
                  {blockedUsers.length}
                </span>
              )}
            </div>
          )}

          {/* Log Out */}
          <div
            onClick={() => {
              playClickSound();
              onLogout();
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 cursor-pointer transition-colors text-red-500"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">{t.settings.logOut}</span>
          </div>

          {/* Cancel pending deletion directly inside Settings when active */}
          {!isGuestUser && hasPendingDeletion && onCancelDeletion && (
            <button
              type="button"
              disabled={accountActionLoading}
              onClick={async () => {
                playClickSound();
                setAccountActionLoading(true);
                try {
                  await onCancelDeletion();
                } finally {
                  setAccountActionLoading(false);
                }
              }}
              className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              <span>{t.settings.stopDeletion}</span>
            </button>
          )}

          {/* Bottom Option: Deactivate or Delete Account (Hidden for Guest Users) */}
          {!isGuestUser && (
            <div
              onClick={() => {
                playClickSound();
                openAccountClosureModal();
              }}
              className="flex items-center justify-between p-3.5 rounded-xl bg-black border border-zinc-700 hover:border-red-500/60 cursor-pointer transition-colors mt-1"
            >
              <div className="flex items-center gap-3">
                <UserX size={18} className="text-red-400 shrink-0" />
                <span className="text-sm font-bold text-white">{t.settings.closeOrDeleteAccount}</span>
              </div>
              {hasPendingDeletion && (
                <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                  <Clock size={12} />
                  {t.settings.scheduledBadge}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          {t.settings.cancel}
        </button>
      </div>

      {/* Sub Modals */}
      {activeSubModal && activeSubModal === 'account-closure' && !isGuestUser && (
        <div className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-black border-2 border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="text-lg font-extrabold text-white">
                {accountClosureStep === 'choice' && t.settings.accountClosureModal.stepChoiceTitle}
                {accountClosureStep === 'deactivate-confirm' && t.settings.accountClosureModal.stepDeactivateTitle}
                {accountClosureStep === 'delete-duration' && t.settings.accountClosureModal.stepDeleteDurationTitle}
                {accountClosureStep === 'delete-confirm' && t.settings.accountClosureModal.stepDeleteConfirmTitle}
              </h4>
              <button
                type="button"
                disabled={accountActionLoading}
                onClick={() => setActiveSubModal(null)}
                className="p-1.5 text-white hover:bg-zinc-900 rounded-full"
                aria-label={t.common.close}
              >
                <X size={20} />
              </button>
            </div>

            {accountActionError && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500 text-white text-sm font-semibold flex items-start gap-2.5 leading-relaxed">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <span>{accountActionError}</span>
              </div>
            )}

            {/* STEP 0: Two Main Choices */}
            {accountClosureStep === 'choice' && (
              <div className="space-y-3">
                {hasPendingDeletion && onCancelDeletion && (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-green-500/60 space-y-3">
                    <p className="text-base font-bold text-white leading-relaxed">
                      {t.settings.accountClosureModal.pendingDeletionNotice}
                    </p>
                    <button
                      type="button"
                      disabled={accountActionLoading}
                      onClick={async () => {
                        playClickSound();
                        setAccountActionLoading(true);
                        setAccountActionError('');
                        try {
                          await onCancelDeletion();
                          setActiveSubModal(null);
                        } finally {
                          setAccountActionLoading(false);
                        }
                      }}
                      className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      <ShieldCheck size={20} />
                      <span>{t.settings.accountClosureModal.stopDeletionBtn}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAccountActionError('');
                    setAccountClosureStep('deactivate-confirm');
                  }}
                  className="w-full p-4 rounded-xl bg-zinc-950 border-2 border-green-600/80 hover:border-green-500 text-left space-y-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-white font-extrabold text-base">
                    <PauseCircle size={20} className="text-green-400 shrink-0" />
                    <span>{t.settings.accountClosureModal.deactivateBtn}</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {t.settings.accountClosureModal.deactivateCardDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAccountActionError('');
                    setAccountClosureStep('delete-duration');
                  }}
                  className="w-full p-4 rounded-xl bg-zinc-950 border-2 border-red-600/80 hover:border-red-500 text-left space-y-2 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-white font-extrabold text-base">
                    <Trash2 size={20} className="text-red-400 shrink-0" />
                    <span>{t.settings.accountClosureModal.deletePermanentBtn}</span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {t.settings.accountClosureModal.deleteCardDesc}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveSubModal(null);
                  }}
                  className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base transition-colors"
                >
                  {t.settings.accountClosureModal.closeBtn}
                </button>
              </div>
            )}

            {/* STEP A: Temporary Deactivation */}
            {accountClosureStep === 'deactivate-confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-700">
                  <p className="text-base text-white font-semibold leading-relaxed">
                    {t.settings.accountClosureModal.deactivateFullNotice}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={accountActionLoading}
                    onClick={async () => {
                      if (!onDeactivateAccount) return;
                      playClickSound();
                      setAccountActionLoading(true);
                      setAccountActionError('');
                      try {
                        await onDeactivateAccount();
                        setActiveSubModal(null);
                      } catch (err: any) {
                        setAccountActionError(
                          err?.message || t.settings.accountClosureModal.deactivateFailedError
                        );
                      } finally {
                        setAccountActionLoading(false);
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {accountActionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t.settings.accountClosureModal.deactivatingBtn}</span>
                      </>
                    ) : (
                      <span>{t.settings.accountClosureModal.deactivateBtn}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={accountActionLoading}
                    onClick={() => {
                      playClickSound();
                      setAccountActionError('');
                      setAccountClosureStep('choice');
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-60"
                  >
                    {t.settings.accountClosureModal.goBackBtn}
                  </button>
                </div>
              </div>
            )}

            {/* STEP B1: Choose 7 Days or 30 Days */}
            {accountClosureStep === 'delete-duration' && (
              <div className="space-y-4">
                <p className="text-base text-white font-semibold leading-relaxed">
                  {t.settings.accountClosureModal.chooseDaysPrompt}
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedDeleteDays(7);
                      setAccountActionError('');
                      setAccountClosureStep('delete-confirm');
                    }}
                    className="w-full py-4 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>{t.settings.accountClosureModal.deleteIn7Days}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSelectedDeleteDays(30);
                      setAccountActionError('');
                      setAccountClosureStep('delete-confirm');
                    }}
                    className="w-full py-4 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>{t.settings.accountClosureModal.deleteIn30Days}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setAccountActionError('');
                    setAccountClosureStep('choice');
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base transition-colors"
                >
                  {t.settings.accountClosureModal.goBackBtn}
                </button>
              </div>
            )}

            {/* STEP B2: Exact Target Date Confirmation + Google Re-Authentication */}
            {accountClosureStep === 'delete-confirm' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-zinc-950 border-2 border-red-600/80 space-y-3">
                  <p className="text-base font-bold text-white leading-relaxed">
                    {t.settings.accountClosureModal.deleteTargetConfirmText(formattedDeleteTargetDate)}
                  </p>
                  <p className="text-sm text-white/85 leading-relaxed border-t border-zinc-800 pt-2.5">
                    {t.settings.accountClosureModal.googleReauthNote}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={accountActionLoading}
                    onClick={async () => {
                      if (!onScheduleDeletion) return;
                      playClickSound();
                      setAccountActionLoading(true);
                      setAccountActionError('');
                      try {
                        const result = await onScheduleDeletion(selectedDeleteDays);
                        if (!result.success) {
                          setAccountActionError(
                            result.error || t.settings.accountClosureModal.googleAuthError
                          );
                          return;
                        }
                        setActiveSubModal(null);
                      } catch (err: any) {
                        setAccountActionError(
                          err?.message || t.settings.accountClosureModal.scheduleFailedError
                        );
                      } finally {
                        setAccountActionLoading(false);
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  >
                    {accountActionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t.settings.accountClosureModal.verifyingGoogleBtn}</span>
                      </>
                    ) : (
                      <span>{t.settings.accountClosureModal.confirmScheduleBtn}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={accountActionLoading}
                    onClick={() => {
                      playClickSound();
                      setAccountActionError('');
                      setActiveSubModal(null);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-base transition-colors disabled:opacity-60"
                  >
                    {t.settings.accountClosureModal.cancelBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubModal && activeSubModal === 'blocked-users' && !isGuestUser && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#16181C] border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xl text-white max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-rose-400" />
                <h4 className="text-base font-extrabold text-white">{t.settings.blockedModal.title}</h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-full"
                aria-label={t.common.close}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar min-h-[140px]">
              {blockedUsers.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                    <Ban size={20} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-400">
                    {t.settings.blockedModal.emptyState}
                  </p>
                </div>
              ) : (
                blockedUsers.map((entry) => {
                  const isBusy = unblockingUsername === entry.blockedUsername;
                  return (
                    <div
                      key={entry.blockId || entry.blockedUsername}
                      className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            entry.blockedAvatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                              entry.blockedUsername
                            )}`
                          }
                          alt={entry.blockedUsername}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0 bg-zinc-950"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {entry.blockedName || entry.blockedUsername}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            @{entry.blockedUsername}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={async () => {
                          if (!onUnblockUser) return;
                          playClickSound();
                          setUnblockingUsername(entry.blockedUsername);
                          try {
                            await onUnblockUser(entry.blockedUsername);
                          } finally {
                            setUnblockingUsername(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#00FF88] hover:bg-[#00e57a] text-black font-bold text-xs shrink-0 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isBusy ? '...' : t.settings.blockedModal.unblockBtn}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2.5 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              {t.settings.blockedModal.closeBtn}
            </button>
          </div>
        </div>
      )}

      {activeSubModal && activeSubModal !== 'account-closure' && activeSubModal !== 'blocked-users' && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white">
                {activeSubModal === 'privacy-policy' && t.settings.subModalTitles.privacyPolicy}
                {activeSubModal === 'daily-limits' && t.settings.subModalTitles.dailyLimits}
                {activeSubModal === 'diamonds-rules' && t.settings.subModalTitles.diamondsRules}
                {activeSubModal === 'cloudinary-settings' && t.settings.subModalTitles.cloudinarySettings}
                {activeSubModal === 'creator-monetization' && t.settings.subModalTitles.creatorMonetization}
                {activeSubModal === 'support-feedback' && t.settings.subModalTitles.supportFeedback}
              </h4>
              <button
                onClick={() => setActiveSubModal(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {activeSubModal === 'privacy-policy' && (
              <div className="text-xs text-zinc-300 space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
                <div className="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 space-y-1">
                  <p className="font-bold text-white text-xs">{t.settings.privacyModal.heading}</p>
                  <p className="text-[10px] text-zinc-400">{t.settings.privacyModal.effective}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white">{t.settings.privacyModal.s1Title}</p>
                  <p className="text-zinc-400 text-[11px]">{t.settings.privacyModal.s1Body}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white">{t.settings.privacyModal.s2Title}</p>
                  <p className="text-zinc-400 text-[11px]">{t.settings.privacyModal.s2Body}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white">{t.settings.privacyModal.s3Title}</p>
                  <p className="text-zinc-400 text-[11px]">{t.settings.privacyModal.s3Body}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white">{t.settings.privacyModal.s4Title}</p>
                  <p className="text-zinc-400 text-[11px]">{t.settings.privacyModal.s4Body}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-white">{t.settings.privacyModal.s5Title}</p>
                  <p className="text-zinc-400 text-[11px]">
                    {t.settings.privacyModal.s5BodyBefore}
                    <span className="text-[#00FF88] font-mono">support@infinity.app</span>
                    {t.settings.privacyModal.s5BodyAfter}
                  </p>
                </div>
              </div>
            )}

            {activeSubModal === 'daily-limits' && (
              <div className="text-xs text-zinc-300 space-y-2">
                <p>{t.settings.limitsModal.intro}</p>
                <div className="p-3 bg-zinc-900 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span>{t.settings.limitsModal.followsToday}</span>
                    <strong className="text-[#00FF88]">{dailyFollows} / 200</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.settings.limitsModal.unfollowsToday}</span>
                    <strong className="text-zinc-400">0 / 100</strong>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">{t.settings.limitsModal.resetNote}</p>
              </div>
            )}

            {activeSubModal === 'diamonds-rules' && (
              <div className="text-xs text-zinc-300 space-y-2">
                <p className="font-semibold text-[#FFD700]">
                  {t.settings.diamondsModal.rule}
                </p>
                <p>{t.settings.diamondsModal.desc}</p>
                <p className="text-[11px] text-zinc-400 italic">
                  {t.settings.diamondsModal.note}
                </p>
              </div>
            )}

            {activeSubModal === 'cloudinary-settings' && (
              <div className="text-xs text-zinc-300 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div className="p-3 bg-zinc-900 rounded-xl space-y-2 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{t.settings.cloudinaryModal.featuresLabel}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-2 py-0.5 rounded font-mono">
                      {t.settings.cloudinaryModal.featuresPill}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {t.settings.cloudinaryModal.desc}
                  </p>
                </div>

                <div className="p-3 bg-zinc-900/80 rounded-xl space-y-2 border border-zinc-800/80">
                  <span className="font-semibold text-white block">{t.settings.cloudinaryModal.connectionLabel}</span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">{t.settings.cloudinaryModal.cloudNameLabel}</span>
                    <span className="font-mono text-white">
                      {getCloudinaryConfig().cloudName || t.settings.cloudinaryModal.cloudNameFallback}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">{t.settings.cloudinaryModal.presetLabel}</span>
                    <span className="font-mono text-white">
                      {getCloudinaryConfig().uploadPreset || t.settings.cloudinaryModal.presetFallback}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 text-[11px] text-blue-200">
                  <p className="font-semibold text-blue-300">{t.settings.cloudinaryModal.howToTitle}</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[10px]">
                    {t.settings.cloudinaryModal.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Live Test Upload Button */}
                <div className="pt-1">
                  <button
                    onClick={async () => {
                      setTestStatus('testing');
                      setErrorMessage('');
                      try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 100;
                        canvas.height = 100;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.fillStyle = '#00FF88';
                          ctx.fillRect(0, 0, 100, 100);
                        }
                        const testBlob = await new Promise<Blob>((res) =>
                          canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.8)
                        );
                        const result = await uploadMediaToCloudinary(testBlob, {
                          folder: 'posts',
                          resourceType: 'image',
                        });
                        setTestResult(result);
                        setTestStatus('success');
                      } catch (err: any) {
                        setTestStatus('error');
                        setErrorMessage(err.message || t.settings.cloudinaryModal.uploadFailed);
                      }
                    }}
                    disabled={testStatus === 'testing'}
                    className="w-full py-2 bg-[#00E5FF] hover:bg-[#00cce6] disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {testStatus === 'testing' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>{t.settings.cloudinaryModal.testingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} />
                        <span>{t.settings.cloudinaryModal.testBtn}</span>
                      </>
                    )}
                  </button>

                  {testStatus === 'success' && testResult && (
                    <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-[11px] text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={13} className="text-[#00FF88]" />
                        <span>{t.settings.cloudinaryModal.verifiedMsg}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 break-all">
                        Public ID: {testResult.publicId}
                      </p>
                      <p className="text-[10px] text-zinc-400 break-all">
                        Optimized: {testResult.optimizedUrl.substring(0, 50)}...
                      </p>
                    </div>
                  )}

                  {testStatus === 'error' && (
                    <div className="mt-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-[11px] text-red-300 flex items-start gap-1.5">
                      <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSubModal === 'creator-monetization' && (
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-zinc-900 border border-emerald-500/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Coins size={16} className="text-[#00FF88]" />
                    <span className="text-xs font-bold text-[#00FF88]">
                      {t.settings.monetizationModal.policyTitle}
                    </span>
                  </div>
                  <p className="text-xs text-white font-medium leading-relaxed bg-black/40 p-2.5 rounded-lg border border-emerald-500/30">
                    {t.settings.monetizationModal.policyText}
                  </p>
                </div>

                {/* Earnings & View Count Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-400">{t.settings.monetizationModal.totalViews}</p>
                    <p className="text-sm font-black text-white mt-0.5">1,200,000</p>
                    <span className="text-[9px] text-zinc-500">{t.settings.monetizationModal.rawViews}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-emerald-500/30">
                    <p className="text-[10px] text-[#00FF88]">{t.settings.monetizationModal.verifiedViews}</p>
                    <p className="text-sm font-black text-[#00FF88] mt-0.5">1,080,000</p>
                    <span className="text-[9px] text-emerald-400/80">{t.settings.monetizationModal.authenticRate}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-rose-500/30">
                    <p className="text-[10px] text-rose-400">{t.settings.monetizationModal.filteredViews}</p>
                    <p className="text-sm font-black text-rose-400 mt-0.5">120,000</p>
                    <span className="text-[9px] text-zinc-500">{t.settings.monetizationModal.zeroPayout}</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-[#FFD700]/30">
                    <p className="text-[10px] text-[#FFD700]">{t.settings.monetizationModal.estPayout}</p>
                    <p className="text-sm font-black text-[#FFD700] mt-0.5">₹1,080</p>
                    <span className="text-[9px] text-[#FFD700]/80">{t.settings.monetizationModal.rateText}</span>
                  </div>
                </div>

                {/* 4 Core Anti-Bot Verification Rules */}
                <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2 text-[11px] text-zinc-300">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield size={14} className="text-[#00E5FF]" />
                    <span>{t.settings.monetizationModal.shieldTitle}</span>
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span>
                        <strong>{t.settings.monetizationModal.rule1Title}</strong>{' '}
                        {t.settings.monetizationModal.rule1Desc}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span>
                        <strong>{t.settings.monetizationModal.rule2Title}</strong>{' '}
                        {t.settings.monetizationModal.rule2Desc}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span>
                        <strong>{t.settings.monetizationModal.rule3Title}</strong>{' '}
                        {t.settings.monetizationModal.rule3Desc}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span>
                        <strong>{t.settings.monetizationModal.rule4Title}</strong>{' '}
                        {t.settings.monetizationModal.rule4Desc}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center py-1">
                  <span className="text-[10px] text-zinc-400">
                    {t.settings.monetizationModal.statusLabel}{' '}
                    <span className="text-[#00FF88] font-bold">{t.settings.monetizationModal.statusValue}</span>
                  </span>
                </div>
              </div>
            )}

            {activeSubModal === 'support-feedback' && (
              <div className="space-y-3">
                {feedbackSent ? (
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <CheckCircle2 size={32} className="text-[#00FF88] mx-auto" />
                    <p className="text-sm font-bold text-white">{t.settings.feedbackModal.thankYouTitle}</p>
                    <p className="text-xs text-zinc-300">
                      {t.settings.feedbackModal.thankYouDesc}
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!feedbackText.trim()) return;
                      if (wordCount > 300) {
                        setErrorMessage(t.settings.feedbackModal.wordLimitAlert);
                        return;
                      }

                      setFeedbackSending(true);
                      playClickSound();

                      try {
                        const feedbackItem: FeedbackItem = {
                          id: `fb_${Date.now()}`,
                          category: feedbackCategory,
                          message: feedbackText.trim(),
                          userEmail: feedbackContact.trim() || userProfile?.email || userProfile?.phone || 'anonymous',
                          username: userProfile?.username || 'user',
                          timestamp: Date.now(),
                          createdAt: new Date().toLocaleString(),
                          deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Client',
                        };

                        await saveFeedbackToFirebase(feedbackItem);
                        playWinChime();
                        setFeedbackSending(false);
                        setFeedbackSent(true);
                        setTimeout(() => {
                          setFeedbackSent(false);
                          setFeedbackText('');
                          setActiveSubModal(null);
                        }, 2200);
                      } catch (err) {
                        setFeedbackSending(false);
                        console.error('Feedback submit error:', err);
                      }
                    }}
                    className="space-y-3"
                  >
                    {/* Category Selection Tabs */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        {t.settings.feedbackModal.selectCategory}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFeedbackCategory('bug');
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                            feedbackCategory === 'bug'
                              ? 'bg-red-500/20 border-red-500 text-red-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Bug size={14} className={feedbackCategory === 'bug' ? 'text-red-400' : 'text-zinc-500'} />
                          <span className="truncate">{t.settings.feedbackModal.bugReport}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFeedbackCategory('feature');
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                            feedbackCategory === 'feature'
                              ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Lightbulb size={14} className={feedbackCategory === 'feature' ? 'text-[#00E5FF]' : 'text-zinc-500'} />
                          <span className="truncate">{t.settings.feedbackModal.featureIdea}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playClickSound();
                            setFeedbackCategory('general');
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1 ${
                            feedbackCategory === 'general'
                              ? 'bg-[#00FF88]/20 border-[#00FF88] text-[#00FF88]'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Sparkles size={14} className={feedbackCategory === 'general' ? 'text-[#00FF88]' : 'text-zinc-500'} />
                          <span className="truncate">{t.settings.feedbackModal.feedback}</span>
                        </button>
                      </div>
                    </div>

                    {/* Word Limit Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-zinc-300">
                          {t.settings.feedbackModal.yourMessage}
                        </label>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            wordCount > 300 ? 'text-red-400' : 'text-[#00FF88]'
                          }`}
                        >
                          {wordCount} / 300 {t.settings.feedbackModal.wordsSuffix}
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder={t.settings.feedbackModal.messagePlaceholder}
                        required
                        className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF] resize-none"
                      />
                    </div>

                    {/* Contact details */}
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                        {t.settings.feedbackModal.contactLabel}
                      </label>
                      <input
                        type="text"
                        value={feedbackContact}
                        onChange={(e) => setFeedbackContact(e.target.value)}
                        placeholder={t.settings.feedbackModal.contactPlaceholder}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00E5FF]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={feedbackSending || !feedbackText.trim() || wordCount > 300}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0095F6] via-[#00E5FF] to-[#00FF88] text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.35)] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {feedbackSending ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>{t.settings.feedbackModal.sendingBtn}</span>
                        </>
                      ) : (
                        <>
                          <Send size={14} className="text-black" />
                          <span>{t.settings.feedbackModal.sendBtn}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2 bg-[#00FF88] text-black text-xs font-bold rounded-lg mt-3"
            >
              {t.common.understood}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
