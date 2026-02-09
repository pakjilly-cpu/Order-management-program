import React, { useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey?: (row: T) => string;
  onRowSelect?: (ids: string[]) => void;
  selectedIds?: string[];
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  totalCount?: number;
}

const SortArrow: React.FC<{ active: boolean; order: 'asc' | 'desc' }> = ({ active, order }) => (
  <span className={`ml-1 inline-flex text-[10px] ${active ? 'text-white' : 'text-red-200'}`}>
    {order === 'asc' ? '\u25B2' : '\u25BC'}
  </span>
);

function DataGridInner<T extends object>(
  {
    columns,
    data,
    rowKey,
    onRowSelect,
    selectedIds = [],
    sortKey,
    sortOrder = 'asc',
    onSort,
    isLoading = false,
    emptyMessage = '데이터가 없습니다.',
    totalCount,
  }: DataGridProps<T>,
) {
  const getRowId = useMemo(() => {
    return rowKey ?? ((row: T) => (row as Record<string, unknown>).id as string);
  }, [rowKey]);

  const allSelected = data.length > 0 && data.every(row => selectedIds.includes(getRowId(row)));

  const handleSelectAll = () => {
    if (!onRowSelect) return;
    if (allSelected) {
      onRowSelect([]);
    } else {
      onRowSelect(data.map(row => getRowId(row)));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onRowSelect) return;
    if (selectedIds.includes(id)) {
      onRowSelect(selectedIds.filter(s => s !== id));
    } else {
      onRowSelect([...selectedIds, id]);
    }
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const displayCount = totalCount ?? data.length;
  const alignClass = (align?: string) => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  return (
    <div className="w-full">
      <p className="text-xs text-slate-600 mb-1 font-medium">
        <span className="inline-block w-1.5 h-1.5 bg-slate-800 rounded-full mr-1 relative top-[-1px]" />
        총 리스트수 : {displayCount}
      </p>

      <div className="border border-slate-200 rounded overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-[#8B1A1A] text-white">
              {onRowSelect && (
                <th className="px-2 py-2 w-8 border-r border-red-900/30">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-2 py-2 font-semibold border-r border-red-900/30 last:border-r-0 ${alignClass(col.align)} ${col.sortable ? 'cursor-pointer hover:bg-red-900/40 select-none' : ''}`}
                  style={col.width ? { minWidth: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && (
                    <SortArrow active={sortKey === col.key} order={sortKey === col.key ? sortOrder ?? 'asc' : 'asc'} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {onRowSelect && <td className="px-2 py-3"><div className="h-3 bg-slate-100 rounded animate-pulse w-4" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-3">
                      <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onRowSelect ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const id = getRowId(row);
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={id ?? idx}
                    className={`hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {onRowSelect && (
                      <td className="px-2 py-2 border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(id)}
                          className="w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-2 py-2 border-r border-slate-50 last:border-r-0 ${alignClass(col.align)}`}
                      >
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const DataGrid = DataGridInner as <T extends object>(
  props: DataGridProps<T>,
) => React.ReactElement;
