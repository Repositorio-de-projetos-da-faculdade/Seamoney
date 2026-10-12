// The public proof page wears the workspace's paper (same fonts and the desk scope as /app).
import '@fontsource-variable/funnel-display'
import '@fontsource-variable/funnel-sans'
import '@fontsource-variable/geist-mono'
import '@fontsource/instrument-serif/400-italic.css'

export default function ProofLayout({ children }: { children: React.ReactNode }) {
  return <div className="desk min-h-dvh">{children}</div>
}
