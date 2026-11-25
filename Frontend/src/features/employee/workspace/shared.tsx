import { Badge } from '@/components/ui/badge';
import type { Priority } from '@/api/employee-types';

const tone = {
    urgent: 'danger',
    high: 'warning',
    normal: 'neutral',
    low: 'info',
} as const;

export function PriorityBadge({ priority }: { priority: Priority | null }) {
    return priority ? (
        <Badge tone={tone[priority]} className="capitalize">
            {priority}
        </Badge>
    ) : null;
}

export function RequestStatusBadge({
    status,
}: {
    status: 'pending' | 'approved' | 'rejected';
}) {
    return (
        <Badge
            tone={
                status === 'approved'
                    ? 'success'
                    : status === 'rejected'
                      ? 'danger'
                      : 'warning'
            }
            className="capitalize"
        >
            {status}
        </Badge>
    );
}

export function SectionHeader({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                {description ? (
                    <p className="text-xs text-slate-500">{description}</p>
                ) : null}
            </div>
            {action}
        </div>
    );
}
