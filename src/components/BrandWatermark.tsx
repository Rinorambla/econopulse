import Logo from '@/components/Logo';

// Site-wide brand watermark: pinned to the viewport corner on every page so
// the EconoPulse logo lands in any screenshot or crop. Above app chrome and
// overlays, but click-through so it never blocks the UI underneath.
export default function BrandWatermark() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-3 right-3 z-[90] select-none print:hidden"
    >
      <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1.5 shadow-lg shadow-black/40 backdrop-blur-sm">
        <Logo size={20} textVariant="domain" className="!gap-1.5 [&_span]:!text-[12px] [&_span]:!mr-0 [&_span]:tracking-wider" />
      </div>
    </div>
  );
}
