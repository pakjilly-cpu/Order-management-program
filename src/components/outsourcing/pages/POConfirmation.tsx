import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getPurchaseOrders } from '@/services/outsourcing/purchaseOrderService';
import type { PurchaseOrderWithVendor, PurchaseOrderStatus, ApprovalStatus } from '@/types/database';

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
  const [data, setData] = useState<PurchaseOrderWithVendor[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState('po_date');
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

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      columns.map(c => ({ key: c.key, label: c.label })),
      `발주서확인_${today}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'po_date', label: 'PO 생성일', type: 'dateRange', defaultValue: { from: firstOfMonth, to: today } },
    { key: 'status', label: '상태', type: 'select', options: [
      { label: 'ALL', value: 'ALL' },
      { label: '대기', value: 'pending' },
      { label: '확정', value: 'confirmed' },
      { label: '변경', value: 'changed' },
      { label: '완료', value: 'completed' },
    ], defaultValue: 'ALL' },
    { key: 'exclude_completed', label: '', type: 'checkbox', placeholder: '납품완료제외', defaultValue: true },
    { key: 'request_date', label: '입고 요청일', type: 'dateRange' },
    { key: 'search_type', label: '품목검색', type: 'radio', options: [
      { label: '코드', value: 'code' },
      { label: '명칭', value: 'name' },
    ], defaultValue: 'name' },
    { key: 'product_search', label: '', type: 'text', placeholder: '검색어 입력' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
    { key: 'po_number', label: 'PO번호 검색', type: 'text' },
  ];

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
    { label: '저장', icon: 'save', onClick: () => {}, variant: 'secondary' },
  ];

  const rightActions: ActionButton[] = [
    { label: '포장기준서 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
    { label: '발주서 출력', icon: 'print', onClick: () => {}, variant: 'secondary' },
  ];

  const columns: Column<PurchaseOrderWithVendor>[] = [
    { key: 'status', label: '상태', width: '60px', render: (row) => (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[row.status]}`}>
        {statusLabels[row.status]}
      </span>
    )},
    { key: 'po_number', label: 'PO번호', width: '100px', sortable: true },
    { key: 'item_number', label: '품번', width: '60px' },
    { key: 'product_code', label: '품목코드', width: '100px', sortable: true },
    { key: 'product_name', label: '품목명', width: '200px', sortable: true },
    { key: 'po_date', label: 'PO 생성일', width: '100px', sortable: true },
    { key: 'po_quantity', label: 'PO수량', width: '80px', align: 'right', sortable: true, render: (row) => row.po_quantity.toLocaleString() },
    { key: 'unit', label: '단위', width: '50px', align: 'center' },
    { key: 'unit_price', label: '단가', width: '80px', align: 'right', render: (row) => row.unit_price.toLocaleString() },
    { key: 'currency', label: '통화단위', width: '60px', align: 'center' },
    { key: 'price_unit', label: '가격단위', width: '60px', align: 'center' },
    { key: 'request_date', label: '입고요청일', width: '100px', sortable: true },
    { key: 'received_quantity', label: '기입고수량', width: '80px', align: 'right', render: (row) => row.received_quantity.toLocaleString() },
    { key: 'remaining_quantity', label: '이입고수량', width: '80px', align: 'right', render: (row) => row.remaining_quantity.toLocaleString() },
    { key: 'warehouse', label: '납품창고', width: '80px' },
    { key: 'packaging_image_url', label: '포장이미지', width: '70px', align: 'center', render: (row) => row.packaging_image_url ? (
      <span className="text-blue-600 cursor-pointer underline text-[10px]">보기</span>
    ) : '' },
    { key: 'product_image_url', label: '기존 제품이미지', width: '80px', align: 'center', render: (row) => row.product_image_url ? (
      <span className="text-blue-600 cursor-pointer underline text-[10px]">보기</span>
    ) : '' },
    { key: 'customer_code', label: '고객사목록코드', width: '100px' },
    { key: 'approval_status', label: '승인', width: '60px', align: 'center', render: (row) => (
      <span className={`text-[10px] font-medium ${row.approval_status === 'approved' ? 'text-emerald-600' : row.approval_status === 'rejected' ? 'text-red-600' : 'text-slate-400'}`}>
        {approvalLabels[row.approval_status]}
      </span>
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
