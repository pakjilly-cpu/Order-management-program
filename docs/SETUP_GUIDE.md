# 배포 설정 가이드

이 문서는 Order Management Program을 Vercel과 Supabase를 사용하여 배포하는 방법을 설명합니다.

---

## 목차

1. [Supabase 설정](#1-supabase-설정)
2. [Google OAuth 설정](#2-google-oauth-설정)
3. [데이터베이스 스키마 적용](#3-데이터베이스-스키마-적용)
4. [Vercel 배포](#4-vercel-배포)
5. [로컬 개발 환경 설정](#5-로컬-개발-환경-설정)
6. [문제 해결](#6-문제-해결)

---

## 1. Supabase 설정

### 1.1 Supabase 프로젝트 생성

1. [https://supabase.com](https://supabase.com) 접속
2. 우측 상단 **"Start your project"** 클릭
3. GitHub 계정으로 로그인
4. **"New Project"** 버튼 클릭
5. 프로젝트 정보 입력:
   - **Organization**: 기존 조직 선택 또는 새로 생성
   - **Name**: `order-management` (원하는 이름으로 변경 가능)
   - **Database Password**: 강력한 비밀번호 설정
     > **중요**: 이 비밀번호는 반드시 안전한 곳에 저장해두세요!
   - **Region**: `Northeast Asia (Tokyo)` 선택 (한국에서 가장 빠름)
6. **"Create new project"** 클릭
7. 프로젝트 생성 완료까지 약 2-3분 대기

### 1.2 API 키 확인

1. 프로젝트 대시보드 좌측 메뉴에서 **"Settings"** 클릭
2. **"API"** 탭 선택
3. 다음 정보를 메모장에 복사해두세요:
   - **Project URL**: `https://xxxxx.supabase.co` 형식
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...` 형식의 긴 문자열

> **참고**: 이 정보는 나중에 Vercel 환경 변수 설정에 사용됩니다.

---

## 2. Google OAuth 설정

### 2.1 Google Cloud Console 프로젝트 설정

1. [https://console.cloud.google.com](https://console.cloud.google.com) 접속
2. Google 계정으로 로그인
3. 상단의 프로젝트 선택 드롭다운 클릭
4. **"새 프로젝트"** 클릭
5. 프로젝트 정보 입력:
   - **프로젝트 이름**: `order-management` (원하는 이름)
   - **조직**: 해당되는 경우 선택
6. **"만들기"** 클릭

### 2.2 OAuth 동의 화면 설정

1. 좌측 메뉴에서 **"APIs & Services"** → **"OAuth consent screen"** 클릭
2. User Type: **"External"** 선택 후 **"만들기"** 클릭
3. 앱 정보 입력:
   - **앱 이름**: `Order Management`
   - **사용자 지원 이메일**: 본인 이메일 선택
   - **개발자 연락처 정보**: 본인 이메일 입력
4. **"저장 후 계속"** 클릭
5. **범위(Scopes)** 화면: 기본값 유지, **"저장 후 계속"** 클릭
6. **테스트 사용자** 화면: 필요시 테스트 이메일 추가, **"저장 후 계속"** 클릭
7. **요약** 화면: **"대시보드로 돌아가기"** 클릭

### 2.3 OAuth 클라이언트 ID 생성

1. 좌측 메뉴에서 **"Credentials"** 클릭
2. 상단의 **"+ CREATE CREDENTIALS"** → **"OAuth client ID"** 클릭
3. 설정:
   - **Application type**: `Web application`
   - **Name**: `Order Management Web Client`
   - **Authorized JavaScript origins**: 비워둠
   - **Authorized redirect URIs**: 추가 버튼 클릭 후 입력
     ```
     https://[YOUR-SUPABASE-PROJECT-ID].supabase.co/auth/v1/callback
     ```
     > **[YOUR-SUPABASE-PROJECT-ID]**를 실제 Supabase 프로젝트 URL의 ID로 교체
4. **"만들기"** 클릭
5. 팝업에서 **Client ID**와 **Client Secret** 복사하여 안전한 곳에 저장

### 2.4 Supabase에 Google Provider 연동

1. Supabase 대시보드로 돌아가기
2. 좌측 메뉴 **"Authentication"** → **"Providers"** 클릭
3. Provider 목록에서 **"Google"** 클릭
4. 토글을 켜서 활성화
5. 정보 입력:
   - **Client ID**: Google에서 복사한 Client ID
   - **Client Secret**: Google에서 복사한 Client Secret
6. **"Save"** 클릭

---

## 3. 데이터베이스 스키마 적용

### 3.1 마이그레이션 파일 실행

1. Supabase 대시보드에서 좌측 메뉴 **"SQL Editor"** 클릭
2. **"New query"** 버튼 클릭
3. 프로젝트 폴더의 `supabase/migrations/001_initial_schema.sql` 파일 내용을 복사
4. SQL Editor에 붙여넣기
5. **"Run"** 버튼 클릭
6. 실행 완료 메시지 확인

### 3.2 초기 데이터(시드) 입력

1. SQL Editor에서 **"New query"** 클릭
2. 프로젝트 폴더의 `supabase/seed.sql` 파일 내용을 복사
3. SQL Editor에 붙여넣기
4. **"Run"** 버튼 클릭
5. 실행 완료 메시지 확인

### 3.3 테이블 확인

1. 좌측 메뉴 **"Table Editor"** 클릭
2. 다음 테이블들이 생성되었는지 확인:
   - `users`
   - `vendors`
   - `orders`
   - `vendor_targets`
   - `file_uploads`

---

## 4. Vercel 배포

### 4.1 Vercel 계정 및 프로젝트 연결

1. [https://vercel.com](https://vercel.com) 접속
2. **"Start Deploying"** 또는 **"Sign Up"** 클릭
3. **"Continue with GitHub"**로 GitHub 계정 연결
4. 대시보드에서 **"Add New..."** → **"Project"** 클릭
5. GitHub 리포지토리 목록에서 **Order-management-program** 찾기
6. **"Import"** 클릭

### 4.2 프로젝트 설정

1. **Framework Preset**: `Vite` (자동 감지됨)
2. **Root Directory**: `.` (기본값)
3. **Build and Output Settings**: 기본값 유지

### 4.3 환경 변수 설정

**"Environment Variables"** 섹션에서 다음 변수들을 추가:

| Key | Value | 설명 |
|-----|-------|------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase anon key |
| `VITE_GEMINI_API_KEY` | `your-gemini-api-key` | Google Gemini API 키 |

> **주의**: 모든 환경 변수는 `VITE_` 접두사로 시작해야 합니다.

### 4.4 배포 실행

1. **"Deploy"** 버튼 클릭
2. 빌드 및 배포 완료까지 대기 (약 1-2분)
3. 배포 완료 후 제공되는 URL 확인
   - 예: `https://order-management-xxx.vercel.app`

### 4.5 Google OAuth Redirect URI 추가

배포가 완료되면 Google Cloud Console에서 추가 설정이 필요합니다:

1. [Google Cloud Console](https://console.cloud.google.com) → **"Credentials"**
2. 생성한 OAuth 2.0 Client ID 클릭
3. **"Authorized redirect URIs"**에 추가:
   ```
   https://your-vercel-url.vercel.app/auth/callback
   ```
   > 실제 Vercel 배포 URL로 교체
4. **"저장"** 클릭

---

## 5. 로컬 개발 환경 설정

### 5.1 필수 요구사항

- **Node.js** 18.x 이상
- **Docker Desktop** (Supabase 로컬 실행용)
- **Git**

### 5.2 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone https://github.com/your-username/Order-management-program.git
cd Order-management-program

# 의존성 설치
npm install
```

### 5.3 Supabase CLI 설치

**Windows (PowerShell 관리자 권한으로 실행):**

```powershell
# Scoop을 사용하는 경우
scoop install supabase

# 또는 npm을 사용하는 경우
npm install -g supabase
```

**macOS:**

```bash
brew install supabase/tap/supabase
```

### 5.4 Supabase 로컬 실행

```bash
# Docker Desktop이 실행 중인지 확인

# Supabase 초기화 (최초 1회)
npx supabase init

# Supabase 로컬 시작
npx supabase start
```

시작 후 출력되는 정보를 확인하세요:
```
API URL: http://127.0.0.1:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Studio URL: http://127.0.0.1:54323
```

### 5.5 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase (로컬)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key
```

> **anon key**는 `npx supabase start` 출력에서 복사합니다.

### 5.6 로컬 데이터베이스 마이그레이션

```bash
# 마이그레이션 적용 및 시드 데이터 로드
npx supabase db reset
```

### 5.7 로컬 Google OAuth 설정 (선택사항)

로컬 개발 환경에서 Google OAuth를 테스트하려면:

1. Google Cloud Console에서 Redirect URI 추가:
   ```
   http://127.0.0.1:54321/auth/v1/callback
   ```

2. Supabase 로컬 대시보드 접속: `http://127.0.0.1:54323`

3. **Authentication** → **Providers** → **Google** 설정
   - Client ID와 Secret 입력

### 5.8 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

---

## 6. 문제 해결

### 6.1 "Invalid login credentials" 에러

**원인**: Google Provider 설정 문제

**해결 방법**:
1. Supabase 대시보드 → Authentication → Providers 확인
2. Google이 활성화되어 있는지 확인
3. Client ID와 Client Secret이 올바른지 확인

### 6.2 "OAuth callback error" 에러

**원인**: Redirect URI 불일치

**해결 방법**:
1. Google Cloud Console의 Redirect URI 확인
2. URI가 정확히 일치하는지 확인:
   - 끝에 슬래시(`/`) 없음
   - `https://` 프로토콜 확인
   - 도메인 정확히 일치

### 6.3 배포 후 화면이 안 보임

**원인**: 환경 변수 문제

**해결 방법**:
1. Vercel 환경 변수가 `VITE_` 접두사로 시작하는지 확인
2. 환경 변수 변경 후 재배포 필요
3. Vercel 대시보드 → Deployments → 최신 배포의 "Redeploy" 클릭

### 6.4 로컬 Supabase 연결 안 됨

**원인**: Docker 또는 Supabase 서비스 문제

**해결 방법**:
```bash
# Docker 상태 확인
docker ps

# Supabase 서비스 상태 확인
npx supabase status

# Supabase 재시작
npx supabase stop
npx supabase start
```

### 6.5 빌드 실패

**원인**: TypeScript 타입 에러 또는 의존성 문제

**해결 방법**:
```bash
# 의존성 재설치
rm -rf node_modules
npm install

# 타입 체크
npx tsc --noEmit

# 빌드 재시도
npm run build
```

### 6.6 데이터베이스 연결 에러

**원인**: RLS 정책 또는 권한 문제

**해결 방법**:
1. Supabase 대시보드 → SQL Editor
2. 다음 쿼리로 RLS 상태 확인:
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
3. 필요시 RLS 정책 재적용

---

## 추가 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Vercel 공식 문서](https://vercel.com/docs)
- [Google OAuth 설정 가이드](https://developers.google.com/identity/protocols/oauth2)
- [Vite 환경 변수 문서](https://vitejs.dev/guide/env-and-mode.html)

---

## 지원

문제가 해결되지 않으면 다음 정보와 함께 이슈를 등록해주세요:
- 에러 메시지 전문
- 브라우저 개발자 도구 Console 로그
- 사용 중인 브라우저 및 버전
