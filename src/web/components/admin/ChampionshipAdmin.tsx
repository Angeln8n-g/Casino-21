import React, { useState } from 'react';
import { Settings, Users, ShieldAlert, BarChart3, Landmark, PlayCircle, StopCircle, RefreshCw } from 'lucide-react';

export const ChampionshipAdmin: React.FC = () => {
  const [subTab, setSubTab] = useState<'crud' | 'phase' | 'leaderboard' | 'kyc' | 'live' | 'analytics' | 'prizes'>('crud');

  const tabs = [
    { id: 'crud', label: 'Gestión', icon: Settings },
    { id: 'phase', label: 'Fases', icon: PlayCircle },
    { id: 'leaderboard', label: 'Ranking', icon: Users },
    { id: 'kyc', label: 'KYC (Top 32)', icon: ShieldAlert },
    { id: 'live', label: 'Final en Vivo', icon: StopCircle },
    { id: 'analytics', label: 'Analíticas', icon: BarChart3 },
    { id: 'prizes', label: 'Premios', icon: Landmark },
  ] as const;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[800px]">
      {/* Sub Navigation */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              subTab === tab.id ? 'bg-casino-gold text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {subTab === 'crud' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Configuración de Championship</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                <p className="text-sm text-gray-400 mb-4">Formulario de creación y edición iría aquí. Parámetros como: Nombre, Patrocinador, Pozo Base, Views x Step, Fecha Final, etc.</p>
                <button className="px-4 py-2 bg-casino-gold text-black font-bold rounded-xl text-sm">Guardar Configuración</button>
              </div>
            </div>
          </div>
        )}

        {subTab === 'phase' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Control de Fases</h3>
            <div className="flex gap-4">
              <button className="px-6 py-4 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-2xl font-bold uppercase tracking-wider flex-1 hover:bg-blue-500/30">
                Forzar Corte (Top 32)
              </button>
              <button className="px-6 py-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-2xl font-bold uppercase tracking-wider flex-1 hover:bg-emerald-500/30">
                Iniciar Final
              </button>
              <button className="px-6 py-4 bg-red-500/20 text-red-400 border border-red-500/50 rounded-2xl font-bold uppercase tracking-wider flex-1 hover:bg-red-500/30">
                Pausar Evento
              </button>
            </div>
          </div>
        )}

        {subTab === 'leaderboard' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Moderación del Ranking</h3>
            <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="p-4 text-gray-400">Usuario</th>
                    <th className="p-4 text-gray-400">Puntos</th>
                    <th className="p-4 text-gray-400">Ads/Día</th>
                    <th className="p-4 text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-4 text-white">SuspiciousUser99</td>
                    <td className="p-4 text-casino-gold font-bold">145,000</td>
                    <td className="p-4 text-red-400 font-bold">300/300</td>
                    <td className="p-4 flex gap-2">
                      <button className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">Descalificar</button>
                      <button className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">Congelar Pts</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {subTab === 'kyc' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Cola de Verificación KYC</h3>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-400">28/32 Verificados</span>
            </div>
            {/* List of pending KYCs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-bold">Player_Top1</span>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Pendiente</span>
                 </div>
                 <div className="flex gap-2 mb-4 h-24">
                   <div className="flex-1 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-500">ID Front</div>
                   <div className="flex-1 bg-white/5 rounded-lg flex items-center justify-center text-xs text-gray-500">Selfie</div>
                 </div>
                 <div className="flex gap-2">
                   <button className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/30">Aprobar</button>
                   <button className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/30">Rechazar</button>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Other tabs omitted for brevity but would follow same pattern */}
        {(subTab === 'live' || subTab === 'analytics' || subTab === 'prizes') && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm uppercase tracking-widest font-bold">
            Sección en construcción
          </div>
        )}

      </div>
    </div>
  );
};
