# PlanForge-Package-FE

Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼 **PlanForge** 의 프론트엔드입니다.

## 플랫폼 구성

| 리포지토리                                                                            | 역할                             | 스택                                     |
| ------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| [PlanForge-Package-FE](https://github.com/PlanForge-Package/PlanForge-Package-FE)     | 운영자·프론트데스크 웹 UI        | Next.js 15 · TypeScript · Tailwind CSS 4 |
| [PlanForge-Package-BE](https://github.com/PlanForge-Package/PlanForge-Package-BE)     | 업무 로직 · 자체 데이터베이스    | NestJS · Prisma · PostgreSQL             |
| [PlanForge-Package-Core](https://github.com/PlanForge-Package/PlanForge-Package-Core) | Oracle OPERA(OHIP) 연동 API 서버 | Fastify · OpenAPI                        |

호출 경로는 `FE → BE → Core → OPERA Cloud (OHIP)` 를 기본으로 합니다.
FE 가 Core 를 직접 호출하는 것은 서버 컴포넌트/Route Handler 로 제한합니다.

## 요구 사항

- Node.js 20.11 이상
- pnpm 9

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 값 채우기
pnpm dev
```

`http://localhost:3000` 에서 확인합니다.

## 화면

| 경로                 | 설명                                              |
| -------------------- | ------------------------------------------------- |
| `/login`             | 로그인 (미인증 시 여기로 보냅니다)                |
| `/`                  | 대시보드 — 예약 요약과 바로 가기                  |
| `/reservations`      | 예약 목록 — 확인 번호·게스트 이름 검색, 상태 필터 |
| `/reservations/new`  | 새 예약 — 재고·요금 조회 후 생성                  |
| `/reservations/[id]` | 예약 상세 — 수정·취소, 체크인/아웃, 폴리오        |
| `/rooms`             | 객실 — 상태 변경(OPERA 위임)과 재실 현황          |
| `/housekeeping`      | 하우스키핑 — 작업 배정·진행, 불일치 확인          |
| `/users`             | 계정 관리 — 입사·역할·퇴사 (관리자 전용)          |
| `/account`           | 내 계정 — 비밀번호 변경                           |

## 다중 호텔

내비게이션의 호텔 선택기가 화면 전체의 기준 호텔을 정하고, 선택은 쿠키(12시간)로
유지됩니다. 우선순위는 쿠키 → 계정 소속 → 첫 호텔입니다.

호텔은 URL 이 아니라 선택기가 정합니다. 쿼리스트링으로 받으면 주소만 고치면 남의
호텔을 볼 수 있다는 인상을 주는데, 실제 판단은 BE 가 합니다.

소속이 지정된 직원에게는 자기 호텔 하나만 내려오므로 선택기 대신 호텔 이름만
표시됩니다. 고를 수 없는 항목을 보여줄 이유가 없고, 목록에 남의 호텔 이름이 뜨는
것만으로도 조직 구조가 드러납니다.

## 인증

액세스 토큰은 **httpOnly 쿠키**에 둡니다. `localStorage` 는 XSS 가 한 번만 성공해도
그대로 유출되지만, httpOnly 쿠키는 스크립트가 읽지 못합니다.

보호는 세 겹입니다.

1. **미들웨어** — 쿠키가 없으면 `/login` 으로 보냅니다. 서명은 검증하지 않습니다.
   엣지 번들에 비밀키를 싣지 않고, 검증 규칙이 두 곳으로 갈라지지 않게 하기 위해서입니다.
2. **`(app)` 레이아웃** — `requireUser()` 로 매 요청 BE 에 계정 상태를 확인합니다.
   새 페이지를 추가할 때 보호를 잊을 일이 없습니다.
3. **BE 가드** — 실제 차단은 여기서 합니다. 메뉴를 감추는 것은 편의일 뿐입니다.

만료·위조된 토큰은 `/logout` 라우트 핸들러가 쿠키를 지우고 로그인으로 보냅니다.
쿠키는 서버 액션과 라우트 핸들러에서만 수정할 수 있어, 레이아웃에서 지우려 하면
예외가 나면서 오류 화면에 갇힙니다.

모두 서버 컴포넌트에서 BE 를 호출하며 `cache: 'no-store'` 로 항상 최신 상태를 봅니다.
BE 가 응답하지 않아도 라우트가 죽지 않고 화면에 오류 안내가 표시됩니다.

## 환경 변수

| 이름                        | 설명                                  |
| --------------------------- | ------------------------------------- |
| `BE_BASE_URL`               | BE 서버 주소 (서버 전용, 우선 적용)   |
| `CORE_BASE_URL`             | Core 서버 주소 (서버 전용, 우선 적용) |
| `NEXT_PUBLIC_BE_BASE_URL`   | BE 서버 주소 (브라우저 노출 대체값)   |
| `NEXT_PUBLIC_CORE_BASE_URL` | Core 서버 주소 (브라우저 노출 대체값) |

컨테이너 내부 주소를 브라우저에 노출하지 않도록 서버 전용 변수를 먼저 읽습니다.

## 배포

`Dockerfile` 로 이미지를 만듭니다. Next 의 `output: 'standalone'` 을 써서 실제로
쓰이는 의존성만 담고, 비-root(`node`)로 실행합니다.

```bash
docker build -t planforge-fe .
docker run -p 3000:3000 -e BE_BASE_URL=http://be:3001 planforge-fe
```

`NEXT_PUBLIC_` 값은 빌드 시점에 번들로 박히므로 이미지에 넣지 않습니다. 서버 전용
`BE_BASE_URL`·`CORE_BASE_URL` 만 런타임에 주입하면 되고, 그래야 같은 이미지를
스테이징과 운영에 함께 쓸 수 있습니다.

전체 스택은 BE 리포의 `deploy/docker-compose.yml` 을 참고하세요.
이미지는 태그를 밀 때만 GHCR 에 발행됩니다.

## 스크립트

| 명령             | 설명          |
| ---------------- | ------------- |
| `pnpm dev`       | 개발 서버     |
| `pnpm build`     | 프로덕션 빌드 |
| `pnpm start`     | 프로덕션 서버 |
| `pnpm lint`      | ESLint        |
| `pnpm typecheck` | 타입 검사     |
| `pnpm format`    | Prettier 포맷 |

## 디렉터리

```
src/
  app/        App Router 라우트
  lib/        API 클라이언트 등 공용 유틸
```

## 라이선스

UNLICENSED — 사내 전용.
