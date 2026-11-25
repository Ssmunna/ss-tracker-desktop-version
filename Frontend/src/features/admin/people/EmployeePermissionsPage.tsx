import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import {
    useGetEmployeePermissionsQuery,
    useSaveSpecialPermissionsMutation,
} from '@/api/endpoints/people';
import type { PermissionScreen } from '@/api/people-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useRun } from '@/hooks/useRun';

import { PermissionChecklist } from './PermissionChecklist';

export function EmployeePermissionsPage() {
    const id = Number(useParams().employeeId);
    const { data, isLoading, isError } = useGetEmployeePermissionsQuery(id);

    if (isError) {
        return <ErrorState title="Could not load permissions" />;
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    return <Screen key={id} id={id} data={data} />;
}

function Screen({ id, data }: { id: number; data: PermissionScreen }) {
    const run = useRun();
    const navigate = useNavigate();
    const [save, { isLoading }] = useSaveSpecialPermissionsMutation();
    const [selected, setSelected] = useState<number[]>(
        data.directPermissionIds,
    );

    return (
        <div className="space-y-5 pb-24">
            <div className="space-y-2">
                <Button asChild variant="ghost" size="sm">
                    <Link to={`/admin/employees/${id}`}>
                        <ArrowLeft className="size-4" /> {data.developer.name}
                    </Link>
                </Button>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Special permissions
                </h1>
                <p className="text-sm text-slate-500">
                    Extra permissions for {data.developer.name} on top of their
                    roles. Permissions a role already grants are not listed.
                </p>
            </div>
            <Card className="space-y-2">
                <p className="text-sm font-bold text-slate-900">Roles</p>
                <div className="flex flex-wrap gap-2">
                    {data.roleNames.map((name) => (
                        <Badge key={name} tone="info">
                            {name}
                        </Badge>
                    ))}
                    <span className="text-xs text-slate-500">
                        {data.rolePermissionNames.length} permission(s) from
                        roles
                    </span>
                </div>
            </Card>
            <PermissionChecklist
                groups={data.permissionGroups}
                selected={selected}
                onChange={setSelected}
            />
            <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/90 bg-surface p-3 lg:left-64">
                <div className="flex justify-end gap-2">
                    <Button asChild variant="secondary">
                        <Link to={`/admin/employees/${id}`}>Cancel</Link>
                    </Button>
                    <Button
                        loading={isLoading}
                        onClick={async () => {
                            if (
                                await run(
                                    save({ id, direct_permissions: selected }),
                                )
                            ) {
                                navigate(`/admin/employees/${id}`);
                            }
                        }}
                    >
                        Save permissions
                    </Button>
                </div>
            </div>
        </div>
    );
}
