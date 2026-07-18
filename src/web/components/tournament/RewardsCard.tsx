import React from 'react';

interface RewardsCardProps {
  prizePool?: string;
}

export function RewardsCard({ prizePool = '5,000 Monedas' }: RewardsCardProps) {
  // Helper to extract numbers from the prize pool to estimate smaller rewards
  const parsePrizeNumbers = (poolStr: string) => {
    const numRegex = /[\d,.]+/g;
    const matches = poolStr.match(numRegex);
    if (!matches) return { primary: poolStr, second: 'Consolación', third: 'Consolación' };

    const firstVal = parseFloat(matches[0].replace(/[,.]/g, ''));
    if (isNaN(firstVal)) return { primary: poolStr, second: 'Consolación', third: 'Consolación' };

    const isCoins = poolStr.toLowerCase().includes('moneda');
    const suffix = isCoins ? ' Monedas' : '';

    const formatNum = (val: number) => val.toLocaleString('es-ES');

    // Estimate distribution: 1st = 60%, 2nd = 30%, 3rd-4th = 10%
    return {
      primary: poolStr,
      second: `${formatNum(Math.floor(firstVal * 0.3))}${suffix}`,
      third: `${formatNum(Math.floor(firstVal * 0.1))}${suffix}`,
    };
  };

  const rewards = parsePrizeNumbers(prizePool);

  const tiers = [
    {
      place: '1er Lugar',
      title: 'Campeón del Torneo',
      prize: rewards.primary,
      icon: '🏆',
      borderColor: 'border-casino-gold/40',
      bgColor: 'bg-gradient-to-r from-casino-gold/10 via-yellow-600/5 to-transparent',
      textColor: 'text-casino-gold',
      glow: 'shadow-[0_0_15px_rgba(251,191,36,0.15)]',
    },
    {
      place: '2do Lugar',
      title: 'Subcampeón',
      prize: rewards.second,
      icon: '🥈',
      borderColor: 'border-slate-400/20',
      bgColor: 'bg-gradient-to-r from-slate-400/5 to-transparent',
      textColor: 'text-slate-300',
      glow: '',
    },
    {
      place: '3er - 4to Lugar',
      title: 'Semifinalistas',
      prize: rewards.third,
      icon: '🥉',
      borderColor: 'border-amber-700/20',
      bgColor: 'bg-gradient-to-r from-amber-700/5 to-transparent',
      textColor: 'text-amber-500',
      glow: '',
    },
  ];

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="glass-panel p-5 border-white/5 bg-slate-900/40 text-center mb-2">
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1">
          Bolsa de Premios del Evento
        </span>
        <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-casino-gold-light to-casino-gold font-display">
          🪙 {prizePool}
        </h3>
        <p className="text-[10px] text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
          Los premios se cargan automáticamente a tu cuenta inmediatamente después de que se declara el ganador de la final.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`glass-panel border p-4 flex items-center justify-between gap-4 transition-all duration-300 hover:scale-[1.01] ${tier.bgColor} ${tier.borderColor} ${tier.glow}`}
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl filter drop-shadow-md">{tier.icon}</div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${tier.textColor}`}>
                  {tier.place}
                </span>
                <h4 className="text-sm font-bold text-white leading-snug">{tier.title}</h4>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-gray-500 font-mono block uppercase">RECOMPENSA</span>
              <span className={`text-sm font-black font-mono ${tier.textColor}`}>{tier.prize}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
