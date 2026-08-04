<div align="center">

# PlanForge FE

**호텔 운영자·프론트데스크 웹 UI**

예약부터 야간 감사·실적까지, 현장에서 실제로 쓰는 화면. 모든 데이터는 서버 컴포넌트에서 BE 를
호출해 가져옵니다.

**한국어** · [English](README.en.md) · [中文](README.zh.md) · [日本語](README.ja.md)

![TSX](https://img.shields.io/badge/TSX-67.0%25-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-26.2%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Markdown](https://img.shields.io/badge/Markdown-1.7%25-083FA1?style=flat-square)
![YAML](https://img.shields.io/badge/YAML-1.3%25-CB171E?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-0.9%25-1572B6?style=flat-square&logo=css3&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-0.5%25-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## 프로젝트 배경

호텔 프런트는 **한 화면에서 여러 일을 동시에 처리**합니다. 손님이 서 있는 동안 예약을 찾고,
객실을 배정하고, 카드를 발급하고, 결제를 받습니다. 그래서 이 UI 는 화려함보다 **지금 무엇이
어떻게 되었는지 분명히 보이는 것**을 우선합니다.

세 가지 원칙으로 만들었습니다.

**서버 컴포넌트 우선** — 데이터는 전부 서버에서 가져옵니다. 클라이언트 컴포넌트는 폼 상태가
필요한 곳에만 둡니다. `cache: 'no-store'` 로 항상 최신을 보고, BE 가 응답하지 않아도 라우트가
죽지 않고 화면에 오류 안내가 표시됩니다.

**결과를 감추지 않음** — OPERA 나 PG 가 거절하면 그 사유를 그대로 보여 줍니다. "처리에 실패
했습니다" 만 뜨는 화면에서는 프런트가 무엇을 고쳐야 할지 알 수 없습니다.

**모의 모드를 숨기지 않음** — 잠금장치와 결제가 모의로 돌고 있으면 화면이 그 사실을 말합니다.
카드가 발급됐다고 믿는데 손님이 방에 못 들어가는 상황을 막습니다.

### 플랫폼 구성

| 리포지토리                                                                            | 역할                             |
| ------------------------------------------------------------------------------------- | -------------------------------- |
| **PlanForge-Package-FE**                                                              | **운영자·프론트데스크 웹 UI**    |
| [PlanForge-Package-BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)     | 업무 로직 · 자체 데이터베이스    |
| [PlanForge-Package-Core](https://github.com/PlanForge-Package/PlanForge-Package-Core) | Oracle OPERA(OHIP) 연동 API 서버 |

호출 경로: `FE → BE → Core → OPERA Cloud (OHIP)`

---

## 언어 및 스택

| 구분        | 사용 기술                                           |
| ----------- | --------------------------------------------------- |
| 언어        | TypeScript 5.9 (strict)                             |
| 프레임워크  | Next.js 15 (App Router · 서버 컴포넌트 · 서버 액션) |
| UI          | React 19                                            |
| 스타일      | Tailwind CSS 4 (`@theme` 토큰 · 다크 모드 대응)     |
| 상태        | `useActionState` — 별도 상태 라이브러리 없음        |
| 인증        | httpOnly 쿠키 + 미들웨어 + 레이아웃 가드            |
| 품질        | ESLint · Prettier · GitHub Actions                  |
| 배포        | Docker (standalone 출력 · 비-root 실행)             |
| 패키지 관리 | pnpm 9                                              |

### 디자인 토큰

```css
--color-ink: #333d4b /* 본문 */ --color-muted: #8b95a1 /* 보조 텍스트 */ --color-brand: #3182f6
  /* 버튼 */ --color-brand-hover: #2272eb /* 버튼 호버 */;
```

---

## 디렉토리 구조

```
src/
├── app/
│   ├── login/                    로그인 (공개)
│   ├── logout/route.ts           쿠키 정리 — 라우트 핸들러에서만 가능
│   └── (app)/                    인증 필요 — 레이아웃이 requireUser() 호출
│       ├── page.tsx              대시보드
│       ├── reservations/         목록 · 새 예약 · 상세(수정·체크인·폴리오·키·결제)
│       ├── blocks/               단체 블록 목록 · 상세(할당 그리드·룸리스트)
│       ├── profiles/             게스트 프로필 검색 · 상세(이력·중복 병합)
│       ├── rooms/                객실 상태
│       ├── housekeeping/         작업 배정 · 진행 · 불일치
│       ├── night-audit/          마감 점검표 · 노쇼 처리
│       ├── cashier/             근무조 수납 집계 · 마감
│       ├── reports/              점유율·ADR·RevPAR · 경로별 분해
│       ├── pos-outlets/          POS 아웃렛 키 관리
│       ├── users/                계정 관리 (관리자)
│       └── account/              내 계정
├── components/
│   ├── action-feedback.tsx       ActionMessage · SubmitButton (제출 중 비활성)
│   ├── nav.tsx                   역할별 메뉴 · 호텔 선택기
│   ├── booking-form.tsx          재고 선택 → 게스트 입력 → 예약
│   ├── front-desk.tsx            체크인 · 체크아웃
│   ├── folio-panel.tsx           폴리오 · 거래 등록 · 창구 간 이관
│   ├── folio-routing-panel.tsx   라우팅 지시 (거래 코드 → 창구)
│   ├── payment-panel.tsx         승인 · 매입 · 승인취소 · 환불
│   ├── room-key-panel.tsx        카드 발급 · 무효화
│   ├── room-outage-panel.tsx     사용 불가 객실 등록 · 해제
│   ├── block-form.tsx            블록 생성 · 수정
│   ├── profile-editor.tsx        선호·멤버십·메모 · 중복 병합
│   ├── outlet-admin.tsx          POS 아웃렛 발급 · 재발급
│   ├── housekeeping-board.tsx    작업 배정 · 진행
│   ├── night-audit-board.tsx     점검표 · 노쇼
│   ├── cashier-panel.tsx         근무조 시작 · 마감 · 지난 조
│   └── notice.tsx                ErrorNotice · InfoNotice · EmptyState
├── lib/
│   ├── api.ts                    apiFetch (서버 전용) · ApiError · tryFetch
│   ├── action-state.ts           ActionState · 실패 시 입력값 보존
│   ├── auth.ts                   requireUser · logoutUrl
│   ├── property.ts               호텔 선택 컨텍스트
│   ├── types.ts                  BE 응답 타입
│   ├── channel-labels.ts         예약 경로 코드 표기
│   └── profile-labels.ts         선호 코드 표기
└── middleware.ts                 쿠키 없으면 /login 으로
```

---

## 실행 방법

### 요구 사항

- Node.js 20.11 이상
- pnpm 9
- 기동 중인 [PlanForge BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)

### 설치와 기동

```bash
pnpm install
cp .env.example .env.local     # BE_BASE_URL 설정
pnpm dev -- -p 3200
```

`http://localhost:3200` 에서 확인합니다. 시드 계정은 `manager@planforge.local` /
비밀번호 `planforge` 입니다 (BE 리포 참고).

### 주요 명령

| 명령                                           | 설명                 |
| ---------------------------------------------- | -------------------- |
| `pnpm dev`                                     | 개발 서버            |
| `pnpm build` / `pnpm start`                    | 빌드 / 프로덕션 실행 |
| `pnpm lint` / `pnpm typecheck` / `pnpm format` | 품질 검사            |

### 환경 변수

| 이름                      | 설명                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `BE_BASE_URL`             | BE 주소 (서버 컴포넌트 전용 · 컨테이너 내부 주소 사용 가능) |
| `CORE_BASE_URL`           | Core 주소                                                   |
| `NEXT_PUBLIC_BE_BASE_URL` | 브라우저에서도 필요한 경우의 대체값                         |

---

## 화면

| 경로                         | 설명                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| `/`                          | 대시보드 — 당일 도착·출발·재실, 객실 상태 요약               |
| `/reservations`              | 예약 목록 — 확인 번호·이름 검색, 상태·채널 필터              |
| `/reservations/new`          | 새 예약 — 재고·요금 조회 후 생성                             |
| `/reservations/[id]`         | 예약 상세 — 수정·취소, 체크인/아웃, 폴리오, 객실 키, 결제    |
| `/blocks` `/blocks/[id]`     | 단체 블록 — 확보·픽업, 일자별 할당 그리드, 룸리스트          |
| `/profiles` `/profiles/[id]` | 게스트 프로필 — 검색, 투숙 이력, 중복 병합                   |
| `/rooms`                     | 객실 — 상태 변경(OPERA 위임), 재실 현황, 사용 불가 등록·해제 |
| `/housekeeping`              | 하우스키핑 — 작업 배정·진행, 불일치 확인                     |
| `/night-audit`               | 야간 감사 — 마감 점검표, 노쇼 처리                           |
| `/cashier`                   | 캐셔 마감 — 근무조별 수납·시재 대사                          |
| `/reports`                   | 실적 — 점유율·ADR·RevPAR, 경로별 분해 (지배인)               |
| `/pos-outlets`               | POS 아웃렛 — 키 발급·재발급·사용 중지 (지배인)               |
| `/users`                     | 계정 관리 — 입사·역할·퇴사 (관리자)                          |
| `/account`                   | 내 계정 — 비밀번호 변경                                      |

---

## 설계 판단

### 인증

액세스 토큰은 **httpOnly 쿠키**에 둡니다. `localStorage` 는 XSS 가 한 번만 성공해도 그대로
유출되지만, httpOnly 쿠키는 스크립트가 읽지 못합니다.

보호는 세 겹입니다.

1. **미들웨어** — 쿠키가 없으면 `/login` 으로 보냅니다. 서명은 검증하지 않습니다. 엣지 번들에
   비밀키를 싣지 않고, 검증 규칙이 두 곳으로 갈라지지 않게 하기 위해서입니다.
2. **`(app)` 레이아웃** — `requireUser()` 로 매 요청 BE 에 계정 상태를 확인합니다. 새 페이지를
   추가할 때 보호를 잊을 일이 없습니다.
3. **BE 가드** — 실제 차단은 여기서 합니다. 메뉴를 감추는 것은 편의일 뿐입니다.

만료·위조된 토큰은 `/logout` 라우트 핸들러가 쿠키를 지우고 로그인으로 보냅니다. 쿠키는 서버
액션과 라우트 핸들러에서만 수정할 수 있어, 레이아웃에서 지우려 하면 예외가 나면서 오류 화면에
갇힙니다.

### 다중 호텔

내비게이션의 호텔 선택기가 화면 전체의 기준 호텔을 정하고, 선택은 쿠키(12시간)로 유지됩니다.
우선순위는 쿠키 → 계정 소속 → 첫 호텔입니다.

호텔은 URL 이 아니라 선택기가 정합니다. 쿼리스트링으로 받으면 주소만 고치면 남의 호텔을 볼 수
있다는 인상을 주는데, 실제 판단은 BE 가 합니다.

소속이 지정된 직원에게는 자기 호텔 하나만 내려오므로 선택기 대신 호텔 이름만 표시됩니다. 고를
수 없는 항목을 보여줄 이유가 없고, 목록에 남의 호텔 이름이 뜨는 것만으로도 조직 구조가
드러납니다.

### 폼 액션

액션은 예외를 던지지 않고 `ActionState` 로 결과를 돌려줍니다 — 서버 액션이 던지면 Next 가
프로덕션에서 메시지를 지우고 digest 만 남겨, 사용자가 무엇을 고쳐야 할지 알 수 없습니다.

실패한 액션은 **입력값도 함께 돌려줍니다**(`ActionState.values`). React 19 는 폼 액션이 끝나면
비제어 입력을 초기화하므로, 값을 되돌려 주지 않으면 날짜와 수량을 다 채운 폼이 오류 한 줄과
함께 비워집니다. 화면은 그 값을 `defaultValue` 로 다시 심습니다.

액션 상태는 **행이 아니라 그 행을 담은 패널**이 들고 있습니다. 처리한 항목이 목록에서 빠지면
결과 메시지도 같이 사라지기 때문입니다. 표시할 메시지는 고정 우선순위가 아니라 **마지막으로
실행한 액션**을 따라갑니다.

### 멱등키

결제 폼의 멱등키는 `crypto.randomUUID()` 로 시도마다 새로 만듭니다. `useId()` 로 만들면 안
됩니다 — 컴포넌트 위치로 정해지는 값이라 페이지를 새로 열 때마다 같고, 그러면 새 결제가 이전
결제의 재전송으로 취급되어 **실제로는 긁히지 않았는데 다른 금액이 성공으로 보고됩니다.**

서버 렌더에서는 비워 두고 마운트 후 채웁니다. 초기값을 난수로 두면 서버와 클라이언트가 달라
하이드레이션이 깨집니다.

---

## 배포

```bash
docker build -t planforge-fe .
```

Next.js standalone 출력 · 비-root 실행입니다. 전체 스택 구성은 BE 리포의
`deploy/docker-compose.yml` 을 참고하세요.

---

## 라이선스

UNLICENSED — 사내 전용.
