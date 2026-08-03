# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_ 값은 빌드 시점에 번들에 박힌다. 서버 전용 BE_BASE_URL 을 쓰면
# 런타임 주입으로 충분하므로 여기서는 넘기지 않는다.
ENV NEXT_TELEMETRY_DISABLED=1
# standalone 출력을 켠다. 기본값이 아닌 이유는 next.config.ts 주석 참고.
ENV NEXT_OUTPUT_STANDALONE=1
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone 출력은 실제로 쓰이는 의존성만 추려 담는다. node_modules 를 통째로
# 복사하지 않아 이미지가 작고, 런타임에 pnpm 도 필요 없다.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
