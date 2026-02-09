import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getPurchaseOrders } from '@/services/outsourcing/purchaseOrderService';
import type { OrderWithVendor, PurchaseOrderStatus, ApprovalStatus } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
}

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = `${today.slice(0, 8)}01`;

const statusLabels: Record<PurchaseOrderStatus, string> = {
  pending: '대기',
  confirmed: '확정',
  changed: '변경',
  completed: '완료',
  cancelled: '취소',
};

const statusColors: Record<PurchaseOrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  changed: 'bg-purple-100 text-purple-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

const approvalLabels: Record<ApprovalStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

export const POConfirmation: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<OrderWithVendor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('order_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getPurchaseOrders({
        vendorId,
        dateFrom: filters.po_date_from as string,
        dateTo: filters.po_date_to as string,
        status: (filters.status as string) === 'ALL' ? undefined : filters.status as string,
        poNumber: filters.po_number as string,
        excludeCompleted: filters.exclude_completed === 'true' || filters.exclude_completed === true,
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

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `발주서확인_${today}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'po_date', label: '발주일', type: 'dateRange', defaultValue: { from: firstOfMonth, to: today } },
    { key: 'status', label: '상태', type: 'select', options: [
      { label: 'ALL', value: 'ALL' },
      { label: '대기', value: 'pending' },
      { label: '확정', value: 'confirmed' },
      { label: '변경', value: 'changed' },
      { label: '완료', value: 'completed' },
    ], defaultValue: 'ALL' },
    { key: 'exclude_completed', label: '', type: 'checkbox', placeholder: '납품완료제외', defaultValue: true },
    { key: 'po_number', label: 'PO번호 검색', type: 'text' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
  ];

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const columns: Column<OrderWithVendor>[] = [
    { key: 'po_status', label: '상태', width: '60px', render: (row) => {
      const st = row.po_status ?? 'pending';
      return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[st] ?? ''}`}>
          {statusLabels[st] ?? st}
        </span>
      );
    }},
    { key: 'po_number', label: 'PO번호', width: '100px', sortable: true, render: (row) => row.po_number ?? '-' },
    { key: 'product_code', label: '품목코드', width: '100px', sortable: true },
    { key: 'product_name', label: '품목명', width: '200px', sortable: true },
    { key: 'order_date', label: '발주일', width: '100px', sortable: true },
    { key: 'quantity', label: '수량', width: '80px', align: 'right', sortable: true, render: (row) => (row.quantity ?? 0).toLocaleString() },
    { key: 'unit', label: '단위', width: '50px', align: 'center', render: (row) => row.unit ?? 'EA' },
    { key: 'delivery_date', label: '납기요청일', width: '100px', sortable: true, render: (row) => row.delivery_date ?? '-' },
    { key: 'received_quantity', label: '기입고수량', width: '80px', align: 'right', render: (row) => (row.received_quantity ?? 0).toLocaleString() },
    { key: 'remaining_quantity', label: '미입고수량', width: '80px', align: 'right', render: (row) => (row.remaining_quantity ?? 0).toLocaleString() },
    { key: 'warehouse', label: '납품창고', width: '80px', render: (row) => row.warehouse ?? '-' },
    { key: 'approval_status', label: '승인', width: '60px', align: 'center', render: (row) => {
      const as_ = row.approval_status ?? 'pending';
      return (
        <span className={`text-[10px] font-medium ${as_ === 'approved' ? 'text-emerald-600' : as_ === 'rejected' ? 'text-red-600' : 'text-slate-400'}`}>
          {approvalLabels[as_] ?? as_}
        </span>
      );
    }},
  ];

  return (
    <div>
      <FilterBar filters={filters} onSearch={handleSearch} actions={actions} />
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
