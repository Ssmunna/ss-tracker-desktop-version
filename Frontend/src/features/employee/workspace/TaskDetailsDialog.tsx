import { Paperclip } from 'lucide-react';

import type { Priority } from '@/api/employee-types';
import type { ProjectDetail, TaskItem } from '@/api/project-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { assetUrl } from '@/lib/assetUrl';
import { formatDate } from '@/lib/date';
import { formatMinutes } from '@/lib/time';
import { cn } from '@/lib/utils';

import { priorityOptions } from './constants';
import { PriorityBadge } from './shared';

export interface DetailsActions {
    priority: (task: TaskItem, priority: Priority | null) => void;
    assign: (task: TaskItem, developerId: number | null) => void;
    edit: (task: TaskItem) => void;
    remove: (task: TaskItem) => void;
}

const isMissed = (task: TaskItem) =>
    task.status !== 'completed' &&
    task.deadline !== null &&
    task.deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);

/** Everything about one task, with the actions the viewer may take. */
export function TaskDetailsDialog({
    task,
    onClose,
    canUpdate,
    canDelete,
    isOwner,
    team,
    actions,
}: {
    task: TaskItem | null;
    onClose: () => void;
    canUpdate: boolean;
    canDelete: boolean;
    isOwner: boolean;
    team: ProjectDetail['project']['team_developers'];
    actions: DetailsActions;
}) {
    return (
        <Modal open={task !== null} onOpenChange={(next) => !next && onClose()}>
            {task ? (
                <ModalContent
                    size="lg"
                    title={`${task.serial_no}. ${task.title}`}
                    description={task.task_code ?? undefined}
                    footer={
                        <>
                            {canDelete ? (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onClose();
                                        actions.remove(task);
                                    }}
                                >
                                    Delete
                                </Button>
                            ) : null}
                            {canUpdate ? (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        onClose();
                                        actions.edit(task);
                                    }}
                                >
                                    Edit
                                </Button>
                            ) : null}
                            <ModalClose asChild>
                                <Button variant="secondary">Close</Button>
                            </ModalClose>
                        </>
                    }
                >
                    <div className="space-y-4 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                tone={
                                    task.status === 'completed'
                                        ? 'success'
                                        : task.status === 'in_progress'
                                          ? 'info'
                                          : 'neutral'
                                }
                                className="capitalize"
                            >
                                {task.status.replace('_', ' ')}
                            </Badge>
                            <PriorityBadge priority={task.priority} />
                            {isMissed(task) ? (
                                <Badge tone="danger">Deadline missed</Badge>
                            ) : null}
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                            {[
                                ['Milestone', task.milestone?.name],
                                [
                                    'Deadline',
                                    task.deadline
                                        ? formatDate(task.deadline)
                                        : null,
                                ],
                                [
                                    'Estimated',
                                    task.estimated_hours
                                        ? `${task.estimated_hours}h`
                                        : null,
                                ],
                                [
                                    'Weight',
                                    task.weight !== null
                                        ? `${task.weight}%`
                                        : null,
                                ],
                                ['Created by', task.created_by?.name],
                                [
                                    'Time spent',
                                    task.my_completion_spent_minutes !== null
                                        ? formatMinutes(
                                              task.my_completion_spent_minutes,
                                          )
                                        : null,
                                ],
                            ].map(([label, value]) => (
                                <div key={String(label)}>
                                    <dt className="text-xs text-slate-400">
                                        {label}
                                    </dt>
                                    <dd
                                        className={cn(
                                            'text-sm',
                                            value
                                                ? 'font-semibold text-slate-900'
                                                : 'text-slate-400',
                                        )}
                                    >
                                        {value || 'Not set'}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {task.description ? (
                            <p className="rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
                                {task.description}
                            </p>
                        ) : null}
                        {canUpdate ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-slate-500">
                                        Priority
                                    </p>
                                    <Select
                                        density="compact"
                                        value={task.priority ?? 'none'}
                                        onValueChange={(value) =>
                                            actions.priority(
                                                task,
                                                value === 'none'
                                                    ? null
                                                    : (value as Priority),
                                            )
                                        }
                                        options={priorityOptions}
                                    />
                                </div>
                                {isOwner ? (
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-500">
                                            Assignee
                                        </p>
                                        <Select
                                            density="compact"
                                            value={
                                                task.assigned_developer_id
                                                    ? String(
                                                          task.assigned_developer_id,
                                                      )
                                                    : 'none'
                                            }
                                            onValueChange={(value) =>
                                                actions.assign(
                                                    task,
                                                    value === 'none'
                                                        ? null
                                                        : Number(value),
                                                )
                                            }
                                            options={[
                                                {
                                                    value: 'none',
                                                    label: 'Unassigned',
                                                },
                                                ...team.map((developer) => ({
                                                    value: String(developer.id),
                                                    label: developer.name,
                                                })),
                                            ]}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-600">
                                Assigned to{' '}
                                <span className="font-semibold text-slate-900">
                                    {task.assigned_developer?.name ?? 'nobody'}
                                </span>
                            </p>
                        )}
                        {task.attachments.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-500">
                                    Attachments ({task.attachments.length})
                                </p>
                                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {task.attachments.map((file) => (
                                        <li key={file.id}>
                                            <a
                                                href={
                                                    assetUrl(file.file_url) ??
                                                    '#'
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block overflow-hidden rounded-xl border border-slate-200 hover:border-brand"
                                            >
                                                {file.is_image ? (
                                                    <img
                                                        src={
                                                            assetUrl(
                                                                file.file_url,
                                                            ) ?? undefined
                                                        }
                                                        alt={file.file_name}
                                                        loading="lazy"
                                                        className="h-24 w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-24 items-center justify-center bg-slate-50 text-slate-400">
                                                        <Paperclip className="size-6" />
                                                    </div>
                                                )}
                                                <p className="truncate px-2 py-1.5 text-xs font-semibold text-slate-700">
                                                    {file.file_name}
                                                </p>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </div>
                </ModalContent>
            ) : null}
        </Modal>
    );
}
