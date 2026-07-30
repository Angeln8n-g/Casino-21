import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle2, Filter, DollarSign, Send } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { PrizeClaim } from '../../../domain/sponsored-tournament';

export const PendingPrizesAdmin: React.FC = () => {
  const [claims, setClaims] = useState<(PrizeClaim & { profiles?: { username: string; email: string }; events?: { title: string; sponsor_name: string }; tx_ref?: string; payment_method?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('Banreservas');
  const [txRef, setTxRef] = useState('');
  const [processing, setProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tournament_prize_claims')
        .select(`
          *,
          profiles:user_id (username, email),
          events:event_id (title, sponsor_name)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClaims(data || []);
    } catch (err: any) {
      console.error('Error al cargar reclamos de premios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [filterStatus]);

  const handleMarkAsPaid = async () => {
    if (!selectedClaim) return;
    if (!txRef) {
      alert('Ingresa el código o número de referencia del pago (ej. REF-BR-98412).');
      return;
    }

    setProcessing(true);
    setFeedbackMsg(null);

    try {
      const { error } = await supabase
        .from('tournament_prize_claims')
        .update({
          status: 'paid',
          bank_name: paymentMethod,
          account_number: txRef,
          paid_at: new Date().toISOString()
        })
        .eq('id', selectedClaim.id);

      if (error) throw error;

      setFeedbackMsg(`Premio de $${selectedClaim.amount_usd ?? selectedClaim.amountUsd ?? 0} USD marcado como Pagado (Ref: ${txRef}).`);
      setSelectedClaim(null);
      setTxRef('');
      fetchClaims();
    } catch (err: any) {
      alert(`Error al procesar pago: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 font-['Chakra_Petch']">
      {/* Header Admin */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest">Gestión de Premios y Muro de Pagos</h3>
            <p className="text-xs text-slate-400">Procesa pagos y publica transferencias confirmadas en la Landing Page</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="all">Todos los Reclamos</option>
            <option value="pending_claim">Reclamos Pendientes</option>
            <option value="paid">Pagados ✅</option>
          </select>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 font-bold">
          <CheckCircle2 className="w-5 h-5" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Tabla de Reclamos */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando premios pendientes...</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">No hay premios en esta categoría.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ganador</th>
                <th className="py-3 px-4">Premio</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {claims.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">@{item.profiles?.username || 'Usuario'}</div>
                    <div className="text-[10px] text-slate-400">{item.profiles?.email}</div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-emerald-400 text-base font-mono">
                    ${item.amount_usd ?? item.amountUsd ?? 0} USD
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200">{item.bank_name || 'Banreservas'}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{item.account_number || 'Pendiente ref'}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'paid' ? (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border border-emerald-500/30">
                        PAGADO ✅
                      </span>
                    ) : (
                      <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border border-amber-500/30">
                        PENDIENTE
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {item.status !== 'paid' && (
                      <button
                        onClick={() => setSelectedClaim(item)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        Marcar Pagado
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Confirmación de Pago */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Procesar Pago de Premio
            </h3>
            <p className="text-xs text-slate-300">
              Confirma la transferencia de <strong className="text-emerald-400">${selectedClaim.amount_usd ?? selectedClaim.amountUsd ?? 0} USD</strong> para el usuario <strong>@{selectedClaim.profiles?.username}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Método de Pago / Banco</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="Banreservas">Banreservas</option>
                <option value="PayPal">PayPal</option>
                <option value="Binance Pay">Binance Pay</option>
                <option value="Banco BHD">Banco BHD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Código / Referencia de Transacción (TX Ref)</label>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="Ej. REF-BR-98412"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-black px-5 py-2.5 rounded-xl text-xs shadow-lg uppercase tracking-wider cursor-pointer"
              >
                {processing ? 'Guardando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
