export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">PlanForge</h1>
      <p className="text-base opacity-80">
        Oracle OPERA(OHIP) 기반 호텔 관리 플랫폼의 프론트엔드입니다.
      </p>
      <ul className="flex flex-col gap-2 text-sm opacity-70">
        <li>• BE — 업무 로직 / 데이터베이스 (NestJS + Prisma)</li>
        <li>• Core — OPERA 연동 API 서버 (Fastify + OpenAPI)</li>
      </ul>
    </main>
  );
}
