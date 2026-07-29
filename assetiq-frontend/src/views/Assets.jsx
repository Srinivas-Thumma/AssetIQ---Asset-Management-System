import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, QrCode, Download, UserCheck, UserMinus, 
  Wrench, Activity, Trash2, Calendar, DollarSign, Tag, MapPin, 
  HelpCircle, ChevronRight, X, ShieldAlert, Edit, RefreshCw
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAssetData, setEditAssetData] = useState(null);
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

  const handleOpenEdit = (asset) => {
    setEditAssetData({
      _id: asset._id,
      assetCode: asset.assetCode,
      name: asset.name,
      categoryId: asset.categoryId?._id || asset.categoryId || '',
      roomId: asset.roomId?._id || asset.roomId || '',
      vendorId: asset.vendorId?._id || asset.vendorId || '',
      purchasePrice: asset.purchasePrice || '',
      status: asset.status || 'available',
    });
    setShowEditModal(true);
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    if (!editAssetData) return;
    setSubmitting(true);
    try {
      const res = await apiCall(`/api/v1/assets/${editAssetData._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editAssetData.name,
          categoryId: editAssetData.categoryId,
          roomId: editAssetData.roomId,
          vendorId: editAssetData.vendorId,
          purchasePrice: Number(editAssetData.purchasePrice),
          status: editAssetData.status,
        }),
      });

      if (res.success) {
        setShowEditModal(false);
        setEditAssetData(null);
        fetchData();
        if (showDetailsDrawer && selectedAsset?._id === editAssetData._id) {
          handleOpenDetails(res.data || selectedAsset);
        }
      }
    } catch (err) {
      console.error(err);
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
    if (!window.confirm('Are you sure you want to retire this asset? This marks it retired.')) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${assetId}?mode=retire`, { method: 'DELETE' });
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

  const handleDeleteAsset = async (assetId, assetName) => {
    const nameStr = assetName ? `"${assetName}"` : 'this asset';
    if (!window.confirm(`Are you sure you want to permanently delete ${nameStr}? This will completely remove it from the system.`)) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${assetId}`, { method: 'DELETE' });
      if (res.success) {
        setShowDetailsDrawer(false);
        fetchData();
      } else {
        alert(res.message || 'Failed to delete asset');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting asset');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDamaged = async (assetId) => {
    if (!window.confirm("Are you sure you want to mark this asset as damaged? This will flag it in stock checks.")) return;
    setActionLoading(true);
    try {
      const res = await apiCall(`/api/v1/assets/${assetId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'damaged' })
      });
      if (res.success) {
        fetchData();
        if (showDetailsDrawer && selectedAsset?._id === assetId) {
          setSelectedAsset(res.data || { ...selectedAsset, status: 'damaged' });
        }
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
          <CustomSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'available', label: 'Available' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'under_maintenance', label: 'In Repair' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'retired', label: 'Retired' },
            ]}
            className="w-full md:w-44"
          />

          <CustomSelect
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              ...categories.map((c) => ({ value: c._id, label: c.name })),
            ]}
            className="w-full md:w-44"
          />
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

                          {user?.role !== 'employee' && (
                            <button
                              onClick={() => handleOpenEdit(asset)}
                              title="Edit Asset"
                              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {user?.role !== 'employee' && (
                            <button
                              onClick={() => handleDeleteAsset(asset._id, asset.name)}
                              title="Delete Asset"
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          
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
                  <CustomSelect
                    placeholder="Select Category"
                    value={newAsset.categoryId}
                    onChange={(e) => setNewAsset({ ...newAsset, categoryId: e.target.value })}
                    options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Room Location</label>
                  <CustomSelect
                    placeholder="Select Room"
                    value={newAsset.roomId}
                    onChange={(e) => setNewAsset({ ...newAsset, roomId: e.target.value })}
                    options={rooms.map((r) => ({
                      value: r._id,
                      label: `${r.name} - ${r.floorId?.name || ''} (${r.floorId?.buildingId?.name || ''})`,
                    }))}
                  />
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
                <CustomSelect
                  placeholder="Select Supplier"
                  value={newAsset.vendorId}
                  onChange={(e) => setNewAsset({ ...newAsset, vendorId: e.target.value })}
                  options={vendors.map((v) => ({ value: v._id, label: v.name }))}
                />
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

      {/* Edit Asset Modal */}
      {showEditModal && editAssetData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-2xl max-w-lg w-full space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Asset: {editAssetData.assetCode}</h3>
                <p className="text-xs text-slate-400">Update specifications, locations, and status</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAsset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  value={editAssetData.name}
                  onChange={(e) => setEditAssetData({ ...editAssetData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <CustomSelect
                    placeholder="Select Category"
                    value={editAssetData.categoryId}
                    onChange={(e) => setEditAssetData({ ...editAssetData, categoryId: e.target.value })}
                    options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Room Location</label>
                  <CustomSelect
                    placeholder="Select Room"
                    value={editAssetData.roomId}
                    onChange={(e) => setEditAssetData({ ...editAssetData, roomId: e.target.value })}
                    options={rooms.map((r) => ({
                      value: r._id,
                      label: `${r.name} - ${r.floorId?.name || ''} (${r.floorId?.buildingId?.name || ''})`,
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vendor</label>
                  <CustomSelect
                    placeholder="Select Vendor"
                    value={editAssetData.vendorId}
                    onChange={(e) => setEditAssetData({ ...editAssetData, vendorId: e.target.value })}
                    options={vendors.map((v) => ({ value: v._id, label: v.name }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editAssetData.purchasePrice}
                    onChange={(e) => setEditAssetData({ ...editAssetData, purchasePrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Operational Status</label>
                <CustomSelect
                  value={editAssetData.status}
                  onChange={(e) => setEditAssetData({ ...editAssetData, status: e.target.value })}
                  options={[
                    { value: 'available', label: 'Available' },
                    { value: 'assigned', label: 'Assigned' },
                    { value: 'under_maintenance', label: 'In Repair (Under Maintenance)' },
                    { value: 'damaged', label: 'Damaged' },
                    { value: 'retired', label: 'Retired' },
                  ]}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
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
                <CustomSelect
                  placeholder="Select Employee..."
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  options={employees.map((emp) => ({
                    value: emp._id,
                    label: `${emp.name} (${emp.departmentId?.name || 'Unassigned'})`,
                  }))}
                />
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

      {/* Details Wide 3-Column Centered Popup Modal */}
      {showDetailsDrawer && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
          <div className="w-[95vw] max-w-6xl bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[92vh] animate-fade-in">
            
            {/* 1. Header (Pinned Top) */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-mono font-bold">
                  {selectedAsset.assetCode}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedAsset.name}</h3>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailsDrawer(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 2. Grid Body (3-Column Layout, No Overall Modal Scroll needed on standard displays) */}
            <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1 min-h-0 overflow-y-auto xl:overflow-visible bg-slate-50/40">
              
              {/* --- COLUMN 1 (LEFT): QR, Custodian & Specifications --- */}
              <div className="xl:col-span-3 space-y-4 flex flex-col">
                
                {/* QR & Status Card */}
                <div className="bg-white border border-indigo-100/80 rounded-2xl p-4 shadow-2xs flex flex-col items-center text-center space-y-3">
                  {selectedAsset.qrCode ? (
                    <img 
                      src={selectedAsset.qrCode} 
                      alt="QR Code" 
                      className="w-28 h-28 bg-white p-2 border border-slate-200 rounded-xl shadow-xs shrink-0" 
                    />
                  ) : (
                    <div className="w-28 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-mono text-xs">
                      No QR
                    </div>
                  )}

                  <div className="space-y-1.5 w-full">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50/50 text-indigo-700 border-indigo-100 capitalize">
                        {selectedAsset.status?.replace('_', ' ')}
                      </span>
                    </div>

                    {selectedAsset.assignedTo && (
                      <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 text-left">
                        <span className="font-bold text-slate-500 block text-[9px] uppercase tracking-wider">Current Custodian</span>
                        <p className="font-semibold text-slate-800 truncate">{selectedAsset.assignedTo.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{selectedAsset.assignedTo.email}</p>
                      </div>
                    )}

                    <button
                      onClick={() => downloadQR(selectedAsset)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-700 font-bold px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs cursor-pointer transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download QR Code
                    </button>
                  </div>
                </div>

                {/* Specifications Card */}
                <div className="bg-white border border-indigo-100/80 rounded-2xl p-4 shadow-2xs space-y-3 flex-1 flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                    Specifications & Identity
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Purchase Cost</span>
                      <span className="font-extrabold text-slate-900 text-xs">${selectedAsset.purchasePrice}</span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Purchase Date</span>
                      <span className="font-bold text-slate-800 text-xs">
                        {selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate).toISOString().split('T')[0] : 'N/A'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Category</span>
                      <span className="font-bold text-slate-800 text-xs truncate block">
                        {selectedAsset.categoryId?.name || 'Standard'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Room / Location</span>
                      <span className="font-bold text-slate-800 text-xs truncate block">
                        {selectedAsset.roomId?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {selectedAsset.vendorId && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Vendor</span>
                      <span className="font-bold text-slate-800 text-xs truncate block">{selectedAsset.vendorId.name}</span>
                    </div>
                  )}
                </div>

              </div>


              {/* --- COLUMN 2 (MIDDLE - FEATURE CENTERPIECE): AI HEALTH DIAGNOSTICS --- */}
              <div className="xl:col-span-5 flex flex-col">
                <div className="bg-white border-2 border-indigo-500/25 rounded-2xl p-5 shadow-sm space-y-4 flex-1 flex flex-col">
                  
                  {/* Top Bar */}
                  <div className="flex justify-between items-center border-b border-indigo-50 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">AI Health Diagnostics</h4>
                        <p className="text-[10px] text-slate-400 font-medium">Real-time predictive telemetry</p>
                      </div>
                    </div>
                    {user?.role !== 'employee' && (
                      <button
                        onClick={() => handleTriggerAI(selectedAsset._id)}
                        disabled={actionLoading}
                        className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 border border-indigo-150 rounded-xl shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                      >
                        {actionLoading ? 'Analyzing...' : 'Recalculate AI'}
                      </button>
                    )}
                  </div>

                  {/* Score Highlight Banner */}
                  <div className="flex items-center gap-5 bg-gradient-to-br from-indigo-50/70 to-slate-50 p-4 rounded-2xl border border-indigo-100/60">
                    <div className="relative flex items-center justify-center shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-indigo-600/20">
                        {selectedAsset.ai?.healthScore ?? 100}%
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-indigo-900 font-bold uppercase tracking-wider block">Health Score Metric</span>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        Calculated via telemetry analysis of asset age, component degradation, and repair logs.
                      </p>
                    </div>
                  </div>

                  {/* AI Predictions Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Predicted Maintenance</span>
                      <p className="font-bold text-slate-800 text-xs">
                        {selectedAsset.ai?.predictedNextMaintenanceDate 
                          ? new Date(selectedAsset.ai.predictedNextMaintenanceDate).toLocaleDateString(undefined, { dateStyle: 'medium' })
                          : 'No action due'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Failure Risk</span>
                      <p className={`font-extrabold text-xs ${
                        selectedAsset.ai?.failureRiskPercent > 70 ? 'text-red-650' :
                        selectedAsset.ai?.failureRiskPercent > 40 ? 'text-amber-650' :
                        'text-emerald-600'
                      }`}>
                        {selectedAsset.ai?.failureRiskPercent ?? 0}% Risk
                      </p>
                    </div>

                    {selectedAsset.ai?.remainingUsefulLifeMonths !== undefined && selectedAsset.ai?.remainingUsefulLifeMonths !== null && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Useful Life Left</span>
                        <p className="font-bold text-slate-800 text-xs">
                          {selectedAsset.ai.remainingUsefulLifeMonths} months
                        </p>
                      </div>
                    )}

                    {selectedAsset.ai?.priority && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">Urgency Priority</span>
                        <p className={`font-bold text-xs ${
                          ['critical', 'high'].includes(selectedAsset.ai.priority.toLowerCase()) ? 'text-red-600' :
                          selectedAsset.ai.priority.toLowerCase() === 'medium' ? 'text-amber-600' :
                          'text-slate-700'
                        }`}>
                          {selectedAsset.ai.priority}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI Replacement Recommendation */}
                  {selectedAsset.ai?.replacementRecommendation && (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60 text-xs">
                      <span className="text-[10px] text-amber-800 uppercase tracking-wider block font-bold mb-0.5">Replacement Recommendation</span>
                      <p className="text-amber-900 leading-relaxed text-[11px] font-medium">
                        {selectedAsset.ai.replacementRecommendation}
                      </p>
                    </div>
                  )}

                  {/* AI Insights & Warnings List */}
                  <div className="space-y-2 flex-1 flex flex-col min-h-0 pt-1">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">AI Insights & Warnings</span>
                    <div className="flex-1 overflow-y-auto max-h-36 pr-1 space-y-2 text-xs">
                      {selectedAsset.ai?.insights && selectedAsset.ai.insights.length > 0 ? (
                        <ul className="space-y-2">
                          {selectedAsset.ai.insights.map((insight, idx) => (
                            <li key={idx} className="flex gap-2 items-start text-[11px] text-slate-700 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-slate-400 italic">No AI insights generated yet. Click Recalculate AI above.</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>


              {/* --- COLUMN 3 (RIGHT): ASSIGNMENT HISTORY & COMPLETED REPAIR LOGS --- */}
              <div className="xl:col-span-4 space-y-4 flex flex-col">
                
                {/* Assignment History Card */}
                <div className="bg-white border border-indigo-100/80 rounded-2xl p-4 shadow-2xs flex flex-col max-h-52">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-2 shrink-0">
                    Assignment History
                  </h4>
                  <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
                    {(!detailHistory?.assignments || detailHistory.assignments.length === 0) ? (
                      <div className="text-xs text-slate-400 italic py-2">No historical handover records.</div>
                    ) : (
                      detailHistory.assignments.map((log) => (
                        <div key={log._id} className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                          <div>
                            <span className="font-bold text-slate-800">{log.employeeId?.name || 'Custodian'}</span>
                            <span className="text-slate-400 text-[10px] block">
                              Assigned: {log.assignedAt ? new Date(log.assignedAt).toISOString().split('T')[0] : 'N/A'}
                            </span>
                          </div>
                          <div>
                            {log.returnedAt ? (
                              <span className="text-slate-400 text-[10px]">Returned: {new Date(log.returnedAt).toISOString().split('T')[0]}</span>
                            ) : (
                              <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[10px]">Active</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Completed Repair Logs Card */}
                <div className="bg-white border border-indigo-100/80 rounded-2xl p-4 shadow-2xs flex-1 flex flex-col max-h-56">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-2 shrink-0">
                    Completed Repair Logs
                  </h4>
                  <div className="overflow-y-auto flex-1 pr-1 space-y-2.5">
                    {(!detailHistory?.maintenance || detailHistory.maintenance.length === 0) ? (
                      <div className="text-xs text-slate-400 italic py-2">No recorded repair history.</div>
                    ) : (
                      detailHistory.maintenance.map((log) => (
                        <div key={log._id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-slate-800">
                            <span>Cost: ${log.cost}</span>
                            <span className="text-slate-400 text-[10px] font-normal">{log.date ? new Date(log.date).toISOString().split('T')[0] : 'N/A'}</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed"><span className="font-semibold text-slate-700">Findings:</span> {log.findings}</p>
                          <p className="text-slate-600 text-[11px] leading-relaxed"><span className="font-semibold text-slate-700">Actions:</span> {log.actionsTaken}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* 3. Footer Bar (Pinned Bottom Bar, Always Visible) */}
            {user?.role !== 'employee' && (
              <div className="px-6 py-3.5 bg-slate-900 text-white border-t border-slate-800 flex justify-between items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(selectedAsset)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-white font-bold px-3 py-2 border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/40 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Asset
                  </button>

                  {selectedAsset.status !== 'damaged' && selectedAsset.status !== 'retired' && (
                    <button
                      onClick={() => handleMarkDamaged(selectedAsset._id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-white font-bold px-3 py-2 border border-amber-500/30 bg-amber-600/20 hover:bg-amber-600/40 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Mark Damaged
                    </button>
                  )}

                  <button
                    onClick={() => handleRetire(selectedAsset._id)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-white font-bold px-3 py-2 border border-amber-500/30 bg-amber-600/20 hover:bg-amber-600/40 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retire Asset
                  </button>

                  <button
                    onClick={() => handleDeleteAsset(selectedAsset._id, selectedAsset.name)}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 text-xs text-red-300 hover:text-white font-bold px-3 py-2 border border-red-500/30 bg-red-600/20 hover:bg-red-600/40 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Asset
                  </button>
                </div>

                <div>
                  {selectedAsset.status === 'assigned' && (
                    <button
                      onClick={() => handleReturn(selectedAsset)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-white font-bold px-4 py-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      <UserMinus className="h-4 w-4" />
                      Return Custody
                    </button>
                  )}
                  {selectedAsset.status === 'available' && (
                    <button
                      onClick={() => handleOpenAssign(selectedAsset)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 text-xs text-white font-bold px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-blue-600/20"
                    >
                      <UserCheck className="h-4 w-4" />
                      Assign Custody
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
