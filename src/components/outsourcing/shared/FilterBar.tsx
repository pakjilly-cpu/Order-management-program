import React, { useState, useCallback } from 'react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'dateRange' | 'text' | 'select' | 'radio' | 'checkbox';
  options?: { label: string; value: string }[];
  defaultValue?: unknown;
  placeholder?: string;
}

export interface ActionButton {
  label: string;
  icon?: 'search' | 'save' | 'excel' | 'delete' | 'print';
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'excel';
}

interface FilterBarProps {
  filters: FilterConfig[];
  onSearch: (values: Record<string, unknown>) => void;
  actions?: ActionButton[];
  rightActions?: ActionButton[];
}

const iconMap: Record<string, string> = {
  search: '\uD83D\uDD0D',
  save: '\uD83D\uDCBE',
  excel: '\uD83D\uDCC4',
  delete: '\uD83D\uDDD1',
  print: '\uD83D\uDDA8',
};

const variantClass: Record<string, string> = {
  primary: 'bg-[#8B1A1A] hover:bg-[#6B1414] text-white',
  secondary: 'bg-slate-600 hover:bg-slate-700 text-white',
  danger: 'bg-slate-500 hover:bg-slate-600 text-white',
  excel: 'bg-[#217346] hover:bg-[#1a5c38] text-white',
};

function getDefaultValues(filters: FilterConfig[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  filters.forEach((f) => {
    if (f.type === 'dateRange') {
      const dv = f.defaultValue as { from?: string; to?: string } | undefined;
      defaults[`${f.key}_from`] = dv?.from ?? '';
      defaults[`${f.key}_to`] = dv?.to ?? '';
    } else if (f.type === 'checkbox') {
      defaults[f.key] = f.defaultValue ?? false;
    } else {
      defaults[f.key] = f.defaultValue ?? '';
    }
  });
  return defaults;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onSearch,
  actions = [],
  rightActions = [],
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(() => getDefaultValues(filters));

  const setValue = useCallback((key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    onSearch(values);
  }, [onSearch, values]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  }, [handleSearch]);

  const renderFilter = (filter: FilterConfig) => {
    switch (filter.type) {
      case 'dateRange':
        return (
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={String(values[`${filter.key}_from`] ?? '')}
              onChange={e => setValue(`${filter.key}_from`, e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2 py-1 border border-slate-300 rounded text-xs w-[130px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-slate-400 text-xs">~</span>
            <input
              type="date"
              value={String(values[`${filter.key}_to`] ?? '')}
              onChange={e => setValue(`${filter.key}_to`, e.target.value)}
              onKeyDown={handleKeyDown}
              className="px-2 py-1 border border-slate-300 rounded text-xs w-[130px] focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={String(values[filter.key] ?? '')}
            onChange={e => setValue(filter.key, e.target.value)}
            className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[100px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {filter.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="flex items-center gap-3">
            {filter.options?.map(opt => (
              <label key={opt.value} className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="radio"
                  name={filter.key}
                  value={opt.value}
                  checked={values[filter.key] === opt.value}
                  onChange={e => setValue(filter.key, e.target.value)}
                  className="w-3 h-3"
                />
                {opt.label}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(values[filter.key])}
              onChange={e => setValue(filter.key, e.target.checked)}
              className="w-3.5 h-3.5"
            />
            {filter.placeholder}
          </label>
        );

      default:
        return (
          <input
            type="text"
            value={String(values[filter.key] ?? '')}
            onChange={e => setValue(filter.key, e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={filter.placeholder}
            className="px-2 py-1 border border-slate-300 rounded text-xs min-w-[120px] focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1">
          {filters.map((filter) => (
            <div key={filter.key} className="flex items-center gap-2">
              {filter.type !== 'checkbox' && (
                <label className="text-xs font-medium text-slate-600 whitespace-nowrap min-w-fit">
                  {filter.label}
                </label>
              )}
              {renderFilter(filter)}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${variantClass[action.variant ?? 'primary']}`}
            >
              {action.icon && <span className="text-[10px]">{iconMap[action.icon]}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {rightActions.length > 0 && (
        <div className="flex justify-end mt-2 gap-1.5">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1 ${variantClass[action.variant ?? 'secondary']}`}
            >
              {action.icon && <span className="text-[10px]">{iconMap[action.icon]}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
