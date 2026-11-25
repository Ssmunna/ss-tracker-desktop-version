import {
    CornerDownRight,
    MoreHorizontal,
    Pencil,
    Plus,
    Trash2,
    UserPlus,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { Priority } from '@/api/employee-types';
import {
    useCarryOverOngoingMonthMutation,
    useCarryOverOngoingTaskMutation,
    useDeleteOngoingTaskMutation,
    useGetOngoingProjectQuery,
    useSetOngoingMembersMutation,
    useUpdateOngoingMutation,
} from '@/api/endpoints/ongoingTasks';
import type { Person } from '@/api/general-types';
import type { OngoingProject, OngoingTask } from '@/api/ongoing-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { currentMonth } from '@/features/admin/general/month';
import { MonthField } from '@/features/admin/general/shared';
import { TaskForm } from '@/features/ongoing/TaskForm';
import { PriorityBadge } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';

/**
 * The ongoing tasks of one project: work that never ends (fixes, requests, support), kept in
 * monthly buckets with their own KPI weight. Each control follows its own permission.
 */
export function OngoingPanel({ projectId }: { projectId: number }) {
    const { can } = usePermissions();
    const run = useRun();
    const [month, setMonth] = useState(currentMonth());
    const { data, isLoading, isError, refetch } = useGetOngoingProjectQuery({
        projectId,
        month,
    });
    const [update, { isLoading: updating }] = useUpdateOngoingMutation();
    const [removeTask] = useDeleteOngoingTaskMutation();
    const [carryTask] = useCarryOverOngoingTaskMutation();
    const [carryMonth, { isLoading: carrying }] =
        useCarryOverOngoingMonthMutation();
    const [editing, setEditing] = useState<OngoingTask | 'new' | null>(null);
    const [deleting, setDeleting] = useState<OngoingTask | null>(null);
    const [weightOpen, setWeightOpen] = useState(false);
    const [teamOpen, setTeamOpen] = useState(false);
    const [switchingOff, setSwitchingOff] = useState(false);

    const canToggle = can('projects.ongoing.toggle');
    const canWeight = can('projects.ongoing.weight.update');
    const canAssign = can('projects.ongoing.assign');

    if (isError) {
        return (
            <ErrorState
                title="Could not load ongoing tasks"
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
        return <Skeleton className="h-64 rounded-2xl" />;
    }

    const missed = data.tasks.filter((task) => task.can_carry_over);

    const columns: Column<OngoingTask>[] = [
        {
            key: 'title',
            header: 'Task',
            primary: true,
            cell: (task) => (
                <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">
                        {task.title}
                    </p>
                    <p className="truncate text-xs font-normal text-slate-500">
                        {task.assignee
                            ? `${task.assignee.name} (${task.assignee.developer_code})`
                            : 'Unassigned'}
                        {task.assigned_by ? ` · by ${task.assigned_by}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (task) => (
                <div className="flex flex-wrap gap-1">
                    <Badge
                        tone={
                            task.status === 'completed'
                                ? 'success'
                                : task.is_missed || task.is_overdue
                                  ? 'danger'
                                  : 'warning'
                        }
                    >
                        {task.status === 'completed'
                            ? 'Completed'
                            : task.is_missed
                              ? 'Missed'
                              : task.is_overdue
                                ? 'Overdue'
                                : 'Pending'}
                    </Badge>
                    <PriorityBadge
                        priority={task.priority as Priority | null}
                    />
                    {task.carried_over ? (
                        <Badge tone="info">Carried over</Badge>
                    ) : null}
                    {task.is_locked && !task.is_missed ? (
                        <Badge>Month closed</Badge>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'deadline',
            header: 'Deadline',
            cell: (task) => (
                <span className="text-xs">{formatDate(task.deadline)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (task) =>
                canAssign && (!task.is_locked || task.can_carry_over) ? (
                    <div onClick={(event) => event.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Actions for ${task.title}`}
                                >
                                    <MoreHorizontal className="size-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {task.can_carry_over && data.enabled ? (
                                    <DropdownMenuItem
                                        onSelect={() =>
                                            void run(
                                                carryTask(task.id),
                                                'Task carried over to the next month.',
                                            )
                                        }
                                    >
                                        <CornerDownRight className="size-4" />{' '}
                                        Carry over
                                    </DropdownMenuItem>
                                ) : null}
                                {!task.is_locked ? (
                                    <>
                                        <DropdownMenuItem
                                            onSelect={() => setEditing(task)}
                                        >
                                            <Pencil className="size-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            destructive
                                            onSelect={() => setDeleting(task)}
                                        >
                                            <Trash2 className="size-4" /> Delete
                                        </DropdownMenuItem>
                                    </>
                                ) : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ) : null,
        },
    ];

    return (
        <div className="space-y-4">
            <Card
                variant="tinted"
                className="flex flex-wrap items-center justify-between gap-3"
            >
                <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-900">
                        Ongoing tasks
                    </p>
                    <p className="text-xs text-slate-600">
                        Fixes, requests and support that never end. They stay
                        apart from phases and versions, and carry their own
                        monthly KPI weight.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700">
                        {data.enabled ? 'On' : 'Off'}
                    </span>
                    <Switch
                        aria-label="Ongoing tasks"
                        checked={data.enabled}
                        disabled={!canToggle || updating}
                        onCheckedChange={(checked) =>
                            checked
                                ? void run(
                                      update({ projectId, enabled: true }),
                                      'Ongoing tasks switched on.',
                                  )
                                : setSwitchingOff(true)
                        }
                    />
                </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2">
                <Card className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Monthly weight
                        </p>
                        <p className="text-lg font-extrabold text-slate-900">
                            {data.weight}%
                        </p>
                        <p className="text-xs text-slate-500">
                            {data.own_weight === null
                                ? 'Default weight'
                                : `This project’s own weight (default ${data.default_weight}%)`}
                        </p>
                    </div>
                    {canWeight ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setWeightOpen(true)}
                        >
                            Change
                        </Button>
                    ) : null}
                </Card>
                <Card className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                            Team ({data.members.length})
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                            {data.members.length === 0
                                ? 'No one yet. Only team members see these tasks.'
                                : data.members
                                      .map((member) => member.name)
                                      .join(', ')}
                        </p>
                    </div>
                    {canAssign ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTeamOpen(true)}
                        >
                            Manage
                        </Button>
                    ) : null}
                </Card>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
                <MonthField value={month} onChange={setMonth} />
                <div className="flex flex-wrap gap-2">
                    {canAssign && data.enabled && missed.length > 0 ? (
                        <Button
                            variant="outline"
                            loading={carrying}
                            onClick={() =>
                                void run(
                                    carryMonth({ projectId, month }),
                                    `${missed.length} unfinished task(s) carried over.`,
                                )
                            }
                        >
                            <CornerDownRight className="size-4" /> Carry over
                            all unfinished ({missed.length})
                        </Button>
                    ) : null}
                    {canAssign && data.enabled ? (
                        <Button onClick={() => setEditing('new')}>
                            <Plus className="size-4" /> Add task
                        </Button>
                    ) : null}
                </div>
            </div>

            {data.summary.length > 0 ? (
                <Card variant="flush" className="divide-y divide-slate-100">
                    {data.summary.map((row) => (
                        <div
                            key={row.developer_id}
                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                        >
                            <span className="font-bold text-slate-900">
                                {row.developer_name}{' '}
                                <span className="font-normal text-slate-500">
                                    ({row.developer_code})
                                </span>
                            </span>
                            <span className="text-xs text-slate-600">
                                {row.completed}/{row.assigned} done ·{' '}
                                {row.missed} missed
                                {row.is_closed &&
                                row.awarded_kpi_percentage !== null
                                    ? ` · KPI ${row.awarded_kpi_percentage}`
                                    : ' · month open'}
                            </span>
                        </div>
                    ))}
                </Card>
            ) : null}

            <DataTable
                columns={columns}
                rows={data.tasks}
                rowKey={(task) => task.id}
                emptyTitle={
                    data.enabled
                        ? 'No ongoing tasks this month'
                        : 'Ongoing tasks are switched off'
                }
            />

            <Drawer
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DrawerContent
                    title={
                        editing === 'new' ? 'Add an ongoing task' : 'Edit task'
                    }
                >
                    {editing ? (
                        <TaskForm
                            key={editing === 'new' ? 'new' : editing.id}
                            projectId={projectId}
                            task={editing === 'new' ? null : editing}
                            people={data.members}
                            onDone={() => setEditing(null)}
                        />
                    ) : null}
                </DrawerContent>
            </Drawer>

            <Modal open={weightOpen} onOpenChange={setWeightOpen}>
                {weightOpen ? (
                    <WeightForm
                        projectId={projectId}
                        data={data}
                        onDone={() => setWeightOpen(false)}
                    />
                ) : null}
            </Modal>

            <Modal open={teamOpen} onOpenChange={setTeamOpen}>
                {teamOpen ? (
                    <TeamForm
                        projectId={projectId}
                        data={data}
                        onDone={() => setTeamOpen(false)}
                    />
                ) : null}
            </Modal>

            <ConfirmDialog
                open={switchingOff}
                onOpenChange={setSwitchingOff}
                destructive
                title="Switch off ongoing tasks?"
                description="Employees without open work stop seeing it, and no new tasks can be added. Open tasks stay until the month closes."
                confirmLabel="Switch off"
                onConfirm={async () => {
                    if (
                        await run(
                            update({ projectId, enabled: false }),
                            'Ongoing tasks switched off.',
                        )
                    ) {
                        setSwitchingOff(false);
                    }
                }}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete task?"
                description={
                    deleting ? `"${deleting.title}" will be removed.` : ''
                }
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (deleting && (await run(removeTask(deleting.id)))) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}

function WeightForm({
    projectId,
    data,
    onDone,
}: {
    projectId: number;
    data: OngoingProject;
    onDone: () => void;
}) {
    const [update, { isLoading }] = useUpdateOngoingMutation();
    const [value, setValue] = useState(String(data.weight));
    const [error, setError] = useState<string | undefined>();

    const submit = async (weight: number | null) => {
        try {
            await update({ projectId, weight }).unwrap();
            toast.success('Monthly weight updated.');
            onDone();
        } catch (e) {
            setError(fieldErrors(e).weight ?? errorMessage(e));
        }
    };

    return (
        <ModalContent
            title="Monthly weight"
            description="Share of each team member’s monthly KPI that this project’s ongoing tasks carry. Months already closed keep their weight."
            footer={
                <>
                    {data.own_weight !== null ? (
                        <Button
                            variant="ghost"
                            loading={isLoading}
                            onClick={() => submit(null)}
                        >
                            Use default ({data.default_weight}%)
                        </Button>
                    ) : null}
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        loading={isLoading}
                        onClick={() => submit(Number(value))}
                    >
                        Save
                    </Button>
                </>
            }
        >
            <Field label="Weight (%)" required error={error}>
                <Input
                    type="number"
                    min={1}
                    max={100}
                    step="0.01"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />
            </Field>
        </ModalContent>
    );
}

function TeamForm({
    projectId,
    data,
    onDone,
}: {
    projectId: number;
    data: OngoingProject;
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSetOngoingMembersMutation();
    const [members, setMembers] = useState<Person[]>(data.members);
    const [term, setTerm] = useState('');
    const chosen = new Set(members.map((member) => member.id));
    // Everyone on the project's own team who is not on the ongoing team yet.
    const teamToAdd = data.project_team.filter(
        (developer) => !chosen.has(developer.id),
    );
    const query = term.trim().toLowerCase();
    const candidates = data.project_team.filter(
        (developer) =>
            !chosen.has(developer.id) &&
            (query === '' ||
                `${developer.name} ${developer.developer_code}`
                    .toLowerCase()
                    .includes(query)),
    );

    return (
        <ModalContent
            title="Ongoing team"
            description="Only these employees see this project’s ongoing tasks and can be assigned to them. They must be on the project’s own team."
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        loading={isLoading}
                        onClick={async () => {
                            try {
                                await save({
                                    projectId,
                                    developer_ids: members.map(
                                        (member) => member.id,
                                    ),
                                }).unwrap();
                                toast.success('Ongoing team updated.');
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
            <div className="space-y-3">
                {teamToAdd.length > 0 ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setMembers((current) => [...current, ...teamToAdd])
                        }
                    >
                        <UserPlus className="size-4" /> Add project team (
                        {teamToAdd.length})
                    </Button>
                ) : null}
                <Input
                    density="compact"
                    aria-label="Search employee"
                    placeholder="Search employee to add"
                    value={term}
                    autoComplete="off"
                    onChange={(event) => setTerm(event.target.value)}
                />
                {/* An inline list: a floating one would be clipped by the scrolling dialog. */}
                <ul className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-1">
                    {candidates.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-slate-500">
                            No employee found
                        </li>
                    ) : (
                        candidates.map((developer) => (
                            <li key={developer.id}>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                                    onClick={() =>
                                        setMembers((current) => [
                                            ...current,
                                            developer,
                                        ])
                                    }
                                >
                                    <span className="font-medium text-slate-900">
                                        {developer.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {developer.developer_code}
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
                <ul className="flex flex-wrap gap-2">
                    {members.map((member) => (
                        <li
                            key={member.id}
                            className="flex items-center gap-1 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-xs font-medium text-slate-800"
                        >
                            {member.name}
                            <button
                                type="button"
                                aria-label={`Remove ${member.name}`}
                                className="rounded-full p-1 hover:bg-slate-200"
                                onClick={() =>
                                    setMembers((current) =>
                                        current.filter(
                                            (item) => item.id !== member.id,
                                        ),
                                    )
                                }
                            >
                                <X className="size-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </ModalContent>
    );
}
