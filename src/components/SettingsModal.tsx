import React, { useState } from 'react';
import { X, Lock, Shield, BarChart3, Gem, LogOut, Check, Cloud, CheckCircle2, AlertCircle, Coins, Eye, CheckCheck } from 'lucide-react';
import { playClickSound } from '../utils/audio';
import { getCloudinaryConfig, uploadMediaToCloudinary, CloudinaryUploadResult } from '../utils/cloudinary';
import { getMonetizationStats } from '../utils/monetization';

import { UserProfile } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  dailyFollows: number;
  isPrivate: boolean;
  onTogglePrivacy: () => void;
  userProfile?: UserProfile;
  onOpenAuth?: () => void;
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
}) => {
  const [activeSubModal, setActiveSubModal] = useState<
    'privacy-policy' | 'daily-limits' | 'diamonds-rules' | 'cloudinary-settings' | 'creator-monetization' | null
  >(null);
  const [testResult, setTestResult] = useState<CloudinaryUploadResult | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#1A1A1A] border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slideUp max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-2">
          <h3 className="text-base font-bold text-white">Settings & Privacy</h3>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-full"
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
                {userProfile?.name || 'Infinity User'}
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
              {userProfile?.email ? 'Switch / Auth' : 'Log In'}
            </button>
          )}
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
              <span className="text-sm text-zinc-200">Account Privacy</span>
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
            <span className="text-sm text-zinc-200">🛡️ Privacy Policy & Terms</span>
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
              <span className="text-sm text-zinc-200">📊 Daily Limits</span>
              <p className="text-[11px] text-zinc-500">200 Follows / 100 Unfollows</p>
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
            <span className="text-sm text-zinc-200">💎 Test Diamonds Rules</span>
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
                <span className="text-sm font-semibold text-zinc-100">💰 Creator Monetization</span>
                <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-1.5 py-0.5 rounded font-mono font-bold">₹1 / 1K</span>
              </div>
              <p className="text-[11px] text-zinc-400">Anti-Bot Shield & Earnings</p>
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
              <span className="text-sm text-zinc-200">☁️ Cloudinary Media Cloud</span>
              <p className="text-[11px] text-zinc-500">Reels, Stories & Posts Storage</p>
            </div>
          </div>

          {/* Log Out */}
          <div
            onClick={() => {
              playClickSound();
              onLogout();
            }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 cursor-pointer transition-colors text-red-500"
          >
            <LogOut size={18} />
            <span className="text-sm font-semibold">🚪 Log Out</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Sub Modals */}
      {activeSubModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h4 className="text-sm font-bold text-white">
                {activeSubModal === 'privacy-policy' && '🛡️ Privacy Policy & Terms'}
                {activeSubModal === 'daily-limits' && '📊 Daily Safety Limits'}
                {activeSubModal === 'diamonds-rules' && '💎 Test Diamonds Rules'}
                {activeSubModal === 'cloudinary-settings' && '☁️ Cloudinary Media Cloud'}
                {activeSubModal === 'creator-monetization' && '💰 Creator Monetization & Anti-Bot'}
              </h4>
              <button
                onClick={() => setActiveSubModal(null)}
                className="p-1 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {activeSubModal === 'privacy-policy' && (
              <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  Infinity protects user creators with zero data selling, encrypted media streaming, and strict anti-spam moderation.
                </p>
                <p>
                  Content remains the intellectual property of the author. By posting reels, creators grant Infinity non-exclusive distribution on the network.
                </p>
              </div>
            )}

            {activeSubModal === 'daily-limits' && (
              <div className="text-xs text-zinc-300 space-y-2">
                <p>To prevent automation and foster genuine creator communities:</p>
                <div className="p-3 bg-zinc-900 rounded-lg space-y-1">
                  <div className="flex justify-between">
                    <span>Follows today:</span>
                    <strong className="text-[#00FF88]">{dailyFollows} / 200</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Unfollows today:</span>
                    <strong className="text-zinc-400">0 / 100</strong>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">Limits reset every 24 hours.</p>
              </div>
            )}

            {activeSubModal === 'diamonds-rules' && (
              <div className="text-xs text-zinc-300 space-y-2">
                <p className="font-semibold text-[#FFD700]">
                  100 Test Diamonds = ₹1 (Internal testing rule only)
                </p>
                <p>
                  Test Diamonds are virtual tokens used to evaluate creator engagement, wheel mechanics, and tip calculations.
                </p>
                <p className="text-[11px] text-zinc-400 italic">
                  TEST DIAMONDS — No Monetary Value. They cannot be withdrawn for actual currency during beta testing.
                </p>
              </div>
            )}

            {activeSubModal === 'cloudinary-settings' && (
              <div className="text-xs text-zinc-300 space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div className="p-3 bg-zinc-900 rounded-xl space-y-2 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Integrated Features:</span>
                    <span className="text-[10px] bg-emerald-500/20 text-[#00FF88] px-2 py-0.5 rounded font-mono">
                      Reels · Stories · Posts
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Captions, likes, comments, and profile data stay securely in Firebase. Photos &amp; videos upload with automatic q_auto &amp; f_auto compression.
                  </p>
                </div>

                <div className="p-3 bg-zinc-900/80 rounded-xl space-y-2 border border-zinc-800/80">
                  <span className="font-semibold text-white block">Cloudinary Connection:</span>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Cloud Name:</span>
                    <span className="font-mono text-white">
                      {getCloudinaryConfig().cloudName || 'Configured via .env or server'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Upload Preset:</span>
                    <span className="font-mono text-white">
                      {getCloudinaryConfig().uploadPreset || 'Unsigned Preset'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 text-[11px] text-blue-200">
                  <p className="font-semibold text-blue-300">⚙️ How to configure Cloudinary:</p>
                  <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[10px]">
                    <li>Sign up / log in to <strong>Cloudinary Console</strong>.</li>
                    <li>Copy your <strong>Cloud Name</strong> from the Dashboard.</li>
                    <li>Go to <strong>Settings ⚙️ &rarr; Upload &rarr; Upload Presets</strong>.</li>
                    <li>Click <strong>Add Upload Preset</strong>, select <strong>Signing Mode: Unsigned</strong>.</li>
                    <li>Save the preset name (e.g. <code className="text-[#00FF88]">infinity_media</code>).</li>
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
                        setErrorMessage(err.message || 'Upload test failed');
                      }
                    }}
                    disabled={testStatus === 'testing'}
                    className="w-full py-2 bg-[#00E5FF] hover:bg-[#00cce6] disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {testStatus === 'testing' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Running Test Upload...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} />
                        <span>Test Upload Media Pipeline</span>
                      </>
                    )}
                  </button>

                  {testStatus === 'success' && testResult && (
                    <div className="mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 text-[11px] text-emerald-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={13} className="text-[#00FF88]" />
                        <span>Upload Pipeline Verified!</span>
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
                {/* Official Policy Banner - Exact Hindi Instruction */}
                <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-zinc-900 border border-emerald-500/50 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Coins size={16} className="text-[#00FF88]" />
                    <span className="text-xs font-bold text-[#00FF88]">
                      रील्स मोनेटाइजेशन पॉलिसी
                    </span>
                  </div>
                  {/* MANDATORY EXACT TEXT */}
                  <p className="text-xs text-white font-medium leading-relaxed bg-black/40 p-2.5 rounded-lg border border-emerald-500/30">
                    "₹1 प्रति 1000 रील्स व्यूज (Coming Soon)। केवल ओरिजिनल और असली व्यूज मान्य हैं। बोट या फेक व्यूज पाए जाने पर पेआउट रद्द कर दिया जाएगा।"
                  </p>
                </div>

                {/* Earnings & View Count Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800">
                    <p className="text-[10px] text-zinc-400">Total All-Time Views</p>
                    <p className="text-sm font-black text-white mt-0.5">1,200,000</p>
                    <span className="text-[9px] text-zinc-500">1.2M raw views</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-emerald-500/30">
                    <p className="text-[10px] text-[#00FF88]">Verified Views (3s+)</p>
                    <p className="text-sm font-black text-[#00FF88] mt-0.5">1,080,000</p>
                    <span className="text-[9px] text-emerald-400/80">90% Authentic</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-rose-500/30">
                    <p className="text-[10px] text-rose-400">Bot / Fast-Scroll Filtered</p>
                    <p className="text-sm font-black text-rose-400 mt-0.5">120,000</p>
                    <span className="text-[9px] text-zinc-500">0 payout credited</span>
                  </div>
                  <div className="p-2.5 bg-zinc-900/90 rounded-xl border border-[#FFD700]/30">
                    <p className="text-[10px] text-[#FFD700]">Est. Creator Payout</p>
                    <p className="text-sm font-black text-[#FFD700] mt-0.5">₹1,080</p>
                    <span className="text-[9px] text-[#FFD700]/80">Rate: ₹1 / 1,000 Views</span>
                  </div>
                </div>

                {/* 4 Core Anti-Bot Verification Rules */}
                <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2 text-[11px] text-zinc-300">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Shield size={14} className="text-[#00E5FF]" />
                    <span>Anti-Bot Shield Protection</span>
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span><strong>3-Second Watch Rule:</strong> 3 सेकंड से कम देखने या तेज़ स्क्रॉल करने पर व्यू काउंट नहीं होगा।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span><strong>24-Hour Device Dedup:</strong> एक ही डिवाइस से 24 घंटे में बार-बार लूप में देखना फिल्टर किया जाएगा।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span><strong>Verified Creator Auth:</strong> पेआउट पाने के लिए ईमेल/पासवर्ड से लॉग इन होना अनिवार्य है।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#00FF88] shrink-0 mt-0.5" />
                      <span><strong>AI Bot Neutralizer:</strong> ऑटोमेटेड बॉट ट्रैफिक तुरंत ब्लॉक कर दिया जाएगा।</span>
                    </div>
                  </div>
                </div>

                {/* Status Notice */}
                <div className="text-center py-1">
                  <span className="text-[10px] text-zinc-400">
                    Status: <span className="text-[#00FF88] font-bold">Anti-Bot Shield Active (Beta)</span>
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2 bg-[#00FF88] text-black text-xs font-bold rounded-lg mt-3"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
