import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type {
    AdminMilestone,
    AdminProjectDetail,
} from '@/api/admin-detail-types';
import {
    useCreateAdminMilestoneMutation,
    useDeleteAdminMilestoneMutation,
    useUpdateAdminMilestoneMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { FormMessage } from '@/features/auth/AuthCard';
import { SectionHeader } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';
import { applyServerErrors } from '@/lib/forms';

const schema = z.object({
    name: z.string().trim().min(1, 'Enter a name.').max(255),
    weight: z.coerce.number().min(0.01, 'Enter the weight.').max(100),
    estimated_hours: z.coerce
        .number()
        .min(0.25, 'At least 0.25 hours.')
        .max(100000),
    deadline: z.string(),
});
type Values = z.infer<typeof schema>;

export function AdminMilestonesPanel({
    detail,
    locked,
}: {
    detail: AdminProjectDetail;
    locked: boolean;
}) {
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const [editing, setEditing] = useState<AdminMilestone | 'new' | null>(null);
    const [deleting, setDeleting] = useState<AdminMilestone | null>(null);
    const [remove, { isLoading }] = useDeleteAdminMilestoneMutation();

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Milestones"
                description={`Weights add up to ${detail.milestones_total_weight}% of 100% in this view.`}
                action={
                    can('project-tasks.create') && !locked ? (
                        <Button size="sm" onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> New milestone
                        </Button>
                    ) : undefined
                }
            />
            {detail.milestones.length === 0 ? (
                <Card variant="flush">
                    <EmptyState title="No milestones yet" />
                </Card>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {detail.milestones.map((milestone) => (
                        <Card key={milestone.id} className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                        {milestone.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Weight {milestone.weight}% ·{' '}
                                        {milestone.estimated_hours}h budget ·{' '}
                                        {milestone.tasks_hours_sum}h planned
                                        {milestone.deadline
                                            ? ` · due ${formatDate(milestone.deadline)}`
                                            : ''}
                                    </p>
                                </div>
                                {!locked &&
                                (can('project-tasks.update') ||
                                    can('project-tasks.delete')) ? (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label={`Actions for ${milestone.name}`}
                                            >
                                                <MoreHorizontal className="size-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {can('project-tasks.update') ? (
                                                <DropdownMenuItem
                                                    onSelect={() =>
                                                        setEditing(milestone)
                                                    }
                                                >
                                                    <Pencil className="size-4" />{' '}
                                                    Edit
                                                </DropdownMenuItem>
                                            ) : null}
                                            {can('project-tasks.delete') ? (
                                                <DropdownMenuItem
                                                    destructive
                                                    onSelect={() =>
                                                        setDeleting(milestone)
                                                    }
                                                >
                                                    <Trash2 className="size-4" />{' '}
                                                    Delete
                                                </DropdownMenuItem>
                                            ) : null}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : null}
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>
                                        {milestone.completed_tasks_count} of{' '}
                                        {milestone.tasks_count} tasks
                                    </span>
                                    <span className="font-bold text-slate-900">
                                        {milestone.completion_percentage}%
                                    </span>
                                </div>
                                <ProgressBar
                                    value={milestone.completion_percentage}
                                    label={`${milestone.name} progress`}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            )}
            <Modal
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                {editing !== null ? (
                    <MilestoneForm
                        key={editing === 'new' ? 'new' : editing.id}
                        projectId={projectId}
                        phaseId={detail.selected_phase_id}
                        milestone={editing === 'new' ? null : editing}
                        onDone={() => setEditing(null)}
                    />
                ) : null}
            </Modal>
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete milestone?"
                description={
                    deleting
                        ? `"${deleting.name}" and its tasks will be removed.`
                        : ''
                }
                confirmLabel="Delete"
                loading={isLoading}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(
                            remove({ projectId, milestoneId: deleting.id }),
                        ))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

function MilestoneForm({
    projectId,
    phaseId,
    milestone,
    onDone,
}: {
    projectId: number;
    phaseId: number | null;
    milestone: AdminMilestone | null;
    onDone: () => void;
}) {
    const [create, { isLoading: creating }] = useCreateAdminMilestoneMutation();
    const [update, { isLoading: updating }] = useUpdateAdminMilestoneMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<Values>({
        resolver: zodResolver(schema) as unknown as Resolver<Values>,
        defaultValues: {
            name: milestone?.name ?? '',
            weight: milestone?.weight ?? 10,
            estimated_hours: milestone?.estimated_hours ?? 8,
            deadline: milestone?.deadline?.slice(0, 10) ?? '',
        },
    });

    const onSubmit = async (values: Values) => {
        setFormError(null);
        const body = {
            name: values.name,
            weight: values.weight,
            estimated_hours: values.estimated_hours,
            deadline: values.deadline || null,
        };

        try {
            const result = milestone
                ? await update({
                      projectId,
                      milestoneId: milestone.id,
                      body,
                  }).unwrap()
                : await create({
                      projectId,
                      body: { ...body, project_phase_id: phaseId },
                  }).unwrap();
            toast.success(result.message);
            onDone();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    'name',
                    'weight',
                    'estimated_hours',
                    'deadline',
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <ModalContent
            title={milestone ? 'Edit milestone' : 'New milestone'}
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="admin-milestone-form"
                        loading={creating || updating}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <form
                id="admin-milestone-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-4 pt-1"
            >
                <FormMessage>{formError}</FormMessage>
                <Field label="Name" required error={errors.name?.message}>
                    <Input autoFocus {...register('name')} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label="Weight (%)"
                        required
                        error={errors.weight?.message}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            {...register('weight')}
                        />
                    </Field>
                    <Field
                        label="Budget hours"
                        required
                        error={errors.estimated_hours?.message}
                    >
                        <Input
                            type="number"
                            step="0.25"
                            inputMode="decimal"
                            {...register('estimated_hours')}
                        />
                    </Field>
                </div>
                <Field label="Deadline" error={errors.deadline?.message}>
                    <Input type="date" {...register('deadline')} />
                </Field>
            </form>
        </ModalContent>
    );
}
