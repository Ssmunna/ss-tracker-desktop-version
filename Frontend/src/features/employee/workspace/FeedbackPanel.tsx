import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import { useUpdateIssueStatusMutation } from '@/api/endpoints/employeeProject';
import type { IssueItem, ProjectDetail } from '@/api/project-types';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateTime } from '@/lib/date';

import { SectionHeader } from './shared';

const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
];

/** Issues the client reported; the team moves them along. */
export function FeedbackPanel({ detail }: { detail: ProjectDetail }) {
    const { can } = usePermissions();
    const [update] = useUpdateIssueStatusMutation();

    const change = async (issue: IssueItem, status: IssueItem['status']) => {
        try {
            const result = await update({
                projectId: detail.project.id,
                issueId: issue.id,
                status,
            }).unwrap();
            toast.success(result.message);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Client feedback"
                description="Issues reported by the client for this project."
            />
            {detail.project.issues.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No client feedback yet" />
                </Card>
            ) : (
                <ul className="space-y-3">
                    {detail.project.issues.map((issue) => (
                        <li key={issue.id}>
                            <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-bold text-slate-900">
                                        {issue.title}
                                    </p>
                                    {issue.description ? (
                                        <p className="text-sm whitespace-pre-line text-slate-600">
                                            {issue.description}
                                        </p>
                                    ) : null}
                                    <p className="text-xs text-slate-500">
                                        {issue.client?.name ??
                                            issue.reported_by?.name ??
                                            'Client'}{' '}
                                        · {formatDateTime(issue.created_at)}
                                    </p>
                                </div>
                                <Select
                                    className="sm:w-40"
                                    aria-label={`Status for ${issue.title}`}
                                    value={issue.status}
                                    disabled={
                                        !can('employee-projects.issues.update')
                                    }
                                    onValueChange={(value) =>
                                        change(
                                            issue,
                                            value as IssueItem['status'],
                                        )
                                    }
                                    options={statusOptions}
                                />
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
