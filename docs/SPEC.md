# Vercel + Supabase 배포 프로젝트 Spec 문서

## 1. 현재 상태 분석

### 1.1 현재 아키텍처
- **프론트엔드 전용** React 19 + Vite + TypeScript 앱
- **데이터 저장**: localStorage/sessionStorage (브라우저 로컬)
- **인증**: 6자리(외주처) / 9자리(관리자) 코드 기반 (보안 취약)
- **외부 API**: Google Gemini AI (문서 파싱용)

### 1.2 주요 문제점
1. 데이터베이스 없음 - 브라우저 스토리지에 의존
2. 보안 취약 - 아무 9자리 코드로 관리자 접근 가능
3. 사용자 관리 없음 - 하드코딩된 외주처 코드
4. 배포 불가능 - 로컬 스토리지는 공유되지 않음

---

## 2. 목표 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              React Frontend (Static)                     ││
│  │  - Google OAuth 로그인                                   ││
│  │  - 드래그앤드롭 Excel 업로드                              ││
│  │  - 관리자/사용자 대시보드                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       Supabase                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   PostgreSQL    │  │  Auth (OAuth)   │  │   Storage    │ │
│  │  - users        │  │  - Google       │  │  - uploads   │ │
│  │  - vendors      │  │  - JWT tokens   │  │              │ │
│  │  - orders       │  │  - RLS policies │  │              │ │
│  │  - targets      │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 스키마

### 3.1 users 테이블
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 첫 번째 가입자 자동 admin 트리거
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM users) = 0 THEN
    NEW.role := 'admin';
    NEW.is_active := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER first_user_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_as_admin();
```

### 3.2 vendors 테이블
```sql
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL CHECK (LENGTH(code) = 6),
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 외주처 데이터 시드
INSERT INTO vendors (name, code) VALUES
  ('위드맘', '200131'),
  ('그램', '200216'),
  ('리니어', '200101'),
  ('디딤테크', '308803'),
  ('씨엘로', '200008'),
  ('신세계', '200004'),
  ('엠큐브', '111111'),
  ('메이코스', '222222');
```

### 3.3 orders 테이블
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_code TEXT,
  quantity INTEGER NOT NULL,
  delivery_date DATE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_vendor ON orders(vendor_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_product_code ON orders(product_code);
```

### 3.4 vendor_targets 테이블
```sql
CREATE TABLE vendor_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  target_quantity INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, year, month)
);

-- 기존 목표 데이터 시드 (현재 월 기준)
INSERT INTO vendor_targets (vendor_id, target_quantity, year, month)
SELECT v.id, t.target, EXTRACT(YEAR FROM NOW())::INT, EXTRACT(MONTH FROM NOW())::INT
FROM vendors v
JOIN (VALUES
  ('그램', 480000),
  ('디딤테크', 1600000),
  ('리니어', 1600000),
  ('메이코스', 1000000),
  ('씨엘로', 1600000),
  ('엠큐브', 1000000),
  ('위드맘', 1600000)
) AS t(name, target) ON v.name = t.name;
```

### 3.5 file_uploads 테이블
```sql
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  order_count INTEGER NOT NULL,
  order_date DATE NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.6 Row Level Security (RLS) 정책
```sql
-- RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Users: 관리자만 전체 조회/수정, 본인은 읽기만
CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view self" ON users
  FOR SELECT USING (auth.uid() = id);

-- Vendors: 활성 사용자만 조회, 관리자만 수정
CREATE POLICY "Active users can view vendors" ON vendors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admin can manage vendors" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: 활성 사용자만 조회, 관리자만 추가/삭제
CREATE POLICY "Active users can view orders" ON orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admin can manage orders" ON orders
  FOR INSERT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can delete orders" ON orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: 모든 활성 사용자가 완료 상태 업데이트 가능
CREATE POLICY "Active users can update completion" ON orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_active = true)
  );
```

---

## 4. 프로젝트 구조 변경

### 4.1 새로운 폴더 구조
```
Order-management-program/
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx      # 수정
│   │   ├── VendorPortal.tsx        # 수정
│   │   ├── LoginScreen.tsx         # Google OAuth로 교체
│   │   ├── UserManagement.tsx      # 신규: 사용자 관리
│   │   ├── FileUpload.tsx          # 신규: 드래그앤드롭 업로드
│   │   ├── VendorCard.tsx          # 유지
│   │   └── Button.tsx              # 유지
│   │
│   ├── lib/
│   │   ├── supabase.ts             # 신규: Supabase 클라이언트
│   │   └── auth.tsx                # 신규: Auth Context/Hook
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # 신규: 인증 훅
│   │   ├── useOrders.ts            # 신규: 주문 데이터 훅
│   │   ├── useVendors.ts           # 신규: 외주처 데이터 훅
│   │   └── useUsers.ts             # 신규: 사용자 관리 훅
│   │
│   ├── services/
│   │   ├── geminiService.ts        # 유지 (환경변수 수정)
│   │   ├── orderService.ts         # 신규: 주문 CRUD
│   │   ├── vendorService.ts        # 신규: 외주처 CRUD
│   │   └── userService.ts          # 신규: 사용자 CRUD
│   │
│   ├── types/
│   │   └── index.ts                # types.ts 이동 및 확장
│   │
│   ├── App.tsx                     # 수정
│   └── main.tsx                    # index.tsx 이동
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # 신규: DB 마이그레이션
│   └── seed.sql                    # 신규: 초기 데이터
│
├── docs/
│   └── SETUP_GUIDE.md              # 신규: Vercel/Supabase 설정 가이드
│
├── samples/
│   └── sample_orders.xlsx          # 신규: 샘플 Excel 파일
│
├── .env.local                      # 로컬 환경변수
├── .env.example                    # 환경변수 템플릿
├── vercel.json                     # Vercel 설정
└── package.json                    # 의존성 업데이트
```

---

## 5. 환경 변수

### 5.1 로컬 개발 (.env.local)
```env
# Supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### 5.2 Vercel 프로덕션
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

---

## 6. 핵심 코드 변경 사항

### 6.1 Supabase 클라이언트 (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
```

### 6.2 Auth Context (src/lib/auth.tsx)
```typescript
// Google OAuth 로그인
const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  if (error) throw error;
};

// 로그아웃
const signOut = async () => {
  await supabase.auth.signOut();
};

// 세션 체크 및 사용자 정보 동기화
const syncUserProfile = async (authUser) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select()
    .eq('id', authUser.id)
    .single();

  if (!existingUser) {
    // 첫 로그인 - 프로필 생성 (트리거가 첫 사용자를 admin으로 설정)
    await supabase.from('users').insert({
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata.full_name,
      avatar_url: authUser.user_metadata.avatar_url
    });
  }
};
```

### 6.3 사용자 관리 (src/components/UserManagement.tsx)
```typescript
// 관리자 전용 페이지
// - 전체 사용자 목록 조회
// - 사용자 활성화/비활성화 토글
// - 사용자 권한(admin/user) 변경
// - 마지막 admin은 권한 변경 불가
```

### 6.4 주문 서비스 (src/services/orderService.ts)
```typescript
// 주문 조회 (외주처별 필터링)
export const getOrders = async (vendorId?: string) => {
  let query = supabase.from('orders').select(`
    *,
    vendor:vendors(name, code)
  `);

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  return query.order('order_date', { ascending: false });
};

// 주문 추가 (Excel 파싱 후)
export const createOrders = async (orders: NewOrder[]) => {
  return supabase.from('orders').insert(orders);
};

// 완료 상태 토글
export const toggleOrderCompletion = async (orderId: string) => {
  const { data: order } = await supabase
    .from('orders')
    .select('is_completed')
    .eq('id', orderId)
    .single();

  return supabase
    .from('orders')
    .update({
      is_completed: !order?.is_completed,
      completed_at: !order?.is_completed ? new Date().toISOString() : null
    })
    .eq('id', orderId);
};
```

---

## 7. 프론트엔드 UI 변경

### 7.1 로그인 화면 변경
- 기존: 6/9자리 코드 입력
- 변경: "Google로 로그인" 버튼 단일화
- 첫 로그인 시 자동 회원가입 + admin 권한 부여

### 7.2 관리자 대시보드 추가 기능
- 새 탭: "사용자 관리"
  - 사용자 목록 테이블 (이메일, 이름, 권한, 활성 상태, 가입일)
  - 활성화 토글 스위치
  - 권한 드롭다운 (admin/user)

### 7.3 파일 업로드 개선
- 드래그앤드롭 영역 추가
- 업로드 진행률 표시
- 파싱 결과 미리보기 후 확정

---

## 8. 구현 순서

### Phase 1: 기반 설정 (1단계)
1. [ ] 패키지 의존성 추가 (@supabase/supabase-js)
2. [ ] 프로젝트 구조 재편 (src/ 폴더 생성)
3. [ ] 환경 변수 설정 (.env.example, .env.local)
4. [ ] Supabase 클라이언트 초기화
5. [ ] 샘플 Excel 파일 생성

### Phase 2: Supabase 설정 (2단계)
6. [ ] 데이터베이스 스키마 마이그레이션 파일 작성
7. [ ] RLS 정책 설정
8. [ ] 초기 데이터 시드 (외주처, 목표)
9. [ ] Google OAuth 설정

### Phase 3: 인증 시스템 (3단계)
10. [ ] Auth Context 구현
11. [ ] useAuth 훅 구현
12. [ ] LoginScreen Google OAuth로 교체
13. [ ] 라우팅/보호된 경로 설정

### Phase 4: 데이터 마이그레이션 (4단계)
14. [ ] orderService 구현
15. [ ] vendorService 구현
16. [ ] userService 구현
17. [ ] 기존 컴포넌트 localStorage → Supabase 연동

### Phase 5: 사용자 관리 (5단계)
18. [ ] UserManagement 컴포넌트 구현
19. [ ] 사용자 활성화/비활성화 기능
20. [ ] 권한 변경 기능
21. [ ] AdminDashboard에 탭 추가

### Phase 6: 파일 업로드 개선 (6단계)
22. [ ] FileUpload 드래그앤드롭 컴포넌트
23. [ ] 업로드 → DB 저장 플로우 연결
24. [ ] 업로드 이력 표시

### Phase 7: 배포 준비 (7단계)
25. [ ] vercel.json 설정
26. [ ] SETUP_GUIDE.md 작성
27. [ ] 빌드 테스트
28. [ ] 로컬 Supabase 테스트

---

## 9. 검증 방법

### 9.1 로컬 테스트
```bash
# 1. Supabase 로컬 시작
npx supabase start

# 2. 마이그레이션 적용
npx supabase db reset

# 3. 개발 서버 시작
npm run dev

# 4. 테스트 항목
- [ ] Google 로그인 동작
- [ ] 첫 사용자 admin 자동 설정
- [ ] 사용자 관리 페이지 접근 (admin만)
- [ ] Excel 업로드 → DB 저장
- [ ] 주문 목록 조회
- [ ] 주문 완료 토글
- [ ] 리포트 조회
```

### 9.2 Vercel 배포 테스트
```bash
# 1. Vercel CLI로 배포
vercel

# 2. 환경 변수 확인
# 3. Google OAuth 리디렉션 URL 확인
# 4. 동일 테스트 항목 수행
```

---

## 10. 수정이 필요한 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `App.tsx` | Auth 컨텍스트 래핑, 라우팅 추가 |
| `components/AdminDashboard.tsx` | localStorage → Supabase, 사용자 관리 탭 추가 |
| `components/VendorPortal.tsx` | localStorage → Supabase |
| `components/LoginScreen.tsx` | Google OAuth 버튼으로 교체 |
| `services/geminiService.ts` | 환경변수 경로 변경 |
| `types.ts` | Database 타입 추가, User 타입 확장 |
| `vite.config.ts` | 환경변수 처리 수정 |
| `package.json` | Supabase 의존성 추가 |

---

## 11. 신규 생성 파일

| 파일 | 용도 |
|------|------|
| `src/lib/supabase.ts` | Supabase 클라이언트 |
| `src/lib/auth.tsx` | Auth Context/Provider |
| `src/hooks/useAuth.ts` | 인증 훅 |
| `src/hooks/useOrders.ts` | 주문 데이터 훅 |
| `src/hooks/useVendors.ts` | 외주처 데이터 훅 |
| `src/hooks/useUsers.ts` | 사용자 관리 훅 |
| `src/services/orderService.ts` | 주문 CRUD |
| `src/services/vendorService.ts` | 외주처 CRUD |
| `src/services/userService.ts` | 사용자 CRUD |
| `src/components/UserManagement.tsx` | 사용자 관리 UI |
| `src/components/FileUpload.tsx` | 드래그앤드롭 업로드 |
| `supabase/migrations/001_initial_schema.sql` | DB 스키마 |
| `supabase/seed.sql` | 초기 데이터 |
| `docs/SETUP_GUIDE.md` | 설정 가이드 |
| `samples/sample_orders.xlsx` | 샘플 파일 |
| `.env.example` | 환경변수 템플릿 |
| `vercel.json` | Vercel 설정 |

---

## 12. Vercel & Supabase 설정 가이드 (SETUP_GUIDE.md 내용)

### 12.1 Supabase 설정

#### Step 1: Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인
4. "New Project" 클릭
5. 프로젝트 정보 입력:
   - **Name**: `order-management` (원하는 이름)
   - **Database Password**: 강력한 비밀번호 설정 (저장해두세요!)
   - **Region**: Northeast Asia (Tokyo) 선택 (한국에서 가장 빠름)
6. "Create new project" 클릭 (2-3분 소요)

#### Step 2: API 키 확인
1. 프로젝트 대시보드에서 좌측 메뉴 → "Settings" → "API"
2. 다음 정보를 메모:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

#### Step 3: Google OAuth 설정
1. **Google Cloud Console 설정:**
   - https://console.cloud.google.com 접속
   - 프로젝트 생성 또는 선택
   - 좌측 메뉴 → "APIs & Services" → "OAuth consent screen"
   - User Type: "External" 선택
   - 앱 정보 입력 후 저장

2. **OAuth 클라이언트 생성:**
   - "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Authorized redirect URIs 추가:
     - `https://[YOUR-PROJECT].supabase.co/auth/v1/callback`
   - "Create" 클릭
   - **Client ID**와 **Client Secret** 메모

3. **Supabase에 Google 연동:**
   - Supabase 대시보드 → "Authentication" → "Providers"
   - "Google" 클릭하여 활성화
   - Client ID, Client Secret 입력
   - "Save" 클릭

#### Step 4: 데이터베이스 스키마 적용
1. Supabase 대시보드 → "SQL Editor"
2. "New query" 클릭
3. 프로젝트의 `supabase/migrations/001_initial_schema.sql` 내용 복사/붙여넣기
4. "Run" 클릭

#### Step 5: 초기 데이터 입력
1. SQL Editor에서 새 쿼리
2. `supabase/seed.sql` 내용 실행

---

### 12.2 Vercel 설정

#### Step 1: Vercel 계정 및 프로젝트 생성
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Add New..." → "Project"
4. GitHub 리포지토리 연결 (Order-management-program)
5. 프레임워크 자동 감지됨 (Vite)

#### Step 2: 환경 변수 설정
1. 프로젝트 설정 → "Environment Variables"
2. 다음 변수 추가:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_GEMINI_API_KEY` | `your-gemini-api-key` |

3. "Save" 클릭

#### Step 3: 배포
1. "Deploy" 클릭
2. 빌드 완료 대기 (1-2분)
3. 배포된 URL 확인 (예: `https://order-management-xxx.vercel.app`)

#### Step 4: Google OAuth 리디렉션 URL 추가
1. Google Cloud Console → Credentials → OAuth 2.0 Client
2. Authorized redirect URIs에 추가:
   - `https://your-vercel-url.vercel.app/auth/callback`
3. 저장

---

### 12.3 로컬 개발 환경 설정

#### Step 1: Supabase CLI 설치
```bash
# Windows (PowerShell 관리자 권한)
scoop install supabase

# 또는 npm으로 설치
npm install -g supabase
```

#### Step 2: Supabase 로컬 시작
```bash
# 프로젝트 폴더에서
npx supabase init
npx supabase start
```

출력되는 정보 확인:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Step 3: 로컬 환경 변수 설정
`.env.local` 파일 수정:
```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=your-gemini-api-key
```

#### Step 4: 로컬 Google OAuth 설정
로컬 개발 시 Google OAuth 테스트를 위해:
1. Google Cloud Console에서 redirect URI 추가:
   - `http://127.0.0.1:54321/auth/v1/callback`
2. Supabase 로컬 대시보드 (http://127.0.0.1:54323) 접속
3. Authentication → Providers → Google 설정

#### Step 5: 개발 서버 시작
```bash
npm run dev
```

---

### 12.4 문제 해결

#### "Invalid login credentials" 에러
- Supabase 대시보드에서 Google Provider가 활성화되어 있는지 확인
- Client ID/Secret이 올바른지 확인

#### "OAuth callback error" 에러
- Redirect URI가 정확히 일치하는지 확인
- Supabase URL 끝에 슬래시(/) 없이 입력했는지 확인

#### 배포 후 화면이 안 보일 때
- Vercel 환경 변수가 `VITE_` 접두사로 시작하는지 확인
- 재배포 필요할 수 있음 (환경 변수 변경 후)

#### 로컬 Supabase 연결 안 될 때
```bash
# Docker가 실행 중인지 확인
docker ps

# Supabase 재시작
npx supabase stop
npx supabase start
```
