import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Extract primitive string/number value even if value passed in state was wrapped
  const rawValue = typeof value === 'object' && value !== null
    ? (value.target?.value ?? value.value ?? '')
    : value;

  // Find currently selected option
  const selectedOption = options.find((opt) => String(opt.value) === String(rawValue ?? ''));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelect = (optionValue) => {
    if (disabled) return;
    if (typeof onChange === 'function') {
      const syntheticEvent = {
        target: { value: optionValue, name: id },
        currentTarget: { value: optionValue },
        value: optionValue,
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-white text-left text-sm rounded-xl border border-slate-200 hover:border-purple-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        } ${isOpen ? 'border-purple-500 ring-2 ring-purple-500/20 bg-white' : ''}`}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.icon && (
                <span className="shrink-0 text-purple-600">{selectedOption.icon}</span>
              )}
              <span className="font-semibold text-slate-800 truncate">{selectedOption.label}</span>
            </>
          ) : (
            <span className="text-slate-400 font-normal truncate">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-purple-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200/80 rounded-xl shadow-xl overflow-hidden animate-fade-in custom-scrollbar max-h-60 overflow-y-auto py-1.5">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 italic text-center">No options available</div>
          ) : (
            options.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              const OptionIcon = opt.icon;

              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-purple-50 text-purple-900 font-bold'
                      : 'hover:bg-purple-50/70 text-slate-700 hover:text-purple-900'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {OptionIcon && (
                      <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}>
                        {OptionIcon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`truncate ${isSelected ? 'font-bold text-purple-900' : 'font-semibold'}`}>
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && <Check className="h-4 w-4 text-purple-600 shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
