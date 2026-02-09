import React, { useState, useCallback } from 'react';
import { DataGrid, Column } from '../shared/DataGrid';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getBomItems } from '@/services/outsourcing/bomService';
import type { BomItemWithVendor } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
}

const statusLabels: Record<string, string> = {
  pending: '대기',
  received: '입고',
  partial: '부분입고',
  shortage: '부족',
};

export const BOMStatus: React.FC<Props> = ({ vendorId, vendorCode }) => {
  const [data, setData] = useState<BomItemWithVendor[]>([]);
  const [sortKey, setSortKey] = useState('instruction_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data: result } = await getBomItems({
        vendorId,
        productSearch: filters.product_search as string,
        poNumber: filters.po_number as string,
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
      `BOM입고현황_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }, [data]);

  const filters: FilterConfig[] = [
    { key: 'search_type', label: '품목검색', type: 'radio', options: [
      { label: '코드', value: 'code' },
      { label: '명칭', value: 'name' },
    ], defaultValue: 'code' },
    { key: 'product_search', label: '', type: 'text', placeholder: '검색어 입력' },
    { key: 'po_number', label: 'PO번호', type: 'text' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
  ];

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch({}), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const columns: Column<BomItemWithVendor>[] = [
    { key: 'manager_name', label: '담당자', width: '70px' },
    { key: 'instruction_date', label: '지시일', width: '90px', sortable: true },
    { key: 'supplier_code', label: '공급업체', width: '80px' },
    { key: 'supplier_name', label: '공급업체명', width: '120px' },
    { key: 'purchase_document', label: '구매문서', width: '90px' },
    { key: 'parent_material_code', label: '상위자재코드', width: '110px' },
    { key: 'parent_material_name', label: '상위자재내역', width: '160px' },
    { key: 'purchase_quantity', label: '구매수량', width: '80px', align: 'right', sortable: true, render: (row) => Number(row.purchase_quantity).toLocaleString() },
    { key: 'purchase_unit', label: '구매단위', width: '60px', align: 'center' },
    { key: 'status', label: '상태', width: '60px', align: 'center', render: (row) => statusLabels[row.status] ?? row.status },
    { key: 'child_material_code', label: '하위자재코드', width: '110px' },
    { key: 'child_material_name', label: '하위자재내역', width: '160px' },
    { key: 'required_quantity', label: '소요량', width: '80px', align: 'right', render: (row) => Number(row.required_quantity).toLocaleString() },
    { key: 'required_unit', label: '소요단위', width: '60px', align: 'center' },
    { key: 'vendor_stock', label: '업체재고', width: '80px', align: 'right', render: (row) => Number(row.vendor_stock).toLocaleString() },
    { key: 'shortage_quantity', label: '과부족수량', width: '90px', align: 'right', render: (row) => {
      const val = Number(row.shortage_quantity);
      return <span className={val < 0 ? 'text-red-600 font-semibold' : ''}>{val.toLocaleString()}</span>;
    }},
  ];

  return (
    <div>
      <FilterBar filters={filters} onSearch={handleSearch} actions={actions} />
      <DataGrid
        columns={columns}
        data={data}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        isLoading={isLoading}
      />
    </div>
  );
};
