import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getDeliveryItemsByFilters, deleteDeliveryItem } from '@/services/outsourcing/deliveryService';
import type { DeliveryItemWithNote } from '@/types/database';

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

export const DeliveryPrint: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<DeliveryItemWithNote[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('delivery_note.delivery_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getDeliveryItemsByFilters({
        vendorId,
        dateFrom: filters.delivery_date_from as string,
        dateTo: filters.delivery_date_to as string,
        excludeCompleted: filters.exclude_completed as boolean,
      });
      setData(result ?? []);
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

  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteDeliveryItem(id);
    }
    setSelectedIds([]);
    handleSearch({});
  }, [selectedIds, handleSearch]);

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `납품서출력_${today}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'delivery_date', label: '납품일', type: 'dateRange', defaultValue: { from: firstOfMonth, to: today } },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
    { key: 'exclude_completed', label: '', type: 'checkbox', placeholder: '납품완료제외', defaultValue: true },
  ];

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: '삭제', icon: 'delete', onClick: handleDelete, variant: 'danger' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const rightActions: ActionButton[] = [
    { label: '납품서 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
  ];

  const columns: Column<DeliveryItemWithNote>[] = [
    { key: 'delivery_note_number', label: '납품번호', width: '110px', sortable: true, render: (row) => row.delivery_note?.delivery_number ?? '' },
    { key: 'delivery_note_date', label: '납품일', width: '90px', sortable: true, render: (row) => row.delivery_note?.delivery_date ?? '' },
    { key: 'delivery_completed', label: '납품완료', width: '70px', align: 'center', render: (row) => (
      <span className={`text-[10px] font-medium ${row.delivery_note?.is_completed ? 'text-emerald-600' : 'text-slate-400'}`}>
        {row.delivery_note?.is_completed ? 'Y' : 'N'}
      </span>
    )},
    { key: 'product_code', label: '제품코드', width: '100px', sortable: true },
    { key: 'product_name', label: '제품명', width: '200px' },
    { key: 'po_number', label: '번호', width: '80px' },
    { key: 'po_item_number', label: '품번', width: '60px' },
    { key: 'po_quantity', label: '수량', width: '70px', align: 'right', render: (row) => row.po_quantity.toLocaleString() },
    { key: 'previously_received', label: '기입고수량', width: '80px', align: 'right', render: (row) => row.previously_received.toLocaleString() },
    { key: 'cosmax_comment', label: '코스맥스 의견', width: '120px' },
    { key: 'progress_status', label: '진행상태', width: '70px', align: 'center', render: (row) => progressLabels[row.progress_status] ?? row.progress_status },
    { key: 'pallet_count', label: '파레트수', width: '60px', align: 'right' },
    { key: 'items_per_box', label: '박스당제품수', width: '80px', align: 'right' },
    { key: 'box_count', label: '박스수', width: '60px', align: 'right' },
    { key: 'remainder', label: '날계', width: '50px', align: 'right' },
    { key: 'production_date', label: '생산날짜', width: '90px' },
    { key: 'lot_number', label: 'LOT', width: '90px' },
    { key: 'received_quantity', label: '입고수량', width: '80px', align: 'right', render: (row) => (
      <span className="font-semibold">{row.received_quantity.toLocaleString()}</span>
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
