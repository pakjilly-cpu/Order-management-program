import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getDeliveryItemsByFilters, createDeliveryItems, updateDeliveryItem } from '@/services/outsourcing/deliveryService';
import type { DeliveryItemWithNote, DeliveryItemUpdate } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
}

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = `${today.slice(0, 8)}01`;

const progressLabels: Record<string, string> = {
  pending: '대기',
  in_progress: '진행중',
  completed: '완료',
  rejected: '반려',
};

export const DeliveryCreate: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<DeliveryItemWithNote[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('product_code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<DeliveryItemWithNote>>>({});

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getDeliveryItemsByFilters({
        vendorId,
        dateFrom: filters.po_date_from as string,
        dateTo: filters.po_date_to as string,
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

  const getEditedValue = (row: DeliveryItemWithNote, field: keyof DeliveryItemWithNote) => {
    const edited = editedRows[row.id];
    if (edited && field in edited) return edited[field as string] as unknown;
    return row[field];
  };

  const calcReceivedQty = (row: DeliveryItemWithNote) => {
    const ipb = Number(getEditedValue(row, 'items_per_box')) || 0;
    const bc = Number(getEditedValue(row, 'box_count')) || 0;
    const rem = Number(getEditedValue(row, 'remainder')) || 0;
    return (ipb * bc) + rem;
  };

  const handleSave = useCallback(async () => {
    const entries = Object.entries(editedRows);
    if (entries.length === 0) return;
    for (const [id, changes] of entries) {
      await updateDeliveryItem(id, changes as DeliveryItemUpdate);
    }
    setEditedRows({});
    handleSearch({});
  }, [editedRows, handleSearch]);

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `납품서작성_${today}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'po_date', label: 'PO생성일', type: 'dateRange', defaultValue: { from: firstOfMonth, to: today } },
    { key: 'warehouse', label: '납품창고', type: 'select', options: [{ label: 'ALL', value: '' }], defaultValue: '' },
    { key: 'request_date', label: '입고 요청일', type: 'dateRange' },
    { key: 'search_type', label: '품목검색', type: 'radio', options: [
      { label: '코드', value: 'code' },
      { label: '명칭', value: 'name' },
    ], defaultValue: 'name' },
    { key: 'product_search', label: '', type: 'text', placeholder: '검색어 입력' },
    { key: 'delivery_date', label: '납품일자', type: 'text', defaultValue: today },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
  ];

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
    { label: '저장', icon: 'save', onClick: handleSave, variant: 'secondary' },
  ];

  const rightActions: ActionButton[] = [
    { label: '라벨출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
    { label: '납품서 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
  ];

  const editableInput = (row: DeliveryItemWithNote, field: keyof DeliveryItemWithNote, width: string = '60px') => (
    <input
      type="number"
      value={String(getEditedValue(row, field) ?? 0)}
      onChange={e => updateEditedField(row.id, field, Number(e.target.value))}
      className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
      style={{ maxWidth: width }}
    />
  );

  const columns: Column<DeliveryItemWithNote>[] = [
    { key: 'customer_code', label: '고객사 코드', width: '80px' },
    { key: 'product_code', label: '제품코드', width: '100px', sortable: true },
    { key: 'product_name', label: '제품명', width: '200px', sortable: true },
    { key: 'po_number', label: 'PO번호', width: '80px' },
    { key: 'po_item_number', label: 'PO품번', width: '60px' },
    { key: 'po_quantity', label: 'PO수량', width: '70px', align: 'right', render: (row) => row.po_quantity.toLocaleString() },
    { key: 'previously_received', label: '기입고수량', width: '80px', align: 'right', render: (row) => row.previously_received.toLocaleString() },
    { key: 'delivery_allowed', label: '납품허용', width: '70px', align: 'right', render: (row) => row.delivery_allowed.toLocaleString() },
    { key: 'cosmax_comment', label: '코스맥스 의견', width: '120px' },
    { key: 'progress_status', label: '진행상태', width: '70px', align: 'center', render: (row) => progressLabels[row.progress_status] ?? row.progress_status },
    { key: 'pallet_count', label: '파레트수', width: '60px', align: 'right', render: (row) => editableInput(row, 'pallet_count') },
    { key: 'items_per_box', label: '박스당제품수', width: '80px', align: 'right', render: (row) => editableInput(row, 'items_per_box') },
    { key: 'box_count', label: '박스수', width: '60px', align: 'right', render: (row) => editableInput(row, 'box_count') },
    { key: 'remainder', label: '날계', width: '60px', align: 'right', render: (row) => editableInput(row, 'remainder') },
    { key: 'production_date', label: '생산날짜', width: '100px', render: (row) => (
      <input
        type="date"
        value={String(getEditedValue(row, 'production_date') ?? '')}
        onChange={e => updateEditedField(row.id, 'production_date', e.target.value)}
        className="px-1 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    )},
    { key: 'lot_number', label: 'LOT', width: '90px', render: (row) => (
      <input
        type="text"
        value={String(getEditedValue(row, 'lot_number') ?? '')}
        onChange={e => updateEditedField(row.id, 'lot_number', e.target.value)}
        className="w-full px-1 py-0.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    )},
    { key: 'received_quantity', label: '입고수량', width: '80px', align: 'right', render: (row) => (
      <span className="font-semibold text-blue-700">{calcReceivedQty(row).toLocaleString()}</span>
    )},
    { key: 'managed_product', label: '관리품', width: '50px', align: 'center', render: (row) => (
      <input
        type="checkbox"
        checked={Boolean(getEditedValue(row, 'managed_product'))}
        onChange={e => updateEditedField(row.id, 'managed_product', e.target.checked)}
        className="w-3.5 h-3.5"
      />
    )},
    { key: 'notes', label: '비고', width: '100px', render: (row) => (
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
