import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Tag, Users, Contact, Plus, RefreshCw, 
  Mail, Phone, MapPin, Hash, Briefcase, Key, ShieldAlert 
} from 'lucide-react';

export default function OrganizationSetup() {
  const { apiCall } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('departments');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Lists state
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]); // Registered login accounts

  // Form submits state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });
  const [catForm, setCatForm] = useState({ name: '', code: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', contactEmail: '', phone: '', address: '' });
  
  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({ name: '', employeeId: '', email: '', departmentId: '' });
  const [createAccount, setCreateAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('password123');
  const [userRole, setUserRole] = useState('employee'); // employee | asset_manager

  const fetchData = async () => {
    setRefreshing(true);
    setError('');
    try {
      const [deptRes, catRes, vendRes, empRes, userRes] = await Promise.all([
        apiCall('/api/v1/lookups/departments'),
        apiCall('/api/v1/lookups/categories'),
        apiCall('/api/v1/lookups/vendors'),
        apiCall('/api/v1/lookups/employees'),
        apiCall('/api/v1/auth/users')
      ]);

      if (deptRes.success) setDepartments(deptRes.data);
      if (catRes.success) setCategories(catRes.data);
      if (vendRes.success) setVendors(vendRes.data);
      if (empRes.success) setEmployees(empRes.data);
      if (userRes.success) setUsers(userRes.data);
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

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await apiCall('/api/v1/lookups/departments', {
        method: 'POST',
        body: JSON.stringify(deptForm)
      });
      if (res.success) {
        setDeptForm({ name: '', code: '' });
        fetchData();
      } else {
        setError(res.message || 'Failed to create department');
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
    try {
      const res = await apiCall('/api/v1/lookups/categories', {
        method: 'POST',
        body: JSON.stringify(catForm)
      });
      if (res.success) {
        setCatForm({ name: '', code: '' });
        fetchData();
      } else {
        setError(res.message || 'Failed to create category');
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
    try {
      const res = await apiCall('/api/v1/lookups/vendors', {
        method: 'POST',
        body: JSON.stringify(vendorForm)
      });
      if (res.success) {
        setVendorForm({ name: '', contactEmail: '', phone: '', address: '' });
        fetchData();
      } else {
        setError(res.message || 'Failed to create vendor');
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
      if (createAccount) {
        // Create BOTH Employee Profile AND User Login Credentials
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
        // Create Employee Profile ONLY
        res = await apiCall('/api/v1/lookups/employees', {
          method: 'POST',
          body: JSON.stringify(employeeForm)
        });
      }

      if (res.success) {
        setEmployeeForm({ name: '', employeeId: '', email: '', departmentId: '' });
        setCreateAccount(false);
        setUserPassword('password123');
        setUserRole('employee');
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

  const subTabs = [
    { id: 'departments', label: 'Departments', icon: Briefcase },
    { id: 'categories', label: 'Asset Categories', icon: Tag },
    { id: 'vendors', label: 'Suppliers & Vendors', icon: Building2 },
    { id: 'employees', label: 'Employees & Staff', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Setup</h1>
          <p className="text-slate-500 mt-1">Configure departments, classifications, vendors, and manage staff login accounts.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Sub-tab Selection */}
      <div className="flex border-b border-slate-200 gap-6">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setError('');
              }}
              className={`flex items-center gap-2 pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content grid containing list on the left and form on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: lists */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          
          {/* Departments View */}
          {activeSubTab === 'departments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Department Name</th>
                    <th className="py-4 px-6">System Code</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {departments.map((dept) => (
                    <tr key={dept._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold">{dept.name}</td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-500">{dept.code}</td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="2">No departments registered.</td></tr>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {categories.map((cat) => (
                    <tr key={cat._id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6 font-semibold">{cat.name}</td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-500">{cat.code}</td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="2">No categories registered.</td></tr>
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
                    <th className="py-4 px-6">Supplier Name</th>
                    <th className="py-4 px-6">Email / Phone</th>
                    <th className="py-4 px-6">Address</th>
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
                      <td className="py-4 px-6 text-xs text-slate-500 truncate max-w-[180px]">{vend.address || 'N/A'}</td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="3">No suppliers registered.</td></tr>
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
                      </tr>
                    );
                  })}
                  {employees.length === 0 && (
                    <tr><td className="py-8 px-6 text-center text-slate-400 italic" colSpan="5">No employees registered.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right pane: form */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm h-fit">
          
          {/* Add Department Form */}
          {activeSubTab === 'departments' && (
            <form onSubmit={handleAddDepartment} className="space-y-4">
              <h3 className="text-md font-bold text-slate-800 mb-2">Create Department</h3>
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
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Department
              </button>
            </form>
          )}

          {/* Add Category Form */}
          {activeSubTab === 'categories' && (
            <form onSubmit={handleAddCategory} className="space-y-4">
              <h3 className="text-md font-bold text-slate-800 mb-2">Create Category</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Network Servers"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">System Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NET-SRV"
                  value={catForm.code}
                  onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </button>
            </form>
          )}

          {/* Add Vendor Form */}
          {activeSubTab === 'vendors' && (
            <form onSubmit={handleAddVendor} className="space-y-4">
              <h3 className="text-md font-bold text-slate-800 mb-2">Register Vendor</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Supplier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Enterprise Sales"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-fade-in"
              >
                <Plus className="h-4 w-4" />
                Register Vendor
              </button>
            </form>
          )}

          {/* Add Employee Form */}
          {activeSubTab === 'employees' && (
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <h3 className="text-md font-bold text-slate-800 mb-2">Register Employee</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jdoe@company.com"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              
              {!createAccount && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID (Unique)</label>
                  <input
                    type="text"
                    required={!createAccount}
                    placeholder="e.g. EMP-102"
                    value={employeeForm.employeeId}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-sm focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 font-sans">Department</label>
                <select
                  required
                  value={employeeForm.departmentId}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-750 text-sm focus:outline-none"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <span className="text-[10px] text-red-500 block mt-1">Please register a department first.</span>
                )}
              </div>

              {/* Login Account Provision Option */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3.5">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold">Create System Login Account</span>
                </label>

                {createAccount && (
                  <div className="space-y-3 pt-2 border-t border-slate-200/50 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Access Role Level</label>
                      <select
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-705 focus:outline-none"
                      >
                        <option value="employee">Employee (Read-only own assets)</option>
                        <option value="asset_manager">Asset Manager (Manage inventories)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Access Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Default password"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || departments.length === 0}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-4 rounded-xl text-xs flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {createAccount ? 'Provision User Account' : 'Register Employee'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
