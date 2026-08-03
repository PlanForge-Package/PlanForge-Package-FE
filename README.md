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

| 경로            | 설명                                              |
| --------------- | ------------------------------------------------- |
| `/`             | 대시보드 — 예약 요약과 바로 가기                  |
| `/reservations` | 예약 목록 — 확인 번호·게스트 이름 검색, 상태 필터 |
| `/rooms`        | 객실 — 하우스키핑 상태와 재실 현황                |

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
