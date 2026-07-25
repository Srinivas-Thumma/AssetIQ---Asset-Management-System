import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, AlertCircle, Plus, CheckCircle, Wrench, ShieldAlert, X, Edit, Trash2 } from 'lucide-react';

export default function Maintenance() {
  const { apiCall, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Modals state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRequestData, setEditRequestData] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // New Request Form state
  const [newRequest, setNewRequest] = useState({
    assetId: '',
    type: 'corrective',
    priority: 'medium',
    description: '',
    scheduledDate: '',
  });

  // Resolve Request Form state
  const [resolution, setResolution] = useState({
    cost: '',
    findings: '',
    actionsTaken: '',
  });

  const fetchData = async () => {
    try {
      const [reqRes, assetRes] = await Promise.all([
        apiCall('/api/v1/maintenance'),
        apiCall('/api/v1/assets')
      ]);

      if (reqRes.success) setRequests(reqRes.data);
      // Only show assets that aren't retired or already under maintenance
      if (assetRes.success) {
        setAssets(assetRes.data.filter(a => a.status !== 'retired'));
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

  const handleScheduleRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall('/api/v1/maintenance', {
        method: 'POST',
        body: JSON.stringify(newRequest),
      });

      if (res.success) {
        setShowScheduleModal(false);
        setNewRequest({
          assetId: '',
          type: 'corrective',
          priority: 'medium',
          description: '',
          scheduledDate: '',
        });
        fetchData();
      } else {
        setFormError(res.message || 'Failed to schedule maintenance');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenResolve = (request) => {
    setSelectedRequest(request);
    setResolution({ cost: '', findings: '', actionsTaken: '' });
    setFormError('');
    setShowResolveModal(true);
  };

  const handleCompleteResolve = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall(`/api/v1/maintenance/${selectedRequest._id}/complete`, {
        method: 'POST',
        body: JSON.stringify(resolution),
      });

      if (res.success) {
        setShowResolveModal(false);
        fetchData();
        alert(`Maintenance resolved successfully! New AI Health Score calculated: ${res.data.assetHealthScore}%`);
      } else {
        setFormError(res.message || 'Failed to complete maintenance');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await apiCall(`/api/v1/maintenance/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditRequest = (request) => {
    setEditRequestData({
      _id: request._id,
      assetName: request.assetId?.name || 'Asset',
      assetCode: request.assetId?.assetCode || '',
      type: request.type || 'corrective',
      priority: request.priority || 'medium',
      status: request.status || 'open',
      description: request.description || '',
      scheduledDate: request.scheduledDate ? new Date(request.scheduledDate).toISOString().split('T')[0] : '',
    });
    setFormError('');
    setShowEditModal(true);
  };

  const handleUpdateRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await apiCall(`/api/v1/maintenance/${editRequestData._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          priority: editRequestData.priority,
          status: editRequestData.status,
          description: editRequestData.description,
          scheduledDate: editRequestData.scheduledDate,
        }),
      });

      if (res.success) {
        setShowEditModal(false);
        setEditRequestData(null);
        fetchData();
      } else {
        setFormError(res.message || 'Failed to update maintenance ticket');
      }
    } catch (err) {
      setFormError('Network error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance ticket?')) return;
    try {
      const res = await apiCall(`/api/v1/maintenance/${id}`, {
        method: 'DELETE',
      });
      if (res.success) {
        fetchData();
      } else {
        alert(res.message || 'Failed to delete maintenance ticket');
      }
    } catch (err) {
      console.error(err);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Maintenance Tickets</h1>
          <p className="text-slate-500 mt-1">Schedule servicing, resolve breakdown reports, and track repair billing logs.</p>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-semibold py-2.5 px-5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          Schedule Servicing
        </button>
      </div>

      {/* Grid List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            No active maintenance requests scheduled.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider font-sans">
                  <th className="py-4 px-6">Asset Name / Code</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Scheduled Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {requests.map((req) => {
                  // Badges color code
                  let priorityColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (req.priority === 'high') priorityColor = 'bg-orange-50 text-orange-700 border-orange-100';
                  if (req.priority === 'critical') priorityColor = 'bg-red-50 text-red-700 border-red-100';
                  if (req.priority === 'low') priorityColor = 'bg-slate-50 text-slate-500 border-slate-100';

                  let statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (req.status === 'open') statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (req.status === 'assigned') statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                  if (req.status === 'in_progress') statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                  if (req.status === 'resolved') statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';

                  return (
                    <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-800 block">{req.assetId?.name || 'Retired Asset'}</span>
                        <span className="text-xs font-mono font-bold text-slate-400 block mt-0.5">
                          {req.assetId?.assetCode || 'N/A'} - {req.assetId?.categoryId?.name || ''}
                        </span>
                      </td>
                      <td className="py-4 px-6 capitalize">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          req.type === 'preventive' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                          {req.type}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityColor} capitalize`}>
                          {req.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate" title={req.description}>
                        {req.description}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(req.scheduledDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColor} capitalize`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user?.role !== 'employee' && (
                            <>
                              <button
                                onClick={() => handleOpenEditRequest(req)}
                                title="Edit Maintenance Ticket"
                                className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteRequest(req._id)}
                                title="Delete Maintenance Ticket"
                                className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}

                          {user?.role !== 'employee' && req.status === 'open' && (
                            <button
                              onClick={() => handleUpdateStatus(req._id, 'assigned')}
                              className="text-xs bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Assign Staff
                            </button>
                          )}

                          {user?.role !== 'employee' && req.status === 'assigned' && (
                            <button
                              onClick={() => handleUpdateStatus(req._id, 'in_progress')}
                              className="text-xs bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Start Repair
                            </button>
                          )}

                          {user?.role !== 'employee' && ['assigned', 'in_progress', 'open'].includes(req.status) && (
                            <button
                              onClick={() => handleOpenResolve(req)}
                              className="text-xs bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          
                          {req.status === 'resolved' && (
                            <span className="text-xs text-slate-400 italic font-semibold">Completed</span>
                          )}
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

      {/* --- MODALS --- */}

      {/* Schedule Maintenance Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Schedule Asset Servicing</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleRequest} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Target Asset</label>
                <select
                  required
                  value={newRequest.assetId}
                  onChange={(e) => setNewRequest({ ...newRequest, assetId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                >
                  <option value="">Select Asset...</option>
                  {assets.map((a) => (
                    <option key={a._id} value={a._id}>{a.name} ({a.assetCode}) - Status: {a.status}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Request Type</label>
                  <select
                    value={newRequest.type}
                    onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                  >
                    <option value="corrective">Corrective (Breakdown)</option>
                    <option value="preventive">Preventive (Routine)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={newRequest.scheduledDate}
                  onChange={(e) => setNewRequest({ ...newRequest, scheduledDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Problem Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Describe the issues, symptoms, or preventive check items..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule servicing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Maintenance Modal */}
      {showResolveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Complete Repair & Log Invoice</h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteResolve} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div><span className="font-semibold text-slate-400 uppercase">Target Asset:</span> <span className="font-bold text-slate-700">{selectedRequest.assetId?.name}</span></div>
                <div><span className="font-semibold text-slate-400 uppercase">Issue Reported:</span> <p className="mt-0.5 text-slate-600 italic leading-relaxed">"{selectedRequest.description}"</p></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Incurred Cost ($)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 150"
                  value={resolution.cost}
                  onChange={(e) => setResolution({ ...resolution, cost: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Technician Findings</label>
                <textarea
                  required
                  rows="2"
                  placeholder="What was the core fault or component breakdown findings?"
                  value={resolution.findings}
                  onChange={(e) => setResolution({ ...resolution, findings: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actions Taken</label>
                <textarea
                  required
                  rows="2"
                  placeholder="Describe repair actions, replacement items, or components cleaned..."
                  value={resolution.actionsTaken}
                  onChange={(e) => setResolution({ ...resolution, actionsTaken: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Logging Resolution...' : 'Resolve Ticket & Trigger AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Maintenance Ticket Modal */}
      {showEditModal && editRequestData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Maintenance Ticket</h3>
                <p className="text-xs text-slate-400">Target Asset: {editRequestData.assetName} ({editRequestData.assetCode})</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRequest} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority</label>
                  <select
                    value={editRequestData.priority}
                    onChange={(e) => setEditRequestData({ ...editRequestData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none capitalize"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={editRequestData.status}
                    onChange={(e) => setEditRequestData({ ...editRequestData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-700 text-sm focus:outline-none capitalize"
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={editRequestData.scheduledDate}
                  onChange={(e) => setEditRequestData({ ...editRequestData, scheduledDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description / Issue Summary</label>
                <textarea
                  required
                  rows="3"
                  value={editRequestData.description}
                  onChange={(e) => setEditRequestData({ ...editRequestData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
