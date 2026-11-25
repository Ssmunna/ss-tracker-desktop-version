import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Circle,
    CircleDot,
    Copy,
    Eye,
    Flag,
    Layers,
    Pencil,
    Search,
    Trash2,
    Upload,
    User,
} from 'lucide-react';
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { toast } from 'sonner';

import type { Priority } from '@/api/employee-types';
import type { ProjectDetail, TaskItem, TaskStatus } from '@/api/project-types';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { RowMenu, type RowMenuItem } from './RowMenu';
import {
    initials,
    PRIORITY_ICON,
    PRIORITY_LABEL,
    PRIORITY_STYLE,
    selectClass,
} from './taskTableStyles';
import { useIncremental } from './useIncremental';

type Team = ProjectDetail['project']['team_developers'];

export interface TableActions {
    status: (task: TaskItem, status: TaskStatus) => void;
    priority: (task: TaskItem, priority: Priority | null) => void;
    assign: (task: TaskItem, developerId: number | null) => void;
    details: (task: TaskItem) => void;
    edit: (task: TaskItem) => void;
    remove: (task: TaskItem) => void;
}

const STATUS_STYLE: Record<TaskStatus, string> = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-sky-100 text-sky-700',
    completed: 'bg-emerald-100 text-emerald-700',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
};

const today = () => new Date().toISOString().slice(0, 10);

const hm = (decimal: number | null) => {
    if (decimal === null) {
        return null;
    }

    const total = Math.round(decimal * 60);
    const h = Math.floor(total / 60);
    const m = total % 60;

    return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

type MenuKind = 'status' | 'priority' | 'assignee';

interface RowFlags {
    canToggle: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    isOwner: boolean;
    locked: boolean;
}

interface RowHandlers extends TableActions {
    openMenu: (kind: MenuKind, task: TaskItem, anchor: HTMLElement) => void;
    copy: (task: TaskItem) => void;
}

const Row = memo(function Row({
    task,
    flags,
    now,
    copied,
    h,
}: {
    task: TaskItem;
    flags: RowFlags;
    now: string;
    copied: boolean;
    h: RowHandlers;
}) {
    const done = task.status === 'completed';
    const missed =
        !done && task.deadline !== null && task.deadline.slice(0, 10) < now;
    const priority = task.priority ?? 'none';
    const people = task.assigned_developer;
    const files = task.attachments.length;
    const small =
        'inline-flex size-6 items-center justify-center rounded-md border transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <tr className={cn('text-slate-700', missed && 'bg-rose-50/60')}>
            <td className="px-3 py-2.5 text-xs font-semibold text-slate-500">
                {task.task_code ? task.task_code.replace('#', '') : '#'}
            </td>
            <td className="px-3 py-2.5">
                <p
                    className={cn(
                        'font-medium text-slate-900',
                        done && 'text-slate-500 line-through',
                    )}
                >
                    {task.title}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    {task.milestone ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                            <Layers className="size-2.5" />
                            {task.milestone.name}
                        </span>
                    ) : null}
                    {files > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Upload className="size-3" />
                            {files} file{files > 1 ? 's' : ''}
                        </span>
                    ) : null}
                </div>
            </td>
            <td className="px-3 py-2.5">
                <button
                    type="button"
                    disabled={
                        !flags.isOwner || !flags.canUpdate || flags.locked
                    }
                    onClick={(event) =>
                        h.openMenu('assignee', task, event.currentTarget)
                    }
                    className="inline-flex h-8 max-w-44 items-center gap-2 rounded-full border border-slate-200 bg-white pr-2.5 pl-1.5 text-xs font-medium text-slate-700 disabled:cursor-default"
                >
                    <span
                        className={cn(
                            'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                            people
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500',
                        )}
                    >
                        {people ? (
                            initials(people.name)
                        ) : (
                            <User className="size-3" />
                        )}
                    </span>
                    <span className="truncate">
                        {people?.name ?? 'Unassigned'}
                    </span>
                </button>
            </td>
            <td className="px-3 py-2.5 text-xs text-slate-600">
                {task.created_by
                    ? `${task.created_by.name} (${task.created_by.developer_code})`
                    : 'Unknown'}
            </td>
            <td className="px-3 py-2.5">
                <button
                    type="button"
                    disabled={!flags.canUpdate || flags.locked}
                    onClick={(event) =>
                        h.openMenu('priority', task, event.currentTarget)
                    }
                    className={cn(
                        'inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs font-semibold disabled:cursor-default',
                        PRIORITY_STYLE[priority],
                    )}
                >
                    <Flag className="size-3.5" />
                    {PRIORITY_LABEL[priority]}
                </button>
            </td>
            <td className="px-3 py-2.5 text-xs text-slate-600">
                {hm(task.estimated_hours) ?? (
                    <span className="text-slate-400">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 text-xs text-slate-600">
                {task.weight !== null ? (
                    `${task.weight}%`
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 text-xs">
                {task.deadline ? (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 font-medium',
                            missed ? 'text-rose-600' : 'text-slate-600',
                        )}
                    >
                        {missed ? (
                            <span className="inline-block size-1.5 rounded-full bg-rose-500" />
                        ) : null}
                        {task.deadline
                            .slice(0, 10)
                            .split('-')
                            .reverse()
                            .join('-')}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                )}
            </td>
            <td className="px-3 py-2.5">
                <button
                    type="button"
                    disabled={!flags.canToggle || flags.locked}
                    onClick={(event) =>
                        h.openMenu('status', task, event.currentTarget)
                    }
                    className={cn(
                        'inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold disabled:cursor-default',
                        STATUS_STYLE[task.status],
                    )}
                >
                    {STATUS_LABEL[task.status]}
                </button>
            </td>
            <td className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        title="Task details"
                        aria-label="Task details"
                        onClick={() => h.details(task)}
                        className={cn(
                            small,
                            'border-indigo-300 text-indigo-700',
                        )}
                    >
                        <Eye className="size-3" />
                    </button>
                    {flags.canUpdate && !flags.locked ? (
                        <button
                            type="button"
                            title="Edit task and upload files"
                            aria-label="Edit task"
                            onClick={() => h.edit(task)}
                            className={cn(
                                small,
                                'border-emerald-300 text-emerald-700',
                            )}
                        >
                            <Upload className="size-3" />
                        </button>
                    ) : null}
                    <button
                        type="button"
                        title="Copy task"
                        aria-label="Copy task"
                        onClick={() => h.copy(task)}
                        className={cn(small, 'border-slate-300 text-slate-900')}
                    >
                        {copied ? (
                            <Check className="size-3" />
                        ) : (
                            <Copy className="size-3" />
                        )}
                    </button>
                    {flags.canUpdate && !flags.locked ? (
                        <button
                            type="button"
                            title="Edit task"
                            aria-label="Edit task details"
                            onClick={() => h.edit(task)}
                            className={cn(
                                small,
                                'border-slate-300 text-slate-700',
                            )}
                        >
                            <Pencil className="size-3" />
                        </button>
                    ) : null}
                    {flags.canDelete && !flags.locked ? (
                        <button
                            type="button"
                            title="Delete task"
                            aria-label="Delete task"
                            onClick={() => h.remove(task)}
                            className={cn(
                                small,
                                'border-rose-300 text-rose-700',
                            )}
                        >
                            <Trash2 className="size-3" />
                        </button>
                    ) : null}
                </div>
            </td>
        </tr>
    );
});

/** The empty "all" choice, which a Select item cannot carry as its value. */
const ANY = '__any__';

/** A compact searchable filter; an empty `value` means no filter. */
export function FilterSelect({
    label,
    value,
    onChange,
    options,
    width,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    width: string;
}) {
    return (
        <Select
            aria-label={label}
            density="compact"
            value={value || ANY}
            onValueChange={(next) => onChange(next === ANY ? '' : next)}
            options={options.map((option) =>
                option.value === '' ? { ...option, value: ANY } : option,
            )}
            className={cn(width, 'min-h-8 px-2 py-1 text-xs sm:min-h-8')}
        />
    );
}

/**
 * The task table, as on the web: filters, a count, search, and one row per task. Rows are
 * memoised and rendered in slices, and every row shares one popup menu, so a few hundred tasks
 * stay as light as a few dozen.
 */
export function TaskTable({
    tasks,
    milestones,
    team,
    flags,
    actions,
    filters = true,
    toolbar,
}: {
    tasks: TaskItem[];
    milestones: Array<{ id: number; name: string }>;
    team: Team;
    flags: RowFlags;
    actions: TableActions;
    filters?: boolean;
    /** Extra controls on the right of the filter row. */
    toolbar?: ReactNode;
}) {
    const [milestone, setMilestone] = useState('');
    const [priority, setPriority] = useState('');
    const [status, setStatus] = useState('');
    const [assignee, setAssignee] = useState('');
    const [search, setSearch] = useState('');
    const [menu, setMenu] = useState<{
        kind: MenuKind;
        task: TaskItem;
        anchor: DOMRect;
    } | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const shown = useMemo(() => {
        const term = search.trim().toLowerCase();

        return tasks.filter(
            (task) =>
                (milestone === '' ||
                    (milestone === 'unassigned'
                        ? task.milestone_id === null
                        : String(task.milestone_id) === milestone)) &&
                (priority === '' || (task.priority ?? 'none') === priority) &&
                (status === '' || task.status === status) &&
                (assignee === '' ||
                    (assignee === 'unassigned'
                        ? task.assigned_developer_id === null
                        : String(task.assigned_developer_id) === assignee)) &&
                (term === '' ||
                    `${task.task_code ?? ''} ${task.title}`
                        .toLowerCase()
                        .includes(term)),
        );
    }, [tasks, milestone, priority, status, assignee, search]);

    const { visible, hasMore, more, sentinel } = useIncremental(
        shown,
        `${milestone}|${priority}|${status}|${assignee}|${search}`,
    );

    // Handlers never change, so a row only re-renders when its own task does.
    const latest = useRef(actions);
    useEffect(() => {
        latest.current = actions;
    });
    const handlers = useMemo<RowHandlers>(
        () => ({
            status: (task, next) => latest.current.status(task, next),
            priority: (task, next) => latest.current.priority(task, next),
            assign: (task, id) => latest.current.assign(task, id),
            details: (task) => latest.current.details(task),
            edit: (task) => latest.current.edit(task),
            remove: (task) => latest.current.remove(task),
            openMenu: (kind, task, anchor) =>
                setMenu({ kind, task, anchor: anchor.getBoundingClientRect() }),
            copy: (task) => {
                const line = `${task.title}${task.task_code ? ` ${task.task_code}` : ''}`;

                void navigator.clipboard?.writeText(line).then(() => {
                    setCopiedId(task.id);
                    window.setTimeout(
                        () =>
                            setCopiedId((current) =>
                                current === task.id ? null : current,
                            ),
                        1200,
                    );
                });
                toast.success('Copied');
            },
        }),
        [],
    );
    const closeMenu = useCallback(() => setMenu(null), []);

    const items: RowMenuItem[] = !menu
        ? []
        : menu.kind === 'status'
          ? (['pending', 'in_progress', 'completed'] as const).map((key) => ({
                key,
                label: STATUS_LABEL[key],
                active: menu.task.status === key,
                icon:
                    key === 'pending' ? (
                        <Circle className="size-3.5 text-amber-600" />
                    ) : key === 'in_progress' ? (
                        <CircleDot className="size-3.5 text-sky-600" />
                    ) : (
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ),
                onSelect: () => actions.status(menu.task, key),
            }))
          : menu.kind === 'priority'
            ? [
                  ...(['urgent', 'high', 'normal', 'low'] as const).map(
                      (key) => ({
                          key,
                          label: PRIORITY_LABEL[key],
                          active: menu.task.priority === key,
                          icon:
                              key === 'urgent' ? (
                                  <AlertTriangle
                                      className={cn(
                                          'size-3.5',
                                          PRIORITY_ICON[key],
                                      )}
                                  />
                              ) : (
                                  <Flag
                                      className={cn(
                                          'size-3.5',
                                          PRIORITY_ICON[key],
                                      )}
                                  />
                              ),
                          onSelect: () => actions.priority(menu.task, key),
                      }),
                  ),
                  {
                      key: 'none',
                      label: 'Clear',
                      icon: <Circle className="size-3.5 text-slate-400" />,
                      onSelect: () => actions.priority(menu.task, null),
                  },
              ]
            : [
                  {
                      key: 'none',
                      label: 'Unassigned',
                      active: menu.task.assigned_developer_id === null,
                      icon: <User className="size-3.5 text-slate-400" />,
                      onSelect: () => actions.assign(menu.task, null),
                  },
                  ...team
                      .filter((developer) => developer.assigned)
                      .map((developer) => ({
                          key: String(developer.id),
                          label: developer.name,
                          active:
                              menu.task.assigned_developer_id === developer.id,
                          onSelect: () =>
                              handlers.assign(menu.task, developer.id),
                      })),
              ];

    const now = today();

    return (
        <div className="space-y-3">
            {filters ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <FilterSelect
                            label="Filter tasks by milestone"
                            value={milestone}
                            onChange={setMilestone}
                            width="w-40"
                            options={[
                                { value: '', label: 'All milestones' },
                                { value: 'unassigned', label: 'No milestone' },
                                ...milestones.map((item) => ({
                                    value: String(item.id),
                                    label: item.name,
                                })),
                            ]}
                        />
                        <FilterSelect
                            label="Filter tasks by priority"
                            value={priority}
                            onChange={setPriority}
                            width="w-32"
                            options={[
                                { value: '', label: 'All priorities' },
                                { value: 'urgent', label: 'Urgent' },
                                { value: 'high', label: 'High' },
                                { value: 'normal', label: 'Normal' },
                                { value: 'low', label: 'Low' },
                                { value: 'none', label: 'No priority' },
                            ]}
                        />
                        <FilterSelect
                            label="Filter tasks by status"
                            value={status}
                            onChange={setStatus}
                            width="w-32"
                            options={[
                                { value: '', label: 'All statuses' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'in_progress', label: 'In progress' },
                                { value: 'completed', label: 'Completed' },
                            ]}
                        />
                        <FilterSelect
                            label="Filter tasks by assigned employee"
                            value={assignee}
                            onChange={setAssignee}
                            width="w-44"
                            options={[
                                { value: '', label: 'Assigned employee' },
                                { value: 'unassigned', label: 'Unassigned' },
                                ...team.map((developer) => ({
                                    value: String(developer.id),
                                    label: `${developer.name} (${developer.developer_code})`,
                                })),
                            ]}
                        />
                        <span className="text-[11px] whitespace-nowrap text-slate-500">
                            {shown.length} of {tasks.length} tasks
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {toolbar}
                        <label className="relative w-56">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search task name..."
                                aria-label="Search tasks"
                                className={cn(selectClass, 'w-full pl-8')}
                            />
                        </label>
                    </div>
                </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                        <tr>
                            {[
                                '#',
                                'Task',
                                'Assignee',
                                'Created By',
                                'Priority',
                                'Est. Time',
                                'Weight',
                                'Deadline',
                                'Status',
                                'Actions',
                            ].map((label) => (
                                <th
                                    key={label}
                                    className="px-3 py-2.5 font-medium"
                                >
                                    {label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {visible.map((task) => (
                            <Row
                                key={task.id}
                                task={task}
                                flags={flags}
                                now={now}
                                copied={copiedId === task.id}
                                h={handlers}
                            />
                        ))}
                        {shown.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={10}
                                    className="h-24 px-3 text-center text-slate-400"
                                >
                                    No tasks match the current filters.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
            {hasMore ? (
                <div ref={sentinel} className="flex justify-center py-2">
                    <button
                        type="button"
                        onClick={more}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Showing {visible.length} of {shown.length}. Load more
                    </button>
                </div>
            ) : null}

            {menu ? (
                <RowMenu
                    anchor={menu.anchor}
                    items={items}
                    onClose={closeMenu}
                    width={menu.kind === 'assignee' ? 'w-56' : 'w-44'}
                />
            ) : null}
        </div>
    );
}
