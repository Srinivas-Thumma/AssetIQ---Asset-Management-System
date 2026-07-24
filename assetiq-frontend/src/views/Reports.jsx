import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { DollarSign, Landmark, HelpCircle, Activity, TrendingUp, RefreshCw } from 'lucide-react';

export default function Reports() {
  const { apiCall } = useAuth();
  const [costData, setCostData] = useState({ totalCost: 0, categoryCost: [], monthlyCost: [] });
  const [locationData, setLocationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    setRefreshing(true);
    try {
      const [costRes, locRes] = await Promise.all([
        apiCall('/api/v1/reports/maintenance-cost'),
        apiCall('/api/v1/reports/location-wise')
      ]);

      if (costRes.success) setCostData(costRes.data);
      if (locRes.success) setLocationData(locRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial & Allocation Reports</h1>
          <p className="text-slate-500 mt-1">Audit cumulative repair billing, budget allocation, and spatial loading distributions.</p>
        </div>
        <button
          onClick={fetchReports}
          disabled={refreshing}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Recalculate Audits
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Maintenance Billing</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">${costData.totalCost || 0}</span>
          </div>
          <div className="p-4 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Highest Spending Category</span>
            <span className="text-xl font-bold text-slate-700 mt-2 block truncate max-w-[200px]">
              {costData.categoryCost.length > 0 
                ? [...costData.categoryCost].sort((a,b) => b.cost - a.cost)[0]?.category 
                : 'None'}
            </span>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl text-amber-500">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Office Locations Seeded</span>
            <span className="text-4xl font-extrabold text-slate-800 mt-2 block">{locationData.length || 0}</span>
          </div>
          <div className="p-4 bg-blue-50 rounded-xl text-blue-600">
            <Landmark className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Monthly expense timeline */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Monthly Repair Expense Timeline</h2>
        {costData.monthlyCost.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData.monthlyCost}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c3ce9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6c3ce9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e1ed" />
                <XAxis dataKey="month" stroke="#77698f" fontSize={11} tickLine={false} />
                <YAxis stroke="#77698f" fontSize={11} tickLine={false} unit="$" />
                <Tooltip />
                <Area type="monotone" dataKey="cost" stroke="#6c3ce9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
            No historical repair invoices logged.
          </div>
        )}
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cost by category */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Expenses by Asset Category</h2>
          {costData.categoryCost.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData.categoryCost} layout="vertical">
                  <XAxis type="number" stroke="#77698f" fontSize={11} tickLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#77698f" fontSize={11} tickLine={false} width={100} />
                  <Tooltip />
                  <Bar dataKey="cost" fill="#8c56ff" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No categories have recorded maintenance costs.
            </div>
          )}
        </div>

        {/* Spatial allocation */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Asset Loading by Building</h2>
          {locationData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData}>
                  <XAxis dataKey="location" stroke="#77698f" fontSize={11} tickLine={false} />
                  <YAxis stroke="#77698f" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="assetsCount" fill="#af8cff" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              No assets assigned to buildings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
