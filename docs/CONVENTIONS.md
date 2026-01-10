# Development Conventions (서브에이전트 필독)

이 문서는 프로젝트 전체에서 일관성을 유지하기 위한 규칙입니다.
**모든 서브에이전트는 작업 전에 반드시 이 문서를 읽어야 합니다.**

---

## 1. 프로젝트 구조

```
Order-management-program/
├── src/
│   ├── components/     # React 컴포넌트
│   ├── lib/            # Supabase 클라이언트, Auth Context
│   ├── hooks/          # Custom React Hooks
│   ├── services/       # API/DB 서비스 레이어
│   ├── types/          # TypeScript 타입 정의
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/     # DB 마이그레이션
│   └── seed.sql        # 초기 데이터
├── docs/               # 문서
└── samples/            # 샘플 파일
```

---

## 2. 데이터베이스 스키마 (PostgreSQL)

### 2.1 테이블 구조

#### users
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Supabase Auth의 user.id와 동일 |
| `email` | TEXT UNIQUE | 이메일 |
| `name` | TEXT | 이름 |
| `avatar_url` | TEXT | 프로필 이미지 URL |
| `role` | TEXT ('admin' \| 'user') | 권한 |
| `is_active` | BOOLEAN | 활성화 상태 |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

#### vendors
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | 자동 생성 |
| `name` | TEXT UNIQUE | 외주처 이름 |
| `code` | TEXT UNIQUE | 6자리 코드 |
| `contact_email` | TEXT | 연락처 이메일 |
| `is_active` | BOOLEAN | 활성화 상태 |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

#### orders
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | 자동 생성 |
| `vendor_id` | UUID (FK) | vendors.id 참조 |
| `product_name` | TEXT | 품명 |
| `product_code` | TEXT | 제품코드 |
| `quantity` | INTEGER | 수량 |
| `delivery_date` | DATE | 납기요청일 |
| `order_date` | DATE | 발주일 |
| `is_completed` | BOOLEAN | 완료 여부 |
| `completed_at` | TIMESTAMPTZ | 완료 시각 |
| `notes` | TEXT | 특이사항 |
| `uploaded_by` | UUID (FK) | users.id 참조 |
| `created_at` | TIMESTAMPTZ | 생성일 |
| `updated_at` | TIMESTAMPTZ | 수정일 |

#### vendor_targets
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | 자동 생성 |
| `vendor_id` | UUID (FK) | vendors.id 참조 |
| `target_quantity` | INTEGER | 목표 수량 |
| `year` | INTEGER | 연도 |
| `month` | INTEGER (1-12) | 월 |
| `created_at` | TIMESTAMPTZ | 생성일 |

#### file_uploads
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | 자동 생성 |
| `file_name` | TEXT | 파일명 |
| `order_count` | INTEGER | 등록된 주문 수 |
| `order_date` | DATE | 발주일 |
| `uploaded_by` | UUID (FK) | users.id 참조 |
| `created_at` | TIMESTAMPTZ | 생성일 |

---

## 3. TypeScript 타입 정의

### 3.1 Database Types (src/types/database.ts)

```typescript
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  vendor_id: string;
  product_name: string;
  product_code: string | null;
  quantity: number;
  delivery_date: string | null;
  order_date: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorTarget {
  id: string;
  vendor_id: string;
  target_quantity: number;
  year: number;
  month: number;
  created_at: string;
}

export interface FileUpload {
  id: string;
  file_name: string;
  order_count: number;
  order_date: string;
  uploaded_by: string;
  created_at: string;
}

// Join 타입
export interface OrderWithVendor extends Order {
  vendor: Pick<Vendor, 'name' | 'code'>;
}
```

### 3.2 Application Types (src/types/index.ts)

```typescript
export type AppView = 'LOGIN' | 'ADMIN_DASHBOARD' | 'VENDOR_PORTAL';

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// 새 주문 생성 시 사용
export interface NewOrder {
  vendor_id: string;
  product_name: string;
  product_code?: string;
  quantity: number;
  delivery_date?: string;
  order_date: string;
  notes?: string;
  uploaded_by?: string;
}
```

---

## 4. 환경 변수

```env
# Vite 환경 변수 (VITE_ 접두사 필수)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

**코드에서 접근:**
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
```

---

## 5. Supabase 클라이언트 사용법

### 5.1 클라이언트 임포트
```typescript
import { supabase } from '@/lib/supabase';
```

### 5.2 데이터 조회
```typescript
// 단일 조회
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// 목록 조회 (Join 포함)
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    vendor:vendors(name, code)
  `)
  .order('order_date', { ascending: false });
```

### 5.3 데이터 삽입
```typescript
const { data, error } = await supabase
  .from('orders')
  .insert([{ vendor_id, product_name, quantity }])
  .select();
```

### 5.4 데이터 업데이트
```typescript
const { data, error } = await supabase
  .from('orders')
  .update({ is_completed: true, completed_at: new Date().toISOString() })
  .eq('id', orderId)
  .select();
```

### 5.5 데이터 삭제
```typescript
const { error } = await supabase
  .from('orders')
  .delete()
  .eq('id', orderId);
```

---

## 6. Auth 사용법

### 6.1 로그인
```typescript
import { supabase } from '@/lib/supabase';

const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};
```

### 6.2 로그아웃
```typescript
const signOut = async () => {
  await supabase.auth.signOut();
};
```

### 6.3 현재 사용자 가져오기
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

### 6.4 세션 변경 감지
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // 로그인 처리
  } else if (event === 'SIGNED_OUT') {
    // 로그아웃 처리
  }
});
```

---

## 7. 네이밍 컨벤션

### 7.1 파일명
- 컴포넌트: `PascalCase.tsx` (예: `AdminDashboard.tsx`)
- 훅: `camelCase.ts` (예: `useAuth.ts`)
- 서비스: `camelCase.ts` (예: `orderService.ts`)
- 타입: `camelCase.ts` (예: `database.ts`)

### 7.2 변수/함수명
- 변수: `camelCase` (예: `currentUser`, `orderList`)
- 함수: `camelCase` (예: `handleSubmit`, `fetchOrders`)
- 상수: `UPPER_SNAKE_CASE` (예: `VALID_VENDORS`, `API_URL`)
- 타입/인터페이스: `PascalCase` (예: `User`, `OrderItem`)

### 7.3 컴포넌트 Props
```typescript
interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}
```

---

## 8. 에러 처리 패턴

```typescript
// 서비스 레이어
export const getOrders = async (): Promise<{ data: Order[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching orders:', error);
    return { data: null, error: error as Error };
  }
};

// 컴포넌트에서 사용
const { data, error } = await getOrders();
if (error) {
  // 에러 UI 표시
  return;
}
// data 사용
```

---

## 9. 기존 외주처 데이터 (시드 데이터)

```typescript
const VENDORS = [
  { name: '위드맘', code: '200131' },
  { name: '그램', code: '200216' },
  { name: '리니어', code: '200101' },
  { name: '디딤테크', code: '308803' },
  { name: '씨엘로', code: '200008' },
  { name: '신세계', code: '200004' },
  { name: '엠큐브', code: '111111' },
  { name: '메이코스', code: '222222' }
];

const VENDOR_TARGETS = {
  '그램': 480000,
  '디딤테크': 1600000,
  '리니어': 1600000,
  '메이코스': 1000000,
  '씨엘로': 1600000,
  '엠큐브': 1000000,
  '위드맘': 1600000
};
```

---

## 10. 주의사항

1. **절대 하드코딩하지 않기**: 환경 변수, 타입, 스키마는 이 문서 기준으로 사용
2. **Supabase Auth user.id = users.id**: Supabase Auth의 user.id를 우리 users 테이블의 id로 사용
3. **UUID 타입**: 모든 ID는 UUID 형식 (string으로 처리)
4. **날짜 형식**: ISO 8601 형식 사용 (`YYYY-MM-DD` 또는 `YYYY-MM-DDTHH:mm:ssZ`)
5. **한국어 UI**: 사용자에게 보이는 텍스트는 한국어로 작성
6. **import 경로**: `@/` 별칭 사용 (예: `import { supabase } from '@/lib/supabase'`)
