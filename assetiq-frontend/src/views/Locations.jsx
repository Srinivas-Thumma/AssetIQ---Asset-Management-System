import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GitCommit, Building2, Layers, MapPin, Plus, 
  RefreshCw, X, ChevronDown, ChevronRight, Edit2, Trash2,
  Package, Eye, CheckCircle2
} from 'lucide-react';

export default function Locations() {
  const { apiCall, user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Collapse state for nodes
  const [expandedNodes, setExpandedNodes] = useState({});

  // Room Assets Modal State
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomAssets, setRoomAssets] = useState([]);
  const [roomAssetsLoading, setRoomAssetsLoading] = useState(false);
  const [showRoomAssetsModal, setShowRoomAssetsModal] = useState(false);

  // Modal controls
  const [activeModal, setActiveModal] = useState(null); // 'branch'|'building'|'floor'|'room'|'edit_branch'|'edit_building'|'edit_floor'|'edit_room'
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [editId, setEditId] = useState('');
  
  // Form values
  const [formData, setFormData] = useState({ name: '', code: '', number: 0 });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpenRoomAssets = async (room) => {
    setSelectedRoom(room);
    setShowRoomAssetsModal(true);
    setRoomAssetsLoading(true);
    setRoomAssets([]);
    try {
      const res = await apiCall(`/api/v1/assets?roomId=${room._id}`);
      if (res.success) {
        setRoomAssets(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch room assets:', err);
    } finally {
      setRoomAssetsLoading(false);
    }
  };

  const fetchTree = async () => {
    setRefreshing(true);
    try {
      const res = await apiCall('/api/v1/locations/tree');
      if (res.success) {
        setTree(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  const toggleExpand = (nodeId) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const handleOpenCreateModal = (type, parentIdVal = '', parentNameVal = '') => {
    if (user?.role === 'employee') return; // Read-only for employees
    setFormError('');
    setParentId(parentIdVal);
    setParentName(parentNameVal);
    setEditId('');
    setFormData({ name: '', code: '', number: 0 });
    setActiveModal(type);
  };

  const handleOpenEditModal = (type, item) => {
    if (user?.role === 'employee') return;
    setFormError('');
    setParentId('');
    setParentName('');
    setEditId(item._id);
    setFormData({
      name: item.name,
      code: item.code || '',
      number: item.number || 0
    });
    setActiveModal(`edit_${type}`);
  };

  const getPluralPath = (type) => (type === 'branch' ? 'branches' : `${type}s`);

  const handleDeleteNode = async (type, id) => {
    if (user?.role === 'employee') return;
    if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;

    setRefreshing(true);
    try {
      const res = await apiCall(`/api/v1/locations/${getPluralPath(type)}/${id}`, {
        method: 'DELETE'
      });

      if (res.success) {
        fetchTree();
      } else {
        alert(res.message || `Failed to delete ${type}`);
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    let url = '';
    let method = 'POST';
    let body = {};

    const isEdit = activeModal.startsWith('edit_');
    const type = isEdit ? activeModal.replace('edit_', '') : activeModal;
    const endpointPath = getPluralPath(type);

    if (isEdit) {
      method = 'PUT';
      url = `/api/v1/locations/${endpointPath}/${editId}`;
      if (type === 'floor') {
        body = { name: formData.name, number: Number(formData.number) };
      } else {
        body = { name: formData.name, code: formData.code };
      }
    } else {
      url = `/api/v1/locations/${endpointPath}`;
      if (type === 'branch') {
        body = { name: formData.name, code: formData.code };
      } else if (type === 'building') {
        body = { branchId: parentId, name: formData.name, code: formData.code };
      } else if (type === 'floor') {
        body = { buildingId: parentId, name: formData.name, number: Number(formData.number) };
      } else if (type === 'room') {
        body = { floorId: parentId, name: formData.name, code: formData.code };
      }
    }

    try {
      const res = await apiCall(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.success) {
        setActiveModal(null);
        fetchTree();
      } else {
        setFormError(res.message || 'Action failed');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Location Hierarchy</h1>
          <p className="text-slate-500 mt-1">Configure branches, buildings, floors, and rooms for asset maps.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchTree}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {user?.role !== 'employee' && (
            <button
              onClick={() => handleOpenCreateModal('branch')}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Branch Office
            </button>
          )}
        </div>
      </div>

      {/* Tree Visualization Container */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px]">
        {tree.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            Workspace is empty. Create a Branch Office above to begin establishing your location map.
          </div>
        ) : (
          <div className="space-y-4">
            {tree.map((branch) => {
              const isBranchExpanded = expandedNodes[branch._id];
              return (
                <div key={branch._id} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                  
                  {/* Branch Row */}
                  <div className="flex justify-between items-center bg-slate-50 px-4 py-3 hover:bg-slate-100/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleExpand(branch._id)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
                        {isBranchExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      <GitCommit className="h-5 w-5 text-blue-600 animate-pulse" />
                      <div>
                        <span className="font-bold text-slate-800">{branch.name}</span>
                        <span className="text-xs font-semibold font-mono text-slate-450 ml-2">[{branch.code}]</span>
                      </div>
                    </div>
                    {user?.role !== 'employee' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal('branch', branch)}
                          className="p-1.5 text-slate-550 hover:text-blue-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Edit Branch"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNode('branch', branch._id)}
                          className="p-1.5 text-slate-550 hover:text-red-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          title="Delete Branch"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenCreateModal('building', branch._id, branch.name)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-750 bg-white border border-blue-100 hover:bg-blue-50/50 px-3 py-1.5 rounded-lg shadow-2xs font-semibold cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Building
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Buildings List under Branch */}
                  {isBranchExpanded && (
                    <div className="pl-6 pr-4 py-2 bg-white divide-y divide-slate-50">
                      {branch.buildings.length === 0 ? (
                        <div className="text-xs text-slate-450 italic py-2">No buildings registered. Add one to this branch.</div>
                      ) : (
                        branch.buildings.map((building) => {
                          const isBuildingExpanded = expandedNodes[building._id];
                          return (
                            <div key={building._id} className="py-2.5">
                              
                              {/* Building Row */}
                              <div className="flex justify-between items-center hover:bg-slate-50/50 p-1.5 rounded-lg transition-colors">
                                <div className="flex items-center gap-2">
                                  <button onClick={() => toggleExpand(building._id)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                                    {isBuildingExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                                  <Building2 className="h-4.5 w-4.5 text-indigo-500" />
                                  <span className="font-semibold text-slate-700">{building.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">({building.code})</span>
                                </div>
                                {user?.role !== 'employee' && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenEditModal('building', building)}
                                      className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                                      title="Edit Building"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNode('building', building._id)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                      title="Delete Building"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenCreateModal('floor', building._id, building.name)}
                                      className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-750 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md font-bold cursor-pointer animate-fade-in"
                                    >
                                      <Plus className="h-3 w-3" />
                                      Add Floor
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Floors List under Building */}
                              {isBuildingExpanded && (
                                <div className="pl-8 py-1.5 space-y-2 border-l border-slate-100 ml-3.5">
                                  {building.floors.length === 0 ? (
                                    <div className="text-[11px] text-slate-400 italic">No floors registered.</div>
                                  ) : (
                                    building.floors.map((floor) => {
                                      const isFloorExpanded = expandedNodes[floor._id];
                                      return (
                                        <div key={floor._id} className="space-y-1.5">
                                          
                                          {/* Floor Row */}
                                          <div className="flex justify-between items-center hover:bg-slate-50/50 p-1 rounded-md transition-colors">
                                            <div className="flex items-center gap-2">
                                              <button onClick={() => toggleExpand(floor._id)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                                {isFloorExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                              </button>
                                              <Layers className="h-4 w-4 text-emerald-500" />
                                              <span className="text-sm font-medium text-slate-600">{floor.name}</span>
                                              <span className="text-[10px] text-slate-400">(Lvl: {floor.number})</span>
                                            </div>
                                            {user?.role !== 'employee' && (
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => handleOpenEditModal('floor', floor)}
                                                  className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                                  title="Edit Floor"
                                                >
                                                  <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteNode('floor', floor._id)}
                                                  className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                                  title="Delete Floor"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleOpenCreateModal('room', floor._id, floor.name)}
                                                  className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold cursor-pointer"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                  Add Room
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Rooms under Floor */}
                                          {isFloorExpanded && (
                                            <div className="pl-8 py-1 grid grid-cols-2 md:grid-cols-4 gap-3 border-l border-slate-100 ml-2">
                                              {floor.rooms.length === 0 ? (
                                                <div className="text-[10px] text-slate-400 italic col-span-full">No rooms registered.</div>
                                              ) : (
                                                floor.rooms.map((room) => (
                                                  <div key={room._id} className="group flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-100 p-2 rounded-xl text-xs text-slate-705 transition-colors">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                      <div className="overflow-hidden">
                                                        <span className="font-semibold block truncate">{room.name}</span>
                                                        <span className="text-[9px] font-mono text-slate-455 block truncate">{room.code}</span>
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                      <button
                                                        onClick={() => handleOpenRoomAssets(room)}
                                                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-150 text-blue-700 text-[10px] font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                                        title="Show assets held in this room"
                                                      >
                                                        <Package className="h-3 w-3" />
                                                        Assets
                                                      </button>

                                                      {user?.role !== 'employee' && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
                                                          <button
                                                            onClick={() => handleOpenEditModal('room', room)}
                                                            className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                                                            title="Edit Room"
                                                          >
                                                            <Edit2 className="h-3 w-3" />
                                                          </button>
                                                          <button
                                                            onClick={() => handleDeleteNode('room', room._id)}
                                                            className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                                                            title="Delete Room"
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </button>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- CREATION / EDIT MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 capitalize">
                {activeModal.startsWith('edit_') 
                  ? `Edit ${activeModal.replace('edit_', '')}` 
                  : `Add ${activeModal}`}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              {parentId && (
                <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider block">Parent Element</span>
                  <span className="font-bold text-slate-700 mt-1 block">{parentName}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Name / Identifier
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server Room A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              {activeModal !== 'floor' && activeModal !== 'edit_floor' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    System Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NY-HQ"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Floor Level Number
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {submitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ROOM HELD ASSETS MODAL --- */}
      {showRoomAssetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    Room Inventory: {selectedRoom?.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Room Code: {selectedRoom?.code}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRoomAssetsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {roomAssetsLoading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs font-semibold text-slate-700 shrink-0">
                  <span>Room Allocation Status:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    {roomAssets.length} Assets Currently Held
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Asset Code</th>
                        <th className="py-3 px-4">Asset Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Assigned Employee</th>
                        <th className="py-3 px-4 text-right">Value ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {roomAssets.map((asset) => (
                        <tr key={asset._id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{asset.assetCode}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{asset.name}</td>
                          <td className="py-3 px-4 text-slate-500">{asset.categoryId?.name || 'Standard'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                              {asset.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {asset.assignedTo ? `${asset.assignedTo.firstName || ''} ${asset.assignedTo.lastName || ''}`.trim() || asset.assignedTo.email : 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900">${asset.purchasePrice?.toLocaleString()}</td>
                        </tr>
                      ))}
                      {roomAssets.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 italic">No assets assigned or stored in this room.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
