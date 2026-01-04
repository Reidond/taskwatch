type Status = string

const statusConfig: Record<
	string,
	{ bg: string; text: string; label?: string }
> = {
	NEW: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
	PLANNING: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
	PLAN_READY: {
		bg: 'bg-yellow-500/20',
		text: 'text-yellow-400',
		label: 'Plan Ready',
	},
	PLAN_REVISION: {
		bg: 'bg-orange-500/20',
		text: 'text-orange-400',
		label: 'Revision',
	},
	PLAN_APPROVED: {
		bg: 'bg-green-500/20',
		text: 'text-green-400',
		label: 'Approved',
	},
	IMPLEMENTING: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
	PR_READY: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'PR Ready' },
	DONE: { bg: 'bg-green-500/20', text: 'text-green-400' },
	BLOCKED: { bg: 'bg-red-500/20', text: 'text-red-400' },
	PENDING: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
	APPROVED: { bg: 'bg-green-500/20', text: 'text-green-400' },
	CHANGES_REQUESTED: {
		bg: 'bg-orange-500/20',
		text: 'text-orange-400',
		label: 'Changes Requested',
	},
	QUEUED: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
	RUNNING: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
	SUCCEEDED: { bg: 'bg-green-500/20', text: 'text-green-400' },
	FAILED: { bg: 'bg-red-500/20', text: 'text-red-400' },
	OPEN: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
	MERGED: { bg: 'bg-green-500/20', text: 'text-green-400' },
	CLOSED: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
}

export function StatusBadge({ status }: { status: Status }) {
	const config = statusConfig[status] ?? {
		bg: 'bg-slate-500/20',
		text: 'text-slate-400',
	}
	const label = config.label ?? status.replace(/_/g, ' ')

	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
		>
			{label}
		</span>
	)
}
