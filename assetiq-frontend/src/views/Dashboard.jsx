import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, CheckCircle2, Activity, RefreshCw, Wrench } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const { apiCall, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    setRefreshing(true);
    try {
      const [statsRes, warrantiesRes, maintenanceRes] = await Promise.all([
        apiCall('/api/v1/reports/asset-summary'),
        apiCall('/api/v1/warranties'),
        apiCall('/api/v1/maintenance')
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (warrantiesRes.success) setWarranties(warrantiesRes.data || []);
      if (maintenanceRes.success) setMaintenanceRequests(maintenanceRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'super_admin': return 'Super Admin Dashboard';
      case 'org_admin': return 'Organization Admin Dashboard';
      case 'asset_manager': return 'Asset Manager Dashboard';
      case 'employee': return 'Employee Dashboard';
      default: return 'Executive Dashboard';
    }
  };

  const getWarrantyData = () => {
    const buckets = {};
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = 0;
    }
    warranties.forEach(w => {
      const d = new Date(w.endDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in buckets) buckets[key]++;
    });
    return Object.entries(buckets).map(([month, count]) => {
      const [year, monthNum] = month.split('-');
      const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const formattedMonth = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      return { month: formattedMonth, count };
    });
  };

  const getMaintenanceData = () => {
    const statusCounts = { open: 0, assigned: 0, in_progress: 0, resolved: 0 };
    maintenanceRequests.forEach(r => {
      if (r.status in statusCounts) {
        statusCounts[r.status]++;
      }
    });
    return Object.entries(statusCounts).map(([status, count]) => {
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
      return { status: formattedStatus, count };
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Formatting datasets for Recharts
  const statusData = stats ? [
    { name: 'Available', value: stats.available, color: '#39912f' }, 
    { name: 'Assigned', value: stats.assigned, color: '#80b2e4' }, 
    { name: 'In Repair', value: stats.under_maintenance, color: '#e8d93d' }, 
    { name: 'Damaged', value: stats.damaged, color: '#d12626' }, 
  ].filter(d => d.value > 0) : [];

  const lineData = getWarrantyData();
  const barData = getMaintenanceData();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{getDashboardTitle()}</h1>
          <p className="text-slate-500 mt-1">Real-time tenant asset metrics and AI health scores.</p>
        </div>
        <button
          onClick={fetchDashboardStats}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Assets */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Registered</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">{stats?.total || 0}</span>
          </div>
          <div className="p-4 bg-slate-100 rounded-xl text-slate-700">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Available Assets */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Available</span>
            <span className="text-4xl font-extrabold text-emerald-600 mt-2 block">{stats?.available || 0}</span>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Average AI Health Score */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Average AI Health</span>
            <span className="text-4xl font-extrabold text-blue-600 mt-2 block">{stats?.averageHealthScore || 100}%</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        {/* Open Maintenance Requests */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Open Maintenance</span>
            <span className="text-4xl font-extrabold text-indigo-650 mt-2 block">{stats?.under_maintenance || 0}</span>
          </div>
          <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: 3-Across Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget 1: Status Distribution (Pie) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-base font-bold text-slate-800">Asset Status Allocation</h2>
            <span className="text-xs text-slate-400">Current status of fleet inventory</span>
          </div>
          {statusData.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center space-y-4 my-2">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-650">
                {statusData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="font-semibold truncate">{entry.name}:</span>
                    <span className="font-bold text-slate-800">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
              No status data available.
            </div>
          )}
        </div>

        {/* Widget 2: Warranty Expirations (Line) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-base font-bold text-slate-800">Warranty Expirations</h2>
            <span className="text-xs text-slate-400">Coverage lapses over next 6 months</span>
          </div>
          <div className="flex-1 h-44 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e1ed" />
                <XAxis dataKey="month" stroke="#77698f" fontSize={10} tickLine={false} />
                <YAxis stroke="#77698f" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6c3ce9" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} name="Expirations" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-[10px] text-slate-450 font-semibold border-t border-slate-100 pt-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onNavigate && onNavigate('warranties')}>
            View All Warranty Records &rarr;
          </div>
        </div>

        {/* Widget 3: Maintenance Workload by Status (Bar) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[350px]">
          <div>
            <h2 className="text-base font-bold text-slate-800">Maintenance Workload</h2>
            <span className="text-xs text-slate-400">Request queues sorted by queue status</span>
          </div>
          <div className="flex-1 h-44 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e1ed" />
                <XAxis dataKey="status" stroke="#77698f" fontSize={10} tickLine={false} />
                <YAxis stroke="#77698f" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f5f3f7' }} />
                <Bar dataKey="count" fill="#8c56ff" radius={[3, 3, 0, 0]} barSize={24} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-[10px] text-slate-450 font-semibold border-t border-slate-100 pt-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onNavigate && onNavigate('maintenance')}>
            Manage Servicing Workflows &rarr;
          </div>
        </div>
      </div>
    </div>
  );
}
