# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (Vite default port)
npm run build        # Build for production
npm run preview      # Preview production build
```

**Environment Setup:** Set `API_KEY` (Gemini API key) via environment variable. The app reads `process.env.API_KEY` in `geminiService.ts`.

## Architecture Overview

This is a **React 19 + Vite + TypeScript** order management system that uses Google Gemini AI to parse order documents and distribute them to vendors.

### Core Flow
1. **Admin** uploads order document (image/Excel/text) → Gemini AI parses it into structured order items
2. System assigns predefined 6-digit codes for known vendors, generates random codes for new ones
3. **Vendors** login with their fixed 6-digit code to view and mark orders as completed

### Authentication

- **Admin:** Any 9-digit code grants admin access
- **Vendors:** Only predefined 6-digit codes work (defined in `VALID_VENDOR_CODES` in `App.tsx`)
- Known vendors: 위드맘, 그램, 리니어, 디딤테크, 씨엘로, 신세계, 엠큐브, 메이코스
- `#portal/[code]` URL hash enables direct vendor access links

### State Management

- **No Redux/Context** - uses React hooks with localStorage persistence
- **localStorage keys:** `daily_orders`, `vendor_codes`, `auth_user`
- **sessionStorage:** `auth_user` (for non-persistent "Remember Me" unchecked sessions)

### Gemini AI Integration

`services/geminiService.ts` uses `gemini-2.0-flash` model with structured JSON output schema.

**Input types:**
- Images (PNG/JPEG) - sent as base64 inline data
- Excel files (.xlsx/.xls) - converted to CSV text via `xlsx` library
- Raw text - sent directly

**Extracts:** vendor (외주처), product (품명), productCode (제품코드), quantity (수량), deliveryDate (납기요청일), notes (특이사항)

### Report Feature

`AdminDashboard.tsx` includes a monthly report tab that:
- Filters orders where `productCode` starts with "9"
- Compares against predefined monthly targets per vendor (`VENDOR_TARGETS`)
- Displays achievement rate bar charts

### Styling

- Tailwind CSS via CDN (`index.html`)
- Pretendard Korean font via CDN
