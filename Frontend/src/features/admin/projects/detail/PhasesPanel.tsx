import {
    CheckCheck,
    Lock,
    MoreHorizontal,
    Pencil,
    Plus,
    RotateCcw,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { AdminPhase, AdminProjectDetail } from '@/api/admin-detail-types';
import {
    useCompletePhaseMutation,
    useCreatePhaseMutation,
    useGetPhaseAssignmentsQuery,
    useReopenPhaseMutation,
    useSetPhaseDevelopersMutation,
    useUpdatePhaseMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';
import { formatDate } from '@/lib/date';

import { DeveloperPicker } from './DeveloperPicker';

const DEADLINE_REQUIRED = 'A deadline is required.';

/** First field error if the server sent any, else the general message. */
function failureMessage(error: unknown): string {
    return Object.values(fieldErrors(error))[0] ?? errorMessage(error);
}

type Dialog =
    | { kind: 'create' }
    | { kind: 'edit' | 'complete' | 'reopen' | 'team'; phase: AdminPhase }
    | null;

export function PhasesPanel({ detail }: { detail: AdminProjectDetail }) {
    const { can } = usePermissions();
    const { phaseLabel, phaseLabelPlural } = usePhaseLabel();
    const [dialog, setDialog] = useState<Dialog>(null);
    const [updatePhase] = useUpdatePhaseMutation();
    const projectId = detail.project.id;
    const close = () => setDialog(null);

    // The active phase always leads the list; the rest keep the server order.
    const phases = [...detail.phases].sort(
        (a, b) =>
            Number(b.id === detail.active_phase_id) -
            Number(a.id === detail.active_phase_id),
    );

    function statusOptions(phase: AdminPhase) {
        if (phase.is_locked) {
            return can('project-phases.reopen') &&
                phase.status !== 'In Progress'
                ? [phase.status, 'In Progress']
                : [phase.status];
        }

        return detail.phase_statuses.filter((value) =>
            value === phase.status
                ? true
                : value === 'Successful'
                  ? can('project-phases.complete')
                  : can('project-phases.update'),
        );
    }

    async function changeStatus(phase: AdminPhase, next: string) {
        if (next === phase.status) return;

        if (next === 'Successful') {
            setDialog({ kind: 'complete', phase });
            return;
        }

        if (phase.is_locked) {
            setDialog({ kind: 'reopen', phase });
            return;
        }

        try {
            const result = await updatePhase({
                projectId,
                phaseId: phase.id,
                body: {
                    phase_weight: phase.phase_weight,
                    deadline: phase.deadline?.slice(0, 10) ?? null,
                    status: next,
                },
            }).unwrap();
            toast.success(result.message);
        } catch (error) {
            toast.error(failureMessage(error));
        }
    }

    const columns: Column<AdminPhase>[] = [
        {
            key: 'name',
            header: phaseLabel,
            primary: true,
            cell: (phase) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                        {phase.name}
                    </span>
                    {detail.active_phase_id === phase.id ? (
                        <Badge tone="info">Current</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (phase) => {
                const options = statusOptions(phase);

                return options.length > 1 ? (
                    <Select
                        density="compact"
                        className="min-w-40"
                        value={phase.status}
                        onValueChange={(next) => void changeStatus(phase, next)}
                        options={options.map((value) => ({
                            value,
                            label:
                                phase.is_locked && value === 'In Progress'
                                    ? 'Reopen (In Progress)'
                                    : value,
                        }))}
                    />
                ) : (
                    <Badge tone={phase.is_locked ? 'success' : 'brand'}>
                        {phase.is_locked ? <Lock className="size-3" /> : null}{' '}
                        {phase.status}
                    </Badge>
                );
            },
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (phase) => formatDate(phase.deadline),
        },
        {
            key: 'kpi',
            header: 'KPI month',
            hideOnMobile: true,
            cell: (phase) =>
                phase.kpi_month ? `${phase.kpi_month}/${phase.kpi_year}` : '-',
        },
        {
            key: 'weight',
            header: 'Weight',
            hideOnMobile: true,
            cell: (phase) =>
                `${phase.phase_weight}% (effective ${phase.effective_weight ?? '-'}%)`,
        },
        {
            key: 'completion',
            header: 'Completion',
            cell: (phase) => (
                <div className="min-w-28 space-y-1">
                    <span className="text-xs font-bold text-slate-900">
                        {phase.completion_percentage}%
                    </span>
                    <ProgressBar
                        value={phase.completion_percentage}
                        label={`${phase.name} completion`}
                    />
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (phase) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${phase.name}`}
                        >
                            <MoreHorizontal className="size-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {can('project-phases.update') && !phase.is_locked ? (
                            <DropdownMenuItem
                                onSelect={() =>
                                    setDialog({ kind: 'edit', phase })
                                }
                            >
                                <Pencil className="size-4" /> Edit
                            </DropdownMenuItem>
                        ) : null}
                        {can('project-phases.assignments.update') &&
                        !phase.is_locked ? (
                            <DropdownMenuItem
                                onSelect={() =>
                                    setDialog({ kind: 'team', phase })
                                }
                            >
                                <Users className="size-4" /> Assign developers
                            </DropdownMenuItem>
                        ) : null}
                        {can('project-phases.complete') && !phase.is_locked ? (
                            <DropdownMenuItem
                                onSelect={() =>
                                    setDialog({ kind: 'complete', phase })
                                }
                            >
                                <CheckCheck className="size-4" /> Complete
                            </DropdownMenuItem>
                        ) : null}
                        {can('project-phases.reopen') && phase.is_locked ? (
                            <DropdownMenuItem
                                onSelect={() =>
                                    setDialog({ kind: 'reopen', phase })
                                }
                            >
                                <RotateCcw className="size-4" /> Reopen
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        {phaseLabelPlural} ({detail.phases.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                        Each {phaseLabel.toLowerCase()} has its own tasks,
                        weight and KPI month.
                    </p>
                </div>
                {can('project-phases.create') ? (
                    <Button
                        size="sm"
                        onClick={() => setDialog({ kind: 'create' })}
                    >
                        <Plus className="size-4" /> New{' '}
                        {phaseLabel.toLowerCase()}
                    </Button>
                ) : null}
            </div>

            <DataTable
                columns={columns}
                rows={phases}
                rowKey={(phase) => phase.id}
                emptyTitle={`No ${phaseLabelPlural.toLowerCase()} yet`}
            />

            <Modal
                open={dialog?.kind === 'create'}
                onOpenChange={(open) => !open && close()}
            >
                {dialog?.kind === 'create' ? (
                    <CreatePhaseForm
                        projectId={projectId}
                        detail={detail}
                        onDone={close}
                    />
                ) : null}
            </Modal>
            <Modal
                open={dialog?.kind === 'edit'}
                onOpenChange={(open) => !open && close()}
            >
                {dialog?.kind === 'edit' ? (
                    <EditPhaseForm
                        projectId={projectId}
                        detail={detail}
                        phase={dialog.phase}
                        onDone={close}
                    />
                ) : null}
            </Modal>
            <Modal
                open={dialog?.kind === 'complete'}
                onOpenChange={(open) => !open && close()}
            >
                {dialog?.kind === 'complete' ? (
                    <CompleteForm
                        projectId={projectId}
                        phase={dialog.phase}
                        onDone={close}
                    />
                ) : null}
            </Modal>
            <Modal
                open={dialog?.kind === 'reopen'}
                onOpenChange={(open) => !open && close()}
            >
                {dialog?.kind === 'reopen' ? (
                    <ReopenForm
                        projectId={projectId}
                        phase={dialog.phase}
                        onDone={close}
                    />
                ) : null}
            </Modal>
            <Modal
                open={dialog?.kind === 'team'}
                onOpenChange={(open) => !open && close()}
            >
                {dialog?.kind === 'team' ? (
                    <TeamForm
                        projectId={projectId}
                        detail={detail}
                        phase={dialog.phase}
                        onDone={close}
                    />
                ) : null}
            </Modal>
        </div>
    );
}

function Footer({
    id,
    label,
    loading,
}: {
    id: string;
    label: string;
    loading: boolean;
}) {
    return (
        <>
            <ModalClose asChild>
                <Button variant="secondary">Cancel</Button>
            </ModalClose>
            <Button type="submit" form={id} loading={loading}>
                {label}
            </Button>
        </>
    );
}

function CreatePhaseForm({
    projectId,
    detail,
    onDone,
}: {
    projectId: number;
    detail: AdminProjectDetail;
    onDone: () => void;
}) {
    const { phaseLabel } = usePhaseLabel();
    const [create, { isLoading }] = useCreatePhaseMutation();
    const [category, setCategory] = useState(
        detail.categories
            .find((item) => item.status === 'active')
            ?.id.toString() ?? '',
    );
    const [start, setStart] = useState('');
    const [deadline, setDeadline] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title={`New ${phaseLabel.toLowerCase()}`}
            footer={
                <Footer id="phase-create" label="Create" loading={isLoading} />
            }
        >
            <form
                id="phase-create"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    if (!deadline) {
                        setErrors({ deadline: DEADLINE_REQUIRED });
                        toast.error(DEADLINE_REQUIRED);
                        return;
                    }

                    try {
                        const result = await create({
                            projectId,
                            body: {
                                category_id: Number(category),
                                start_date: start || null,
                                deadline: deadline || null,
                            },
                        }).unwrap();
                        toast.success(result.message);
                        onDone();
                    } catch (error) {
                        setErrors(fieldErrors(error));
                        toast.error(failureMessage(error));
                    }
                }}
            >
                <Field label="Category" required error={errors.category_id}>
                    <Select
                        value={category || undefined}
                        onValueChange={setCategory}
                        placeholder="Choose a category"
                        options={detail.categories
                            .filter((item) => item.status === 'active')
                            .map((item) => ({
                                value: String(item.id),
                                label: `${item.name} (${item.weight}%)`,
                            }))}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Start date" error={errors.start_date}>
                        <Input
                            type="date"
                            value={start}
                            onChange={(event) => setStart(event.target.value)}
                        />
                    </Field>
                    <Field label="Deadline" required error={errors.deadline}>
                        <Input
                            type="date"
                            value={deadline}
                            onChange={(event) =>
                                setDeadline(event.target.value)
                            }
                        />
                    </Field>
                </div>
            </form>
        </ModalContent>
    );
}

function EditPhaseForm({
    projectId,
    detail,
    phase,
    onDone,
}: {
    projectId: number;
    detail: AdminProjectDetail;
    phase: AdminPhase;
    onDone: () => void;
}) {
    const [update, { isLoading }] = useUpdatePhaseMutation();
    const [weight, setWeight] = useState(String(phase.phase_weight));
    const [deadline, setDeadline] = useState(
        phase.deadline?.slice(0, 10) ?? '',
    );
    const [status, setStatus] = useState(phase.status);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <ModalContent
            title={`Edit ${phase.name}`}
            footer={<Footer id="phase-edit" label="Save" loading={isLoading} />}
        >
            <form
                id="phase-edit"
                className="space-y-4 pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    if (!deadline) {
                        setErrors({ deadline: DEADLINE_REQUIRED });
                        toast.error(DEADLINE_REQUIRED);
                        return;
                    }

                    try {
                        const result = await update({
                            projectId,
                            phaseId: phase.id,
                            body: {
                                phase_weight: Number(weight),
                                deadline: deadline || null,
                                status,
                            },
                        }).unwrap();
                        toast.success(result.message);
                        onDone();
                    } catch (error) {
                        setErrors(fieldErrors(error));
                        toast.error(failureMessage(error));
                    }
                }}
            >
                <Field label="Status" error={errors.status}>
                    <Select
                        value={status}
                        onValueChange={setStatus}
                        options={detail.phase_statuses
                            .filter((value) => value !== 'Successful')
                            .map((value) => ({ value, label: value }))}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Weight (%)" error={errors.phase_weight}>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={weight}
                            onChange={(event) => setWeight(event.target.value)}
                        />
                    </Field>
                    <Field label="Deadline" required error={errors.deadline}>
                        <Input
                            type="date"
                            value={deadline}
                            onChange={(event) =>
                                setDeadline(event.target.value)
                            }
                        />
                    </Field>
                </div>
            </form>
        </ModalContent>
    );
}

function CompleteForm({
    projectId,
    phase,
    onDone,
}: {
    projectId: number;
    phase: AdminPhase;
    onDone: () => void;
}) {
    const [complete, { isLoading }] = useCompletePhaseMutation();
    const [reference, setReference] = useState('');

    return (
        <ModalContent
            title={`Complete ${phase.name}?`}
            description="The tasks become read only and each assigned developer's contribution is added to their KPI."
            footer={
                <Footer
                    id="phase-complete"
                    label="Complete"
                    loading={isLoading}
                />
            }
        >
            <form
                id="phase-complete"
                className="pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await complete({
                            projectId,
                            phaseId: phase.id,
                            client_approval_reference: reference || undefined,
                        }).unwrap();
                        toast.success(result.message);
                        onDone();
                    } catch (error) {
                        toast.error(failureMessage(error));
                    }
                }}
            >
                <Field label="Client approval reference" hint="Optional">
                    <Input
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

function ReopenForm({
    projectId,
    phase,
    onDone,
}: {
    projectId: number;
    phase: AdminPhase;
    onDone: () => void;
}) {
    const { t } = usePhaseLabel();
    const [reopen, { isLoading }] = useReopenPhaseMutation();
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | undefined>();

    return (
        <ModalContent
            title={`Reopen ${phase.name}`}
            description={t(
                'A reason is required. The phase returns to In Progress and its KPI is recalculated when completed again.',
            )}
            footer={
                <Footer id="phase-reopen" label="Reopen" loading={isLoading} />
            }
        >
            <form
                id="phase-reopen"
                className="pt-1"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await reopen({
                            projectId,
                            phaseId: phase.id,
                            reason,
                        }).unwrap();
                        toast.success(result.message);
                        onDone();
                    } catch (failure) {
                        setError(
                            fieldErrors(failure).reason ??
                                errorMessage(failure),
                        );
                    }
                }}
            >
                <Field label="Reason" required error={error}>
                    <Textarea
                        rows={3}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                    />
                </Field>
            </form>
        </ModalContent>
    );
}

function TeamForm({
    projectId,
    detail,
    phase,
    onDone,
}: {
    projectId: number;
    detail: AdminProjectDetail;
    phase: AdminPhase;
    onDone: () => void;
}) {
    const { data, isLoading: loading } = useGetPhaseAssignmentsQuery({
        projectId,
        phaseId: phase.id,
    });
    const [save, { isLoading }] = useSetPhaseDevelopersMutation();
    const [picked, setPicked] = useState<number[] | null>(null);
    const selected =
        picked ?? data?.assignments.map((item) => item.developer.id) ?? [];

    return (
        <ModalContent
            title={`Developers on ${phase.name}`}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        loading={isLoading}
                        disabled={loading}
                        onClick={async () => {
                            try {
                                const result = await save({
                                    projectId,
                                    phaseId: phase.id,
                                    developer_ids: selected,
                                }).unwrap();
                                toast.success(result.message);
                                onDone();
                            } catch (error) {
                                toast.error(errorMessage(error));
                            }
                        }}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <div className="space-y-3 pt-1">
                <DeveloperPicker
                    options={detail.available_developers.filter(
                        (developer) => !selected.includes(developer.id),
                    )}
                    onPick={(developer) =>
                        setPicked([...selected, developer.id])
                    }
                />
                {selected.length === 0 ? (
                    <p className="text-xs text-slate-500">
                        No developers assigned yet.
                    </p>
                ) : (
                    <ul className="flex flex-wrap gap-2">
                        {selected.map((id) => {
                            const developer = detail.available_developers.find(
                                (item) => item.id === id,
                            );

                            return (
                                <li
                                    key={id}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-xs font-medium text-slate-800"
                                >
                                    {developer?.name ?? `#${id}`}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${developer?.name ?? id}`}
                                        className="inline-flex size-5 items-center justify-center rounded-full hover:bg-slate-200"
                                        onClick={() =>
                                            setPicked(
                                                selected.filter(
                                                    (item) => item !== id,
                                                ),
                                            )
                                        }
                                    >
                                        <X className="size-3" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </ModalContent>
    );
}
