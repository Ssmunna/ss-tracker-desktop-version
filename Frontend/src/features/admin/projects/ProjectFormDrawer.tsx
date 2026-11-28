import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
    Controller,
    useForm,
    useWatch,
    type Control,
    type FieldErrors,
    type Path,
    type Resolver,
    type UseFormRegister,
} from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type {
    AdminProjectRow,
    ProjectFormOptions,
} from '@/api/admin-project-types';
import {
    useCreateAdminProjectMutation,
    useUpdateAdminProjectMutation,
} from '@/api/endpoints/adminProjects';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FormMessage } from '@/features/auth/AuthCard';
import { applyServerErrors } from '@/lib/forms';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { LinksFields } from './LinksFields';
import { linksPayload, linksSchema, type LinksFormValues } from './linksForm';

const MAX_PRD = 10 * 1024 * 1024;

const schema = z.object({
    name: z.string().trim().min(1, 'Enter the project name.').max(255),
    client_id: z.string(),
    category_id: z.string().min(1, 'Choose a category.'),
    project_group_id: z.string(),
    type: z.string().min(1, 'Choose a type.'),
    points: z.string(),
    estimated_hours: z.string(),
    deadline: z.string().min(1, 'Choose a deadline.'),
    department_ids: z
        .array(z.number())
        .min(1, 'Choose at least one department.'),
    links: linksSchema,
});
type Values = z.infer<typeof schema>;
const FIELDS = [
    'name',
    'client_id',
    'category_id',
    'project_group_id',
    'type',
    'points',
    'estimated_hours',
    'deadline',
    'department_ids',
] as const;

function endOfMonth(): string {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
    ).toLocaleDateString('en-CA');
}

/** Create or edit a project. On edit, choosing a file replaces the current phase's PRD. */
export function ProjectFormDrawer({
    open,
    project,
    options,
    defaultGroupId,
    onClose,
}: {
    open: boolean;
    project: AdminProjectRow | null;
    options: ProjectFormOptions;
    /** A new project starts in this group (opened from a group's page). */
    defaultGroupId?: number;
    onClose: () => void;
}) {
    return (
        <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
            {open ? (
                <DrawerContent title={project ? 'Edit project' : 'New project'}>
                    <ProjectForm
                        key={project?.id ?? 'new'}
                        project={project}
                        options={options}
                        defaultGroupId={defaultGroupId}
                        onClose={onClose}
                    />
                </DrawerContent>
            ) : null}
        </Drawer>
    );
}

function ProjectForm({
    project,
    options,
    defaultGroupId,
    onClose,
}: {
    project: AdminProjectRow | null;
    options: ProjectFormOptions;
    defaultGroupId?: number;
    onClose: () => void;
}) {
    const { t } = usePhaseLabel();
    const [create, { isLoading: creating }] = useCreateAdminProjectMutation();
    const [update, { isLoading: updating }] = useUpdateAdminProjectMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const [prd, setPrd] = useState<File | null>(null);
    const [prdError, setPrdError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        setValue,
        formState: { errors },
    } = useForm<Values>({
        resolver: zodResolver(schema) as unknown as Resolver<Values>,
        defaultValues: {
            name: project?.name ?? '',
            client_id: project?.client_id ? String(project.client_id) : '',
            category_id: project?.category_id
                ? String(project.category_id)
                : '',
            project_group_id: String(
                project
                    ? (project.project_group_id ?? '')
                    : (defaultGroupId ?? ''),
            ),
            type: project?.type ?? 'Periodic',
            points: project?.points ? String(project.points) : '',
            estimated_hours: project?.estimated_hours
                ? String(project.estimated_hours)
                : '',
            deadline: project?.deadline?.slice(0, 10) ?? '',
            department_ids: project?.department_ids ?? [],
            links: (project?.links ?? []).map((link) => ({
                label: link.label ?? '',
                url: link.url,
            })),
        },
    });
    const type = useWatch({ control, name: 'type' });

    const onSubmit = async (values: Values) => {
        setFormError(null);
        const payload: Record<string, unknown> = {
            name: values.name,
            client_id: values.client_id ? Number(values.client_id) : null,
            category_id: Number(values.category_id),
            project_group_id: values.project_group_id
                ? Number(values.project_group_id)
                : null,
            type: values.type,
            points: values.points ? Number(values.points) : null,
            estimated_hours: values.estimated_hours
                ? Number(values.estimated_hours)
                : null,
            deadline: values.deadline,
            department_ids: values.department_ids,
            // Always sent, so removing every link clears them.
            links: linksPayload(values.links),
        };

        try {
            const result = project
                ? await update({
                      id: project.id,
                      values: payload,
                      prd,
                  }).unwrap()
                : await create({ values: payload, prd }).unwrap();
            toast.success(result.message);
            onClose();
        } catch (error) {
            setFormError(
                applyServerErrors(error, setError, [
                    ...FIELDS,
                    ...values.links.map(
                        (_, index) => `links.${index}.url` as Path<Values>,
                    ),
                ]) ?? errorMessage(error),
            );
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex min-h-full flex-col"
        >
            <div className="flex-1 space-y-4 p-5">
                <FormMessage>{formError}</FormMessage>
                <Field
                    label="Project code"
                    hint={
                        project
                            ? undefined
                            : 'Generated automatically when you create the project.'
                    }
                >
                    <Input
                        readOnly
                        tabIndex={-1}
                        value={
                            project?.project_code ?? options.next_project_code
                        }
                    />
                </Field>
                <Field label="Name" required error={errors.name?.message}>
                    <Input autoFocus {...register('name')} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Type" required error={errors.type?.message}>
                        <Controller
                            control={control}
                            name="type"
                            render={({ field }) => (
                                <Select
                                    value={field.value}
                                    onValueChange={(value) => {
                                        field.onChange(value);

                                        if (value === 'Monthly') {
                                            setValue('deadline', endOfMonth());
                                        }
                                    }}
                                    options={[
                                        {
                                            value: 'Periodic',
                                            label: 'Periodic',
                                        },
                                        { value: 'Monthly', label: 'Monthly' },
                                    ]}
                                />
                            )}
                        />
                    </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                        label="Category"
                        required
                        error={errors.category_id?.message}
                    >
                        <Controller
                            control={control}
                            name="category_id"
                            render={({ field }) => (
                                <Select
                                    value={field.value || undefined}
                                    onValueChange={field.onChange}
                                    placeholder="Choose a category"
                                    options={options.categories.map(
                                        (category) => ({
                                            value: String(category.id),
                                            label: `${category.name} (${category.weight}%)`,
                                        }),
                                    )}
                                />
                            )}
                        />
                    </Field>
                    <Field
                        label="Group"
                        error={errors.project_group_id?.message}
                    >
                        <Controller
                            control={control}
                            name="project_group_id"
                            render={({ field }) => (
                                <Select
                                    value={field.value || 'none'}
                                    onValueChange={(value) =>
                                        field.onChange(
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                    options={[
                                        { value: 'none', label: 'No group' },
                                        ...options.groups
                                            .filter(
                                                (group) =>
                                                    group.status === 'active' ||
                                                    String(group.id) ===
                                                        field.value,
                                            )
                                            .map((group) => ({
                                                value: String(group.id),
                                                label: group.name,
                                            })),
                                    ]}
                                />
                            )}
                        />
                    </Field>
                    <Field label="Client" error={errors.client_id?.message}>
                        <Controller
                            control={control}
                            name="client_id"
                            render={({ field }) => (
                                <Select
                                    value={field.value || 'none'}
                                    onValueChange={(value) =>
                                        field.onChange(
                                            value === 'none' ? '' : value,
                                        )
                                    }
                                    options={[
                                        { value: 'none', label: 'No client' },
                                        ...options.clients.map((client) => ({
                                            value: String(client.id),
                                            label: client.name,
                                        })),
                                    ]}
                                />
                            )}
                        />
                    </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                        label={
                            type === 'Monthly'
                                ? 'Deadline (month end)'
                                : 'Deadline'
                        }
                        required
                        error={errors.deadline?.message}
                    >
                        <Input type="date" {...register('deadline')} />
                    </Field>
                    <Field
                        label="Estimated hours"
                        hint="Optional"
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
                </div>
                <Field
                    label="Points"
                    hint="Optional"
                    error={errors.points?.message}
                >
                    <Input
                        type="number"
                        min="1"
                        inputMode="numeric"
                        {...register('points')}
                    />
                </Field>

                <fieldset className="space-y-1.5">
                    <legend className="text-xs font-bold text-slate-700">
                        Departments <span className="text-red-500">*</span>
                    </legend>
                    <Controller
                        control={control}
                        name="department_ids"
                        render={({ field }) => (
                            <ul className="rounded-xl border border-slate-200 p-1">
                                {options.departments.map((department) => (
                                    <li key={department.id}>
                                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50 sm:min-h-9">
                                            <Checkbox
                                                checked={field.value.includes(
                                                    department.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    field.onChange(
                                                        checked === true
                                                            ? [
                                                                  ...field.value,
                                                                  department.id,
                                                              ]
                                                            : field.value.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      department.id,
                                                              ),
                                                    )
                                                }
                                            />
                                            {department.name}
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    />
                    {errors.department_ids?.message ? (
                        <p
                            role="alert"
                            className="text-xs font-medium text-red-600"
                        >
                            {errors.department_ids.message}
                        </p>
                    ) : null}
                </fieldset>

                <LinksFields
                    control={control as unknown as Control<LinksFormValues>}
                    register={
                        register as unknown as UseFormRegister<LinksFormValues>
                    }
                    errors={errors as unknown as FieldErrors<LinksFormValues>}
                />

                <Field
                    label={
                        project ? t('Replace PRD (current phase)') : 'PRD file'
                    }
                    hint="pdf, doc, docx, md · up to 10 MB"
                    error={prdError ?? undefined}
                >
                    <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.docs,.md"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file && file.size > MAX_PRD) {
                                setPrdError(
                                    'PRD file must be 10 MB or smaller.',
                                );
                                setPrd(null);

                                return;
                            }

                            setPrdError(null);
                            setPrd(file);
                        }}
                    />
                </Field>
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
                    loading={creating || updating}
                    className="w-full sm:w-auto"
                >
                    {project ? 'Save changes' : 'Create project'}
                </Button>
            </div>
        </form>
    );
}
