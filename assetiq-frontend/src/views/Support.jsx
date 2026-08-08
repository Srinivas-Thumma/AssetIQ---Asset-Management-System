import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import CustomSelect from '../components/ui/CustomSelect';
import {
  LifeBuoy, MessageSquare, Plus, Send, Shield, X, Building2, User,
  Package, Wrench, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock,
  Tag, MapPin, Activity, Settings, RefreshCw
} from 'lucide-react';

export default function Support() {
  const { user, apiCall } = useAuth();
  const { socket } = useSocket();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminOrManager = ['super_admin', 'org_admin', 'asset_manager'].includes(user?.role);

  // Main state
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [otherUserTyping, setOtherUserTyping] = useState(null);

  // Maintenance Repair Modal state (Admin Action)
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairVendor, setRepairVendor] = useState('');
  const [repairDate, setRepairDate] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [updatingRepair, setUpdatingRepair] = useState(false);

  // New Ticket Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newType, setNewType] = useState('internal');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [orgAdmins, setOrgAdmins] = useState([]);
  const [newRecipientId, setNewRecipientId] = useState('');
  const [newAssetId, setNewAssetId] = useState('');
  const [newIssueType, setNewIssueType] = useState('hardware_damage');
  const [newPriority, setNewPriority] = useState('medium');
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orgUsers, setOrgUsers] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch My Support Tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/api/v1/support');
      if (res.success) {
        setTickets(res.data || []);
        if (res.data && res.data.length > 0 && !selectedTicket) {
          setSelectedTicket(res.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch org users (Admins, Managers, Employees)
  const fetchOrgUsers = async () => {
    if (isSuperAdmin) return;
    try {
      const res = await apiCall('/api/v1/auth/users');
      if (res.success) {
        const filtered = (res.data || []).filter((u) => u._id !== user._id);
        const rolePriority = { org_admin: 1, asset_manager: 2, employee: 3 };
        filtered.sort((a, b) => (rolePriority[a.role] || 4) - (rolePriority[b.role] || 4));
        setOrgUsers(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch org users:', err.message);
    }
  };

  // Fetch available assets for ticket creation (assigned to user if employee, or org assets)
  const fetchAvailableAssets = async () => {
    if (isSuperAdmin) return;
    try {
      const endpoint = user?.role === 'employee' 
        ? `/api/v1/assets?assignedTo=${user.employeeRef || user._id}`
        : '/api/v1/assets';
      const res = await apiCall(endpoint);
      if (res.success) {
        setAvailableAssets(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch available assets for ticket:', err.message);
    }
  };

  // Fetch all organizations for Super Admin dropdown
  const fetchOrganizations = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await apiCall('/api/v1/support/organizations');
      if (res.success) {
        setOrganizations(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedOrgId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err.message);
    }
  };

  // Fetch Org Admins whenever Super Admin changes selectedOrgId
  useEffect(() => {
    if (!isSuperAdmin || !selectedOrgId) return;

    const fetchAdmins = async () => {
      try {
        const res = await apiCall(`/api/v1/support/org-admins/${selectedOrgId}`);
        if (res.success) {
          setOrgAdmins(res.data || []);
          if (res.data && res.data.length > 0) {
            setNewRecipientId(res.data[0]._id);
          } else {
            setNewRecipientId('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch org admins:', err.message);
      }
    };

    fetchAdmins();
  }, [selectedOrgId, isSuperAdmin]);

  useEffect(() => {
    fetchTickets();
    if (isSuperAdmin) {
      fetchOrganizations();
    } else {
      fetchOrgUsers();
      fetchAvailableAssets();
    }
  }, [isSuperAdmin]);

  // Fetch Message History and Join Socket Room when selectedTicket changes
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      setOtherUserTyping(null);
      return;
    }

    const fetchMessages = async () => {
      try {
        setMessagesLoading(true);
        const res = await apiCall(`/api/v1/support/${selectedTicket._id}/messages`);
        if (res.success) {
          setMessages(res.data.messages || []);
          if (res.data.ticket) {
            setSelectedTicket(res.data.ticket);
          }
        }
      } catch (err) {
        console.error('Failed to fetch support messages:', err.message);
      } finally {
        setMessagesLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchMessages();

    if (socket) {
      socket.emit('support:join', { ticketId: selectedTicket._id });
    }
  }, [selectedTicket?._id, socket]);

  // Real-time Socket Message & Typing Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (selectedTicket && newMsg.ticketId === selectedTicket._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });

        if (selectedTicket.status === 'resolved') {
          setSelectedTicket((prev) => (prev ? { ...prev, status: 'in_progress' } : prev));
        }

        setTimeout(scrollToBottom, 50);
      }

      setTickets((prev) =>
        prev.map((t) =>
          t._id === newMsg.ticketId
            ? { ...t, updatedAt: new Date().toISOString(), status: t.status === 'resolved' ? 'in_progress' : t.status }
            : t
        )
      );
    };

    const handleUserTyping = ({ ticketId, userEmail, isTyping }) => {
      if (selectedTicket && ticketId === selectedTicket._id && userEmail !== user?.email) {
        setOtherUserTyping(isTyping ? userEmail.split('@')[0] : null);
      }
    };

    const handleSupportError = ({ ticketId, message }) => {
      console.error(`Support Socket Error on Ticket [${ticketId}]:`, message);
    };

    socket.on('support:message', handleNewMessage);
    socket.on('support:user_typing', handleUserTyping);
    socket.on('support:error', handleSupportError);

    return () => {
      socket.off('support:message', handleNewMessage);
      socket.off('support:user_typing', handleUserTyping);
      socket.off('support:error', handleSupportError);
    };
  }, [socket, selectedTicket, user?.email]);

  // Input change handler emitting typing indicators
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessageInput(val);

    if (socket && selectedTicket) {
      socket.emit('support:typing', { ticketId: selectedTicket._id, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('support:typing', { ticketId: selectedTicket._id, isTyping: false });
      }, 2000);
    }
  };

  // Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedTicket || sending) return;

    const text = messageInput.trim();
    setMessageInput('');
    setSending(true);

    if (socket && selectedTicket) {
      socket.emit('support:typing', { ticketId: selectedTicket._id, isTyping: false });
    }

    if (socket && socket.connected) {
      socket.emit('support:message', {
        ticketId: selectedTicket._id,
        message: text,
      });
      setSending(false);
    } else {
      try {
        const res = await apiCall(`/api/v1/support/${selectedTicket._id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ message: text }),
        });
        if (res.success) {
          fetchTickets();
        }
      } catch (err) {
        console.error('Failed to send support message:', err.message);
      } finally {
        setSending(false);
      }
    }
  };

  // Create New Support Ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMessage.trim()) return;

    if (!isSuperAdmin && newType === 'internal' && !newRecipientId) {
      alert('Please select an Organization recipient to message');
      return;
    }

    if (isSuperAdmin && !newRecipientId) {
      alert('Please select an Organization Admin to message');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        subject: newSubject.trim(),
        initialMessage: newInitialMessage.trim(),
        recipientId: newRecipientId,
        assetId: newAssetId || undefined,
        issueType: newIssueType,
        priority: newPriority,
      };

      if (isSuperAdmin) {
        payload.organizationId = selectedOrgId;
      } else {
        payload.type = newType;
      }

      const res = await apiCall('/api/v1/support', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setShowNewModal(false);
        setNewSubject('');
        setNewInitialMessage('');
        setNewRecipientId('');
        setNewAssetId('');
        await fetchTickets();
        if (res.data?.ticket) {
          setSelectedTicket(res.data.ticket);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Ticket Status & Smart Asset Restoration
  const handleStatusChange = async (newStatus, assetAction = 'restore') => {
    if (!selectedTicket || (selectedTicket.status === newStatus && !assetAction)) return;

    try {
      const res = await apiCall(`/api/v1/support/${selectedTicket._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, assetAction }),
      });

      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setTickets((prev) =>
          prev.map((t) => (t._id === selectedTicket._id ? res.data : t))
        );
        // Refresh messages list to show system audit entry
        const msgRes = await apiCall(`/api/v1/support/${selectedTicket._id}/messages`);
        if (msgRes.success) {
          setMessages(msgRes.data.messages || []);
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err.message);
    }
  };

  // Submit Schedule Repair Details (Admin Action)
  const handleSaveRepairDetails = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setUpdatingRepair(true);
      const res = await apiCall(`/api/v1/support/${selectedTicket._id}/repair`, {
        method: 'PATCH',
        body: JSON.stringify({
          vendorName: repairVendor,
          scheduledDate: repairDate,
          estimatedCost: Number(repairCost) || 0,
        }),
      });

      if (res.success && res.data) {
        setSelectedTicket(res.data);
        setShowRepairModal(false);
        // Refresh messages list to display system audit entry
        const msgRes = await apiCall(`/api/v1/support/${selectedTicket._id}/messages`);
        if (msgRes.success) {
          setMessages(msgRes.data.messages || []);
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to update repair details');
    } finally {
      setUpdatingRepair(false);
    }
  };

  // Open Repair Modal with prefilled values
  const openRepairModal = () => {
    if (!selectedTicket) return;
    setRepairVendor(selectedTicket.vendorName || '');
    setRepairDate(selectedTicket.scheduledDate ? new Date(selectedTicket.scheduledDate).toISOString().split('T')[0] : '');
    setRepairCost(selectedTicket.estimatedCost ? String(selectedTicket.estimatedCost) : '');
    setShowRepairModal(true);
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    if (typeFilter === 'platform_support') return t.type === 'platform_support';
    if (typeFilter === 'internal') return t.type === 'internal';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">OPEN</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">IN PROGRESS</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">RESOLVED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600">{status?.toUpperCase()}</span>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">CRITICAL</span>;
      case 'high':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">HIGH</span>;
      case 'medium':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">MEDIUM</span>;
      case 'low':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">LOW</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">{priority?.toUpperCase() || 'MEDIUM'}</span>;
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'platform_support') {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200">Platform Support</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">Organization</span>;
  };

  const getAssetStatusBadge = (status) => {
    switch (status) {
      case 'under_maintenance':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">UNDER MAINTENANCE</span>;
      case 'damaged':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200">DAMAGED</span>;
      case 'assigned':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200">ASSIGNED</span>;
      case 'available':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">AVAILABLE</span>;
      case 'retired':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">RETIRED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">{status?.toUpperCase()}</span>;
    }
  };

  const getReadableRole = (role) => {
    switch (role) {
      case 'org_admin': return 'Organization Admin';
      case 'asset_manager': return 'Asset Manager';
      case 'employee': return 'Employee';
      case 'super_admin': return 'Platform Super Admin';
      default: return role;
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col bg-slate-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isSuperAdmin ? 'Platform Helpdesk & Org Admin Messaging' : 'Enterprise Asset Support & Helpdesk'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Direct 1:1 messaging with tenant Organization Admins' : 'IT hardware ticket lifecycle management, maintenance scheduling, and activity logs'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {isSuperAdmin ? 'Message Org Admin' : 'New Ticket'}
        </button>
      </div>

      {/* Main Content Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Ticket List */}
        <div className="w-80 md:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Type Filter Tabs */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex gap-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'all' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setTypeFilter('internal')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'internal' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Organization
            </button>
            <button
              onClick={() => setTypeFilter('platform_support')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                typeFilter === 'platform_support' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Platform
            </button>
          </div>

          {/* Ticket Cards */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading support tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">No support tickets found</p>
                <p className="text-[11px]">Click "{isSuperAdmin ? 'Message Org Admin' : 'New Ticket'}" above to start a conversation</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?._id === ticket._id;
                const otherParty = ticket.raisedBy?._id === user?._id ? ticket.recipientId : ticket.raisedBy;
                const orgName = ticket.organizationId?.name;
                const ticketCode = `TKT-${ticket._id.slice(-4).toUpperCase()}`;

                return (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected ? 'bg-purple-50/70 border-l-4 border-purple-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{ticketCode}</span>
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-1">{ticket.subject}</h4>

                    {ticket.assetId && (
                      <div className="flex items-center gap-1 text-[11px] text-purple-700 font-semibold mb-1">
                        <Package className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ticket.assetId.name} ({ticket.assetId.assetCode})</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mt-2">
                      <span className="truncate max-w-[170px]">
                        With: <strong className="text-slate-700">{otherParty?.email ? otherParty.email.split('@')[0] : 'Support'}</strong>
                        {orgName && <span className="text-[10px] text-purple-600 block truncate">({orgName})</span>}
                      </span>
                      <span>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Content Panel: Enterprise Split Screen */}
        <div className="flex-1 flex flex-col bg-slate-100/60 overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Structured Enterprise Ticket Top Banner */}
              <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-black rounded bg-purple-900 text-white tracking-wider">
                      TKT-{selectedTicket._id.slice(-4).toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h3>
                    {getTypeBadge(selectedTicket.type)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <span>Priority: {getPriorityBadge(selectedTicket.priority)}</span>
                    <span>•</span>
                    <span>Status: {getStatusBadge(selectedTicket.status)}</span>
                    <span>•</span>
                    <span>Issue: <strong className="text-slate-700 uppercase">{selectedTicket.issueType?.replace('_', ' ') || 'GENERAL'}</strong></span>
                  </div>
                </div>

                {/* Status Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Status:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="open">OPEN</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Enterprise Split View: Left Meta Cards (Asset & Repair) | Right Activity Thread */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Meta Cards Pane */}
                <div className="w-80 md:w-96 bg-white border-r border-slate-200 p-5 overflow-y-auto custom-scrollbar space-y-5 shrink-0">
                  {/* 📦 LINKED ASSET DETAILS Card */}
                  {selectedTicket.assetId ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <Package className="h-4 w-4 text-purple-600" />
                          LINKED ASSET DETAILS
                        </h4>
                        {getAssetStatusBadge(selectedTicket.assetId.status)}
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Asset Name:</span>
                          <strong className="text-slate-900 font-bold">{selectedTicket.assetId.name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Asset Code:</span>
                          <span className="font-mono text-purple-700 font-bold">{selectedTicket.assetId.assetCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Serial Number:</span>
                          <span className="font-mono text-slate-700 font-semibold">{selectedTicket.assetId.serialNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Assigned To:</span>
                          <span className="text-slate-800 font-bold">
                            {selectedTicket.assetId.assignedTo
                              ? selectedTicket.assetId.assignedTo.name || selectedTicket.assetId.assignedTo.email
                              : 'Unassigned (Inventory)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Category:</span>
                          <span className="text-slate-700 font-semibold">{selectedTicket.assetId.categoryId?.name || 'General'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Purchase Value:</span>
                          <span className="text-slate-900 font-bold">${selectedTicket.assetId.purchasePrice || 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Edge Case 3: Graceful Platform Support Card */
                    <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                        <Shield className="h-4 w-4 text-purple-600 shrink-0" />
                        Platform / General Inquiry
                      </div>
                      <p className="text-xs text-purple-700 font-medium leading-relaxed">
                        No physical hardware asset is linked to this ticket. This is a direct general support or administrative inquiry thread.
                      </p>
                    </div>
                  )}

                  {/* 🛠️ MAINTENANCE & REPAIR DETAILS Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-purple-600" />
                        MAINTENANCE / REPAIR
                      </h4>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Technician / Vendor:</span>
                        <strong className="text-slate-900">{selectedTicket.vendorName || 'Not Assigned'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Scheduled Date:</span>
                        <span className="text-slate-800 font-semibold">
                          {selectedTicket.scheduledDate ? new Date(selectedTicket.scheduledDate).toLocaleDateString() : 'Not Scheduled'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Estimated Cost:</span>
                        <strong className="text-emerald-700 font-bold">${selectedTicket.estimatedCost || 0}.00</strong>
                      </div>
                    </div>
                  </div>

                  {/* 🕹️ ADMIN / MANAGER ACTIONS Panel */}
                  {isAdminOrManager && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Admin Controls</h4>
                      
                      <button
                        onClick={openRepairModal}
                        className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        Schedule Repair / Cost
                      </button>

                      {selectedTicket.assetId && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleStatusChange('resolved', 'restore')}
                            className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Resolve & Restore
                          </button>

                          <button
                            onClick={() => handleStatusChange('resolved', 'retire')}
                            className="py-2 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                          >
                            <X className="h-3.5 w-3.5" />
                            Resolve & Retire
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Chat & Activity Audit Stream Pane */}
                <div className="flex-1 flex flex-col bg-slate-100/60 overflow-hidden">
                  <div className="px-6 py-2 bg-slate-200/50 border-b border-slate-200 text-[11px] font-bold text-slate-600 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-purple-600" />
                    ACTIVITY & DISCUSSION HISTORY
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {messagesLoading ? (
                      <div className="text-center py-12 text-xs text-slate-400">Loading activity history...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400">No activity yet. Send a message below.</div>
                    ) : (
                      messages.map((msg) => {
                        // Render System Event Audit Cards
                        if (msg.isSystemEvent) {
                          return (
                            <div key={msg._id} className="flex justify-center my-3">
                              <div className="bg-purple-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md border border-purple-800 max-w-lg text-center flex items-center gap-2">
                                <Activity className="h-4 w-4 text-purple-300 shrink-0" />
                                <span>{msg.message}</span>
                              </div>
                            </div>
                          );
                        }

                        // Render User Discussion Speech Bubbles
                        const senderIdStr = typeof msg.senderId === 'object' && msg.senderId !== null ? msg.senderId._id?.toString() : msg.senderId?.toString();
                        const userIdStr = user?._id?.toString();
                        const isSelf = Boolean(senderIdStr && userIdStr && senderIdStr === userIdStr);

                        return (
                          <div
                            key={msg._id}
                            className={`flex flex-col w-full ${isSelf ? 'items-end' : 'items-start'}`}
                          >
                            <div className={`flex items-center gap-2 mb-1 px-1 text-[11px] ${isSelf ? 'justify-end' : 'justify-start'}`}>
                              <span className="font-bold text-slate-700">{isSelf ? 'You' : msg.senderName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold uppercase">{getReadableRole(msg.senderRole)}</span>
                              <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            <div
                              className={`max-w-md px-4 py-2.5 text-xs font-medium leading-relaxed shadow-sm ${
                                isSelf
                                  ? 'bg-purple-600 text-white rounded-2xl rounded-tr-none'
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none'
                              }`}
                            >
                              {msg.message}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {otherUserTyping && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 animate-pulse px-3 py-1.5 bg-purple-50 border border-purple-100 rounded-xl w-fit">
                        <span className="h-2 w-2 rounded-full bg-purple-600 animate-ping" />
                        {otherUserTyping} is typing...
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={handleInputChange}
                      placeholder={selectedTicket.status === 'resolved' ? "Sending a message will re-open this ticket..." : "Type your message or discussion note..."}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <LifeBuoy className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-700">Select a Support Ticket</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">Choose a ticket from the left panel to inspect asset meta data, maintenance schedules, or discussion logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Repair Modal (Admin Action) */}
      {showRepairModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowRepairModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-purple-400" />
                Schedule Maintenance & Repair
              </h3>
              <button onClick={() => setShowRepairModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRepairDetails} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Technician / Vendor Name</label>
                <input
                  type="text"
                  required
                  value={repairVendor}
                  onChange={(e) => setRepairVendor(e.target.value)}
                  placeholder="e.g. Apple Service Center / Dell Support"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Scheduled Service Date</label>
                <input
                  type="date"
                  required
                  value={repairDate}
                  onChange={(e) => setRepairDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimated Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={repairCost}
                  onChange={(e) => setRepairCost(e.target.value)}
                  placeholder="250.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRepairModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRepair}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {updatingRepair ? 'Saving...' : 'Save & Log Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-purple-400" />
                {isSuperAdmin ? 'Message Organization Admin' : 'New Enterprise Support Ticket'}
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              {isSuperAdmin ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Organization</label>
                    <CustomSelect
                      placeholder="Select Organization..."
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      options={organizations.map((o) => ({
                        value: o._id,
                        label: `${o.name} (${o.slug})`,
                        icon: <Building2 className="h-4 w-4" />,
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Org Admin</label>
                    <CustomSelect
                      placeholder={orgAdmins.length === 0 ? "No Org Admins found" : "Select Org Admin..."}
                      value={newRecipientId}
                      onChange={(e) => setNewRecipientId(e.target.value)}
                      disabled={orgAdmins.length === 0}
                      options={orgAdmins.map((a) => ({
                        value: a._id,
                        label: `${a.email} (${a.name || 'Org Admin'})`,
                        icon: <User className="h-4 w-4" />,
                      }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Request Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewType('internal')}
                        className={`p-3 rounded-xl border text-left flex flex-col cursor-pointer transition-all ${
                          newType === 'internal' ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold">Organization</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Message admin or manager</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewType('platform_support')}
                        className={`p-3 rounded-xl border text-left flex flex-col cursor-pointer transition-all ${
                          newType === 'platform_support' ? 'border-purple-600 bg-purple-50/50 text-purple-900 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs font-bold">Platform Support</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Contact Super Admin</span>
                      </button>
                    </div>
                  </div>

                  {newType === 'internal' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Recipient</label>
                      <CustomSelect
                        placeholder="Select Admin, Manager, or Colleague..."
                        value={newRecipientId}
                        onChange={(e) => setNewRecipientId(e.target.value)}
                        options={orgUsers.map((u) => ({
                          value: u._id,
                          label: `${u.email} — [${getReadableRole(u.role)}]`,
                        }))}
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-600 shrink-0" />
                      Auto-assigned to Platform Super Admin
                    </div>
                  )}

                  {/* Select Linked Asset */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Select Linked Hardware Asset (Optional)
                    </label>
                    <CustomSelect
                      placeholder="Select Hardware Asset (e.g. MacBook, Monitor)..."
                      value={newAssetId}
                      onChange={(e) => setNewAssetId(e.target.value)}
                      options={[
                        { value: '', label: 'None / General Support' },
                        ...availableAssets.map((a) => ({
                          value: a._id,
                          label: `${a.name} (${a.assetCode}) — [${a.status.toUpperCase()}]`,
                          icon: <Package className="h-4 w-4 text-purple-600" />,
                        })),
                      ]}
                    />
                  </div>

                  {/* Issue Type & Priority Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Issue Type</label>
                      <select
                        value={newIssueType}
                        onChange={(e) => setNewIssueType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                      >
                        <option value="hardware_damage">Hardware Damage</option>
                        <option value="software_issue">Software Issue</option>
                        <option value="lost_stolen">Lost / Stolen</option>
                        <option value="general">General Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                      >
                        <option value="low">LOW</option>
                        <option value="medium">MEDIUM</option>
                        <option value="high">HIGH</option>
                        <option value="critical">CRITICAL</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. MacBook Pro M2 Screen Flickering & Cracked"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Initial Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message Description</label>
                <textarea
                  required
                  rows={4}
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  placeholder="Describe the issue, damage details, or assistance required..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (!isSuperAdmin && newType === 'internal' && !newRecipientId) || (isSuperAdmin && !newRecipientId)}
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Creating Ticket...' : 'Submit Enterprise Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
