import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, CheckCircle2, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { apiCall } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardStats = async () => {
    setRefreshing(true);
    try {
      const res = await apiCall('/api/v1/reports/asset-summary');
      if (res.success) {
        setStats(res.data);
      }
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Formatting datasets for Recharts
  const statusData = stats ? [
    { name: 'Available', value: stats.available, color: '#10b981' }, // Emerald
    { name: 'Assigned', value: stats.assigned, color: '#3b82f6' }, // Blue
    { name: 'In Repair', value: stats.under_maintenance, color: '#f59e0b' }, // Amber
    { name: 'Damaged', value: stats.damaged, color: '#ef4444' }, // Red
  ].filter(d => d.value > 0) : [];

  const barData = stats ? [
    { name: 'Total', count: stats.total },
    { name: 'Available', count: stats.available },
    { name: 'Assigned', count: stats.assigned },
    { name: 'In Repair', count: stats.under_maintenance },
    { name: 'Damaged', count: stats.damaged },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
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

        {/* Maintenance / Issues */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Active Repairs / Damage</span>
            <span className="text-4xl font-extrabold text-amber-500 mt-2 block">
              {((stats?.under_maintenance || 0) + (stats?.damaged || 0))}
            </span>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl text-amber-500">
            <AlertTriangle className="h-6 w-6" />
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
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution (Pie) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Asset Status Allocation</h2>
          {statusData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
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
              <div className="w-1/2 space-y-3 pl-4">
                {statusData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-medium">{entry.name}:</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No asset status data available. Add assets to see visual breakdown.
            </div>
          )}
        </div>

        {/* Asset Counts (Bar) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Inventory Metrics</h2>
          {stats?.total > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" fill="#475569" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No inventory metrics available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
