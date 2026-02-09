import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getSettlements, updateSettlement } from '@/services/outsourcing/materialService';
import type { MaterialSettlementWithVendor, MaterialSettlementUpdate } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
}

export const MaterialSettlement: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<MaterialSettlementWithVendor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('po_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<MaterialSettlementWithVendor>>>({});

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getSettlements({
        vendorId,
        dateFrom: filters.delivery_date_from as string,
        dateTo: filters.delivery_date_to as string,
        poNumber: filters.po_number as string,
        productCode: filters.product_code as string,
        materialCode: filters.material_code as string,
        registrationStatus: (filters.registration_status as string) ?? 'all',
        excludeZeroStock: filters.exclude_zero_stock === 'true' || filters.exclude_zero_stock === true,
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

  const getEditedValue = (row: MaterialSettlementWithVendor, field: keyof MaterialSettlementWithVendor) => {
    const edited = editedRows[row.id];
    if (edited && field in edited) return edited[field as string] as unknown;
    return row[field];
  };

  const calcRemaining = (row: MaterialSettlementWithVendor) => {
    const orig = Number(row.original_quantity) || 0;
    const normal = Number(getEditedValue(row, 'normal_usage')) || 0;
    const damaged = Number(getEditedValue(row, 'damaged_usage')) || 0;
    return orig - normal - damaged;
  };

  const handleSave = useCallback(async () => {
    const entries = Object.entries(editedRows);
    if (entries.length === 0) return;
    for (const [id, changes] of entries) {
      await updateSettlement(id, changes as MaterialSettlementUpdate);
    }
    setEditedRows({});
    handleSearch({});
  }, [editedRows, handleSearch]);

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `자재정산_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'delivery_date', label: '납품일자', type: 'dateRange' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
    { key: 'registration_status', label: '등록여부', type: 'radio', options: [
      { label: '전체', value: 'all' },
      { label: '기등록', value: 'registered' },
      { label: '미등록', value: 'unregistered' },
    ], defaultValue: 'unregistered' },
    { key: 'exclude_zero_stock', label: '', type: 'checkbox', placeholder: '재고 0인 것 제외' },
    { key: 'po_number', label: 'PO번호', type: 'text' },
    { key: 'product_code', label: '제품코드', type: 'text' },
    { key: 'material_code', label: '자재코드', type: 'text' },
  ];

  const actions: ActionButton[] = [
    { label: '저장', icon: 'save', onClick: handleSave, variant: 'secondary' },
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const rightActions: ActionButton[] = [
    { label: '자재정산 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
  ];

  const editableNumber = (row: MaterialSettlementWithVendor, field: keyof MaterialSettlementWithVendor) => (
    <input
      type="number"
      value={String(getEditedValue(row, field) ?? 0)}
      onChange={e => updateEditedField(row.id, field, Number(e.target.value))}
      className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
      style={{ maxWidth: '80px' }}
    />
  );

  const columns: Column<MaterialSettlementWithVendor>[] = [
    { key: 'po_number', label: 'PO번호', width: '90px', sortable: true },
    { key: 'po_item_number', label: 'PO항번', width: '60px' },
    { key: 'product_code', label: '제품코드', width: '100px', sortable: true },
    { key: 'product_name', label: '제품명', width: '180px' },
    { key: 'material_code', label: '자재코드', width: '100px', sortable: true },
    { key: 'material_name', label: '자재명', width: '180px' },
    { key: 'lot_number', label: 'LOT번호', width: '90px' },
    { key: 'original_quantity', label: '원수량', width: '80px', align: 'right', render: (row) => Number(row.original_quantity).toLocaleString() },
    { key: 'normal_usage', label: '정상사용', width: '80px', align: 'right', render: (row) => editableNumber(row, 'normal_usage') },
    { key: 'damaged_usage', label: '사용파손', width: '80px', align: 'right', render: (row) => editableNumber(row, 'damaged_usage') },
    { key: 'remaining_stock', label: '잔여재고량', width: '90px', align: 'right', render: (row) => {
      const val = calcRemaining(row);
      return <span className={`font-semibold ${val < 0 ? 'text-red-600' : 'text-slate-800'}`}>{val.toLocaleString()}</span>;
    }},
    { key: 'notes', label: '비고', width: '120px', render: (row) => (
      <input
        type="text"
        value={String(getEditedValue(row, 'notes') ?? '')}
        onChange={e => updateEditedField(row.id, 'notes', e.target.value)}
        className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    )},
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
