// The rubber stamp that lands on the invoice. The text is real; the inked, uneven edge is an SVG filter.
export function Stamp({ label, invoiceNo }: { label: string; invoiceNo: string }) {
  return (
    <div data-r="stamp" className="pointer-events-none absolute inset-x-0 top-[38%] flex -translate-y-1/2 justify-center md:left-[10%]">
      <svg aria-hidden="true" className="absolute size-0">
        <filter id="recon-ink">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="3.5" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </svg>
      <div
        className="-rotate-[12deg] whitespace-nowrap rounded-md border-[5px] border-double border-brand-600 px-5 pb-3 pt-4 text-center text-brand-600 mix-blend-multiply md:px-8"
        style={{ filter: 'url(#recon-ink)' }}
      >
        <p className="font-grotesk text-[clamp(2.2rem,5.4vw,5.4rem)] font-extrabold uppercase leading-[0.85] tracking-[0.03em]">{label}</p>
        <p className="mt-2.5 flex justify-between gap-6 border-t-2 border-brand-600 pt-2 font-data text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span>{invoiceNo}</span>
          <span>Tempo 42431</span>
        </p>
      </div>
    </div>
  )
}
