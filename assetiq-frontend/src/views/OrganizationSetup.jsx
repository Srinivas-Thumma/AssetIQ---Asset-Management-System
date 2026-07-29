import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Tag, Users, Contact, Plus, RefreshCw, 
  Mail, Phone, MapPin, Hash, Briefcase, Key, ShieldAlert, Edit2, Trash2, X, Eye, EyeOff 
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';

export default function OrganizationSetup({ initialSubTab = 'departments', onSubTabChange }) {
  const { apiCall, user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lists state
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]); // Registered login accounts
  const [allAssets, setAllAssets] = useState([]); // All organization assets

  // Eye view modal state
  const [viewingEntity, setViewingEntity] = useState(null); // { type: 'vendor' | 'employee', data, assets: [] }

  // Form submits state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Editing state
  const [editId, setEditId] = useState('');

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [catForm, setCatForm] = useState({ name: '', code: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contactEmail: '', phone: '', address: '' });
  
  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({ name: '', employeeId: '', email: '', departmentId: '' });
  const [createAccount, setCreateAccount] = useState(true);
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('employee'); // employee | asset_manager
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    setError('');
    try {
      const [deptRes, catRes, vendRes, empRes, userRes, assetRes] = await Promise.all([
        apiCall('/api/v1/lookups/departments'),
        apiCall('/api/v1/lookups/categories'),
        apiCall('/api/v1/lookups/vendors'),
        apiCall('/api/v1/lookups/employees'),
        apiCall('/api/v1/auth/users'),
        apiCall('/api/v1/assets')
      ]);

      if (deptRes.success) setDepartments(deptRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (vendRes.success) setVendors(vendRes.data);
      if (empRes.success) setEmployees(empRes.data);
      if (userRes.success) setUsers(userRes.data);
      if (assetRes.success) setAllAssets(assetRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch lookup configurations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCancelEdit = () => {
    setEditId('');
    setDeptForm({ name: '', code: '' });
    setCatForm({ name: '', code: '' });
    setVendorForm({ name: '', contactEmail: '', phone: '', address: '' });
    setEmployeeForm({ name: '', employeeId: '', email: '', departmentId: '' });
    setCreateAccount(false);
    setUserPassword('password123');
    setUserRole('employee');
    setError('');
  };

  const handleEditInit = (type, item) => {
    setError('');
    setEditId(item._id);
    if (type === 'departments') {
      setDeptForm({ name: item.name, code: item.code });
    } else if (type === 'categories') {
      setCatForm({ name: item.name, code: item.code });
    } else if (type === 'vendors') {
      setVendorForm({ 
        name: item.name, 
        contactEmail: item.contactEmail || '', 
        phone: item.phone || '', 
        address: item.address || '' 
      });
    } else if (type === 'employees') {
      setEmployeeForm({ 
        name: item.name, 
        employeeId: item.employeeId, 
        email: item.email, 
        departmentId: item.departmentId?._id || item.departmentId || '' 
      });
      setCreateAccount(false); // Can't add login account via edit employee
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.slice(0,-1)}? This cannot be undone.`)) return;
    setRefreshing(true);
    setError('');
    try {
      const res = await apiCall(`/api/v1/lookups/${type}/${id}`, {
        method: 'DELETE'
      });
      if (res.success) {
        fetchData();
      } else {
        setError(res.message || `Failed to delete from ${type}`);
      }
    } catch (err) {
      setError('A connection issue occurred.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/v1/lookups/departments/${editId}` : '/api/v1/lookups/departments';
    
    try {
      const res = await apiCall(url, {
        method,
        body: JSON.stringify(deptForm)
      });
      if (res.success) {
        handleCancelEdit();
        fetchData();
      } else {
        setError(res.message || 'Failed to submit department');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/v1/lookups/categories/${editId}` : '/api/v1/lookups/categories';
    
    try {
      const res = await apiCall(url, {
        method,
        body: JSON.stringify(catForm)
      });
      if (res.success) {
        handleCancelEdit();
        fetchData();
      } else {
        setError(res.message || 'Failed to submit category');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `/api/v1/lookups/vendors/${editId}` : '/api/v1/lookups/vendors';
    
    try {
      const res = await apiCall(url, {
        method,
        body: JSON.stringify(vendorForm)
      });
      if (res.success) {
        handleCancelEdit();
        fetchData();
      } else {
        setError(res.message || 'Failed to submit vendor');
      }
    } catch (err) {
      setError('Connection failure.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      let res;
      if (editId) {
        // Edit Employee Profile ONLY (PUT)
        res = await apiCall(`/api/v1/lookups/employees/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(employeeForm)
        });
      } else if (createAccount) {
        // Create BOTH Employee Profile AND User Login Credentials (POST)
        res = await apiCall('/api/v1/auth/users', {
          method: 'POST',
          body: JSON.stringify({
            name: employeeForm.name,
            email: employeeForm.email,
            password: userPassword,
            role: userRole,
            departmentId: employeeForm.departmentId
          })
        });
      } else {
        // Create Employee Profile ONLY (POST)
        res = await apiCall('/api/v1/lookups/employees', {
          method: 'POST',
          body: JSON.stringify(employeeForm)
        });
      }

      if (res.success) {
        setShowEmployeeModal(false);
        handleCancelEdit();
        fetchData();
      } else {
        setError(res.message || 'Failed to register employee');
      }
    } catch (err) {
      setError('Connection failure.');
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

  const pageMeta = {
    departments: {
      title: 'Departments',
      subtitle: 'Configure and manage organizational departments for asset allocations.',
    },
    categories: {
      title: 'Asset Categories',
      subtitle: 'Manage asset classification categories and inventory groupings.',
    },
    vendors: {
      title: 'Suppliers & Vendors',
      subtitle: 'Manage approved hardware suppliers and vendor contacts.',
    },
    employees: {
      title: 'Employees & Staff',
      subtitle: 'Manage employee profiles, department assignments, and login accounts.',
    },
  };

  const currentMeta = pageMeta[activeSubTab] || pageMeta.departments;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{currentMeta.title}</h1>
          <p className="text-slate-500 mt-1">{currentMeta.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {activeSubTab === 'employees' && (
            <button
              onClick={() => {
                handleCancelEdit();
                setShowEmployeeModal(true);
              }}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl shadow-md cursor-pointer text-sm transition-all active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Add Employee
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-semibold animate-fade-in">
          {error}
        </div>
      )}

      {/* Content grid containing list on the left and form on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main pane: lists */}
        <div className={`${activeSubTab === 'employees' ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden`}>
          
          {/* Departments View */}
          {activeSubTab === 'departments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Department Name</th>
                    <th className="py-4 px-6">System Code</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {departments.map((dept) => (
                    <tr key={dept._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold">{dept.name}</td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-500">{dept.code}</td>
                      <td className="py-4 px-6 text-right space-x-2 shrink-0">
                        <button
                          onClick={() => handleEditInit('departments', dept)}
                          className="inline-flex p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('departments', dept._id)}
                          className="inline-flex p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="3">No departments registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Categories View */}
          {activeSubTab === 'categories' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Category Name</th>
                    <th className="py-4 px-6">System Code</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {categories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold">{cat.name}</td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-500">{cat.code}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleEditInit('categories', cat)}
                          className="inline-flex p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('categories', cat._id)}
                          className="inline-flex p-1 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="3">No categories registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Vendors View */}
          {activeSubTab === 'vendors' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Supplier</th>
                    <th className="py-4 px-6">Email / Phone</th>
                    <th className="py-4 px-6">Address</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {vendors.map((vend) => (
                    <tr key={vend._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold text-slate-800">{vend.name}</td>
                      <td className="py-4 px-6 text-slate-500 text-xs space-y-0.5">
                        <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {vend.contactEmail || 'N/A'}</div>
                        <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {vend.phone || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 truncate max-w-[150px]">{vend.address || 'N/A'}</td>
                      <td className="py-4 px-6 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            const vendorAssets = allAssets.filter(
                              (a) => String(a.vendorId?._id || a.vendorId) === String(vend._id)
                            );
                            setViewingEntity({ type: 'vendor', data: vend, assets: vendorAssets });
                          }}
                          className="inline-flex p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                          title="View Supplied Assets"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditInit('vendors', vend)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('vendors', vend._id)}
                          className="inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="4">No suppliers registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Employees View */}
          {activeSubTab === 'employees' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Staff Member</th>
                    <th className="py-4 px-6">Employee ID</th>
                    <th className="py-4 px-6">Corporate Email</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">System Access</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {employees.map((emp) => {
                    const associatedUser = users.find(
                      (u) => u.employeeRef?._id === emp._id || u.email?.toLowerCase() === emp.email?.toLowerCase()
                    );
                    
                    return (
                      <tr key={emp._id} className="hover:bg-slate-50/50">
                        <td className="py-4 px-6 font-semibold text-slate-800">{emp.name}</td>
                        <td className="py-4 px-6 font-mono text-slate-500 text-xs font-bold">{emp.employeeId}</td>
                        <td className="py-4 px-6 text-slate-600">{emp.email}</td>
                        <td className="py-4 px-6">
                          <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs">
                            {emp.departmentId?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {associatedUser ? (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${
                              associatedUser.role === 'asset_manager'
                                ? 'bg-blue-50 border-blue-100 text-blue-700'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                            } capitalize`}>
                              {associatedUser.role.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">No Login Account</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-1.5">
                          <button
                            onClick={() => {
                              const empAssets = allAssets.filter(
                                (a) =>
                                  String(a.custodianId?._id || a.custodianId) === String(emp._id) ||
                                  String(a.assignedTo?._id || a.assignedTo) === String(emp._id)
                              );
                              setViewingEntity({ type: 'employee', data: emp, assets: empAssets });
                            }}
                            className="inline-flex p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            title="View Assigned Assets"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              handleEditInit('employees', emp);
                              setShowEmployeeModal(true);
                            }}
                            className="inline-flex p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('employees', emp._id)}
                            className="inline-flex p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="6">No employees registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right pane: form (Rendered ONLY for Departments, Categories, and Vendors) */}
        {activeSubTab !== 'employees' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm h-fit">
            
            {/* Add/Edit Department Form */}
            {activeSubTab === 'departments' && (
              <form onSubmit={handleAddDepartment} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-bold text-slate-800">{editId ? 'Modify Department' : 'Create Department'}</h3>
                  {editId && (
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"><X className="h-3 w-3" /> Cancel</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operations"
                    value={deptForm.name}
                    onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">System Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. OPS"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {editId ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                  {editId ? 'Update Department' : 'Register Department'}
                </button>
              </form>
            )}

            {/* Add/Edit Category Form */}
            {activeSubTab === 'categories' && (
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-bold text-slate-800">{editId ? 'Modify Category' : 'Create Category'}</h3>
                  {editId && (
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"><X className="h-3 w-3" /> Cancel</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Laptops & Mobile"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Prefix Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAP"
                    value={catForm.code}
                    onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {editId ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                  {editId ? 'Update Category' : 'Register Category'}
                </button>
              </form>
            )}

            {/* Add/Edit Vendor Form */}
            {activeSubTab === 'vendors' && (
              <form onSubmit={handleAddVendor} className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-md font-bold text-slate-800">{editId ? 'Modify Vendor' : 'Create Vendor'}</h3>
                  {editId && (
                    <button type="button" onClick={handleCancelEdit} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-0.5"><X className="h-3 w-3" /> Cancel</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Vendor Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Logistics Ltd"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Contact Email</label>
                  <input
                    type="email"
                    placeholder="sales@supplier.com"
                    value={vendorForm.contactEmail}
                    onChange={(e) => setVendorForm({ ...vendorForm, contactEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1-555-0199"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mailing Address</label>
                  <textarea
                    rows="2"
                    placeholder="Street, City, State..."
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-850 text-sm focus:outline-none focus:border-slate-400 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-fade-in"
                >
                  {editId ? <Edit2 className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                  {editId ? 'Update Vendor' : 'Register Vendor'}
                </button>
              </form>
            )}

          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <h3 className="text-base font-bold">
                  {editId ? 'Modify Employee Profile' : 'Register New Employee'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowEmployeeModal(false);
                  handleCancelEdit();
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-101"
                    value={employeeForm.employeeId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm font-mono focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="john@company.com"
                    value={employeeForm.email}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                <CustomSelect
                  placeholder="Select Department..."
                  value={employeeForm.departmentId}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target ? e.target.value : e })}
                  options={departments.map((d) => ({
                    value: d._id,
                    label: `${d.name} (${d.code})`,
                  }))}
                />
                {departments.length === 0 && (
                  <span className="text-[11px] text-rose-500 block mt-1 font-medium">Please register a department first.</span>
                )}
              </div>

              {!editId && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Access Role Level</label>
                    <CustomSelect
                      value={userRole}
                      onChange={(e) => setUserRole(e.target ? e.target.value : e)}
                      options={[
                        {
                          value: 'employee',
                          label: 'Employee',
                          description: 'Read-only access to assigned personal assets and servicing tickets',
                          icon: <Users className="h-4 w-4 text-blue-600" />,
                        },
                        {
                          value: 'asset_manager',
                          label: 'Asset Manager',
                          description: 'Full inventory management, allocation, repair tracking, and staff controls',
                          icon: <ShieldAlert className="h-4 w-4 text-purple-600" />,
                        },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Set Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Set account password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pr-10 text-slate-800 text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmployeeModal(false);
                    handleCancelEdit();
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || departments.length === 0}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {editId ? 'Update Employee' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Holdings Eye View Modal */}
      {viewingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">
                  {viewingEntity.type === 'vendor' ? <Briefcase className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {viewingEntity.type === 'vendor'
                      ? `Assets Supplied by ${viewingEntity.data.name}`
                      : `Assets Held by ${viewingEntity.data.name}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {viewingEntity.type === 'vendor'
                      ? `Contact Email: ${viewingEntity.data.contactEmail || 'N/A'} • Phone: ${viewingEntity.data.phone || 'N/A'}`
                      : `ID: ${viewingEntity.data.employeeId} • Email: ${viewingEntity.data.email}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingEntity(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body - Assets Table */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {viewingEntity.assets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic">
                  No assets currently registered to this {viewingEntity.type === 'vendor' ? 'supplier' : 'employee'}.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Asset Code</th>
                      <th className="py-3 px-4">Asset Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Purchase Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {viewingEntity.assets.map((ast) => (
                      <tr key={ast._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{ast.assetCode}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{ast.name}</td>
                        <td className="py-3 px-4 text-slate-500">{ast.categoryId?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-500">{ast.roomId?.name || 'N/A'}</td>
                        <td className="py-3 px-4 capitalize">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            ast.status === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            ast.status === 'allocated' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            ast.status === 'under_maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            {ast.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                          ${Number(ast.purchasePrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                Total Assets: <strong className="text-slate-800">{viewingEntity.assets.length}</strong>
              </span>
              <button
                onClick={() => setViewingEntity(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
