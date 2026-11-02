import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, X, Gift, CheckCircle2 } from 'lucide-react';
import { playWheelTick, playWinChime } from '../utils/audio';

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWin: (amount: number) => void;
  currentDiamonds: number;
}

const SEGMENTS = [10, 60, 20, 70, 30, 80, 40, 90, 50, 100];
const COLORS = [
  '#00FF88', '#FFD700', '#00E5FF', '#FF0055', '#7928CA',
  '#FF7A00', '#00FF88', '#FFD700', '#00E5FF', '#FF0055'
];

export const SpinWheelModal: React.FC<SpinWheelModalProps> = ({
  isOpen,
  onClose,
  onWin,
  currentDiamonds,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonAmount, setWonAmount] = useState<number | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const currentRotationRef = useRef(0);

  useEffect(() => {
    if (!isOpen) {
      setWonAmount(null);
      setShowCelebrationModal(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSpin = () => {
    if (spinning) return;

    // 🎲 WEIGHTED SPIN LOGIC: 80% (10 to 50) | 20% (60 to 100)
    const commonRewards = [10, 20, 30, 40, 50]; // 80% Chance
    const rareRewards = [60, 70, 80, 90, 100];   // 20% Chance

    const isCommon = Math.random() < 0.8;
    const rewardsArray = isCommon ? commonRewards : rareRewards;
    const chosenWin = rewardsArray[Math.floor(Math.random() * rewardsArray.length)];

    // Target index on the SEGMENTS wheel
    const targetIndex = SEGMENTS.indexOf(chosenWin);
    const segmentAngle = 360 / SEGMENTS.length;
    // Top pointer is at 270 deg (or 90 deg depending on orientation).
    // Let's calculate rotation so the top pointer lands squarely in target segment.
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full revolutions
    const targetOffset = 360 - (targetIndex * segmentAngle + segmentAngle / 2);
    const newTotalRotation = currentRotationRef.current + (fullSpins * 360) + (targetOffset - (currentRotationRef.current % 360) + 360) % 360;

    setSpinning(true);
    setWonAmount(null);
    setShowCelebrationModal(false);
    currentRotationRef.current = newTotalRotation;
    setRotation(newTotalRotation);

    // Audio ticks during spinning
    let tickCount = 0;
    const maxTicks = 35;
    const tickInterval = setInterval(() => {
      tickCount++;
      playWheelTick(1 + (tickCount / maxTicks) * 0.5);
      if (tickCount >= maxTicks) {
        clearInterval(tickInterval);
      }
    }, 110);

    // After animation finishes (4.2 seconds)
    setTimeout(() => {
      setSpinning(false);
      setWonAmount(chosenWin);
      setShowCelebrationModal(true);
      onWin(chosenWin);
      playWinChime();

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00FF88', '#FFD700', '#00E5FF', '#FF0055', '#FFFFFF']
        });
      } catch {
        // fallback
      }
    }, 4200);
  };

  const handleClaimReward = () => {
    setShowCelebrationModal(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Main Wheel Card */}
      <div className="relative w-full max-w-sm p-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={spinning}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-full bg-white/5 transition-colors disabled:opacity-30"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-[#FFD700]" size={22} />
          <h3 className="text-xl font-bold text-[#FFD700] tracking-wide">Spin To Win</h3>
        </div>

        {/* Disclaimer as specified */}
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
          TEST DIAMONDS — No Monetary Value
        </p>

        {/* Current Balance */}
        <div className="mt-2 mb-4 px-3 py-1 bg-black/40 border border-emerald-500/30 rounded-full flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span>Current Balance:</span>
          <span className="font-bold text-white">💎 {currentDiamonds}</span>
        </div>

        {/* Wheel Graphic */}
        <div className="relative my-3 flex items-center justify-center">
          {/* Top Indicator Arrow */}
          <div className="absolute -top-3 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-[#FFD700] drop-shadow-[0_2px_8px_rgba(255,215,0,0.8)]" />

          {/* Glowing outer bezel */}
          <div className="w-64 h-64 rounded-full p-2 bg-gradient-to-tr from-[#111] via-[#262626] to-[#111] border-4 border-[#333] shadow-[0_0_30px_rgba(0,255,136,0.15)] flex items-center justify-center">
            {/* Spinning SVG */}
            <div
              className="w-full h-full rounded-full overflow-hidden transition-transform ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? '4.2s' : '0s',
                transitionTimingFunction: 'cubic-bezier(0.12, 0.8, 0.32, 1)',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {SEGMENTS.map((val, idx) => {
                  const angle = 360 / SEGMENTS.length;
                  const startAngle = idx * angle - 90;
                  const endAngle = startAngle + angle;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const x1 = 100 + 100 * Math.cos(startRad);
                  const y1 = 100 + 100 * Math.sin(startRad);
                  const x2 = 100 + 100 * Math.cos(endRad);
                  const y2 = 100 + 100 * Math.sin(endRad);
                  const pathData = `M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`;

                  // Text position
                  const midRad = ((startAngle + angle / 2) * Math.PI) / 180;
                  const tx = 100 + 68 * Math.cos(midRad);
                  const ty = 100 + 68 * Math.sin(midRad);
                  const textRotation = startAngle + angle / 2 + 90;

                  return (
                    <g key={idx}>
                      <path
                        d={pathData}
                        fill={idx % 2 === 0 ? '#18241D' : '#14141E'}
                        stroke="#2B362F"
                        strokeWidth="1.2"
                      />
                      <circle
                        cx={100 + 90 * Math.cos(midRad)}
                        cy={100 + 90 * Math.sin(midRad)}
                        r="3"
                        fill={COLORS[idx]}
                      />
                      <text
                        x={tx}
                        y={ty}
                        fill={val >= 60 ? '#FFD700' : '#00FF88'}
                        fontSize="13"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        +{val}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Cap */}
            <div className="absolute w-14 h-14 rounded-full bg-gradient-to-b from-[#222] to-[#0A0A0A] border-2 border-[#FFD700] shadow-lg flex items-center justify-center pointer-events-none">
              <span className="text-sm">💎</span>
            </div>
          </div>
        </div>

        {/* Rewards Spectrum Legend */}
        <p className="text-[11px] font-bold text-[#00FF88] tracking-wider my-2">
          10 • 20 • 30 • 40 • 50 • 60 • 70 • 80 • 90 • 100
        </p>

        {/* Spin Action Button */}
        <button
          onClick={handleSpin}
          disabled={spinning}
          className="w-full mt-2 py-3 px-6 rounded-xl font-bold text-black bg-gradient-to-r from-[#FFD700] via-[#FFEC80] to-[#FFD700] hover:brightness-105 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {spinning ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              SPINNING WHEEL...
            </span>
          ) : (
            <>
              <Gift size={16} />
              FREE SPIN NOW
            </>
          )}
        </button>

        <button
          onClick={onClose}
          disabled={spinning}
          className="mt-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Close
        </button>
      </div>

      {/* Won Dialog / Alert Modal matching React Native Alert */}
      {showCelebrationModal && wonAmount !== null && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-fadeIn">
          <div className="w-full max-w-xs p-6 bg-[#181E19] border border-emerald-500/40 rounded-2xl text-center shadow-2xl animate-scaleUp">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">Spin To Win! 🎉</h4>
            <p className="text-sm text-emerald-300 font-medium mb-2">
              बधाई हो! आपने जीते 💎 {wonAmount} Test Diamonds!
            </p>
            <p className="text-[10px] text-zinc-400 mb-5">
              Added to your test balance. No real monetary cash value.
            </p>
            <button
              onClick={handleClaimReward}
              className="w-full py-2.5 rounded-lg font-bold text-black bg-[#00FF88] hover:bg-[#00e57a] transition-all"
            >
              Collect 💎 {wonAmount} Diamonds
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
