import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useGetEmployeeQuery,
    useGetEmployeesQuery,
    useSaveEmployeeMutation,
} from '@/api/endpoints/people';
import type { EmployeeDetail } from '@/api/people-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { InviteLinkDialog } from '@/features/admin/org/shared';

export function EmployeeFormPage() {
    const raw = useParams().employeeId;
    const id = raw ? Number(raw) : undefined;
    const options = useGetEmployeesQuery({ per_page: 1 });
    const detail = useGetEmployeeQuery(
        { id: id ?? 0 },
        { skip: id === undefined },
    );

    if (options.isError || detail.isError) {
        return <ErrorState title="Could not load the form" />;
    }

    if (
        options.isLoading ||
        !options.data ||
        (id !== undefined && !detail.data)
    ) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-72 w-full" />
            </div>
        );
    }

    return (
        <EmployeeForm
            key={id ?? 'new'}
            id={id}
            detail={detail.data}
            departments={options.data.departments}
            roles={options.data.roles}
        />
    );
}

function EmployeeForm({
    id,
    detail,
    departments,
    roles,
}: {
    id?: number;
    detail?: EmployeeDetail;
    departments: { id: number; name: string; status: string }[];
    roles: { id: number; name: string }[];
}) {
    const navigate = useNavigate();
    const [save, { isLoading }] = useSaveEmployeeMutation();
    const [name, setName] = useState(detail?.developer.name ?? '');
    const [code, setCode] = useState(detail?.developer.developer_code ?? '');
    const [email, setEmail] = useState(detail?.developer.email ?? '');
    const [departmentId, setDepartmentId] = useState(
        String(detail?.form.department_id ?? ''),
    );
    const [roleNames, setRoleNames] = useState<string[]>(
        detail?.form.role_names ?? [],
    );
    const [active, setActive] = useState(detail?.developer.is_active ?? true);
    const [points, setPoints] = useState(
        String(detail?.form.target_points ?? 10),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [link, setLink] = useState<string | null>(null);

    const roleError = Object.entries(errors).find(([key]) =>
        key.startsWith('role_names'),
    )?.[1];

    return (
        <form
            className="mx-auto max-w-2xl space-y-5"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    const result = await save({
                        id,
                        name,
                        developer_code: code,
                        email,
                        role_names: roleNames,
                        department_id: Number(departmentId),
                        is_active: active,
                        target_points: points ? Number(points) : null,
                    }).unwrap();
                    toast.success(result.message);

                    if (result.invite_link) {
                        setLink(result.invite_link);
                    } else {
                        navigate('/admin/employees');
                    }
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link
                        to={id ? `/admin/employees/${id}` : '/admin/employees'}
                    >
                        <ArrowLeft className="size-4" /> Back
                    </Link>
                </Button>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    {id ? 'Edit employee' : 'New employee'}
                </h1>
            </div>
            <Card className="space-y-4">
                <Field label="Name" required error={errors.name}>
                    <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Employee code"
                        required
                        error={errors.developer_code}
                    >
                        <Input
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                        />
                    </Field>
                    <Field label="Email" required error={errors.email}>
                        <Input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Department"
                        required
                        error={errors.department_id}
                    >
                        <Select
                            value={departmentId}
                            onValueChange={setDepartmentId}
                            placeholder="Choose a department"
                            options={departments
                                .filter(
                                    (item) =>
                                        item.status === 'active' ||
                                        String(item.id) === departmentId,
                                )
                                .map((item) => ({
                                    value: String(item.id),
                                    label: item.name,
                                }))}
                        />
                    </Field>
                    <Field label="Target points" error={errors.target_points}>
                        <Input
                            type="number"
                            min={1}
                            max={1000}
                            value={points}
                            onChange={(event) => setPoints(event.target.value)}
                        />
                    </Field>
                </div>
                <fieldset className="space-y-1">
                    <legend className="mb-1 text-sm font-bold text-slate-900">
                        Roles <span className="text-red-600">*</span>
                    </legend>
                    <ul className="grid gap-x-4 sm:grid-cols-2">
                        {roles.map((role) => (
                            <li key={role.id}>
                                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700 lg:min-h-9">
                                    <Checkbox
                                        checked={roleNames.includes(role.name)}
                                        onCheckedChange={(value) =>
                                            setRoleNames((current) =>
                                                value === true
                                                    ? [...current, role.name]
                                                    : current.filter(
                                                          (item) =>
                                                              item !==
                                                              role.name,
                                                      ),
                                            )
                                        }
                                    />
                                    {role.name}
                                </label>
                            </li>
                        ))}
                    </ul>
                    {roleError ? (
                        <p className="text-xs text-red-600">{roleError}</p>
                    ) : null}
                </fieldset>
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-900">
                    Active
                    <Switch
                        checked={active}
                        onCheckedChange={setActive}
                        aria-label="Active"
                    />
                </label>
            </Card>
            <div className="flex justify-end gap-2">
                <Button asChild variant="secondary">
                    <Link
                        to={id ? `/admin/employees/${id}` : '/admin/employees'}
                    >
                        Cancel
                    </Link>
                </Button>
                <Button type="submit" loading={isLoading}>
                    Save employee
                </Button>
            </div>
            <InviteLinkDialog
                link={link}
                title="Share the password setup link"
                onClose={() => {
                    setLink(null);
                    navigate('/admin/employees');
                }}
            />
        </form>
    );
}
