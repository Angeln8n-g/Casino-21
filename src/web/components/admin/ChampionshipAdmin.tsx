import React, { useState, useEffect } from 'react';
import { Settings, Users, ShieldAlert, BarChart3, Landmark, PlayCircle, StopCircle, RefreshCw, Save, CheckCircle2, XCircle, AlertTriangle, Building2, Flame, UserPlus } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { PendingPrizesAdmin } from './PendingPrizesAdmin';
import { SponsorLeadsAdmin } from './SponsorLeadsAdmin';
import { ReferralsAdminTab } from './ReferralsAdminTab';

export const ChampionshipAdmin: React.FC = () => {
  const [subTab, setSubTab] = useState<'crud' | 'phase' | 'leaderboard' | 'kyc' | 'referrals' | 'leads' | 'prizes'>('crud');

  // Championship event state
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Form states
  const [basePrize, setBasePrize] = useState<number>(100);
  const [currentPrize, setCurrentPrize] = useState<number>(1247.35);
  const [maxPrize, setMaxPrize] = useState<number>(5000);
  const [globalViews, setGlobalViews] = useState<number>(124735);
  const [dailyCap, setDailyCap] = useState<number>(300);

  // Participant list for moderation
  const [participants, setParticipants] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');

  // KYC queue
  const [kycQueue, setKycQueue] = useState<any[]>([]);

  const loadChampionshipData = async () => {
    setLoading(true);
    try {
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('is_championship', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (eventData) {
        setActiveEvent(eventData);
        setBasePrize(eventData.base_prize_usd || 100);
        setCurrentPrize(eventData.current_prize_usd || 1247.35);
        setMaxPrize(eventData.max_prize_usd || 5000);
        setGlobalViews(eventData.global_ad_views || 124735);
        setDailyCap(eventData.daily_ad_cap || 300);
      }

      // Load participants
      const { data: partData } = await supabase
        .from('championship_participants')
        .select('*, profiles(username, avatar_url)')
        .order('points', { ascending: false })
        .limit(32);

      if (partData) {
        setParticipants(partData);
        setKycQueue(partData.filter((p: any) => p.kyc_status === 'submitted' || p.kyc_status === 'pending'));
      }
    } catch (err) {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChampionshipData();
  }, []);

  const handleSaveConfig = async () => {
    if (!activeEvent?.id) return;
    setLoading(true);
    try {
      await supabase.from('events').update({
        base_prize_usd: basePrize,
        current_prize_usd: currentPrize,
        max_prize_usd: maxPrize,
        global_ad_views: globalViews,
        daily_ad_cap: dailyCap,
        updated_at: new Date().toISOString(),
      }).eq('id', activeEvent.id);

      setStatusMsg('Configuración guardada exitosamente ✅');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeLeague = async () => {
    if (!activeEvent?.id) return;
    if (!window.confirm('¿Confirmas congelar la liga y seleccionar a los 32 clasificados?')) return;
    setLoading(true);
    try {
      const { data } = await supabase.rpc('freeze_championship_league', { p_event_id: activeEvent.id });
      setStatusMsg('Liga congelada exitosamente. Top 32 seleccionado ✅');
      loadChampionshipData();
    } catch (err) {
      setStatusMsg('Error al ejecutar congelamiento');
    } finally {
      setLoading(false);
    }
  };

  const handleDisqualify = async (userId: string, username: string) => {
    if (!activeEvent?.id) return;
    const reason = window.prompt(`Ingresa el motivo de descalificación para ${username}:`, 'Actividad sospechosa de bots');
    if (!reason) return;

    setLoading(true);
    try {
      const { data: adminUser } = await supabase.auth.getUser();
      await supabase.rpc('disqualify_championship_participant', {
        p_event_id: activeEvent.id,
        p_user_id: userId,
        p_reason: reason,
        p_admin_id: adminUser?.user?.id,
      });

      setStatusMsg(`Jugador ${username} descalificado y suplente promovido ✅`);
      loadChampionshipData();
    } catch (err) {
      setStatusMsg('Error al descalificar participante');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'crud', label: 'Gestión Pozo', icon: Settings },
    { id: 'phase', label: 'Fases & Corte', icon: PlayCircle },
    { id: 'leaderboard', label: 'Ranking & Anti-Fraude', icon: Users },
    { id: 'kyc', label: 'Verificación KYC', icon: ShieldAlert },
    { id: 'referrals', label: 'Programa Referidos', icon: UserPlus },
    { id: 'leads', label: 'Leads de Marcas', icon: Building2 },
    { id: 'prizes', label: 'Premios & Muro', icon: Landmark },
  ] as const;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[800px]">
      {/* Sub Navigation */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex gap-2 overflow-x-auto shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
              subTab === tab.id ? 'bg-casino-gold text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}

        <button
          onClick={loadChampionshipData}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold p-3 text-center">
          {statusMsg}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        
        {/* TAB 1: CRUD & CONFIGURACIÓN DEL POZO */}
        {subTab === 'crud' && (
          <div className="space-y-6 font-['Chakra_Petch']">
            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Flame className="text-yellow-400" /> Configuración del Pozo Championship
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">Parámetros Financieros</h4>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Pozo Base (USD):</label>
                  <input
                    type="number"
                    value={basePrize}
                    onChange={(e) => setBasePrize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Pozo Actual en Vivo (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentPrize}
                    onChange={(e) => setCurrentPrize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-yellow-400 font-mono font-black"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Pozo Máximo Cap (USD):</label>
                  <input
                    type="number"
                    value={maxPrize}
                    onChange={(e) => setMaxPrize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="bg-black/40 p-6 rounded-2xl border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Parámetros de Tráfico y Ads</h4>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Vistas Acumuladas Globales:</label>
                  <input
                    type="number"
                    value={globalViews}
                    onChange={(e) => setGlobalViews(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tope Diario de Ads por Usuario:</label>
                  <input
                    type="number"
                    value={dailyCap}
                    onChange={(e) => setDailyCap(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono font-bold"
                  />
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={loading}
                  className="w-full mt-4 py-3 bg-casino-gold text-black font-black rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors cursor-pointer"
                >
                  <Save size={16} /> Guardar Cambios en vivo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTROL DE FASES */}
        {subTab === 'phase' && (
          <div className="space-y-6">
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Control de Fases del Campeonato</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={handleFreezeLeague}
                className="p-6 bg-blue-500/10 border border-blue-500/40 text-blue-400 rounded-2xl font-bold uppercase tracking-wider text-center hover:bg-blue-500/20 transition-all cursor-pointer"
              >
                <PlayCircle className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-black">Forzar Corte (Top 32)</div>
                <div className="text-[10px] text-gray-400 mt-1">Marca clasificados y habilita KYC</div>
              </button>

              <button
                onClick={() => setStatusMsg('Fase de Brackets activa')}
                className="p-6 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded-2xl font-bold uppercase tracking-wider text-center hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-black">Generar Brackets Final</div>
                <div className="text-[10px] text-gray-400 mt-1">Asigna emparejamientos de eliminación</div>
              </button>

              <button
                onClick={() => setStatusMsg('Evento pausado temporalmente')}
                className="p-6 bg-red-500/10 border border-red-500/40 text-red-400 rounded-2xl font-bold uppercase tracking-wider text-center hover:bg-red-500/20 transition-all cursor-pointer"
              >
                <StopCircle className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-black">Pausar Campeonato</div>
                <div className="text-[10px] text-gray-400 mt-1">Detiene acumulación de puntos</div>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: RANKING & MODERACIÓN ANTI-FRAUDE */}
        {subTab === 'leaderboard' && (
          <div className="space-y-6 font-['Chakra_Petch']">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Moderación del Ranking</h3>
              <input
                type="text"
                placeholder="Buscar por usuario..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase">
                  <tr>
                    <th className="p-3">Rank</th>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Puntos</th>
                    <th className="p-3">Ads Vistos</th>
                    <th className="p-3">Estado KYC</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {participants
                    .filter(p => (p.profiles?.username || '').toLowerCase().includes(searchUser.toLowerCase()))
                    .map((p, idx) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="p-3 font-mono font-bold text-yellow-400">#{idx + 1}</td>
                        <td className="p-3 text-white font-bold">{p.profiles?.username ? `@${p.profiles.username}` : 'Usuario'}</td>
                        <td className="p-3 font-mono text-yellow-400 font-bold">{p.points.toLocaleString()}</td>
                        <td className="p-3 font-mono text-gray-300">{p.ads_watched || 0}</td>
                        <td className="p-3">
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold uppercase">{p.kyc_status}</span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDisqualify(p.user_id, p.profiles?.username || 'Usuario')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-bold cursor-pointer"
                          >
                            Descalificar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: VERIFICACIÓN KYC */}
        {subTab === 'kyc' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Cola de Verificación KYC</h3>
              <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-gray-400">
                {kycQueue.length} Solicitudes Pendientes
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kycQueue.map((item) => (
                <div key={item.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 font-['Chakra_Petch']">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">@{item.profiles?.username || 'Usuario'}</span>
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold uppercase">
                      {item.kyc_status}
                    </span>
                  </div>

                  <div className="flex gap-2 h-28">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xs text-gray-500">
                      ID Documento
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xs text-gray-500">
                      Selfie Verificación
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatusMsg(`KYC de @${item.profiles?.username} Aprobado ✅`)}
                      className="flex-1 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => setStatusMsg(`KYC de @${item.profiles?.username} Rechazado ❌`)}
                      className="flex-1 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold hover:bg-red-500/30 transition-colors cursor-pointer"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROGRAMA DE REFERIDOS */}
        {subTab === 'referrals' && <ReferralsAdminTab />}

        {/* TAB 6: LEADS DE MARCAS PATROCINADORAS */}
        {subTab === 'leads' && <SponsorLeadsAdmin />}

        {/* TAB 7: PREMIOS Y MURO DE GANADORES */}
        {subTab === 'prizes' && <PendingPrizesAdmin />}

      </div>
    </div>
  );
};
