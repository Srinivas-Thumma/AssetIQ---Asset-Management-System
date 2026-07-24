import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, ShieldAlert, Plus, ShieldCheck, RefreshCw, X, AlertTriangle } from 'lucide-react';

export default function Warranties() {
  const { apiCall, user } = useAuth();
  const [warranties, setWarranties] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Modal Controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarranty, setNewWarranty] = useState({
    assetId: '',
    provider: '',
    startDate: '',
    endDate: '',
  });

  const fetchData = async () => {
    try {
      const [warRes, assetRes] = await Promise.all([
        apiCall('/api/v1/warranties'),
        apiCall('/api/v1/assets')
      ]);

      if (warRes.success) setWarranties(warRes.data);
      if (assetRes.success) {
        // Filter assets that don't have warranties already registered
        const assetsWithWarranty = warRes.data?.map(w => w.assetId?._id) || [];
        setAssets(assetRes.data.filter(a => a.status !== 'retired' && !assetsWithWarranty.includes(a._id)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWarranty = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall('/api/v1/warranties', {
        method: 'POST',
        body: JSON.stringify(newWarranty),
      });

      if (res.success) {
        setShowAddModal(false);
        setNewWarranty({ assetId: '', provider: '', startDate: '', endDate: '' });
        fetchData();
      } else {
        setFormError(res.message || 'Failed to register warranty');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: calculate days remaining
  const getDaysRemaining = (endDateStr) => {
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Count expiring soon (days remaining between 0 and 30)
  const expiringSoonCount = warranties.filter(
    (w) => getDaysRemaining(w.endDate) > 0 && getDaysRemaining(w.endDate) <= 30
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Warranty Ledger</h1>
          <p className="text-slate-500 mt-1">Track supplier coverages, claim expirations, and alert terms.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {user?.role !== 'employee' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Link Warranty
            </button>
          )}
        </div>
      </div>

      {/* Alert Panel if warranties are expiring soon */}
      {expiringSoonCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 text-amber-800 shadow-xs items-start">
          <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Coverages Expiring Soon</span>
            <p className="text-xs mt-1 leading-relaxed text-amber-700">
              There are {expiringSoonCount} asset warranty coverages set to expire in the next 30 days. 
              Review the ledger below to schedule inspection rounds or hardware refreshes before coverage lapse.
            </p>
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {warranties.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            No warranties linked. Connect an asset warranty using the button above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Asset Reference</th>
                  <th className="py-4 px-6">Provider / Vendor</th>
                  <th className="py-4 px-6">Coverage Term</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Time Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {warranties.map((w) => {
                  const daysRemaining = getDaysRemaining(w.endDate);
                  let termStatus = 'active';
                  
                  if (daysRemaining <= 0) termStatus = 'expired';
                  else if (daysRemaining <= 30) termStatus = 'expiring';

                  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  if (termStatus === 'expired') badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                  if (termStatus === 'expiring') badgeColor = 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';

                  return (
                    <tr key={w._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800 block">{w.assetId?.name || 'Retired Asset'}</span>
                        <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">{w.assetId?.assetCode || 'N/A'}</span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700">{w.provider}</td>
                      <td className="py-4 px-6 text-xs text-slate-500 space-y-0.5">
                        <div>Start: {new Date(w.startDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                        <div>End: {new Date(w.endDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor} capitalize`}>
                          {termStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium">
                        {daysRemaining <= 0 ? (
                          <span className="text-rose-600 font-bold">Lapsed</span>
                        ) : daysRemaining <= 30 ? (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <ShieldAlert className="h-4 w-4" />
                            {daysRemaining} Days
                          </span>
                        ) : (
                          <span className="text-slate-600">{daysRemaining} Days</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Link Warranty Coverage</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarranty} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Asset</label>
                <select
                  required
                  value={newWarranty.assetId}
                  onChange={(e) => setNewWarranty({ ...newWarranty, assetId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                >
                  <option value="">Select Asset...</option>
                  {assets.map((a) => (
                    <option key={a._id} value={a._id}>{a.name} ({a.assetCode})</option>
                  ))}
                </select>
                {assets.length === 0 && (
                  <span className="text-[10px] text-slate-400 block mt-1">No unregistered assets available. Create an asset first.</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Warranty Provider Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AppleCare, Dell Support"
                  value={newWarranty.provider}
                  onChange={(e) => setNewWarranty({ ...newWarranty, provider: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newWarranty.startDate}
                    onChange={(e) => setNewWarranty({ ...newWarranty, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newWarranty.endDate}
                    onChange={(e) => setNewWarranty({ ...newWarranty, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Connecting...' : 'Connect Warranty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
