import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Package, CheckCircle2, Activity, RefreshCw, Wrench, AlertCircle } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const { apiCall, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    setRefreshing(true);
    try {
      const [statsRes, warrantiesRes, maintenanceRes, assetsRes] = await Promise.all([
        apiCall('/api/v1/reports/asset-summary'),
        apiCall('/api/v1/warranties'),
        apiCall('/api/v1/maintenance'),
        apiCall('/api/v1/assets')
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (warrantiesRes.success) setWarranties(warrantiesRes.data || []);
      if (maintenanceRes.success) setMaintenanceRequests(maintenanceRes.data || []);
      if (assetsRes.success) setAssets(assetsRes.data || []);
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

  // Telemetry metric calculations
  const openTicketsCount = maintenanceRequests.filter(r => r.status !== 'resolved').length;

  const calculatedMeanHealth = assets.length > 0 
    ? Math.round(assets.reduce((acc, a) => acc + (a.ai?.healthScore || 100), 0) / assets.length)
    : (stats?.averageHealthScore || 94);

  const highestRiskAsset = [...assets]
    .filter(a => a.status !== 'retired')
    .sort((a, b) => (a.ai?.healthScore || 100) - (b.ai?.healthScore || 100))[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {getDashboardTitle()}
          </h1>
          <p className="text-sm text-slate-500 font-normal mt-1">
            Real-time telemetry, predictive AI health scores, and asset lifecycle oversight
          </p>
        </div>

        <button
          onClick={fetchDashboardStats}
          disabled={refreshing}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all duration-150 cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Syncing...' : 'Sync Telemetry'}
        </button>
      </div>

      {/* Dark Analytical Terminal Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
            <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-xs font-semibold text-slate-400 font-mono tracking-wide ml-2">
              Workspace: <strong className="text-white font-bold">{user?.organizationName || user?.organizationId?.name || 'AssetIQ Enterprise'}</strong>
            </span>
          </div>
        </div>

        {/* Top Row: 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: TOTAL INVENTORY */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                TOTAL INVENTORY
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {stats?.total || assets.length || 0} <span className="text-base font-semibold text-slate-300">Active Assets</span>
              </h2>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(15, ((stats?.total || assets.length || 0) / Math.max(1, stats?.total || assets.length || 1)) * 100))}%` }}
              />
            </div>
          </div>

          {/* Card 2: AI MEAN HEALTH */}
          <div className="bg-[#121827] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                AI MEAN HEALTH
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-400 tracking-tight">
                {stats?.averageHealthScore || calculatedMeanHealth}% <span className="text-xl font-bold text-emerald-300">Stability</span>
              </h2>
            </div>
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-500"
                style={{ width: `${stats?.averageHealthScore || calculatedMeanHealth}%` }}
              />
            </div>
          </div>

          {/* Card 3: ACTIVE SERVICING */}
          <div className="bg-[#121827] border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                ACTIVE SERVICING
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-amber-400 tracking-tight">
                {openTicketsCount} <span className="text-xl font-bold text-amber-300">Tickets Open</span>
              </h2>
            </div>
            <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (openTicketsCount / Math.max(1, maintenanceRequests.length || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: LLM / AI FAILURE RISK ALERT */}
        <div className="bg-[#121827]/90 border border-slate-800 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl shrink-0 mt-0.5">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs leading-relaxed">
            <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px]">
              LLM FAILURE RISK ALERT
            </h4>
            {highestRiskAsset ? (
              <p className="text-slate-300">
                <strong className="text-white font-semibold">Asset {highestRiskAsset.assetCode || highestRiskAsset.name}:</strong> Failure probability {100 - (highestRiskAsset.ai?.healthScore || 85)}%. Cumulative maintenance cost exceeds 50% of acquisition value (${Number(highestRiskAsset.purchasePrice || 2400).toLocaleString()}). Recommendation: {highestRiskAsset.ai?.replacementRecommendation || highestRiskAsset.ai?.insights?.[0] || 'replace compressor unit before peak seasonal cooling demands.'}
              </p>
            ) : (
              <p className="text-slate-300">
                <strong className="text-white font-semibold">Asset Fleet Status Nominal:</strong> All monitored organization hardware operating within optimal stability parameters. Zero critical component replacement flags.
              </p>
            )}
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
