/**
 * FileUpload 컴포넌트
 * 드래그앤드롭 파일 업로드 및 엑셀 파싱/미리보기 기능
 */

import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { Vendor, OrderInsert } from '@/types/database';

// 유효한 외주처 목록
const VALID_VENDORS = ['리니어', '그램', '위드맘', '씨엘로', '신세계', '메이코스', '엠큐브'];

interface ParsedOrder {
  vendorName: string;
  productName: string;
  productCode: string;
  quantity: number;
}

interface FileUploadProps {
  vendors: Vendor[];
  userId?: string;
  onUploadComplete: (orders: OrderInsert[], fileName: string, orderDate: string) => Promise<void>;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  vendors,
  userId,
  onUploadComplete,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 미리보기 상태
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [orderDate, setOrderDate] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 외주처 이름으로 vendor_id 찾기
  const getVendorId = useCallback((vendorName: string): string | null => {
    const vendor = vendors.find(v => v.name === vendorName);
    return vendor?.id || null;
  }, [vendors]);

  // 파일명에서 날짜 추출
  const extractDateFromFileName = useCallback((name: string): string => {
    // 예: "외주출고 제출자료 25.12.31.xlsx" -> "2025-12-31"
    const yymmddMatch = name.match(/(\d{2})\.(\d{1,2})\.(\d{1,2})/);
    if (yymmddMatch) {
      const year = parseInt(yymmddMatch[1]) + 2000;
      const month = yymmddMatch[2].padStart(2, '0');
      const day = yymmddMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const mmddMatch = name.match(/(\d{1,2})\.(\d{1,2})(?=\.xlsx?$)/i);
    if (mmddMatch) {
      const today = new Date();
      const year = today.getFullYear();
      const month = mmddMatch[1].padStart(2, '0');
      const day = mmddMatch[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 날짜를 못 찾으면 오늘 날짜 사용
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  // 엑셀 시트 파싱
  const parseExcelSheet = useCallback((sheet: XLSX.WorkSheet): ParsedOrder[] => {
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    // 헤더 행 찾기 (외주처, 품명, sap코드, 수량 포함된 행)
    let headerRowIndex = -1;
    const colIndexes = { vendor: -1, product: -1, sapCode: -1, quantity: -1 };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;

      row.forEach((cell, j) => {
        const cellStr = String(cell || '').trim().toLowerCase();
        if (cellStr.includes('외주처')) colIndexes.vendor = j;
        if (cellStr.includes('품명')) colIndexes.product = j;
        if (cellStr.includes('sap') || cellStr === '코드' || cellStr.includes('제품코드')) colIndexes.sapCode = j;
        if (cellStr.includes('수량')) colIndexes.quantity = j;
      });

      if (colIndexes.vendor !== -1 && colIndexes.product !== -1) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('헤더 행을 찾을 수 없습니다. (외주처, 품명 열이 필요합니다)');
    }

    // 데이터 행 파싱 및 필터링
    const orders: ParsedOrder[] = [];

    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row) continue;

      const vendorName = String(row[colIndexes.vendor] || '').trim();
      if (!VALID_VENDORS.includes(vendorName)) continue;

      const productName = String(row[colIndexes.product] || '').trim();
      if (!productName) continue;

      // 제품코드(F열)가 1, 9, 3으로 시작하는 것만 필터링
      const productCode = colIndexes.sapCode !== -1 ? String(row[colIndexes.sapCode] || '').trim() : '';
      if (!productCode.startsWith('1') && !productCode.startsWith('9') && !productCode.startsWith('3')) {
        continue;
      }

      // 수량 파싱
      const quantityStr = String(row[colIndexes.quantity] || '').replace(/[^\d]/g, '');
      const quantity = parseInt(quantityStr) || 0;

      orders.push({
        vendorName,
        productName,
        productCode,
        quantity,
      });
    }

    return orders;
  }, []);

  // 파일 처리
  const processFile = useCallback(async (file: File) => {
    setError(null);
    setSuccessMessage(null);

    // 파일 확장자 확인
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      return;
    }

    setIsParsing(true);
    setFileName(file.name);
    const extractedDate = extractDateFromFileName(file.name);
    setOrderDate(extractedDate);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // 두 번째 시트 사용 (인덱스 1), 시트가 1개면 첫 번째 시트
      const sheetIndex = workbook.SheetNames.length > 1 ? 1 : 0;
      const sheetName = workbook.SheetNames[sheetIndex];
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        throw new Error(`시트를 찾을 수 없습니다.\n사용 가능한 시트: ${workbook.SheetNames.join(', ')}`);
      }

      const orders = parseExcelSheet(sheet);

      if (orders.length === 0) {
        throw new Error('유효한 발주 데이터를 찾을 수 없습니다.');
      }

      setParsedOrders(orders);
      setShowPreview(true);
    } catch (err) {
      console.error('엑셀 파싱 오류:', err);
      setError(err instanceof Error ? err.message : '엑셀 파일 처리 중 오류가 발생했습니다.');
      setParsedOrders([]);
      setShowPreview(false);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [extractDateFromFileName, parseExcelSheet]);

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  // 파일 선택 핸들러
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  // 등록 버튼 클릭
  const handleSubmit = useCallback(async () => {
    if (parsedOrders.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      // ParsedOrder를 OrderInsert로 변환
      const ordersToInsert: OrderInsert[] = parsedOrders
        .map(order => {
          const vendorId = getVendorId(order.vendorName);
          if (!vendorId) {
            console.warn(`외주처를 찾을 수 없습니다: ${order.vendorName}`);
            return null;
          }

          return {
            vendor_id: vendorId,
            product_name: order.productName,
            product_code: order.productCode,
            quantity: order.quantity,
            order_date: orderDate,
            uploaded_by: userId || null,
          };
        })
        .filter((order): order is OrderInsert => order !== null);

      if (ordersToInsert.length === 0) {
        throw new Error('등록할 수 있는 주문이 없습니다. 외주처 정보를 확인해주세요.');
      }

      await onUploadComplete(ordersToInsert, fileName, orderDate);

      setSuccessMessage(`${ordersToInsert.length}건의 발주가 등록되었습니다.`);
      setParsedOrders([]);
      setShowPreview(false);
      setFileName('');
      setOrderDate('');

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('저장 오류:', err);
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [parsedOrders, orderDate, fileName, userId, getVendorId, onUploadComplete]);

  // 취소 버튼 클릭
  const handleCancel = useCallback(() => {
    setParsedOrders([]);
    setShowPreview(false);
    setFileName('');
    setOrderDate('');
    setError(null);
  }, []);

  // 외주처별 그룹화
  const groupedOrders = parsedOrders.reduce((acc, order) => {
    if (!acc[order.vendorName]) {
      acc[order.vendorName] = [];
    }
    acc[order.vendorName].push(order);
    return acc;
  }, {} as Record<string, ParsedOrder[]>);

  return (
    <div className="space-y-6">
      {/* 성공 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="text-green-700 font-medium">{successMessage}</span>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* 미리보기가 아닐 때: 드래그앤드롭 영역 */}
      {!showPreview && (
        <div
          className={`bg-white p-8 rounded-2xl shadow-sm border-2 border-dashed transition-all cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <div className={`mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full transition-colors ${
              isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-green-50 text-green-600'
            }`}>
              {isParsing ? (
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <path d="M12 18v-6"/>
                  <path d="M9 15l3-3 3 3"/>
                </svg>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {isParsing ? '파일 분석 중...' : '파일 업로드'}
            </h3>

            <p className="text-sm text-slate-500 mb-4">
              {isDragOver ? (
                '여기에 파일을 놓으세요'
              ) : (
                <>
                  발주서 엑셀 파일을 여기로 드래그하거나 클릭해서 선택하세요.<br/>
                  <span className="text-xs text-slate-400">.xlsx, .xls 파일만 가능</span>
                </>
              )}
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
              disabled={isParsing}
            />
          </div>
        </div>
      )}

      {/* 미리보기 */}
      {showPreview && parsedOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* 헤더 */}
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">파싱 결과 미리보기</h3>
                <p className="text-sm text-slate-500 mt-1">
                  파일: <span className="font-medium text-slate-700">{fileName}</span>
                  <span className="mx-2">|</span>
                  발주일: <span className="font-medium text-blue-600">{orderDate}</span>
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{parsedOrders.length}</div>
                <div className="text-xs text-slate-500">총 발주 건수</div>
              </div>
            </div>
          </div>

          {/* 외주처별 요약 */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h4 className="text-sm font-semibold text-slate-600 mb-3">외주처별 발주 현황</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(groupedOrders).map(([vendorName, orders]) => (
                <div
                  key={vendorName}
                  className="px-3 py-2 bg-slate-100 rounded-lg text-sm"
                >
                  <span className="font-medium text-slate-700">{vendorName}</span>
                  <span className="ml-2 text-blue-600 font-bold">{orders.length}건</span>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 목록 */}
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">외주처</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">제품코드</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">품명</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedOrders.map((order, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 font-medium">{order.vendorName}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{order.productCode}</td>
                    <td className="px-4 py-3 text-slate-800">{order.productName}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-bold">{order.quantity.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 액션 버튼 */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  등록하기
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
