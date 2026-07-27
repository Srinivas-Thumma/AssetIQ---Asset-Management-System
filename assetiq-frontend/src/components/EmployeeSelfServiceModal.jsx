import React, { useState } from 'react';
import { X, Package, Users } from 'lucide-react';

export default function EmployeeSelfServiceModal({ isOpen, onClose, onSubmit }) {
  const [type, setType] = useState('new_request');
  const [notes, setNotes] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-800">Request Asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setType('new_request')} 
              className={`flex-1 p-3 rounded-xl border font-semibold text-sm transition-all cursor-pointer ${type === 'new_request' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Package className="w-5 h-5 mx-auto mb-1" /> New Item
            </button>
            <button 
              type="button"
              onClick={() => setType('transfer')} 
              className={`flex-1 p-3 rounded-xl border font-semibold text-sm transition-all cursor-pointer ${type === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Users className="w-5 h-5 mx-auto mb-1" /> Transfer
            </button>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Reason / Details</label>
            <textarea 
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500" 
              rows="3" 
              placeholder="Describe the item you need or who you are transferring to..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <button 
            type="button"
            onClick={() => { onSubmit({ type, notes }); setNotes(''); onClose(); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
