import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FilterBar, FilterConfig, ActionButton } from '../shared/FilterBar';
import { exportToExcel } from '../shared/ExcelDownload';
import { getBomItems, createBomItems } from '@/services/outsourcing/bomService';
import type { BomItem, BomItemInsert } from '@/types/database';

interface Props {
  vendorId?: string;
  vendorCode?: string;
  isAdmin?: boolean;
}

interface RowGroup {
  parentKey: string;
  rows: BomItem[];
}

interface ParsedBomRow {
  manager_name: string;
  instruction_date: string;
  supplier_code: string;
  supplier_name: string;
  purchase_document: string;
  parent_material_code: string;
  parent_material_name: string;
  purchase_quantity: number;
  purchase_unit: string;
  child_material_code: string;
  child_material_name: string;
  required_quantity: number;
  required_unit: string;
  vendor_stock: number;
  shortage_quantity: number;
}

const HEADER_KEYWORDS: Record<keyof ParsedBomRow, string[]> = {
  manager_name: ['담당자', '담당'],
  instruction_date: ['지시일', '지시'],
  supplier_code: ['공급업체', '공급업일', '업체코드'],
  supplier_name: ['공급업체명', '업체명'],
  purchase_document: ['구매문서', 'PO', 'po번호'],
  parent_material_code: ['상위자재코드', '상위자재', '자재 번호', '자재번호'],
  parent_material_name: ['상위자재내역', '상위자재명', '자재내역'],
  purchase_quantity: ['구매수량', 'po수량', 'PO수량'],
  purchase_unit: ['구매단위'],
  child_material_code: ['하위자재코드', '하위자재'],
  child_material_name: ['하위자재내역', '하위자재명'],
  required_quantity: ['소요량'],
  required_unit: ['소요단위'],
  vendor_stock: ['업체재고', '재고'],
  shortage_quantity: ['과부족', '과부족수량'],
};

function findColumnIndexes(headerRow: unknown[]): Partial<Record<keyof ParsedBomRow, number>> {
  const indexes: Partial<Record<keyof ParsedBomRow, number>> = {};

  headerRow.forEach((cell, colIdx) => {
    const cellStr = String(cell ?? '').trim();
    if (!cellStr) return;

    for (const [field, keywords] of Object.entries(HEADER_KEYWORDS)) {
      if (indexes[field as keyof ParsedBomRow] !== undefined) continue;
      if (keywords.some(kw => cellStr.includes(kw))) {
        indexes[field as keyof ParsedBomRow] = colIdx;
      }
    }
  });

  return indexes;
}

function groupByParent(data: BomItem[]): RowGroup[] {
  const groups: RowGroup[] = [];
  let current: RowGroup | null = null;

  for (const row of data) {
    const key = row.parent_material_code ?? '';
    if (!current || current.parentKey !== key) {
      current = { parentKey: key, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

function computeStatus(shortage: number): 'received' | 'shortage' {
  return shortage >= 0 ? 'received' : 'shortage';
}

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const isOk = status === 'received' || status === 'partial';
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`}
      title={status}
    />
  );
};

export const BOMStatus: React.FC<Props> = ({ vendorId, vendorCode, isAdmin = false }) => {
  const [data, setData] = useState<BomItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedBomRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [matchedHeaders, setMatchedHeaders] = useState<string>('');
  const [unmatchedFields, setUnmatchedFields] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);

  // 상단 스크롤바 ↔ 테이블 스크롤 동기화
  const handleTopScroll = useCallback(() => {
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  }, []);
  const handleTableScroll = useCallback(() => {
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, []);

  // 테이블 너비 변경 감지 → 상단 스크롤바 spacer 동기화
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const update = () => setTableScrollWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  const handleSearch = useCallback(async (filters: Record<string, unknown>) => {
    latestFiltersRef.current = filters;
    setIsLoading(true);
    try {
      const { data: result } = await getBomItems({
        vendorId,
        productSearch: filters.product_search as string,
        poNumber: filters.po_number as string,
        supplierCode: filters.vendor_code as string,
      });
      setData(result ?? []);
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  const handleExcel = useCallback(() => {
    exportToExcel(
      data as unknown as Record<string, unknown>[],
      excelColumns,
      `BOM입고현황_${new Date().toISOString().split('T')[0]}.xlsx`,
    );
  }, [data]);

  const parseExcel = useCallback((file: File) => {
    setUploadError(null);
    setSuccessMsg(null);

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      setUploadError(`엑셀 파일(.xlsx, .xls)만 업로드 가능합니다. (현재: ${file.name})`);
      return;
    }

    setIsParsing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        if (!sheet) throw new Error('시트를 찾을 수 없습니다.');

        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];

        let headerRowIdx = -1;
        let colMap: Partial<Record<keyof ParsedBomRow, number>> = {};

        for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
          const row = jsonData[i];
          if (!row) continue;
          const candidate = findColumnIndexes(row);
          const matchCount = Object.keys(candidate).length;
          if (matchCount >= 5) {
            headerRowIdx = i;
            colMap = candidate;
            break;
          }
        }

        if (headerRowIdx === -1) {
          const sampleHeaders = jsonData.slice(0, 10)
            .map((r, i) => `행${i}: [${(r ?? []).map(c => String(c ?? '')).filter(Boolean).join(', ')}]`)
            .join('\n');
          throw new Error(
            '헤더 행을 찾을 수 없습니다.\n' +
            'ebiz에서 다운로드한 BOM 입고현황 Excel 파일인지 확인해주세요.\n\n' +
            '감지된 Excel 상위 행:\n' + sampleHeaders
          );
        }

        const FIELD_LABELS: Record<string, string> = {
          manager_name: '담당자', instruction_date: '지시일', supplier_code: '공급업체',
          supplier_name: '공급업체명', purchase_document: '구매문서',
          parent_material_code: '상위자재코드', parent_material_name: '상위자재내역',
          purchase_quantity: '구매수량', purchase_unit: '구매단위',
          child_material_code: '하위자재코드', child_material_name: '하위자재내역',
          required_quantity: '소요량', required_unit: '소요단위',
          vendor_stock: '업체재고', shortage_quantity: '과부족수량',
        };

        const headerRow = jsonData[headerRowIdx] ?? [];
        const matched = Object.entries(colMap)
          .map(([field, idx]) => `${FIELD_LABELS[field] ?? field} → 열${idx}(${String(headerRow[idx] ?? '')})`)
          .join(', ');
        const allFields = Object.keys(HEADER_KEYWORDS) as (keyof ParsedBomRow)[];
        const missing = allFields
          .filter(f => colMap[f] === undefined)
          .map(f => FIELD_LABELS[f] ?? f)
          .join(', ');

        setMatchedHeaders(matched);
        setUnmatchedFields(missing);
        setRawHeaders(headerRow.map(c => String(c ?? '')).filter(Boolean).join(' | '));

        const str = (row: unknown[], key: keyof ParsedBomRow): string => {
          const idx = colMap[key];
          if (idx === undefined) return '';
          return String(row[idx] ?? '').trim();
        };

        const num = (row: unknown[], key: keyof ParsedBomRow): number => {
          const raw = str(row, key).replace(/[^\d.-]/g, '');
          return parseFloat(raw) || 0;
        };

        const rows: ParsedBomRow[] = [];
        let lastParentRow: Partial<ParsedBomRow> = {};

        for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every(c => !c)) continue;

          const childCode = str(row, 'child_material_code');
          const parentCode = str(row, 'parent_material_code');

          if (!childCode && !parentCode) continue;

          const managerName = str(row, 'manager_name');
          if (managerName || parentCode) {
            lastParentRow = {
              manager_name: managerName || lastParentRow.manager_name,
              instruction_date: str(row, 'instruction_date') || lastParentRow.instruction_date,
              supplier_code: str(row, 'supplier_code') || lastParentRow.supplier_code,
              supplier_name: str(row, 'supplier_name') || lastParentRow.supplier_name,
              purchase_document: str(row, 'purchase_document') || lastParentRow.purchase_document,
              parent_material_code: parentCode || lastParentRow.parent_material_code,
              parent_material_name: str(row, 'parent_material_name') || lastParentRow.parent_material_name,
              purchase_quantity: num(row, 'purchase_quantity') || lastParentRow.purchase_quantity,
              purchase_unit: str(row, 'purchase_unit') || lastParentRow.purchase_unit,
            };
          }

          rows.push({
            manager_name: lastParentRow.manager_name ?? '',
            instruction_date: lastParentRow.instruction_date ?? '',
            supplier_code: lastParentRow.supplier_code ?? '',
            supplier_name: lastParentRow.supplier_name ?? '',
            purchase_document: lastParentRow.purchase_document ?? '',
            parent_material_code: lastParentRow.parent_material_code ?? '',
            parent_material_name: lastParentRow.parent_material_name ?? '',
            purchase_quantity: lastParentRow.purchase_quantity ?? 0,
            purchase_unit: lastParentRow.purchase_unit ?? 'EA',
            child_material_code: childCode,
            child_material_name: str(row, 'child_material_name'),
            required_quantity: num(row, 'required_quantity'),
            required_unit: str(row, 'required_unit') || 'EA',
            vendor_stock: num(row, 'vendor_stock'),
            shortage_quantity: num(row, 'shortage_quantity'),
          });
        }

        if (rows.length === 0) {
          throw new Error('유효한 BOM 데이터를 찾을 수 없습니다.');
        }

        setParsedRows(rows);
      } catch (err) {
        console.error('BOM Excel parse error:', err);
        setUploadError(err instanceof Error ? err.message : '파일 처리 중 오류');
        setParsedRows([]);
      } finally {
        setIsParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleSave = useCallback(async () => {
    if (parsedRows.length === 0) return;
    setIsSaving(true);
    setUploadError(null);

    try {
      const inserts: BomItemInsert[] = parsedRows.map(r => ({
        vendor_id: null,
        manager_name: r.manager_name || null,
        instruction_date: r.instruction_date || null,
        supplier_code: r.supplier_code || null,
        supplier_name: r.supplier_name || null,
        purchase_document: r.purchase_document || null,
        parent_material_code: r.parent_material_code || null,
        parent_material_name: r.parent_material_name || null,
        purchase_quantity: r.purchase_quantity,
        purchase_unit: r.purchase_unit,
        status: computeStatus(r.shortage_quantity),
        child_material_code: r.child_material_code || null,
        child_material_name: r.child_material_name || null,
        required_quantity: r.required_quantity,
        required_unit: r.required_unit,
        vendor_stock: r.vendor_stock,
        shortage_quantity: r.shortage_quantity,
      }));

      const { error, count } = await createBomItems(inserts);
      if (error) throw error;

      setSuccessMsg(`${count}건의 BOM 데이터가 등록되었습니다.`);
      setParsedRows([]);
      setFileName('');
      setShowUpload(false);

      handleSearch({});
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error('BOM save error:', err);
      const errObj = err as Record<string, unknown>;
      const detail = errObj?.message || errObj?.details || errObj?.hint || JSON.stringify(err);
      setUploadError(`저장 실패: ${detail}`);
    } finally {
      setIsSaving(false);
    }
  }, [parsedRows, handleSearch]);

  const handleCancelUpload = useCallback(() => {
    setParsedRows([]);
    setFileName('');
    setUploadError(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseExcel(file);
  }, [parseExcel]);

  const filters: FilterConfig[] = [
    { key: 'search_type', label: '품목검색', type: 'radio', options: [
      { label: '코드', value: 'code' },
      { label: '명칭', value: 'name' },
    ], defaultValue: 'code' },
    { key: 'product_search', label: '', type: 'text', placeholder: '검색어 입력' },
    { key: 'po_number', label: 'PO번호', type: 'text' },
    { key: 'vendor_code', label: '협력사 코드', type: 'text', defaultValue: vendorCode ?? '' },
  ];

  const latestFiltersRef = useRef<Record<string, unknown>>({});

  const actions: ActionButton[] = [
    { label: '조회', icon: 'search', onClick: () => handleSearch(latestFiltersRef.current), variant: 'primary' },
    { label: 'EXCEL', icon: 'excel', onClick: handleExcel, variant: 'excel' },
  ];

  const excelColumns = [
    { key: 'manager_name', label: '담당자' },
    { key: 'instruction_date', label: '지시일' },
    { key: 'supplier_code', label: '공급업체' },
    { key: 'supplier_name', label: '공급업체명' },
    { key: 'purchase_document', label: '구매문서' },
    { key: 'parent_material_code', label: '상위자재코드' },
    { key: 'parent_material_name', label: '상위자재내역' },
    { key: 'purchase_quantity', label: '구매수량' },
    { key: 'purchase_unit', label: '구매단위' },
    { key: 'status', label: '상태' },
    { key: 'child_material_code', label: '하위자재코드' },
    { key: 'child_material_name', label: '하위자재내역' },
    { key: 'required_quantity', label: '소요량' },
    { key: 'required_unit', label: '소요단위' },
    { key: 'vendor_stock', label: '업체재고' },
    { key: 'shortage_quantity', label: '과부족수량' },
  ];

  const groups = useMemo(() => groupByParent(data), [data]);

  const flatRows = useMemo(() => {
    const rows: { row: BomItem; isFirst: boolean; span: number; globalIdx: number; groupIdx: number }[] = [];
    let idx = 0;
    let gIdx = 0;
    for (const group of groups) {
      for (let i = 0; i < group.rows.length; i++) {
        rows.push({
          row: group.rows[i],
          isFirst: i === 0,
          span: group.rows.length,
          globalIdx: idx++,
          groupIdx: gIdx,
        });
      }
      gIdx++;
    }
    return rows;
  }, [groups]);

  const previewGroups = useMemo(() => {
    const g: { parent: string; rows: ParsedBomRow[] }[] = [];
    let cur: { parent: string; rows: ParsedBomRow[] } | null = null;
    for (const r of parsedRows) {
      if (!cur || cur.parent !== r.parent_material_code) {
        cur = { parent: r.parent_material_code, rows: [] };
        g.push(cur);
      }
      cur.rows.push(r);
    }
    return g;
  }, [parsedRows]);

  const thClass = 'px-2 py-2 font-semibold border-r border-red-900/30 last:border-r-0 text-xs whitespace-nowrap';
  const tdClass = 'px-2 py-1.5 border-r border-slate-100 last:border-r-0 text-xs whitespace-nowrap';

  return (
    <div className="space-y-3">
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-green-700 text-sm font-medium">{successMsg}</span>
        </div>
      )}

      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <span className="text-red-500">✕</span>
          <span className="text-red-700 text-sm whitespace-pre-line">{uploadError}</span>
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => { setShowUpload(!showUpload); handleCancelUpload(); }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              showUpload
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {showUpload ? '✕ 업로드 닫기' : '📤 SAP Excel 업로드'}
          </button>
        </div>
      )}

      {showUpload && parsedRows.length === 0 && (
        <div
          className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-300'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isParsing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-600">파일 분석 중...</p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-600 mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="M12 18v-6"/>
                  <path d="M9 15l3-3 3 3"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                ebiz BOM 입고현황 Excel 파일을 드래그하거나 클릭
              </p>
              <p className="text-xs text-slate-400">
                ebiz &gt; 외주임가공 &gt; BOM 입고현황 &gt; [EXCEL] 버튼으로 다운로드한 파일
              </p>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileInputRef}
            onChange={e => { const f = e.target.files?.[0]; if (f) parseExcel(f); }}
            className="hidden"
          />
        </div>
      )}

      {parsedRows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">업로드 미리보기</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fileName} · {previewGroups.length}개 상위자재 · {parsedRows.length}건 하위자재
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600">{parsedRows.length}</div>
              <div className="text-[10px] text-slate-400">총 건수</div>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 space-y-1">
            <p className="text-[10px] text-slate-400">
              <span className="font-semibold">Excel 헤더:</span> {rawHeaders}
            </p>
            <p className="text-[10px] text-green-600">
              <span className="font-semibold">매칭됨:</span> {matchedHeaders}
            </p>
            {unmatchedFields && (
              <p className="text-[10px] text-red-500">
                <span className="font-semibold">미매칭:</span> {unmatchedFields}
              </p>
            )}
          </div>

          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-slate-600">상위자재코드</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-600">상위자재내역</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-600">구매수량</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-600">하위자재코드</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-600">하위자재내역</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-600">소요량</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-600">업체재고</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-600">과부족</th>
                  <th className="px-2 py-2 text-center font-semibold text-slate-600">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewGroups.map((group, gi) => (
                  group.rows.map((r, ri) => (
                    <tr key={`${gi}-${ri}`} className="hover:bg-slate-50">
                      {ri === 0 && (
                        <>
                          <td className="px-2 py-1.5 font-mono text-slate-600" rowSpan={group.rows.length}>{r.parent_material_code}</td>
                          <td className="px-2 py-1.5 text-slate-800" rowSpan={group.rows.length}>{r.parent_material_name}</td>
                          <td className="px-2 py-1.5 text-right text-slate-700" rowSpan={group.rows.length}>{r.purchase_quantity.toLocaleString()}</td>
                        </>
                      )}
                      <td className="px-2 py-1.5 font-mono text-slate-500">{r.child_material_code}</td>
                      <td className="px-2 py-1.5 text-slate-700">{r.child_material_name}</td>
                      <td className="px-2 py-1.5 text-right">{r.required_quantity.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{r.vendor_stock.toLocaleString()}</td>
                      <td className={`px-2 py-1.5 text-right ${r.shortage_quantity < 0 ? 'text-red-600 font-semibold' : ''}`}>
                        {r.shortage_quantity.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <StatusDot status={computeStatus(r.shortage_quantity)} />
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={handleCancelUpload}
              disabled={isSaving}
              className="px-4 py-2 rounded text-sm text-slate-600 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>✓ {parsedRows.length}건 등록하기</>
              )}
            </button>
          </div>
        </div>
      )}

      <FilterBar filters={filters} onSearch={handleSearch} actions={actions} />

      <p className="text-xs text-slate-600 mb-1 font-medium">
        <span className="inline-block w-1.5 h-1.5 bg-slate-800 rounded-full mr-1 relative top-[-1px]" />
        총 {data.length}건
      </p>

      {/* 상단 가로 스크롤바 */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className="overflow-x-auto -mx-4 sm:mx-0"
        style={{ height: '14px', marginBottom: '-1px' }}
      >
        <div style={{ width: tableScrollWidth || '100%', height: '1px' }} />
      </div>

      <div
        ref={tableContainerRef}
        onScroll={handleTableScroll}
        className="border border-slate-200 rounded overflow-auto max-h-[70vh] -mx-4 sm:mx-0"
      >
        <table className="w-full text-xs whitespace-nowrap border-collapse min-w-[1100px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#8B1A1A] text-white">
              <th className={`${thClass} w-8 text-center sticky left-0 z-30 bg-[#8B1A1A]`}>#</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '60px' }}>담당자</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '80px' }}>지시일</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '70px' }}>공급업체</th>
              <th className={thClass} style={{ minWidth: '110px' }}>공급업체명</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '90px' }}>구매문서</th>
              <th className={thClass} style={{ minWidth: '100px' }}>상위자재코드</th>
              <th className={thClass} style={{ minWidth: '150px' }}>상위자재내역</th>
              <th className={`${thClass} text-right`} style={{ minWidth: '70px' }}>구매수량</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '50px' }}>구매단위</th>
              <th className={thClass} style={{ minWidth: '100px' }}>하위자재코드</th>
              <th className={thClass} style={{ minWidth: '150px' }}>하위자재내역</th>
              <th className={`${thClass} text-right`} style={{ minWidth: '70px' }}>소요량</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '50px' }}>소요단위</th>
              <th className={`${thClass} text-right`} style={{ minWidth: '70px' }}>업체재고</th>
              <th className={`${thClass} text-right`} style={{ minWidth: '80px' }}>과부족수량</th>
              <th className={`${thClass} text-center`} style={{ minWidth: '40px' }}>상태</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {Array.from({ length: 17 }).map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + Math.random() * 50}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-4 py-12 text-center text-slate-400">
                  데이터가 없습니다. SAP Excel을 업로드해주세요.
                </td>
              </tr>
            ) : (
              flatRows.map(({ row, isFirst, span, globalIdx, groupIdx }) => {
                const shortage = Number(row.shortage_quantity ?? 0);
                return (
                  <tr
                    key={row.id ?? globalIdx}
                    className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors"
                  >
                    {isFirst && (
                      <>
                        <td className={`${tdClass} text-center text-slate-500 bg-slate-50 sticky left-0 z-10`} rowSpan={span}>
                          {groupIdx + 1}
                        </td>
                        <td className={`${tdClass} text-center`} rowSpan={span}>
                          {row.manager_name ?? ''}
                        </td>
                        <td className={`${tdClass} text-center`} rowSpan={span}>
                          {row.instruction_date ?? ''}
                        </td>
                        <td className={`${tdClass} text-center`} rowSpan={span}>
                          {row.supplier_code ?? ''}
                        </td>
                        <td className={tdClass} rowSpan={span}>
                          {row.supplier_name ?? ''}
                        </td>
                        <td className={`${tdClass} text-center`} rowSpan={span}>
                          {row.purchase_document ?? ''}
                        </td>
                        <td className={tdClass} rowSpan={span}>
                          {row.parent_material_code ?? ''}
                        </td>
                        <td className={tdClass} rowSpan={span}>
                          {row.parent_material_name ?? ''}
                        </td>
                        <td className={`${tdClass} text-right`} rowSpan={span}>
                          {Number(row.purchase_quantity ?? 0).toLocaleString()}
                        </td>
                        <td className={`${tdClass} text-center`} rowSpan={span}>
                          {row.purchase_unit ?? ''}
                        </td>
                      </>
                    )}

                    <td className={tdClass}>{row.child_material_code ?? ''}</td>
                    <td className={tdClass}>{row.child_material_name ?? ''}</td>
                    <td className={`${tdClass} text-right`}>{Number(row.required_quantity ?? 0).toLocaleString()}</td>
                    <td className={`${tdClass} text-center`}>{row.required_unit ?? ''}</td>
                    <td className={`${tdClass} text-right`}>{Number(row.vendor_stock ?? 0).toLocaleString()}</td>
                    <td className={`${tdClass} text-right`}>
                      <span className={shortage < 0 ? 'text-red-600 font-semibold' : ''}>
                        {shortage.toLocaleString()}
                      </span>
                    </td>
                    <td className={`${tdClass} text-center`}>
                      <StatusDot status={computeStatus(shortage)} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
