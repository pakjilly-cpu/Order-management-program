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
  search: '🔍',
  save: '💾',
  excel: '📄',
  delete: '🗑',
  print: '🖨',
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
  const [expanded, setExpanded] = useState(false);

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
          <div className="flex items-center gap-1 w-full">
            <input
              type="date"
              value={String(values[`${filter.key}_from`] ?? '')}
              onChange={e => setValue(`${filter.key}_from`, e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-slate-400 text-xs flex-shrink-0">~</span>
            <input
              type="date"
              value={String(values[`${filter.key}_to`] ?? '')}
              onChange={e => setValue(`${filter.key}_to`, e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        );

      case 'select':
        return (
          <select
            value={String(values[filter.key] ?? '')}
            onChange={e => setValue(filter.key, e.target.value)}
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {filter.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="flex items-center gap-3 flex-wrap">
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
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        );
    }
  };

  const visibleFilters = expanded ? filters : filters.slice(0, 3);
  const hasMore = filters.length > 3;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
      <div className="space-y-2">
        {visibleFilters.map((filter) => (
          <div key={filter.key} className={filter.type === 'checkbox' ? 'flex items-center' : ''}>
            {filter.type !== 'checkbox' && filter.label && (
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {filter.label}
              </label>
            )}
            {renderFilter(filter)}
          </div>
        ))}

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? '접기 ▲' : `더보기 (${filters.length - 3}개) ▼`}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              if (action.icon === 'search') {
                onSearch(values);
              } else {
                action.onClick();
              }
            }}
            className={`flex-1 min-w-[60px] px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${variantClass[action.variant ?? 'primary']}`}
          >
            {action.icon && <span className="text-[10px]">{iconMap[action.icon]}</span>}
            {action.label}
          </button>
        ))}
      </div>

      {rightActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`flex-1 min-w-[60px] px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${variantClass[action.variant ?? 'secondary']}`}
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
