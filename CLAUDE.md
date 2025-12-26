# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build
```

**Environment Setup:** Set `GEMINI_API_KEY` in `.env.local` for Gemini AI integration.

## Architecture Overview

This is a **React 19 + Vite + TypeScript** order management system that uses Google Gemini AI to parse order documents and distribute them to vendors.

### Core Flow
1. **Admin** uploads order document (image/text) → Gemini AI parses it into structured order items
2. System auto-generates 6-digit access codes for each vendor
3. **Vendors** access their orders via the code and mark items as completed

### Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, global state (orders, vendorCodes, auth), localStorage persistence |
| `services/geminiService.ts` | Gemini API integration for order parsing |
| `components/AdminDashboard.tsx` | Order upload (image/text), vendor management, code generation |
| `components/VendorPortal.tsx` | Vendor order view with completion checkboxes |
| `components/LoginScreen.tsx` | Dual auth: 9-digit (admin) or 6-digit (vendor) codes |
| `types.ts` | TypeScript interfaces: `OrderItem`, `VendorGroup`, `User`, `AppView` enum |

### State Management

- **No Redux/Context** - uses React hooks with localStorage persistence
- **localStorage keys:** `daily_orders`, `vendor_codes`, `auth_user`
- **sessionStorage:** `auth_user` (for non-persistent sessions)
- **URL hash:** `#portal/[code]` enables direct vendor access

### Gemini AI Integration

`geminiService.ts` parses orders using:
- `gemini-2.5-flash-latest` for images (base64 PNG/JPEG)
- `gemini-3-flash-preview` for text input

Extracts: vendor (외주처), product (품명), quantity (수량), delivery date (납기요청일), notes (특이사항)

### Styling

- Tailwind CSS loaded via CDN in `index.html`
- Pretendard Korean font via CDN
- ES modules imported from esm.sh (React, Genai, UUID)
