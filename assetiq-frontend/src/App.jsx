import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
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
import Support from './views/Support';

import { 
  ShieldCheck, LayoutDashboard, Package, MapPin, 
  Wrench, ShieldCheck as ShieldIcon, BarChart2, Globe, LogOut, User, Settings, Bell,
  PlusCircle, Database, CreditCard, Building2, Tag, Briefcase, Users, LifeBuoy
} from 'lucide-react';

// Root component: custom router state, view switcher, notification listener, session guards.

function AppContent() {
  const { user, loading, logout, apiCall } = useAuth();
  const { socket } = useSocket();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // In-app notifications state
  const [notifications, setNotifications] = useState([]);
   const [showNotifications, setShowNotifications] = useState(false);

  // Super Admin Platform Controls sub-views state
  const [superAdminSubTab, setSuperAdminSubTab] = useState('organizations');
  const [superAdminAutoOpenModal, setSuperAdminAutoOpenModal] = useState(false);

  // Parse active tab segment from current URL path (e.g. /dashboard/assets -> 'assets')
  const getTabFromPath = (path) => {
    if (!path.startsWith('/dashboard')) return 'dashboard';
    const segment = path.replace(/^\/dashboard\/?/, '').split('/')[0];
    const validTabs = ['dashboard', 'assets', 'locations', 'maintenance', 'warranties', 'reports', 'setup', 'superadmin', 'support'];
    return validTabs.includes(segment) ? segment : 'dashboard';
  };

  const getSetupSubTabFromPath = (path) => {
    if (path.startsWith('/dashboard/setup')) {
      const sub = path.replace(/^\/dashboard\/setup\/?/, '').split('/')[0];
      if (['departments', 'categories', 'vendors', 'employees'].includes(sub)) return sub;
    }
    return 'departments';
  };

  const activeTab = getTabFromPath(currentPath);
  const orgSetupSubTab = getSetupSubTabFromPath(currentPath);

  // Custom routing navigation function
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleTabNavigate = (tabId) => {
    const targetPath = tabId === 'dashboard' ? '/dashboard' : `/dashboard/${tabId}`;
    navigate(targetPath);
    setShowNotifications(false);
  };

  const handleSetupSubTabNavigate = (subTab) => {
    navigate(`/dashboard/setup/${subTab}`);
    setShowNotifications(false);
  };

  // Sync state with browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch in-app notifications via REST
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

  // Fetch notifications on mount and setup background polling interval (slowed to 2 minutes as WebSocket fallback)
  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 600000); // Poll every 10 mins as fallback
      return () => clearInterval(interval);
    }
  }, [user]);

  // Real-time WebSocket Notification Listener
  useEffect(() => {
    if (socket) {
      const handleNewNotification = (newNotification) => {
        console.log('⚡ Live Notification Received via WebSocket:', newNotification);
        setNotifications((prev) => [newNotification, ...prev]);
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, [socket]);

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
        // Unauthenticated users trying to access dashboard paths should be redirected to login
        if (currentPath.startsWith('/dashboard')) {
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

  // 2. Authenticated State: Dashboard Shell
  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleTabNavigate} />;
      case 'assets':
        return <Assets />;
      case 'locations':
        return <Locations />;
      case 'maintenance':
        return <Maintenance notifications={notifications} onRefreshNotifications={fetchNotifications} />;
      case 'warranties':
        return <Warranties />;
      case 'reports':
        return <Reports />;
      case 'setup':
        return <OrganizationSetup initialSubTab={orgSetupSubTab} onSubTabChange={handleSetupSubTabNavigate} />;
      case 'superadmin':
        return user.role === 'super_admin' ? (
          <SuperAdmin initialSubTab={superAdminSubTab} autoOpenAddModal={superAdminAutoOpenModal} />
        ) : (
          <Dashboard onNavigate={handleTabNavigate} />
        );
      case 'support':
        return <Support />;
      default:
        return <Dashboard onNavigate={handleTabNavigate} />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'assets', label: 'Assets', icon: Package, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
    { id: 'locations', label: 'Locations', icon: MapPin, roles: ['org_admin'] },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, roles: ['org_admin', 'asset_manager', 'employee'] },
    { id: 'warranties', label: 'Warranties', icon: ShieldIcon, roles: ['org_admin', 'asset_manager', 'employee'] },
    { id: 'reports', label: 'Reports', icon: BarChart2, roles: ['super_admin', 'org_admin', 'asset_manager'] },
    { id: 'setup', label: 'Org Setup', icon: Settings, roles: ['org_admin'] },
    { id: 'support', label: 'Helpdesk & Support', icon: LifeBuoy, roles: ['super_admin', 'org_admin', 'asset_manager', 'employee'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Panel - Icon-only default (w-20), expands on hover (w-64) */}
      <aside className="w-20 hover:w-64 transition-all duration-300 ease-in-out group bg-white border-r border-slate-100 flex flex-col shrink-0 overflow-hidden shadow-lg hover:shadow-2xl z-20 relative">
        
        {/* Branding header (Hidden when not hovering, fades in smoothly on hover) */}
        <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between w-full">
            <span className="text-xl font-extrabold text-blue-600 tracking-tight select-none">
              AssetIQ
            </span>

            {/* Notification Bell Component */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 cursor-pointer relative transition-all"
                title="Notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover Drawer (Fixed position to prevent overflow clipping) */}
              {showNotifications && (
                <div className="fixed left-20 top-16 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden max-h-96 flex flex-col animate-fade-in">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center font-bold text-slate-600">
                    <span>Notifications ({unreadCount} unread)</span>
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
                          className={`p-3 space-y-1 relative group/item hover:bg-slate-50 transition-colors ${
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
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden flex flex-col items-center custom-scrollbar">
          {/* Super Admin Platform Controls Section AT TOP */}
          {user.role === 'super_admin' && (
            <>
              <div className="w-full pb-1 text-center group-hover:text-left transition-all">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden px-2">
                  Platform Controls
                </span>
              </div>

              {/* 1. Global Organizations */}
              <button
                onClick={() => {
                  setSuperAdminSubTab('organizations');
                  setSuperAdminAutoOpenModal(false);
                  handleTabNavigate('superadmin');
                }}
                title="Global Organizations"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'superadmin' && superAdminSubTab === 'organizations' && !superAdminAutoOpenModal
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Globe className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'superadmin' && superAdminSubTab === 'organizations' && !superAdminAutoOpenModal ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Global Organizations
                </span>
              </button>

              {/* 2. Add Organization */}
              <button
                onClick={() => {
                  setSuperAdminSubTab('organizations');
                  setSuperAdminAutoOpenModal(true);
                  handleTabNavigate('superadmin');
                }}
                title="Add Organization"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'superadmin' && superAdminAutoOpenModal
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <PlusCircle className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'superadmin' && superAdminAutoOpenModal ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Add Organization
                </span>
              </button>

              {/* 3. Subscription Plans */}
              <button
                onClick={() => {
                  setSuperAdminSubTab('plans');
                  setSuperAdminAutoOpenModal(false);
                  handleTabNavigate('superadmin');
                }}
                title="Subscription Plans"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'superadmin' && superAdminSubTab === 'plans' && !superAdminAutoOpenModal
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'superadmin' && superAdminSubTab === 'plans' && !superAdminAutoOpenModal ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Subscription Plans
                </span>
              </button>

              {/* 4. Storage */}
              <button
                onClick={() => {
                  setSuperAdminSubTab('storage');
                  setSuperAdminAutoOpenModal(false);
                  handleTabNavigate('superadmin');
                }}
                title="Storage"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'superadmin' && superAdminSubTab === 'storage' && !superAdminAutoOpenModal
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Database className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'superadmin' && superAdminSubTab === 'storage' && !superAdminAutoOpenModal ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Storage
                </span>
              </button>

              <div className="w-full border-t border-slate-100 my-2" />
            </>
          )}

          {/* Org Admin Organization Setup Section AT TOP */}
          {user.role === 'org_admin' && (
            <>
              <div className="w-full pb-1 text-center group-hover:text-left transition-all">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden px-2">
                  Organization Setup
                </span>
              </div>

              {/* 1. Departments */}
              <button
                onClick={() => handleSetupSubTabNavigate('departments')}
                title="Departments"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'setup' && orgSetupSubTab === 'departments'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'setup' && orgSetupSubTab === 'departments' ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Departments
                </span>
              </button>

              {/* 2. Asset Categories */}
              <button
                onClick={() => handleSetupSubTabNavigate('categories')}
                title="Asset Categories"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'setup' && orgSetupSubTab === 'categories'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Tag className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'setup' && orgSetupSubTab === 'categories' ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Asset Categories
                </span>
              </button>

              {/* 3. Suppliers */}
              <button
                onClick={() => handleSetupSubTabNavigate('vendors')}
                title="Suppliers"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'setup' && orgSetupSubTab === 'vendors'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'setup' && orgSetupSubTab === 'vendors' ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Suppliers
                </span>
              </button>

              {/* 4. Employees */}
              <button
                onClick={() => handleSetupSubTabNavigate('employees')}
                title="Employees"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'setup' && orgSetupSubTab === 'employees'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <Users className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'setup' && orgSetupSubTab === 'employees' ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Employees
                </span>
              </button>

              {/* 5. Helpdesk & Support */}
              <button
                onClick={() => handleTabNavigate('support')}
                title="Helpdesk & Support"
                className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                  activeTab === 'support'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}>
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                  activeTab === 'support' ? 'text-blue-600 font-bold' : 'text-slate-600'
                }`}>
                  Helpdesk & Support
                </span>
              </button>

              <div className="w-full border-t border-slate-300 my-2.5" />
            </>
          )}

          {/* Standard Navigation list (Dashboard, Assets, Reports) BELOW */}
          {navItems
            .filter((item) => {
              if (user.role === 'org_admin' && (item.id === 'setup' || item.id === 'support')) return false;
              return item.roles.includes(user.role);
            })
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && (item.id !== 'superadmin' || !superAdminSubTab || superAdminSubTab === 'organizations');
              const hasUnreadChat = item.id === 'maintenance' && notifications.some((n) => !n.read && n.type === 'chat_message');

              return (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => handleTabNavigate(item.id)}
                    title={item.label}
                    className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all relative ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}>
                      <Icon className="h-5 w-5" />
                      {hasUnreadChat && (
                        <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-600 animate-pulse border-2 border-white" />
                      )}
                    </div>
                    <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                      isActive ? 'text-blue-600 font-bold' : 'text-slate-600'
                    }`}>
                      {item.label}
                    </span>
                  </button>

                  {/* Render Global Tickets right below Dashboard for Super Admin */}
                  {user.role === 'super_admin' && item.id === 'dashboard' && (
                    <button
                      onClick={() => {
                        setSuperAdminSubTab('tickets');
                        setSuperAdminAutoOpenModal(false);
                        handleTabNavigate('superadmin');
                      }}
                      title="Global Maintenance Tickets"
                      className="w-full flex items-center gap-4 px-1 py-1 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                        activeTab === 'superadmin' && superAdminSubTab === 'tickets' && !superAdminAutoOpenModal
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}>
                        <Wrench className="h-5 w-5" />
                      </div>
                      <span className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis ${
                        activeTab === 'superadmin' && superAdminSubTab === 'tickets' && !superAdminAutoOpenModal ? 'text-blue-600 font-bold' : 'text-slate-600'
                      }`}>
                        Global Tickets
                      </span>
                    </button>
                  )}
                </React.Fragment>
              );
            })}
        </nav>

        {/* User Identity bottom bar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 px-1">
            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                {user.role.replace('_', ' ')}
              </span>
              <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="w-full flex items-center gap-3 px-1 py-1 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="h-11 w-11 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden text-ellipsis text-slate-700">
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}
