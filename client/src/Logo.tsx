/** App mark: a rising trend line on a blue gradient tile. */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`logo ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l5.5-5.5 4 4L21 7" />
        <path d="M15 7h6v6" />
      </svg>
    </span>
  )
}
