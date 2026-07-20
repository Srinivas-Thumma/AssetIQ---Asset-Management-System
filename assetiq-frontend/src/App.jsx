import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './views/Login';
import Register from './views/Register';
import Dashboard from './views/Dashboard';
import Assets from './views/Assets';
import Locations from './views/Locations';
import Maintenance from './views/Maintenance';
import Warranties from './views/Warranties';
import Reports from './views/Reports';
import SuperAdmin from './views/SuperAdmin';

import { 
  ShieldCheck, LayoutDashboard, Package, MapPin, 
  Wrench, ShieldCheck as ShieldIcon, BarChart2, Globe, LogOut, User 
} from 'lucide-react';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    );
  }

  // 1. Unauthenticated State
  if (!user) {
    return showLogin ? (
      <Login onSwitchToRegister={() => setShowLogin(false)} />
    ) : (
      <Register onSwitchToLogin={() => setShowLogin(true)} />
    );
  }

  // 2. Authenticated State: Main Layout with left Sidebar and right Content Panel
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'assets':
        return <Assets />;
      case 'locations':
        return <Locations />;
      case 'maintenance':
        return <Maintenance />;
      case 'warranties':
        return <Warranties />;
      case 'reports':
        return <Reports />;
      case 'superadmin':
        return user.role === 'super_admin' ? <SuperAdmin /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'assets', label: 'Assets', icon: Package, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'locations', label: 'Locations', icon: MapPin, roles: ['super_admin', 'org_admin'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'warranties', label: 'Warranties', icon: ShieldIcon, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['super_admin', 'org_admin', 'asset_manager'] },
    { id: 'superadmin', label: 'Platform Controls', icon: Globe, roles: ['super_admin'] },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Branding header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">AssetIQ</span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
        </nav>

        {/* User Identity bottom bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl text-slate-400">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">
                {user.role.replace('_', ' ')}
              </span>
              <span className="text-sm font-bold text-white block truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-all active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Optional top info bar if super admin is switching tenant scope */}
        {user.role === 'super_admin' && (
          <div className="bg-blue-600 text-white px-6 py-2 text-xs font-semibold text-center select-none shadow-sm">
            🛡️ platform super admin authority active. cross-tenant database filters are bypassed.
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
