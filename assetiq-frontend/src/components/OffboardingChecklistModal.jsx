import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OffboardingChecklistModal({ isOpen, onClose, employeeId, employeeName, onReturnAll }) {
  const { apiCall } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      setLoading(true);
      apiCall(`/api/v1/offboarding/${employeeId}`)
        .then(res => { if(res.success) setAssets(res.data); })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Offboarding: {employeeName || 'Employee'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">The following assigned assets must be collected upon offboarding:</p>
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {assets.map(asset => (
              <li key={asset._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">{asset.name} ({asset.assetCode})</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-full">Assigned</span>
              </li>
            ))}
            {!loading && assets.length === 0 && (
              <p className="text-sm text-slate-500 italic py-4 text-center">No assets currently assigned to this employee.</p>
            )}
          </ul>
        </div>
        
        <button 
          disabled={loading || assets.length === 0}
          onClick={async () => {
            setLoading(true);
            await onReturnAll(employeeId);
            setLoading(false);
            onClose();
          }}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
        >
          {loading ? 'Processing...' : <><CheckCircle className="w-4 h-4" /> Collect & Return All Assets</>}
        </button>
      </div>
    </div>
  );
}
