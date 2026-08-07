import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [panelStyles, setPanelStyles] = useState({});
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);

  // Extract primitive value
  const rawValue = typeof value === 'object' && value !== null
    ? (value.target?.value ?? value.value ?? '')
    : value;

  const selectedOption = options.find((opt) => String(opt.value) === String(rawValue ?? ''));

  // Filter options if search term present
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const labelMatch = String(opt.label || '').toLowerCase().includes(term);
    const descMatch = String(opt.description || '').toLowerCase().includes(term);
    return labelMatch || descMatch;
  });

  // Calculate dropdown positioning relative to viewport
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // Determine whether to open upwards or downwards
    const showAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    
    const styles = {
      position: 'fixed',
      left: `${Math.max(8, rect.left)}px`,
      width: `${Math.min(rect.width, window.innerWidth - 16)}px`,
      zIndex: 99999,
    };

    if (showAbove) {
      styles.bottom = `${window.innerHeight - rect.top + 6}px`;
      styles.maxHeight = `${Math.min(280, spaceAbove - 16)}px`;
    } else {
      styles.top = `${rect.bottom + 6}px`;
      styles.maxHeight = `${Math.min(280, spaceBelow - 16)}px`;
    }

    setPanelStyles(styles);
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    // Auto-focus search input if options > 5
    if (options.length > 5 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        panelRef.current && !panelRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, options.length]);

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

      {/* Dropdown Panel using React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyles}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-fade-in flex flex-col cursor-default"
          >
            {/* Search Input for > 5 options */}
            {options.length > 5 && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10">
                <div className="relative flex items-center">
                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search options..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white text-xs text-slate-800 placeholder-slate-400 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="overflow-y-auto custom-scrollbar py-1.5 flex-1 max-h-56">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                  {options.length === 0 ? 'No options available' : 'No matching options found'}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(rawValue ?? '');
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
          </div>,
          document.body
        )}
    </div>
  );
}
