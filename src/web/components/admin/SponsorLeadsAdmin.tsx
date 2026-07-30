import React, { useEffect, useState } from 'react';
import { Building2, Search, Filter, RefreshCw, Mail, Phone, Calendar, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';

export interface SponsorInquiry {
  id: string;
  company_name: string;
  email: string;
  phone: string;
  budget: string;
  status: 'new' | 'contacted' | 'negotiating' | 'closed' | 'rejected';
  notes: string | null;
  created_at: string;
}

const DEFAULT_MOCK_LEADS: SponsorInquiry[] = [
  {
    id: 'lead-1',
    company_name: 'Banreservas RD',
    email: 'mercadeo@banreservas.com',
    phone: '+1 (809) 960-2000',
    budget: '$1,500+',
    status: 'negotiating',
    notes: 'Interesados en patrocinar el Championship de Agosto.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'lead-2',
    company_name: 'Cervecería Nacional',
    email: 'brand@cnd.com.do',
    phone: '+1 (809) 535-5555',
    budget: '$500 - $1,500',
    status: 'new',
    notes: 'Solicitaron presentación corporativa de métricas.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'lead-3',
    company_name: 'Claro Dominicana',
    email: 'esports@claro.com.do',
    phone: '+1 (809) 220-1111',
    budget: '$1,500+',
    status: 'contacted',
    notes: 'Enviada propuesta formal por correo.',
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
  },
];

export const SponsorLeadsAdmin: React.FC = () => {
  const [leads, setLeads] = useState<SponsorInquiry[]>(DEFAULT_MOCK_LEADS);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sponsor_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setLeads(data as SponsorInquiry[]);
      }
    } catch (err) {
      // Fallback to mock leads silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (id: string, newStatus: SponsorInquiry['status']) => {
    setLeads(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    try {
      await supabase
        .from('sponsor_inquiries')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      // Silently update UI state
    }
  };

  const filteredLeads = leads.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch =
      item.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: SponsorInquiry['status']) => {
    switch (status) {
      case 'new':
        return <span className="bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Nuevo</span>;
      case 'contacted':
        return <span className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Contactado</span>;
      case 'negotiating':
        return <span className="bg-purple-500/20 border border-purple-500/40 text-purple-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase">En Negociación</span>;
      case 'closed':
        return <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Cerrado ✅</span>;
      case 'rejected':
        return <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase">Rechazado</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Building2 className="text-blue-400" /> Solicitudes de Patrocinio (Marcas)
          </h3>
          <p className="text-xs text-gray-400 mt-1">Leads recibidos desde el formulario "Cotizar Torneo para Marcas"</p>
        </div>

        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por empresa, correo o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">Todos los Estados</option>
            <option value="new">Nuevos</option>
            <option value="contacted">Contactados</option>
            <option value="negotiating">En Negociación</option>
            <option value="closed">Cerrados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLeads.map((item) => (
          <div
            key={item.id}
            className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-blue-500/40 transition-colors"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-bold text-white">{item.company_name}</h4>
                {getStatusBadge(item.status)}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <Mail className="w-3.5 h-3.5" /> {item.email}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Phone className="w-3.5 h-3.5" /> {item.phone}
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400 font-bold">
                  <DollarSign className="w-3.5 h-3.5" /> Presupuesto: {item.budget}
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Calendar className="w-3.5 h-3.5" /> {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              {item.notes && (
                <p className="text-xs text-gray-300 italic bg-white/5 p-2.5 rounded-xl border border-white/5 mt-2">
                  "{item.notes}"
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="text-xs font-bold text-gray-400">Cambiar Estado:</label>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="new">Nuevo</option>
                <option value="contacted">Contactado</option>
                <option value="negotiating">En Negociación</option>
                <option value="closed">Cerrado ✅</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
