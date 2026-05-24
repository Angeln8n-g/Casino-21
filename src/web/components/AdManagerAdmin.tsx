import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

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
  const [configs, setConfigs] = useState<AdConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState('');

  useEffect(() => { fetchConfigs(); }, []);

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

  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="animate-fade-in">
      {error && (
        <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl mb-6">{error}</div>
      )}

      <div className="mb-6">
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
        <div className="glass-panel p-6 rounded-2xl border border-white/10 mb-8">
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
  );
}
