import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GitCommit, Building2, Layers, MapPin, Plus, RefreshCw, X, ChevronDown, ChevronRight } from 'lucide-react';

export default function Locations() {
  const { apiCall, user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Collapse state for nodes
  const [expandedNodes, setExpandedNodes] = useState({});

  // Modal controls
  const [activeModal, setActiveModal] = useState(null); // 'branch' | 'building' | 'floor' | 'room' | null
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState('');
  
  // Form values
  const [formData, setFormData] = useState({ name: '', code: '', number: 0 });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setFormData({ name: '', code: '', number: 0 });
    setActiveModal(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    let url = '';
    let body = {};

    if (activeModal === 'branch') {
      url = '/api/v1/locations/branches';
      body = { name: formData.name, code: formData.code };
    } else if (activeModal === 'building') {
      url = '/api/v1/locations/buildings';
      body = { branchId: parentId, name: formData.name, code: formData.code };
    } else if (activeModal === 'floor') {
      url = '/api/v1/locations/floors';
      body = { buildingId: parentId, name: formData.name, number: Number(formData.number) };
    } else if (activeModal === 'room') {
      url = '/api/v1/locations/rooms';
      body = { floorId: parentId, name: formData.name, code: formData.code };
    }

    try {
      const res = await apiCall(url, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (res.success) {
        setActiveModal(null);
        fetchTree();
      } else {
        setFormError(res.message || 'Failed to add node');
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
          <p className="text-slate-500 mt-1">Configure spatial relationships for your organization assets.</p>
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
                      <GitCommit className="h-5 w-5 text-blue-600" />
                      <div>
                        <span className="font-bold text-slate-800">{branch.name}</span>
                        <span className="text-xs font-semibold font-mono text-slate-400 ml-2">[{branch.code}]</span>
                      </div>
                    </div>
                    {user?.role !== 'employee' && (
                      <button
                        onClick={() => handleOpenCreateModal('building', branch._id, branch.name)}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 bg-white border border-blue-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg shadow-2xs font-semibold cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Building
                      </button>
                    )}
                  </div>

                  {/* Buildings List under Branch */}
                  {isBranchExpanded && (
                    <div className="pl-6 pr-4 py-2 bg-white divide-y divide-slate-50">
                      {branch.buildings.length === 0 ? (
                        <div className="text-xs text-slate-400 italic py-2">No buildings registered. Add one to this branch.</div>
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
                                  <button
                                    onClick={() => handleOpenCreateModal('floor', building._id, building.name)}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md font-bold cursor-pointer"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add Floor
                                  </button>
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
                                              <button
                                                onClick={() => handleOpenCreateModal('room', floor._id, floor.name)}
                                                className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold cursor-pointer"
                                              >
                                                <Plus className="h-3 w-3" />
                                                Add Room
                                              </button>
                                            )}
                                          </div>

                                          {/* Rooms under Floor */}
                                          {isFloorExpanded && (
                                            <div className="pl-8 py-1 grid grid-cols-2 md:grid-cols-4 gap-3 border-l border-slate-100 ml-2">
                                              {floor.rooms.length === 0 ? (
                                                <div className="text-[10px] text-slate-400 italic col-span-full">No rooms registered.</div>
                                              ) : (
                                                floor.rooms.map((room) => (
                                                  <div key={room._id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-xl text-xs text-slate-700">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <div className="overflow-hidden">
                                                      <span className="font-semibold block truncate">{room.name}</span>
                                                      <span className="text-[9px] font-mono text-slate-400">{room.code}</span>
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

      {/* --- CREATION MODALS --- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 capitalize">
                Add {activeModal}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
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
                  placeholder={
                    activeModal === 'branch' ? 'New York HQ' : 
                    activeModal === 'building' ? 'Building A' : 
                    activeModal === 'floor' ? 'First Floor' : 'Server Room'
                  }
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              {activeModal !== 'floor' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    System Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      activeModal === 'branch' ? 'NY-HQ' : 
                      activeModal === 'building' ? 'BLD-A' : 'SRV-102'
                    }
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Floor Number
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
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
