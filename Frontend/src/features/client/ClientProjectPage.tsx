import { ArrowLeft, Flag, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useGetClientProjectQuery,
    useReportIssueMutation,
} from '@/api/endpoints/account';
import type { ClientIssue } from '@/api/account-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/date';
import { statusTone } from '@/lib/projectStatus';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

const issueTone = {
    open: 'danger',
    in_progress: 'warning',
    resolved: 'success',
} as const;
const issueLabel = {
    open: 'Open',
    in_progress: 'In progress',
    resolved: 'Resolved',
} as const;

const trackLabel: Record<string, string> = {
    completed: 'Completed',
    on_track: 'On track',
    at_risk: 'At risk',
    overdue: 'Overdue',
    no_deadline: 'No deadline set',
};

export function ClientProjectPage() {
    const { phaseLabel, t } = usePhaseLabel();
    const { can } = usePermissions();
    const id = Number(useParams().projectId);
    const [params, setParams] = useSearchParams();
    const phase = params.get('phase') ?? undefined;
    const { data, isLoading, isError, refetch } = useGetClientProjectQuery({
        id,
        phase,
    });
    const [reporting, setReporting] = useState(false);

    if (isError) {
        return (
            <ErrorState
                title="Could not load this project"
                action={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                    >
                        Try again
                    </Button>
                }
            />
        );
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    const detail = data.phase_detail;
    const selected = data.selected_phase_id;

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to="/client/projects">
                        <ArrowLeft className="size-4" /> Projects
                    </Link>
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                            {data.project.name}
                        </h1>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            {data.project.project_code}
                            {data.project.status ? (
                                <Badge tone={statusTone(data.project.status)}>
                                    {data.project.status}
                                </Badge>
                            ) : null}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {can('chat.access') ? (
                            <Button asChild variant="outline">
                                <Link to="/chat">
                                    <MessageSquare className="size-4" /> Chat
                                    with the team
                                </Link>
                            </Button>
                        ) : null}
                        {can('client-projects.issues.create') && selected ? (
                            <Button onClick={() => setReporting(true)}>
                                <Flag className="size-4" /> Report an issue
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {data.phases.length > 1 ? (
                <div
                    role="group"
                    aria-label={phaseLabel}
                    className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
                >
                    {data.phases.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-pressed={item.id === selected}
                            onClick={() =>
                                setParams(
                                    { phase: String(item.id) },
                                    { replace: true },
                                )
                            }
                            className={cn(
                                'min-h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors',
                                item.id === selected
                                    ? 'border-brand bg-brand text-on-brand'
                                    : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                            )}
                        >
                            {item.name}
                        </button>
                    ))}
                </div>
            ) : null}

            {!detail ? (
                <Card variant="flush">
                    <EmptyState
                        title={t('No phase yet')}
                        description={t(
                            'The team has not started a phase for this project.',
                        )}
                    />
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label="Progress"
                            value={`${detail.completion_percentage}%`}
                            highlight
                        />
                        <StatCard label="Tasks" value={detail.tasks_count} />
                        <Card className="col-span-2 grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500">Starts</p>
                                <p className="text-base font-bold text-slate-900">
                                    {formatDate(detail.start_date)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">
                                    Deadline
                                </p>
                                <p className="text-base font-bold text-slate-900">
                                    {formatDate(detail.deadline)}
                                </p>
                                {detail.track ? (
                                    <p className="text-xs text-slate-500">
                                        {trackLabel[detail.track] ??
                                            detail.track}
                                    </p>
                                ) : null}
                            </div>
                        </Card>
                    </div>
                    <Card className="space-y-2">
                        <ProgressBar
                            value={detail.completion_percentage}
                            label={`${detail.name} progress`}
                        />
                        <p className="text-xs text-slate-500">{detail.name}</p>
                    </Card>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                Worked on today
                            </h2>
                            {detail.todays_work.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    No update has been reported today.
                                </p>
                            ) : (
                                <ul className="space-y-3">
                                    {detail.todays_work.map((entry, index) => (
                                        <li key={index}>
                                            <p className="text-sm font-bold text-slate-900">
                                                {entry.developer_name ??
                                                    'Team member'}
                                            </p>
                                            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">
                                                {entry.tasks.map((task, i) => (
                                                    <li key={i}>{task}</li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                        <Card className="space-y-3">
                            <h2 className="text-sm font-bold text-slate-900">
                                {t('Team on this phase')}
                            </h2>
                            {detail.developers.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                    No one is assigned yet.
                                </p>
                            ) : (
                                <ul className="flex flex-wrap gap-2">
                                    {detail.developers.map((person) => (
                                        <li key={person.id}>
                                            <Badge>{person.name}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-slate-900">
                            Issues you reported
                        </h2>
                        {detail.issues.length === 0 ? (
                            <Card variant="flush">
                                <EmptyState title="No issues reported" />
                            </Card>
                        ) : (
                            <ul className="space-y-3">
                                {detail.issues.map((issue: ClientIssue) => (
                                    <li key={issue.id}>
                                        <Card className="space-y-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {issue.title}
                                                </p>
                                                <Badge
                                                    tone={
                                                        issueTone[issue.status]
                                                    }
                                                >
                                                    {issueLabel[issue.status]}
                                                </Badge>
                                            </div>
                                            {issue.description ? (
                                                <p className="text-sm whitespace-pre-line text-slate-600">
                                                    {issue.description}
                                                </p>
                                            ) : null}
                                            <p className="text-xs text-slate-500">
                                                {formatDateTime(
                                                    issue.created_at,
                                                )}
                                            </p>
                                        </Card>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}

            <Modal open={reporting} onOpenChange={setReporting}>
                {reporting && selected ? (
                    <IssueForm
                        projectId={id}
                        phases={data.phases}
                        initialPhase={selected}
                        onDone={() => setReporting(false)}
                    />
                ) : null}
            </Modal>
        </div>
    );
}

function IssueForm({
    projectId,
    phases,
    initialPhase,
    onDone,
}: {
    projectId: number;
    phases: { id: number; name: string; is_locked: boolean }[];
    initialPhase: number;
    onDone: () => void;
}) {
    const { phaseLabel } = usePhaseLabel();
    const [report, { isLoading }] = useReportIssueMutation();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [phase, setPhase] = useState(String(initialPhase));
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title="Report an issue"
            description="Tell the team what is not right. They will see it right away."
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="report-issue"
                        loading={isLoading}
                    >
                        Send report
                    </Button>
                </>
            }
        >
            <form
                id="report-issue"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        await report({
                            projectId,
                            title,
                            description: description || null,
                            project_phase_id: Number(phase),
                        }).unwrap();
                        toast.success('Your report was sent.');
                        onDone();
                    } catch (error) {
                        const fields = fieldErrors(error);
                        setErrors(fields);

                        if (Object.keys(fields).length === 0) {
                            toast.error(errorMessage(error));
                        }
                    }
                }}
            >
                <Field label="Title" required error={errors.title}>
                    <Input
                        value={title}
                        maxLength={255}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </Field>
                <Field label="Details" error={errors.description}>
                    <Textarea
                        rows={4}
                        value={description}
                        maxLength={5000}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Field>
                {phases.length > 1 ? (
                    <Field
                        label={phaseLabel}
                        required
                        error={errors.project_phase_id}
                    >
                        <Select
                            value={phase}
                            onValueChange={setPhase}
                            options={phases.map((item) => ({
                                value: String(item.id),
                                label: item.name,
                            }))}
                        />
                    </Field>
                ) : null}
            </form>
        </ModalContent>
    );
}
