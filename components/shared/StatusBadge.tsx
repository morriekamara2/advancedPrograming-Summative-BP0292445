import { Badge } from '@/components/ui/badge'
import type { ItemStatus, AgentType } from '@/types'

const statusConfig: Record<ItemStatus, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  draft: { label: 'Draft', variant: 'gray' },
  'pending-approval': { label: 'Pending Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'rose' },
  returned: { label: 'Returned', variant: 'warning' },
  exported: { label: 'Exported', variant: 'purple' },
}

const agentConfig: Record<AgentType, { label: string; variant: Parameters<typeof Badge>[0]['variant'] }> = {
  'test-design': { label: 'Test Design', variant: 'info' },
  automation: { label: 'Automation', variant: 'indigo' },
  'failure-analysis': { label: 'Failure Analysis', variant: 'rose' },
  architecture: { label: 'Architecture', variant: 'purple' },
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function AgentBadge({ agentType }: { agentType: AgentType }) {
  const config = agentConfig[agentType]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
