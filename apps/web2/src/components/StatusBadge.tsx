import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Status = string

const statusConfig: Record<string, { className: string; label?: string }> = {
	NEW: { className: 'bg-muted text-muted-foreground' },
	PLANNING: { className: 'bg-blue-500/20 text-blue-400' },
	PLAN_READY: {
		className: 'bg-yellow-500/20 text-yellow-400',
		label: 'Plan Ready',
	},
	PLAN_REVISION: {
		className: 'bg-orange-500/20 text-orange-400',
		label: 'Revision',
	},
	PLAN_APPROVED: {
		className: 'bg-green-500/20 text-green-400',
		label: 'Approved',
	},
	IMPLEMENTING: { className: 'bg-purple-500/20 text-purple-400' },
	PR_READY: { className: 'bg-cyan-500/20 text-cyan-400', label: 'PR Ready' },
	DONE: { className: 'bg-green-500/20 text-green-400' },
	BLOCKED: { className: 'bg-destructive/20 text-destructive' },
	PENDING: { className: 'bg-yellow-500/20 text-yellow-400' },
	APPROVED: { className: 'bg-green-500/20 text-green-400' },
	CHANGES_REQUESTED: {
		className: 'bg-orange-500/20 text-orange-400',
		label: 'Changes Requested',
	},
	QUEUED: { className: 'bg-muted text-muted-foreground' },
	RUNNING: { className: 'bg-blue-500/20 text-blue-400' },
	SUCCEEDED: { className: 'bg-green-500/20 text-green-400' },
	FAILED: { className: 'bg-destructive/20 text-destructive' },
	OPEN: { className: 'bg-blue-500/20 text-blue-400' },
	MERGED: { className: 'bg-green-500/20 text-green-400' },
	CLOSED: { className: 'bg-muted text-muted-foreground' },
}

export function StatusBadge({ status }: { status: Status }) {
	const config = statusConfig[status] ?? {
		className: 'bg-muted text-muted-foreground',
	}
	const label = config.label ?? status.replace(/_/g, ' ')

	return <Badge className={cn('border-0', config.className)}>{label}</Badge>
}
