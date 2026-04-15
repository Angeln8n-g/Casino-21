import React, { useMemo } from 'react';

interface CelebrationConfettiProps {
  seed: number;
  active: boolean;
}

const COLORS = ['#fbbf24', '#fde68a', '#10b981', '#60a5fa', '#a855f7', '#f43f5e'];

export function CelebrationConfetti({ seed, active }: CelebrationConfettiProps) {
  const pieces = useMemo(() => {
    const base = seed || Date.now();

    return Array.from({ length: 36 }, (_, index) => {
      const left = (base * (index + 3) * 17) % 100;
      const delay = (index % 9) * 70;
      const duration = 1800 + ((base + index * 131) % 1200);
      const rotation = ((base + index * 47) % 360) - 180;
      const drift = ((base + index * 67) % 80) - 40;
      const size = 6 + ((base + index * 29) % 8);

      return {
        id: `${base}-${index}`,
        color: COLORS[index % COLORS.length],
        left,
        delay,
        duration,
        rotation,
        drift,
        size,
      };
    });
  }, [seed]);

  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-[-12%] animate-confetti-fall rounded-sm opacity-90"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.8}px`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${piece.duration}ms`,
            transform: `translateX(${piece.drift}px) rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
