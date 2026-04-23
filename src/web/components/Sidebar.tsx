import React from 'react';
import { 
  Gamepad2, 
  Trophy, 
  Store as StoreIcon, 
  Users, 
  UserCircle,
  ShieldAlert,
  LogOut,
  Settings
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import brand21Icon from '../../Public/Icon (2).png';
import type { DesktopTab } from './TopNavbar';

interface SidebarProps {
  activeTab: DesktopTab;
  onTabChange: (tab: DesktopTab) => void;
  isAdmin?: boolean;
}

export function Sidebar({ activeTab, onTabChange, isAdmin }: SidebarProps) {
  const { signOut } = useAuth();

  const navItems = [
    { id: 'all', label: 'Jugar', icon: Gamepad2, color: 'text-casino-gold' },
    { id: 'events', label: 'Torneos', icon: Trophy, color: 'text-amber-500' },
    { id: 'store', label: 'Tienda', icon: StoreIcon, color: 'text-purple-500' },
    { id: 'social', label: 'Social', icon: Users, color: 'text-blue-500' },
    { id: 'stats', label: 'Perfil', icon: UserCircle, color: 'text-emerald-500' },
  ] as const;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full bg-slate-900/80 backdrop-blur-2xl border-r border-white/5 relative z-40">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-8">
        <img src={brand21Icon} alt="Kasino21 logo" className="w-10 h-10 rounded-xl object-cover shadow-gold" />
        <div>
          <h1 className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold to-yellow-600 tracking-wider">
            KASINO21
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as DesktopTab)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon 
                className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                  isActive ? item.color : 'text-slate-500 group-hover:text-slate-300'
                }`} 
              />
              <span className="font-semibold tracking-wide text-sm">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-casino-gold animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </button>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/5 mx-2" />
            <button
              onClick={() => onTabChange('admin')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeTab === 'admin' 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : 'text-slate-400 hover:text-purple-400 hover:bg-purple-500/10'
              }`}
            >
              <ShieldAlert className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 text-purple-500" />
              <span className="font-semibold tracking-wide text-sm">Admin Panel</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
