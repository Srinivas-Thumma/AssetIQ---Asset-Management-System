import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './views/Login';
import Register from './views/Register';
import LandingPage from './views/LandingPage';
import Dashboard from './views/Dashboard';
import Assets from './views/Assets';
import Locations from './views/Locations';
import Maintenance from './views/Maintenance';
import Warranties from './views/Warranties';
import Reports from './views/Reports';
import SuperAdmin from './views/SuperAdmin';
import OrganizationSetup from './views/OrganizationSetup';

import { 
  ShieldCheck, LayoutDashboard, Package, MapPin, 
  Wrench, ShieldCheck as ShieldIcon, BarChart2, Globe, LogOut, User, Settings, Bell
} from 'lucide-react';

function AppContent() {
  const { user, loading, logout, apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // In-app notifications state
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Custom routing navigation function
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Sync state with browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch in-app notifications
  const fetchNotifications = async () => {
    try {
      const res = await apiCall('/api/v1/notifications');
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
    }
  };

  // Fetch notifications on mount and setup polling intervals
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await apiCall(`/api/v1/notifications/${id}`, { method: 'PUT' });
      if (res.success) {
        setNotifications((prev) => 
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await apiCall('/api/v1/notifications', { method: 'PUT' });
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Enforce session routing bounds
  useEffect(() => {
    if (!loading) {
      if (user) {
        // Authenticated users should not access login, register, or landing pages
        if (['/', '/login', '/register'].includes(currentPath)) {
          navigate('/dashboard');
        }
      } else {
        // Unauthenticated users should be redirected to landing page or login if trying to access dashboard
        if (currentPath === '/dashboard') {
          navigate('/login');
        }
      }
    }
  }, [user, loading, currentPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // 1. Unauthenticated State Routing
  if (!user) {
    if (currentPath === '/login') {
      return (
        <Login 
          onSwitchToRegister={() => navigate('/register')} 
          onBackToLanding={() => navigate('/')} 
        />
      );
    }
    if (currentPath === '/register') {
      return (
        <Register 
          onSwitchToLogin={() => navigate('/login')} 
          onBackToLanding={() => navigate('/')} 
        />
      );
    }
    // Default to Landing Page for the base path '/' and other unmapped paths
    return (
      <LandingPage 
        onNavigateToLogin={() => navigate('/login')} 
        onNavigateToRegister={() => navigate('/register')} 
      />
    );
  }

  // 2. Authenticated State: Dashboard Shell (Only accessible under '/dashboard')
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveTab} />;
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
      case 'setup':
        return <OrganizationSetup />;
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
    { id: 'setup', label: 'Org Setup', icon: Settings, roles: ['super_admin', 'org_admin'] },
    { id: 'superadmin', label: 'Platform Controls', icon: Globe, roles: ['super_admin'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Panel */}
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0">
        
        {/* Branding header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 relative">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">AssetIQ</span>
          </div>

          {/* Notification Bell Component */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer relative transition-all"
              title="Notifications"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-550 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Drawer */}
            {showNotifications && (
              <div className="absolute left-0 mt-3 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 text-xs overflow-hidden max-h-96 flex flex-col animate-fade-in">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center font-bold text-slate-500">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 italic select-none">No active notifications.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3 space-y-1 relative group hover:bg-slate-50 transition-colors ${
                          !n.read ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-slate-650 leading-relaxed ${!n.read ? 'text-slate-900 font-medium' : ''}`}>
                            {n.message}
                          </p>
                          {!n.read && (
                            <button
                              onClick={() => handleMarkAsRead(n._id)}
                              className="text-[9px] text-blue-600 hover:text-blue-700 font-semibold cursor-pointer shrink-0 mt-0.5"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(n.createdAt).toLocaleDateString([], { dateStyle: 'short' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
                  onClick={() => {
                    setActiveTab(item.id);
                    setShowNotifications(false); // Close drawer
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </button>
              );
            })}
        </nav>

        {/* User Identity bottom bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block truncate">
                {user.role.replace('_', ' ')}
              </span>
              <span className="text-sm font-bold text-slate-800 block truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-850 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition-all active:scale-[0.98]"
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
