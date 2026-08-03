export default function ReservationDetailLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-8 py-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">예약을 불러오는 중입니다.</span>
      <div className="flex flex-col gap-2">
        <div className="h-4 w-24 rounded bg-current/10" />
        <div className="h-8 w-56 rounded bg-current/10" />
      </div>
      <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="h-3 w-20 rounded bg-current/10" />
            <div className="h-4 w-40 rounded bg-current/10" />
          </div>
        ))}
      </div>
      <div className="h-28 rounded-lg bg-current/5" />
      <div className="h-56 rounded-lg bg-current/5" />
    </div>
  );
}
