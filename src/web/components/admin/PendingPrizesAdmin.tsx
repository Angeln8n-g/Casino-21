import React, { useState, useEffect } from 'react';
import { Landmark, CheckCircle2, Filter } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { PrizeClaim } from '../../../domain/sponsored-tournament';

export const PendingPrizesAdmin: React.FC = () => {
  const [claims, setClaims] = useState<(PrizeClaim & { profiles?: { username: string; email: string }; events?: { title: string; sponsor_name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('claim_submitted');
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [lastFourDigits, setLastFourDigits] = useState('');
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
    if (lastFourDigits.length < 4) {
      alert('Ingresa los últimos 4 dígitos de la cuenta bancaria de origen/destino.');
      return;
    }

    setProcessing(true);
    setFeedbackMsg(null);

    try {
      const { error } = await supabase
        .from('tournament_prize_claims')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString()
        })
        .eq('id', selectedClaim.id);

      if (error) throw error;

      // Simular/Enviar correo de confirmación
      await fetch('/api/admin/sponsored-tournaments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId: selectedClaim.id,
          lastFourDigits,
          userEmail: selectedClaim.profiles?.email,
          userName: selectedClaim.full_name || selectedClaim.profiles?.username,
          amountUsd: selectedClaim.amount_usd ?? selectedClaim.amountUsd ?? 0,
          bankName: selectedClaim.bank_name
        })
      }).catch(() => {});

      setFeedbackMsg(`Premio de $${selectedClaim.amount_usd ?? selectedClaim.amountUsd ?? 0} USD marcado como Pagado.`);
      setSelectedClaim(null);
      setLastFourDigits('');
      fetchClaims();
    } catch (err: any) {
      alert(`Error al procesar pago: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Admin */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Gestión de Premios Pendientes (Transferencias)</h3>
            <p className="text-xs text-slate-400">Procesa los desembolsos bancarios semanales (Lunes)</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            <option value="claim_submitted">Pendientes de Pago (Lunes)</option>
            <option value="pending_claim">Reclamos Incompletos</option>
            <option value="paid">Pagados</option>
            <option value="expired">Expirados (7 días)</option>
            <option value="all">Todos los Reclamos</option>
          </select>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
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
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ganador / Torneo</th>
                <th className="py-3 px-4">Premio</th>
                <th className="py-3 px-4">Datos Bancarios</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {claims.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white">{item.full_name || item.profiles?.username || 'Usuario'}</div>
                    <div className="text-xs text-slate-400">
                      {item.events?.sponsor_name} • {item.events?.title} ({item.rank_position}er lugar)
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-black text-emerald-400 text-base">
                    ${item.amount_usd ?? item.amountUsd ?? 0} USD
                  </td>
                  <td className="py-3.5 px-4">
                    {item.bank_name ? (
                      <div className="text-xs">
                        <div className="font-semibold text-slate-200">{item.bank_name}</div>
                        <div className="text-slate-400 font-mono">Cuenta: {item.account_number}</div>
                        <div className="text-slate-400">Cédula: {item.id_card_number}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-400 italic">No ha completado datos</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'paid' ? (
                      <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold">
                        PAGADO
                      </span>
                    ) : item.status === 'claim_submitted' ? (
                      <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">
                        PENDIENTE LUNES
                      </span>
                    ) : item.status === 'expired' ? (
                      <span className="bg-rose-500/20 text-rose-400 text-xs px-2.5 py-1 rounded-full font-bold">
                        EXPIRADO
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full font-bold">
                        POR RECLAMAR
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.status === 'claim_submitted' && (
                      <button
                        onClick={() => setSelectedClaim(item)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-emerald-500/20"
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
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              Confirmar Desembolso Bancario
            </h3>
            <p className="text-xs text-slate-300">
              Estás confirmando la transferencia de <strong className="text-emerald-400">${selectedClaim.amount_usd ?? selectedClaim.amountUsd ?? 0} USD</strong> a favor de <strong>{selectedClaim.full_name || selectedClaim.profiles?.username || 'Usuario'}</strong> en <strong>{selectedClaim.bank_name || 'su cuenta bancaria'}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Últimos 4 dígitos de la cuenta asignada</label>
              <input
                type="text"
                maxLength={4}
                value={lastFourDigits}
                onChange={(e) => setLastFourDigits(e.target.value)}
                placeholder="1234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-center text-lg outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedClaim(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20"
              >
                {processing ? 'Enviando Notificación...' : 'Confirmar y Notificar al Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
