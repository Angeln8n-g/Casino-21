import React from 'react';

type TabType = 'bracket' | 'rewards' | 'stats';

interface TournamentTabsProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export function TournamentTabs({ activeTab, onChange }: TournamentTabsProps) {
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'bracket', label: 'Encuentros', icon: '⚔️' },
    { id: 'rewards', label: 'Premios', icon: '🎁' },
    { id: 'stats', label: 'Reglas & Info', icon: '📜' },
  ];

  return (
    <div className="w-full p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner">
      <div className="flex w-full gap-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex-1 relative flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 ${
                isActive
                  ? 'text-casino-bg bg-gradient-to-r from-casino-gold to-yellow-500 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className={`text-sm transition-transform duration-300 ${isActive ? 'scale-110 rotate-3' : ''}`}>
                {tab.icon}
              </span>
              <span className="truncate">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-white rounded-full opacity-60" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
