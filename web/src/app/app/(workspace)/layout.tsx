import { DeskShell } from '@/components/app/shell/DeskShell'

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <DeskShell>{children}</DeskShell>
}
