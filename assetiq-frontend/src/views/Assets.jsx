import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, QrCode, Download, UserCheck, UserMinus, 
  Wrench, Activity, Trash2, Calendar, DollarSign, Tag, MapPin, 
  HelpCircle, ChevronRight, X
} from 'lucide-react';

export default function Assets() {
  const { apiCall, user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');

  // Modals & Drawers state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  
  // Form State
  const [newAsset, setNewAsset] = useState({
    assetCode: '',
    name: '',
    categoryId: '',
    roomId: '',
    purchaseDate: '',
    purchasePrice: '',
    vendorId: '',
  });

  const [formError, setFormError] = useState('');
  const [detailHistory, setDetailHistory] = useState({ assignments: [], maintenance: [] });

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [assetsRes, catRes, roomRes, vendorRes, empRes] = await Promise.all([
        apiCall(`/api/v1/assets?search=${search}&status=${statusFilter}&categoryId=${catFilter}`),
        apiCall('/api/v1/lookups/categories'),
        apiCall('/api/v1/locations/rooms'),
        apiCall('/api/v1/lookups/vendors'),
        apiCall('/api/v1/lookups/employees')
      ]);

      if (assetsRes.success) setAssets(assetsRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (roomRes.success) setRooms(roomRes.data);
      if (vendorRes.success) setVendors(vendorRes.data);
      if (empRes.success) setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, catFilter]);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall('/api/v1/assets', {
        method: 'POST',
        body: JSON.stringify(newAsset),
      });

      if (res.success) {
        setShowAddModal(false);
        setNewAsset({
          assetCode: '',
          name: '',
          categoryId: '',
          roomId: '',
          purchaseDate: '',
          purchasePrice: '',
          vendorId: '',
        });
        fetchData();
      } else {
        setFormError(res.message || 'Failed to create asset');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssign = (asset) => {
    setSelectedAsset(asset);
    setSelectedEmployeeId(employees[0]?._id || '');
    setShowAssignModal(true);
  };

  const handleAssign = async () => {
    if (!selectedEmployeeId) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${selectedAsset._id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: selectedEmployeeId }),
      });
      if (res.success) {
        setShowAssignModal(false);
        fetchData();
        if (showDetailsDrawer) handleOpenDetails(selectedAsset);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async (asset) => {
    if (!window.confirm(`Are you sure you want to return ${asset.name}?`)) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${asset._id}/return`, {
        method: 'POST',
      });
      if (res.success) {
        fetchData();
        if (showDetailsDrawer) handleOpenDetails(asset);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetails = async (asset) => {
    setSelectedAsset(asset);
    setShowDetailsDrawer(true);
    try {
      const res = await apiCall(`/api/v1/assets/${asset._id}/history`);
      if (res.success) {
        setDetailHistory(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerAI = async (assetId) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/ai/recompute/${assetId}`, { method: 'POST' });
      if (res.success) {
        // Update selected asset in view
        const updatedAsset = { ...selectedAsset, ai: res.data };
        setSelectedAsset(updatedAsset);
        // Refresh grid
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetire = async (assetId) => {
    if (!window.confirm('Are you sure you want to retire this asset? This marks it retired and preserves assignment history.')) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${assetId}`, { method: 'DELETE' });
      if (res.success) {
        setShowDetailsDrawer(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const downloadQR = (asset) => {
    const link = document.createElement('a');
    link.href = asset.qrCode;
    link.download = `QR_${asset.assetCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assets Directory</h1>
          <p className="text-slate-500 mt-1">Manage physical hardware, custodianship, and AI failure diagnostics.</p>
        </div>
        {user?.role !== 'employee' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            Register Asset
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm focus:outline-none w-full md:w-44"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="assigned">Assigned</option>
            <option value="under_maintenance">In Repair</option>
            <option value="damaged">Damaged</option>
            <option value="retired">Retired</option>
          </select>

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-700 text-sm focus:outline-none w-full md:w-44"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid / Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            No assets match the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Asset Code</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Room / Floor</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">AI Health</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {assets.map((asset) => {
                  let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (asset.status === 'available') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  if (asset.status === 'assigned') statusColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  if (asset.status === 'under_maintenance') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                  if (asset.status === 'damaged') statusColor = 'bg-red-50 text-red-700 border-red-100';
                  
                  const health = asset.ai?.healthScore ?? 100;
                  let healthColor = 'text-emerald-600';
                  if (health < 40) healthColor = 'text-red-500';
                  else if (health < 75) healthColor = 'text-amber-500';

                  return (
                    <tr key={asset._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">{asset.assetCode}</td>
                      <td className="py-4 px-6 font-medium text-slate-800">{asset.name}</td>
                      <td className="py-4 px-6">{asset.categoryId?.name || 'N/A'}</td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {asset.roomId?.name || 'N/A'}
                        <span className="block text-[10px] text-slate-400">
                          {asset.roomId?.floorId?.name || ''} ({asset.roomId?.floorId?.buildingId?.name || ''})
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`flex items-center gap-1.5 font-bold ${healthColor}`}>
                          <Activity className="h-4 w-4" />
                          {health}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => downloadQR(asset)}
                            title="Download QR Code"
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          
                          {user?.role !== 'employee' && asset.status === 'available' && (
                            <button
                              onClick={() => handleOpenAssign(asset)}
                              title="Assign Custodian"
                              className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg cursor-pointer"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}

                          {user?.role !== 'employee' && asset.status === 'assigned' && (
                            <button
                              onClick={() => handleReturn(asset)}
                              title="Return to Stock"
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg cursor-pointer"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenDetails(asset)}
                            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer text-xs"
                          >
                            Details
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALS & DRAWERS --- */}

      {/* Register Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Register Physical Asset</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleCreateAsset} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Asset Code (Unique)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IT-LAP-042"
                    value={newAsset.assetCode}
                    onChange={(e) => setNewAsset({ ...newAsset, assetCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MacBook Pro M3"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    required
                    value={newAsset.categoryId}
                    onChange={(e) => setNewAsset({ ...newAsset, categoryId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Room Location</label>
                  <select
                    required
                    value={newAsset.roomId}
                    onChange={(e) => setNewAsset({ ...newAsset, roomId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                  >
                    <option value="">Select Room</option>
                    {rooms.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} - {r.floorId?.name} ({r.floorId?.buildingId?.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={newAsset.purchaseDate}
                    onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="1200"
                    value={newAsset.purchasePrice}
                    onChange={(e) => setNewAsset({ ...newAsset, purchasePrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor Provider</label>
                <select
                  required
                  value={newAsset.vendorId}
                  onChange={(e) => setNewAsset({ ...newAsset, vendorId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>{v.name}</option>
                  ))}
                </select>
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
                  {submitting ? 'Registering...' : 'Complete Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Asset Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Assign Custody</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>{emp.name} ({emp.departmentId?.name})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Side Drawer */}
      {showDetailsDrawer && selectedAsset && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col relative overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold font-mono text-slate-400">{selectedAsset.assetCode}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{selectedAsset.name}</h3>
              </div>
              <button onClick={() => setShowDetailsDrawer(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* QR and Status Card */}
              <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {selectedAsset.qrCode ? (
                  <img src={selectedAsset.qrCode} alt="QR Code" className="w-24 h-24 bg-white p-1.5 border border-slate-200 rounded-lg shadow-sm" />
                ) : (
                  <div className="w-24 h-24 bg-slate-200 rounded-lg" />
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-white capitalize">{selectedAsset.status}</span>
                  </div>
                  {selectedAsset.assignedTo && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">Custodian:</span> {selectedAsset.assignedTo.name} ({selectedAsset.assignedTo.email})
                    </div>
                  )}
                  <button
                    onClick={() => downloadQR(selectedAsset)}
                    className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 shadow-xs cursor-pointer transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR Code
                  </button>
                </div>
              </div>

              {/* AI Health Diagnostics Pane */}
              <div className="bg-white border-2 border-blue-600/25 rounded-2xl p-5 shadow-sm text-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                      <Activity className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold tracking-wide text-slate-700">AI Health Diagnostics</span>
                  </div>
                  {user?.role !== 'employee' && (
                    <button
                      onClick={() => handleTriggerAI(selectedAsset._id)}
                      disabled={actionLoading}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 border border-blue-100 rounded-lg shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      {actionLoading ? 'Analyzing...' : 'Recalculate AI'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-6 py-2">
                  <div className="relative flex items-center justify-center">
                    {/* Ring score */}
                    <div className="text-3xl font-extrabold text-blue-600">{selectedAsset.ai?.healthScore ?? 100}%</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider block font-semibold">Diagnostic Score</span>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Calculated on-demand or nightly based on age, category metrics, and total repair history.
                    </p>
                  </div>
                </div>

                {/* AI Predictions */}
                {selectedAsset.ai?.predictedNextMaintenanceDate && (
                  <div className="space-y-4 border-t border-slate-100 pt-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Predicted Maintenance</span>
                        <p className="font-bold text-slate-800">
                          {new Date(selectedAsset.ai.predictedNextMaintenanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Failure Risk Probability</span>
                        <p className={`font-bold ${
                          selectedAsset.ai.failureRiskPercent > 70 ? 'text-red-650' :
                          selectedAsset.ai.failureRiskPercent > 40 ? 'text-amber-650' :
                          'text-emerald-600'
                        }`}>
                          {selectedAsset.ai.failureRiskPercent}% Risk
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {selectedAsset.ai.remainingUsefulLifeMonths !== undefined && selectedAsset.ai.remainingUsefulLifeMonths !== null && (
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Remaining Useful Life</span>
                          <p className="font-bold text-slate-800">
                            {selectedAsset.ai.remainingUsefulLifeMonths} months
                          </p>
                        </div>
                      )}
                      {selectedAsset.ai.priority && (
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">Urgency Priority</span>
                          <p className={`font-bold ${
                            selectedAsset.ai.priority.toLowerCase() === 'critical' || selectedAsset.ai.priority.toLowerCase() === 'high' ? 'text-red-600' :
                            selectedAsset.ai.priority.toLowerCase() === 'medium' ? 'text-amber-600' :
                            'text-slate-700'
                          }`}>
                            {selectedAsset.ai.priority}
                          </p>
                        </div>
                      )}
                    </div>

                    {selectedAsset.ai.replacementRecommendation && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-1">Replacement Recommendation</span>
                        <p className="text-slate-700 leading-relaxed font-medium">
                          {selectedAsset.ai.replacementRecommendation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Insights List */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Insights & Warnings</span>
                  {selectedAsset.ai?.insights && selectedAsset.ai.insights.length > 0 ? (
                    <ul className="space-y-2.5 mt-2">
                      {selectedAsset.ai.insights.map((insight, idx) => (
                        <li key={idx} className="flex gap-2 items-start text-xs text-slate-650 leading-relaxed">
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-650 shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-500 italic mt-1">No AI insights generated yet. Click Recalculate to generate details.</div>
                  )}
                </div>
              </div>

              {/* General details list */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800">Specifications</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-1">Purchase Cost</span>
                    <span className="font-bold text-slate-800 text-sm">${selectedAsset.purchasePrice}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 font-semibold block mb-1">Purchase Date</span>
                    <span className="font-bold text-slate-800 text-sm">{new Date(selectedAsset.purchaseDate).toISOString().split('T')[0]}</span>
                  </div>
                </div>
              </div>

              {/* History logs tabs */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-800">Assignment History</h4>
                {detailHistory.assignments.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No historical handover records.</div>
                ) : (
                  <div className="space-y-3">
                    {detailHistory.assignments.map((log) => (
                      <div key={log._id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <div>
                          <span className="font-semibold text-slate-700">{log.employeeId?.name || 'Custodian'}</span>
                          <span className="text-slate-400 text-[10px] block">
                            Assigned: {new Date(log.assignedAt).toISOString().split('T')[0]} by {log.assignedBy?.email || 'Admin'}
                          </span>
                        </div>
                        <div>
                          {log.returnedAt ? (
                            <span className="text-slate-400">Returned: {new Date(log.returnedAt).toISOString().split('T')[0]}</span>
                          ) : (
                            <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[10px]">Active</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintenance History logs */}
              <div className="space-y-4 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-bold text-slate-800">Completed Repair Logs</h4>
                {detailHistory.maintenance.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">No recorded repair history.</div>
                ) : (
                  <div className="space-y-3">
                    {detailHistory.maintenance.map((log) => (
                      <div key={log._id} className="border-b border-slate-50 pb-2 text-xs">
                        <div className="flex justify-between font-semibold text-slate-700">
                          <span>Cost: ${log.cost}</span>
                          <span className="text-slate-400">{new Date(log.date).toISOString().split('T')[0]}</span>
                        </div>
                        <p className="text-slate-500 mt-1 text-[11px] leading-relaxed"><span className="font-semibold">Findings:</span> {log.findings}</p>
                        <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed"><span className="font-semibold">Actions:</span> {log.actionsTaken}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            {user?.role !== 'employee' && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-4 shrink-0">
                <button
                  onClick={() => handleRetire(selectedAsset._id)}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 font-bold px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Retire Asset
                </button>
                {selectedAsset.status === 'assigned' && (
                  <button
                    onClick={() => handleReturn(selectedAsset)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-bold px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <UserMinus className="h-4 w-4" />
                    Return Asset
                  </button>
                )}
                {selectedAsset.status === 'available' && (
                  <button
                    onClick={() => handleOpenAssign(selectedAsset)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 text-xs text-white font-bold px-5 py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <UserCheck className="h-4 w-4" />
                    Assign Asset
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
