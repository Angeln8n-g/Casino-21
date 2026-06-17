import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  BarChart3, 
  Settings2, 
  Play, 
  Trash2, 
  Calendar, 
  ShieldAlert, 
  Award, 
  MousePointerClick, 
  Eye, 
  TrendingUp, 
  RefreshCw, 
  Layers 
} from 'lucide-react';

interface AdConfig {
  id: string;
  name: string;
  ad_type: 'banner' | 'social_bar' | 'interstitial' | 'rewarded';
  enabled: boolean;
  script_url: string | null;
  container_id: string | null;
  smartlink_url: string | null;
  csp_domains: string[];
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AdLog {
  id: string;
  config_id: string | null;
  ad_type: 'banner' | 'social_bar' | 'interstitial' | 'rewarded';
  event_type: 'impression' | 'click' | 'complete' | 'blocked' | 'error';
  created_at: string;
}

const AD_TYPE_LABELS: Record<string, string> = {
  banner: 'Banner',
  social_bar: 'Barra Social',
  interstitial: 'Intersticial',
  rewarded: 'Recompensada',
};

const emptyForm: Omit<AdConfig, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  ad_type: 'banner',
  enabled: false,
  script_url: '',
  container_id: '',
  smartlink_url: '',
  csp_domains: [],
  priority: 0,
};

export function AdManagerAdmin() {
  // Tabs & Settings
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'networks'>('dashboard');

  // Ad Networks configuration CRUD
  const [configs, setConfigs] = useState<AdConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Dashboard / Analytics State
  const [logs, setLogs] = useState<AdLog[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d'>('7d');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => { 
    fetchConfigs(); 
  }, []);

  useEffect(() => {
    if (activeSubTab === 'dashboard') {
      fetchStats();
    }
  }, [activeSubTab, timeRange, selectedType]);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ad_configurations')
      .select('*')
      .order('priority', { ascending: true });
    if (error) setError(error.message);
    else setConfigs(data || []);
    setLoading(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const today = new Date();
      let startDate = new Date();
      
      if (timeRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '7d') {
        startDate.setDate(today.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
      } else if (timeRange === '30d') {
        startDate.setDate(today.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
      }
      
      let query = supabase
        .from('ad_logs')
        .select('id, config_id, ad_type, event_type, created_at')
        .gte('created_at', startDate.toISOString());
        
      if (selectedType !== 'all') {
        query = query.eq('ad_type', selectedType);
      }
      
      const { data, error: logsError } = await query.order('created_at', { ascending: true });
      if (logsError) throw logsError;
      
      setLogs(data || []);
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      script_url: form.script_url || null,
      container_id: form.container_id || null,
      smartlink_url: form.smartlink_url || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from('ad_configurations')
        .update(payload)
        .eq('id', editingId);
      if (error) setError(error.message);
      else { setIsEditing(false); setEditingId(null); fetchConfigs(); }
    } else {
      const { error } = await supabase
        .from('ad_configurations')
        .insert([payload]);
      if (error) setError(error.message);
      else { setIsEditing(false); fetchConfigs(); }
    }
  };

  const handleEdit = (cfg: AdConfig) => {
    setForm({
      name: cfg.name,
      ad_type: cfg.ad_type,
      enabled: cfg.enabled,
      script_url: cfg.script_url || '',
      container_id: cfg.container_id || '',
      smartlink_url: cfg.smartlink_url || '',
      csp_domains: cfg.csp_domains || [],
      priority: cfg.priority,
    });
    setEditingId(cfg.id);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta configuración de anuncio?')) return;
    const { error } = await supabase.from('ad_configurations').delete().eq('id', id);
    if (error) setError(error.message);
    else fetchConfigs();
  };

  const handleToggle = async (cfg: AdConfig) => {
    const { error } = await supabase
      .from('ad_configurations')
      .update({ enabled: !cfg.enabled })
      .eq('id', cfg.id);
    if (error) setError(error.message);
    else fetchConfigs();
  };

  const addDomain = () => {
    const d = domainInput.trim();
    if (d && !form.csp_domains.includes(d)) {
      setForm({ ...form, csp_domains: [...form.csp_domains, d] });
      setDomainInput('');
    }
  };

  const removeDomain = (d: string) => {
    setForm({ ...form, csp_domains: form.csp_domains.filter(x => x !== d) });
  };

  // --- Mock Data Generator (Diagnostics) ---
  const handleGenerateMockData = async () => {
    if (configs.length === 0) {
      alert('Debes configurar al menos una red/anuncio antes de generar datos.');
      return;
    }
    if (!confirm('¿Quieres generar ~1500 eventos de prueba distribuidos en los últimos 15 días?')) return;

    setLoadingStats(true);
    try {
      const mockLogs: any[] = [];
      const now = Date.now();
      
      for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
        const date = new Date(now - dayOffset * 24 * 60 * 60 * 1000);
        
        for (const config of configs) {
          // Determine activity levels based on ad type
          let baseImp = 30 + Math.floor(Math.random() * 80);
          if (config.ad_type === 'social_bar') baseImp = 60 + Math.floor(Math.random() * 110);
          if (config.ad_type === 'rewarded') baseImp = 12 + Math.floor(Math.random() * 30);
          
          // Click CTR rate
          let ctr = 0.04; // 4% default
          if (config.ad_type === 'rewarded') ctr = 0.68; // Rewarded ads has high click rate
          if (config.ad_type === 'interstitial') ctr = 0.16;
          
          const clicks = Math.floor(baseImp * ctr * (0.8 + Math.random() * 0.4));
          const blocked = Math.floor(baseImp * 0.10 * (0.5 + Math.random())); // 10% adblockers
          
          let completions = 0;
          if (config.ad_type === 'rewarded') {
            completions = Math.floor(clicks * 0.92);
          } else if (config.ad_type === 'interstitial') {
            completions = Math.floor(clicks * 0.85);
          }
          
          const errors = Math.floor(baseImp * 0.02 * Math.random());

          // Impressions
          for (let i = 0; i < baseImp; i++) {
            mockLogs.push({
              config_id: config.id,
              ad_type: config.ad_type,
              event_type: 'impression',
              created_at: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { simulated: true }
            });
          }
          // Clicks
          for (let i = 0; i < clicks; i++) {
            mockLogs.push({
              config_id: config.id,
              ad_type: config.ad_type,
              event_type: 'click',
              created_at: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { simulated: true }
            });
          }
          // Completions
          for (let i = 0; i < completions; i++) {
            mockLogs.push({
              config_id: config.id,
              ad_type: config.ad_type,
              event_type: 'complete',
              created_at: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { simulated: true }
            });
          }
          // Blocked
          for (let i = 0; i < blocked; i++) {
            mockLogs.push({
              config_id: config.id,
              ad_type: config.ad_type,
              event_type: 'blocked',
              created_at: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { simulated: true }
            });
          }
          // Errors
          for (let i = 0; i < errors; i++) {
            mockLogs.push({
              config_id: config.id,
              ad_type: config.ad_type,
              event_type: 'error',
              created_at: new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
              metadata: { simulated: true }
            });
          }
        }
      }

      // Grouped insert for database efficiency
      const batchSize = 400;
      for (let i = 0; i < mockLogs.length; i += batchSize) {
        const batch = mockLogs.slice(i, i + batchSize);
        const { error: insertErr } = await supabase.from('ad_logs').insert(batch);
        if (insertErr) throw insertErr;
      }

      alert(`¡Generados ${mockLogs.length} eventos simulados con éxito!`);
      fetchStats();
    } catch (err: any) {
      console.error(err);
      alert('Error generando simulaciones: ' + err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('¿ESTÁS SEGURO? Esto borrará permanentemente todos los logs de publicidad en la base de datos.')) return;
    
    setLoadingStats(true);
    try {
      const { error: deleteErr } = await supabase
        .from('ad_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
        
      if (deleteErr) throw deleteErr;
      
      alert('Todos los logs de anuncios han sido eliminados.');
      setLogs([]);
    } catch (err: any) {
      alert('Error eliminando logs: ' + err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  // --- Statistics computations ---
  const kpis = {
    impressions: logs.filter(l => l.event_type === 'impression').length,
    clicks: logs.filter(l => l.event_type === 'click').length,
    completions: logs.filter(l => l.event_type === 'complete').length,
    blocked: logs.filter(l => l.event_type === 'blocked').length,
    errors: logs.filter(l => l.event_type === 'error').length,
    get ctr() {
      return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
    },
    get estimatedRevenue() {
      // eCPM values per impression:
      // Banner: $0.80 eCPM = $0.0008
      // Social Bar: $1.20 eCPM = $0.0012
      // Interstitial: $3.50 eCPM = $0.0035
      // Rewarded: $8.00 eCPM = $0.0080
      let total = 0;
      logs.forEach(log => {
        if (log.event_type === 'impression') {
          if (log.ad_type === 'banner') total += 0.0008;
          else if (log.ad_type === 'social_bar') total += 0.0012;
          else if (log.ad_type === 'interstitial') total += 0.0035;
          else if (log.ad_type === 'rewarded') total += 0.0080;
        }
      });
      return total;
    }
  };

  const getTrendData = () => {
    const dailyData: Record<string, { date: string; dateStr: string; impressions: number; clicks: number }> = {};
    const daysToShow = timeRange === 'today' ? 1 : timeRange === '7d' ? 7 : 30;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const d = new Date();
      if (timeRange !== 'today') {
        d.setDate(d.getDate() - i);
      }
      const key = d.toISOString().split('T')[0];
      const dateStr = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      dailyData[key] = { date: key, dateStr, impressions: 0, clicks: 0 };
    }

    logs.forEach(log => {
      const key = log.created_at.split('T')[0];
      if (dailyData[key]) {
        if (log.event_type === 'impression') dailyData[key].impressions++;
        else if (log.event_type === 'click') dailyData[key].clicks++;
      }
    });

    return Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));
  };

  const trendData = getTrendData();
  const maxImpressionValue = Math.max(...trendData.map(d => d.impressions), 10);

  // Group by Network/Config Performance
  const getNetworkPerformance = () => {
    const performanceMap: Record<string, {
      id: string;
      name: string;
      ad_type: string;
      impressions: number;
      clicks: number;
      completions: number;
      blocked: number;
      revenue: number;
    }> = {};

    // Initialize with configs
    configs.forEach(cfg => {
      performanceMap[cfg.id] = {
        id: cfg.id,
        name: cfg.name,
        ad_type: cfg.ad_type,
        impressions: 0,
        clicks: 0,
        completions: 0,
        blocked: 0,
        revenue: 0,
      };
    });

    // Anonymous/Other fallback
    performanceMap['other'] = {
      id: 'other',
      name: 'Sin Configuración / Otros',
      ad_type: 'unknown',
      impressions: 0,
      clicks: 0,
      completions: 0,
      blocked: 0,
      revenue: 0,
    };

    logs.forEach(log => {
      const key = log.config_id || 'other';
      if (!performanceMap[key]) {
        performanceMap[key] = {
          id: key,
          name: `Desconocido (${key.substring(0,6)})`,
          ad_type: log.ad_type,
          impressions: 0,
          clicks: 0,
          completions: 0,
          blocked: 0,
          revenue: 0,
        };
      }

      const p = performanceMap[key];
      if (log.event_type === 'impression') {
        p.impressions++;
        // Calc revenue
        if (log.ad_type === 'banner') p.revenue += 0.0008;
        else if (log.ad_type === 'social_bar') p.revenue += 0.0012;
        else if (log.ad_type === 'interstitial') p.revenue += 0.0035;
        else if (log.ad_type === 'rewarded') p.revenue += 0.0080;
      } else if (log.event_type === 'click') {
        p.clicks++;
      } else if (log.event_type === 'complete') {
        p.completions++;
      } else if (log.event_type === 'blocked') {
        p.blocked++;
      }
    });

    return Object.values(performanceMap).filter(p => p.impressions > 0 || p.clicks > 0 || p.id !== 'other');
  };

  const performanceStats = getNetworkPerformance();

  return (
    <div className="animate-fade-in text-white space-y-6">
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl mb-6">{error}</div>
      )}

      {/* Main Tabs */}
      <div className="flex border-b border-white/10 pb-1">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-colors uppercase tracking-wider ${
            activeSubTab === 'dashboard'
              ? 'border-casino-gold text-casino-gold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard de Publicidad
        </button>
        <button
          onClick={() => setActiveSubTab('networks')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-bold text-sm transition-colors uppercase tracking-wider ${
            activeSubTab === 'networks'
              ? 'border-casino-gold text-casino-gold'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Configuración de Redes
        </button>
      </div>

      {/* --- DASHBOARD SUB-TAB --- */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Filters */}
              <div className="flex gap-1 bg-casino-dark-900 border border-white/10 p-1 rounded-xl">
                <button
                  onClick={() => setTimeRange('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === 'today' ? 'bg-casino-gold text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Hoy
                </button>
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === '7d' ? 'bg-casino-gold text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  7 días
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeRange === '30d' ? 'bg-casino-gold text-black' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  30 días
                </button>
              </div>

              {/* Ad Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-casino-dark-900 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
              >
                <option value="all">Todos los formatos</option>
                <option value="banner">Banner</option>
                <option value="social_bar">Barra Social</option>
                <option value="interstitial">Intersticial</option>
                <option value="rewarded">Recompensada</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold transition"
              >
                <RefreshCw className={`w-3 h-3 ${loadingStats ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
              <button
                onClick={handleGenerateMockData}
                disabled={loadingStats}
                className="flex items-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 rounded-xl px-3 py-1.5 text-xs font-bold transition"
              >
                <Play className="w-3 h-3" />
                Simular datos
              </button>
              <button
                onClick={handleClearLogs}
                disabled={loadingStats}
                className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 rounded-xl px-3 py-1.5 text-xs font-bold transition"
              >
                <Trash2 className="w-3 h-3" />
                Limpiar logs
              </button>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Impressions */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Impresiones</p>
                <h3 className="text-2xl font-black mt-1 text-white">{kpis.impressions.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            {/* Clicks */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Clics</p>
                <h3 className="text-2xl font-black mt-1 text-white">{kpis.clicks.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-casino-gold/10 flex items-center justify-center text-casino-gold border border-casino-gold/20">
                <MousePointerClick className="w-5 h-5" />
              </div>
            </div>

            {/* CTR */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">CTR promedio</p>
                <h3 className="text-2xl font-black mt-1 text-cyan-400">{kpis.ctr.toFixed(2)}%</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            {/* Completed */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Completados</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-400">{kpis.completions.toLocaleString()}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* Estimated revenue */}
            <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center justify-between col-span-2 lg:col-span-1">
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Est. Ingresos</p>
                <h3 className="text-2xl font-black mt-1 text-amber-500">${kpis.estimatedRevenue.toFixed(4)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <span className="text-lg font-black">$</span>
              </div>
            </div>
          </div>

          {/* Visual charts block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* SVG Trend Chart */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold uppercase tracking-wider text-casino-gold">Tendencia de Rendimiento</h4>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-sm"></span> Impresiones</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-casino-gold rounded-sm"></span> Clics</span>
                </div>
              </div>

              {loadingStats ? (
                <div className="h-[200px] flex items-center justify-center text-gray-500 animate-pulse text-sm">
                  Cargando tendencia...
                </div>
              ) : trendData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
                  Sin datos registrados en este período
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[500px] h-[200px] relative">
                    <svg viewBox="0 0 600 200" className="w-full h-full">
                      {/* Grid lines */}
                      <line x1="40" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="40" y1="70" x2="580" y2="70" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="40" y1="120" x2="580" y2="120" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <line x1="40" y1="170" x2="580" y2="170" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

                      {/* Y-axis Labels */}
                      <text x="10" y="25" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold">{(maxImpressionValue).toFixed(0)}</text>
                      <text x="10" y="95" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold">{(maxImpressionValue/2).toFixed(0)}</text>
                      <text x="10" y="170" fill="rgba(255,255,255,0.4)" fontSize="9" fontWeight="bold">0</text>

                      {/* Bar charts rendering */}
                      {trendData.map((d, index) => {
                        const stepX = (540 / (trendData.length - 1 || 1));
                        const x = 40 + index * stepX;
                        
                        // Height formulas
                        const impHeight = (d.impressions / maxImpressionValue) * 140;
                        const clickHeight = (d.clicks / maxImpressionValue) * 140 * 5; // Scale click to make it visible
                        
                        return (
                          <g key={d.date} className="group cursor-pointer">
                            {/* Impression bar */}
                            <rect
                              x={x - 6}
                              y={170 - impHeight}
                              width="6"
                              height={Math.max(impHeight, 2)}
                              fill="url(#blueGrad)"
                              rx="2"
                              className="transition-all duration-300 hover:brightness-125"
                            />
                            {/* Clicks bar */}
                            <rect
                              x={x + 1}
                              y={170 - clickHeight}
                              width="6"
                              height={Math.max(clickHeight, 1)}
                              fill="url(#goldGrad)"
                              rx="2"
                              className="transition-all duration-300 hover:brightness-125"
                            />

                            {/* Hover tooltip values */}
                            <title>{`${d.date}: ${d.impressions} impresiones, ${d.clicks} clics`}</title>

                            {/* X label (Only show periodically if 30 days to avoid clutter) */}
                            {(trendData.length <= 8 || index % 4 === 0 || index === trendData.length - 1) && (
                              <text
                                x={x}
                                y="185"
                                fill="rgba(255,255,255,0.5)"
                                fontSize="8"
                                textAnchor="middle"
                                fontWeight="bold"
                              >
                                {d.dateStr}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Gradients definitions */}
                      <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#eab308" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Funnel conversion widget */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider text-casino-gold mb-4">Embudo de Conversión</h4>
                <p className="text-xs text-gray-400 mb-4">Eficiencia en la entrega del flujo publicitario.</p>
              </div>

              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {/* Impressions (100%) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-purple-400" /> Impresiones</span>
                    <span>{kpis.impressions.toLocaleString()} (100%)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>

                {/* Clicks (CTR) */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1"><MousePointerClick className="w-3.5 h-3.5 text-casino-gold" /> Clics en Anuncios</span>
                    <span>{kpis.clicks.toLocaleString()} ({kpis.ctr.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                    <div className="h-full bg-casino-gold rounded-full" style={{ width: `${Math.min(kpis.ctr, 100)}%` }}></div>
                  </div>
                </div>

                {/* Completed */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-300">
                    <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-emerald-400" /> Completados / Recompensa</span>
                    {/* Completions percentage relative to clicks */}
                    {(() => {
                      const completedPct = kpis.clicks > 0 ? (kpis.completions / kpis.clicks) * 100 : 0;
                      return (
                        <span>{kpis.completions.toLocaleString()} ({completedPct.toFixed(1)}% del clic)</span>
                      );
                    })()}
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5">
                    {(() => {
                      const completedPct = kpis.clicks > 0 ? (kpis.completions / kpis.clicks) * 100 : 0;
                      return (
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(completedPct, 100)}%` }}></div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Ad blocker detection warning */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3 flex items-center gap-3 text-xs text-red-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">Anuncios Bloqueados: </span>
                  {kpis.blocked.toLocaleString()} ({kpis.impressions + kpis.blocked > 0 
                    ? ((kpis.blocked / (kpis.impressions + kpis.blocked)) * 100).toFixed(1) 
                    : 0}% del tráfico)
                </div>
              </div>

            </div>
          </div>

          {/* Detailed Performance table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-black/20">
              <h4 className="text-sm font-bold uppercase tracking-wider text-casino-gold">Rendimiento por Red de Anuncios</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-4 font-black">Red / Configuración</th>
                    <th className="p-4 font-black">Formato</th>
                    <th className="p-4 font-black text-right">Impresiones</th>
                    <th className="p-4 font-black text-right">Clics</th>
                    <th className="p-4 font-black text-right">CTR</th>
                    <th className="p-4 font-black text-right">Completados</th>
                    <th className="p-4 font-black text-right">Anuncios Bloqueados</th>
                    <th className="p-4 font-black text-right">Ingresos Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStats ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">Cargando reporte...</td></tr>
                  ) : performanceStats.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">No hay registros para las configuraciones activas.</td></tr>
                  ) : (
                    performanceStats.map(stat => {
                      const ctr = stat.impressions > 0 ? (stat.clicks / stat.impressions) * 100 : 0;
                      return (
                        <tr key={stat.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4 font-bold">{stat.name}</td>
                          <td className="p-4">
                            <span className="bg-white/10 px-2 py-1 rounded text-xs">
                              {AD_TYPE_LABELS[stat.ad_type] || stat.ad_type}
                            </span>
                          </td>
                          <td className="p-4 text-right font-bold text-gray-300">{stat.impressions.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-gray-300">{stat.clicks.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-cyan-400">{ctr.toFixed(2)}%</td>
                          <td className="p-4 text-right font-bold text-emerald-400">
                            {stat.completions > 0 ? stat.completions.toLocaleString() : '—'}
                          </td>
                          <td className="p-4 text-right font-bold text-red-400">
                            {stat.blocked > 0 ? stat.blocked.toLocaleString() : '0'}
                          </td>
                          <td className="p-4 text-right font-black text-amber-500">${stat.revenue.toFixed(4)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- NETWORKS MANAGEMENT SUB-TAB (Original View) --- */}
      {activeSubTab === 'networks' && (
        <div className="space-y-6">
          {/* Guide collapse button */}
          <div className="mb-4">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-gray-500 hover:text-casino-gold transition-colors flex items-center gap-1"
            >
              <span className={`inline-block transition-transform ${showGuide ? 'rotate-90' : ''}`}>▶</span>
              {showGuide ? 'Ocultar guía' : '¿Cómo agregar una red de anuncios?'}
            </button>

            {showGuide && (
              <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 text-sm text-gray-300 space-y-3">
                <h4 className="text-casino-gold font-black uppercase tracking-wider text-xs">Guía de uso</h4>

                <div>
                  <p className="font-bold text-white mb-1">1. Crear una red</p>
                  <p className="text-gray-400">Presiona <strong className="text-white">+ Nueva Red</strong>. Completá nombre, tipo y las URLs que te da tu red de anuncios.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">2. Tipos de anuncio</p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li><strong className="text-white">Banner</strong> — Rectángulo de 300×250px. Se muestra en el Landing y en páginas públicas. Necesita <em>script_url</em> y <em>container_id</em>.</li>
                    <li><strong className="text-white">Barra Social</strong> — Barra fija en la parte inferior del Landing. Inyecta un script directamente en el &lt;body&gt;. Solo necesita <em>script_url</em>.</li>
                    <li><strong className="text-white">Intersticial</strong> — Modal de pantalla completa que aparece durante el juego (puntuación ≥17, fin de partida, etc.). No inyecta scripts — solo un botón que abre una URL en otra pestaña. Necesita <em>smartlink_url</em>.</li>
                    <li><strong className="text-white">Recompensada</strong> — Modal similar al intersticial pero con cuenta regresiva de 15s. Al cerrarlo, el jugador recibe 500 monedas. Necesita <em>smartlink_url</em>.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">3. Script URL vs Smartlink URL</p>
                  <ul className="list-disc list-inside text-gray-400 space-y-1">
                    <li><strong className="text-white">Script URL</strong> — La URL del &lt;script&gt; que te da la red (banner y barra social). Se inyecta dinámicamente con <code className="text-casino-gold">document.createElement('script')</code>.</li>
                    <li><strong className="text-white">Smartlink URL</strong> — Una URL de afiliado/redirect. Se muestra como botón "Ver anuncio" que se abre en otra pestaña. Para intersticiales y recompensadas.</li>
                  </ul>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">4. Container ID</p>
                  <p className="text-gray-400">El ID del div donde se inyecta el script del banner. Algunas redes (como Adsterra) lo requieren. Opcional para otras.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">5. Activar</p>
                  <p className="text-gray-400">Una vez creada, togglea el botón <strong className="text-green-400">Activo/Inactivo</strong>. Solo las configuraciones activas se cargan.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">6. CSP (Content-Security-Policy)</p>
                  <p className="text-gray-400">Los dominios CSP son informativos. Cuando actives una red, <strong className="text-white">tenés que agregarlos manualmente</strong> en la configuración de Nginx en <code className="text-casino-gold">/etc/nginx/sites-available/kasino21.com.conf</code> y recargar con <code className="text-casino-gold">nginx -t && nginx -s reload</code>. Sin esto, el navegador va a bloquear los scripts de la red.</p>
                </div>

                <div>
                  <p className="font-bold text-white mb-1">7. Prioridad</p>
                  <p className="text-gray-400">Si tenés varias redes del mismo tipo, se usa la de prioridad más baja (0 = más alta). Las demás se ignoran.</p>
                </div>

                <div className="pt-2 border-t border-amber-500/20">
                  <p className="text-xs text-gray-500">💡 Los componentes <strong className="text-white">AdBanner</strong>, <strong className="text-white">SocialBar</strong> y <strong className="text-white">AdManager</strong> leen la configuración desde Supabase en tiempo real. No hace falta redeploy para activar/desactivar una red.</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-gray-400 text-sm">
                Gestiona las redes de anuncios. Las configuraciones activas se cargan dinámicamente.
                Al agregar una red nueva, actualiza también la CSP en Nginx con los dominios indicados.
              </p>
            </div>
            <button
              onClick={() => { setForm(emptyForm); setEditingId(null); setIsEditing(true); }}
              className="bg-casino-gold text-black px-4 py-2 rounded-xl font-bold hover:bg-yellow-400 transition whitespace-nowrap"
            >
              + Nueva Red
            </button>
          </div>

          {isEditing && (
            <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8 animate-slide-up">
              <h3 className="text-xl font-bold mb-4">{editingId ? 'Editar Red' : 'Nueva Red de Anuncios'}</h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre</label>
                    <input required type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo</label>
                    <select className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={form.ad_type} onChange={e => setForm({ ...form, ad_type: e.target.value as any })}>
                      {Object.entries(AD_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">URL del Script</label>
                    <input type="url" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="https://...js" value={form.script_url || ''}
                      onChange={e => setForm({ ...form, script_url: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">ID del Contenedor</label>
                    <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="container-xxx" value={form.container_id || ''}
                      onChange={e => setForm({ ...form, container_id: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Smartlink URL (Interstitial/Rewarded)</label>
                    <input type="url" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      placeholder="https://..." value={form.smartlink_url || ''}
                      onChange={e => setForm({ ...form, smartlink_url: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Prioridad</label>
                    <input type="number" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white"
                      value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                      Dominios CSP (agregar a Nginx al activar esta red)
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input type="text" className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                        placeholder="https://*.ejemplo.com" value={domainInput}
                        onChange={e => setDomainInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDomain(); } }} />
                      <button type="button" onClick={addDomain}
                        className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-xs font-bold transition">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.csp_domains.map(d => (
                        <span key={d} className="bg-white/10 px-2 py-1 rounded text-xs flex items-center gap-1">
                          {d}
                          <button type="button" onClick={() => removeDomain(d)} className="text-red-400 hover:text-red-300">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <button type="button" onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-white/10 transition">Cancelar</button>
                  <button type="submit"
                    className="px-6 py-2 rounded-lg text-sm font-bold bg-casino-gold text-black hover:bg-yellow-400 transition">Guardar</button>
                </div>
              </form>
            </div>
          )}

          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/40 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                    <th className="p-4 font-black">Red</th>
                    <th className="p-4 font-black">Tipo</th>
                    <th className="p-4 font-black">Estado</th>
                    <th className="p-4 font-black">Script</th>
                    <th className="p-4 font-black">Dominios CSP</th>
                    <th className="p-4 font-black text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>
                  ) : configs.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-gray-500">No hay redes configuradas. Agrega una nueva.</td></tr>
                  ) : (
                    configs.map(cfg => (
                      <tr key={cfg.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold">{cfg.name}</td>
                        <td className="p-4">
                          <span className="bg-white/10 px-2 py-1 rounded text-xs">{AD_TYPE_LABELS[cfg.ad_type]}</span>
                        </td>
                        <td className="p-4">
                          <button onClick={() => handleToggle(cfg)}
                            className={`px-2 py-1 rounded text-xs font-bold transition ${
                              cfg.enabled
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40'
                                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/40'
                            }`}>
                            {cfg.enabled ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="p-4 text-xs text-gray-400 max-w-[200px] truncate">{cfg.script_url || '—'}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {cfg.csp_domains?.length ? cfg.csp_domains.map(d => (
                              <span key={d} className="bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded text-[10px]">{d}</span>
                            )) : <span className="text-gray-500 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => handleEdit(cfg)}
                            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition">Editar</button>
                          <button onClick={() => handleDelete(cfg.id)}
                            className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-3 py-1.5 rounded transition">Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
