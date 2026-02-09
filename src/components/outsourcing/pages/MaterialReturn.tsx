import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getReturns, updateReturn } from '@/services/outsourcing/materialService';
import type { MaterialReturnWithVendor, MaterialReturnUpdate } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
}

export const MaterialReturn: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<MaterialReturnWithVendor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('material_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<MaterialReturnWithVendor>>>({});

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getReturns({
        vendorId,
        materialSearch: filters.material_search as string,
        includeZeroStock: filters.include_zero_stock as boolean,
      });
      setData(result ?? []);
      setEditedRows({});
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  const handleSort = useCallback((key: string) => {
    setSortOrder(prev => (sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
    setSortKey(key);
  }, [sortKey]);

  const updateEditedField = useCallback((id: string, field: string, value: unknown) => {
    setEditedRows(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }, []);

  const getEditedValue = (row: MaterialReturnWithVendor, field: keyof MaterialReturnWithVendor) => {
    const edited = editedRows[row.id];
    if (edited && field in edited) return edited[field as string] as unknown;
    return row[field];
  };

  const handleSave = useCallback(async () => {
    const entries = Object.entries(editedRows);
    if (entries.length === 0) return;
    for (const [id, changes] of entries) {
      await updateReturn(id, changes as MaterialReturnUpdate);
    }
    setEditedRows({});
    handleSearch({});
  }, [editedRows, handleSearch]);

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `자재환입_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'search_type', label: '품목검색', type: 'radio', options: [
      { label: '코드', value: 'code' },
      { label: '명칭', value: 'name' },
    ], defaultValue: 'name' },
    { key: 'material_search', label: '', type: 'text', placeholder: '검색어 입력' },
    { key: 'include_zero_stock', label: '', type: 'checkbox', placeholder: '재고없는품목포함' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
  ];

  const actions: ActionButton[] = [
    { label: '저장', icon: 'save', onClick: handleSave, variant: 'secondary' },
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const rightActions: ActionButton[] = [
    { label: '자재환입 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
  ];

  const columns: Column<MaterialReturnWithVendor>[] = [
    { key: 'history', label: '수불이력조회', width: '80px', align: 'center', render: () => (
      <button className="text-blue-600 hover:text-blue-800 underline text-[10px] font-medium">조회</button>
    )},
    { key: 'material_code', label: '자재코드', width: '100px', sortable: true },
    { key: 'material_name', label: '자재명', width: '200px', sortable: true },
    { key: 'stock_quantity', label: '재고', width: '80px', align: 'right', render: (row) => Number(row.stock_quantity).toLocaleString() },
    { key: 'lot_number', label: 'LOT번호', width: '90px' },
    { key: 'settlement_return', label: '정산환입', width: '80px', align: 'right', render: (row) => Number(row.settlement_return).toLocaleString() },
    { key: 'warehouse', label: '납품창고', width: '80px' },
    { key: 'notes', label: '비고', width: '120px', render: (row) => (
      <input
        type="text"
        value={String(getEditedValue(row, 'notes') ?? '')}
        onChange={e => updateEditedField(row.id, 'notes', e.target.value)}
        className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    )},
    { key: 'bulk_ratio', label: '벌크 비중', width: '80px', align: 'right', render: (row) => row.bulk_ratio?.toFixed(4) ?? '' },
    { key: 'is_return_target', label: '환입대상', width: '60px', align: 'center', render: (row) => (
      <input
        type="checkbox"
        checked={Boolean(getEditedValue(row, 'is_return_target'))}
        onChange={e => updateEditedField(row.id, 'is_return_target', e.target.checked)}
        className="w-3.5 h-3.5 cursor-pointer"
      />
    )},
    { key: 'manufacture_date', label: '제조일', width: '90px' },
  ];

  return (
    <div>
      <FilterBar filters={filters} onSearch={handleSearch} actions={actions} rightActions={rightActions} />
      <DataGrid
        columns={columns}
        data={data}
        onRowSelect={setSelectedIds}
        selectedIds={selectedIds}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        isLoading={isLoading}
      />
    </div>
  );
};
