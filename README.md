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

## 환경 변수

| 이름                        | 설명                                          |
| --------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_BE_BASE_URL`   | BE 서버 주소 (기본 `http://localhost:3001`)   |
| `NEXT_PUBLIC_CORE_BASE_URL` | Core 서버 주소 (기본 `http://localhost:3002`) |

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
