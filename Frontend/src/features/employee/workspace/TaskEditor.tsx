import { zodResolver } from '@hookform/resolvers/zod';
import { Paperclip } from 'lucide-react';
import { useRef, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import {
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useUploadTaskAttachmentsMutation,
} from '@/api/endpoints/employeeProject';
import type { ProjectDetail, TaskItem } from '@/api/project-types';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormMessage } from '@/features/auth/AuthCard';
import { fileIconFor } from '@/lib/file-icon';
import { applyServerErrors } from '@/lib/forms';

import { priorityOptions } from './constants';

const MAX_FILES = 10;
const MAX_BYTES = 10 * 1024 * 1024;

const schema = z.object({
    title: z.string().trim().min(1, 'Enter a title.').max(255),
    description: z.string().max(3000),
    milestone_id: z.string().min(1, 'Choose a milestone.'),
    estimated_hours: z.coerce
        .number()
        .min(0.01, 'Enter the estimated hours.')
        .max(10000),
    weight: z.coerce
        .number()
        .min(0.01, 'Enter the weight.')
        .max(100, 'Weight is at most 100.'),
    deadline: z.string(),
    priority: z.string(),
    assigned_developer_id: z.string(),
});
type Values = z.infer<typeof schema>;
const FIELDS = [
    'title',
    'description',
    'milestone_id',
    'estimated_hours',
    'weight',
    'deadline',
    'priority',
    'assigned_developer_id',
] as const;

function defaults(task: TaskItem | null, detail: ProjectDetail): Values {
    return {
        title: task?.title ?? '',
        description: task?.description ?? '',
        milestone_id: String(
            task?.milestone_id ?? detail.milestones[0]?.id ?? '',
        ),
        estimated_hours: task?.estimated_hours ?? (1 as number),
        weight: task?.weight ?? (1 as number),
        deadline: task?.deadline?.slice(0, 10) ?? '',
        priority: task?.priority ?? 'none',
        assigned_developer_id: String(task?.assigned_developer_id ?? ''),
    };
}

/** Create or edit a task. Only the project owner can pick the assignee. */
export function TaskEditor({
    detail,
    task,
    open,
    onClose,
}: {
    detail: ProjectDetail;
    task: TaskItem | null;
    open: boolean;
    onClose: () => void;
}) {
    return (
        <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
            {open ? (
                <DrawerContent title={task ? 'Edit task' : 'New task'}>
                    <TaskForm
                        key={task?.id ?? 'new'}
                        detail={detail}
                        task={task}
                        onClose={onClose}
                    />
                </DrawerContent>
            ) : null}
        </Drawer>
    );
}

function TaskForm({
    detail,
    task,
    onClose,
}: {
    detail: ProjectDetail;
    task: TaskItem | null;
    onClose: () => void;
}) {
    const projectId = detail.project.id;
    const isOwner = detail.project.is_project_owner;
    const [create, { isLoading: creating }] = useCreateTaskMutation();
    const [update, { isLoading: updating }] = useUpdateTaskMutation();
    const [upload, { isLoading: uploading }] =
        useUploadTaskAttachmentsMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [fileError, setFileError] = useState<string | null>(null);
    const picker = useRef<HTMLInputElement>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<Values>({
        resolver: zodResolver(schema) as unknown as Resolver<Values>,
        defaultValues: defaults(task, detail),
    });

    const pick = (list: FileList | null) => {
        const next = [...files, ...Array.from(list ?? [])];

        if (next.length > MAX_FILES) {
            setFileError(`Attach at most ${MAX_FILES} files.`);

            return;
        }

        if (next.some((file) => file.size > MAX_BYTES)) {
            setFileError('Each file must be 10 MB or smaller.');

            return;
        }

        setFileError(null);
        setFiles(next);
    };

    const onSubmit = async (values: Values) => {
        setFormError(null);
        const body: Record<string, unknown> = {
            title: values.title,
            description: values.description || null,
            milestone_id: Number(values.milestone_id),
            estimated_hours: values.estimated_hours,
            weight: values.weight,
            deadline: values.deadline || null,
            priority: values.priority === 'none' ? null : values.priority,
        };

        if (isOwner && values.assigned_developer_id) {
            body.assigned_developer_id = Number(values.assigned_developer_id);
        }

        if (!task && detail.selected_phase_id) {
            body.project_phase_id = detail.selected_phase_id;
        }

        try {
            if (task) {
                await update({ projectId, taskId: task.id, body }).unwrap();
                toast.success('Task updated.');

                if (files.length > 0) {
                    await upload({
                        projectId,
                        taskId: task.id,
                        files,
                    }).unwrap();
                }
            } else {
                await create({ projectId, body }).unwrap();
                toast.success('Task created.');
            }

            onClose();
        } catch (error) {
            const rest = applyServerErrors(error, setError, FIELDS);

            setFormError(
                rest ??
                    (Object.keys(errors).length ? null : errorMessage(error)),
            );
        }
    };

    const busy = creating || updating || uploading;

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex min-h-full flex-col"
        >
            <div className="flex-1 space-y-4 p-5">
                <FormMessage>{formError}</FormMessage>
                <Field label="Title" required error={errors.title?.message}>
                    <Input autoFocus {...register('title')} />
                </Field>
                <Field
                    label="Milestone"
                    required
                    error={errors.milestone_id?.message}
                >
                    <Controller
                        control={control}
                        name="milestone_id"
                        render={({ field }) => (
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Choose a milestone"
                                options={detail.milestones.map((milestone) => ({
                                    value: String(milestone.id),
                                    label: milestone.name,
                                }))}
                            />
                        )}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field
                        label="Estimated hours"
                        required
                        error={errors.estimated_hours?.message}
                    >
                        <Input
                            type="number"
                            step="0.25"
                            min="0"
                            inputMode="decimal"
                            {...register('estimated_hours')}
                        />
                    </Field>
                    <Field
                        label="Weight (%)"
                        required
                        error={errors.weight?.message}
                    >
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            inputMode="decimal"
                            {...register('weight')}
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Deadline" error={errors.deadline?.message}>
                        <Input type="date" {...register('deadline')} />
                    </Field>
                    <Field label="Priority">
                        <Controller
                            control={control}
                            name="priority"
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={priorityOptions}
                                />
                            )}
                        />
                    </Field>
                </div>
                {isOwner ? (
                    <Field
                        label="Assign to"
                        error={errors.assigned_developer_id?.message}
                    >
                        <Controller
                            control={control}
                            name="assigned_developer_id"
                            render={({ field }) => (
                                <Select
                                    value={field.value || undefined}
                                    onValueChange={field.onChange}
                                    placeholder="Unassigned"
                                    options={detail.project.team_developers
                                        .filter(
                                            (developer) => developer.assigned,
                                        )
                                        .map((developer) => ({
                                            value: String(developer.id),
                                            label: `${developer.name} (${developer.developer_code})`,
                                        }))}
                                />
                            )}
                        />
                    </Field>
                ) : null}
                <Field label="Description" error={errors.description?.message}>
                    <Textarea rows={4} {...register('description')} />
                </Field>

                {task ? (
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">
                            Attachments
                        </p>
                        {task.attachments.length > 0 ? (
                            <ul className="space-y-1">
                                {task.attachments.map((attachment) => {
                                    const Icon = fileIconFor(
                                        attachment.mime_type ?? '',
                                        attachment.file_name,
                                    );

                                    return (
                                        <li key={attachment.id}>
                                            <a
                                                href={attachment.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                <Icon className="size-4 text-slate-400" />{' '}
                                                <span className="truncate">
                                                    {attachment.file_name}
                                                </span>
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                        <input
                            ref={picker}
                            type="file"
                            multiple
                            hidden
                            onChange={(event) => {
                                pick(event.target.files);
                                event.target.value = '';
                            }}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => picker.current?.click()}
                        >
                            <Paperclip className="size-4" /> Add files
                        </Button>
                        {files.length > 0 ? (
                            <ul className="space-y-1 text-xs text-slate-600">
                                {files.map((file, index) => (
                                    <li
                                        key={`${file.name}-${index}`}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="truncate">
                                            {file.name}
                                        </span>
                                        <button
                                            type="button"
                                            className="font-bold text-red-600"
                                            onClick={() =>
                                                setFiles(
                                                    files.filter(
                                                        (_, i) => i !== index,
                                                    ),
                                                )
                                            }
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        {fileError ? (
                            <p
                                role="alert"
                                className="text-xs font-medium text-red-600"
                            >
                                {fileError}
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
            <div className="pb-safe sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-surface p-4 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    className="w-full sm:w-auto"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    loading={busy}
                    className="w-full sm:w-auto"
                >
                    {task ? 'Save changes' : 'Create task'}
                </Button>
            </div>
        </form>
    );
}
