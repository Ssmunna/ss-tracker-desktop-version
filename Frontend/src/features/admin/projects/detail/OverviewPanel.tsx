import {
    ExternalLink,
    FileText,
    FolderOpen,
    Upload,
    UserRound,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { AdminProjectDetail } from '@/api/admin-detail-types';
import { errorMessage } from '@/api/baseApi';
import { useUploadProjectPrdMutation } from '@/api/endpoints/adminProjects';
import {
    useGetPhaseAssignmentsQuery,
    useSetPhaseDevelopersMutation,
    useSetPhaseOwnerMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCard } from '@/components/ui/stat-card';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

import { DeveloperPicker } from './DeveloperPicker';

const MAX_PRD = 10 * 1024 * 1024;

function bytes(value: number | null): string {
    return value === null
        ? '-'
        : value > 1048576
          ? `${(value / 1048576).toFixed(1)} MB`
          : `${Math.max(1, Math.round(value / 1024))} KB`;
}

export function OverviewPanel({
    detail,
    locked,
}: {
    detail: AdminProjectDetail;
    locked: boolean;
}) {
    const { t } = usePhaseLabel();
    const { project, prd } = detail;
    const { can } = usePermissions();
    const phaseId = detail.selected_phase_id;
    // Everything below is per phase, and frozen unless the project is In Progress.
    const open =
        !locked && project.status === 'In Progress' && phaseId !== null;
    const canAssign = can('project-phases.assignments.update') && open;
    const canOwner = can('project-assignments.update') && open;
    const canUpload = can('projects.prd.upload') && open;
    const picker = useRef<HTMLInputElement>(null);
    const [pickingOwner, setPickingOwner] = useState(false);
    const { data: assignments } = useGetPhaseAssignmentsQuery(
        { projectId: project.id, phaseId: phaseId ?? 0 },
        { skip: !canAssign },
    );
    const [saveTeam, { isLoading: savingTeam }] =
        useSetPhaseDevelopersMutation();
    const [saveOwner, { isLoading: savingOwner }] = useSetPhaseOwnerMutation();
    const [upload, { isLoading: uploading }] = useUploadProjectPrdMutation();
    const assignedIds = assignments?.assignments.map((a) => a.developer.id);
    const hoursOver =
        project.estimated_hours !== null &&
        project.total_worked_hours > project.estimated_hours;

    const setTeam = async (ids: number[]) => {
        try {
            const result = await saveTeam({
                projectId: project.id,
                phaseId: phaseId as number,
                developer_ids: ids,
            }).unwrap();
            toast.success(result.message);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const setOwner = async (ownerId: number | null) => {
        try {
            const result = await saveOwner({
                projectId: project.id,
                phaseId: phaseId as number,
                owner_developer_id: ownerId,
            }).unwrap();
            toast.success(result.message);
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <div className="space-y-3">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                    label="Tasks done"
                    value={`${project.completed_tasks_count}/${project.tasks_count}`}
                    highlight
                />
                <StatCard
                    label="Milestones"
                    value={project.milestones_count}
                    hint={`${project.milestones_weight_sum}% weight used`}
                    delay={60}
                />
                <StatCard
                    label="Worked hours"
                    value={`${project.total_worked_hours}h`}
                    hint={
                        project.estimated_hours
                            ? `${project.estimated_hours}h estimated`
                            : 'No estimate'
                    }
                    delay={120}
                />
                <StatCard
                    label="Extensions"
                    value={detail.deadline_extensions_count}
                    hint={`${detail.deadline_extensions_breakdown.pending} pending`}
                    delay={180}
                />
            </section>

            {hoursOver ? (
                <p
                    role="status"
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
                >
                    Worked hours are above the estimate.
                </p>
            ) : null}

            <div className="grid items-start gap-3 lg:grid-cols-2">
                <div className="space-y-3">
                    <Card className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <CardTitle className="text-base">
                                    Details
                                </CardTitle>
                                <CardDescription>
                                    {t('Phase information')}
                                </CardDescription>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {project.departments.map((department) => (
                                    <Badge key={department.id}>
                                        {department.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
                            {[
                                ['Client', project.client?.name],
                                [
                                    'Category',
                                    project.category
                                        ? `${project.category.name} (${project.category.weight}%)`
                                        : null,
                                ],
                                [
                                    'Effective weight',
                                    project.effective_weight !== null
                                        ? `${project.effective_weight}%`
                                        : null,
                                ],
                                ['Points', project.points],
                                [
                                    'Created',
                                    project.created_at
                                        ? formatDate(project.created_at)
                                        : null,
                                ],
                                [
                                    'Completed',
                                    project.completed_at
                                        ? formatDate(project.completed_at)
                                        : null,
                                ],
                            ].map(([label, value]) => (
                                <div key={String(label)} className="min-w-0">
                                    <dt className="text-xs text-slate-400">
                                        {label}
                                    </dt>
                                    <dd
                                        className={cn(
                                            'truncate text-sm',
                                            value === null ||
                                                value === undefined ||
                                                value === ''
                                                ? 'text-slate-400'
                                                : 'font-semibold text-slate-900',
                                        )}
                                    >
                                        {value === null ||
                                        value === undefined ||
                                        value === ''
                                            ? 'Not set'
                                            : value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {project.google_drive_url ? (
                            <div className="border-t border-slate-100 pt-3">
                                <a
                                    href={project.google_drive_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                                >
                                    <FolderOpen className="size-4" /> Google
                                    Drive folder
                                    <ExternalLink className="size-3.5" />
                                </a>
                            </div>
                        ) : null}
                    </Card>

                    <Card className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <CardTitle className="text-base">PRD</CardTitle>
                                <CardDescription>
                                    {t('Requirements document of this phase')}
                                </CardDescription>
                            </div>
                            {canUpload ? (
                                <>
                                    <input
                                        ref={picker}
                                        type="file"
                                        hidden
                                        accept=".pdf,.doc,.docx,.docs,.md"
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0];
                                            event.target.value = '';

                                            if (!file) {
                                                return;
                                            }

                                            if (file.size > MAX_PRD) {
                                                toast.error(
                                                    'PRD file must be 10 MB or smaller.',
                                                );

                                                return;
                                            }

                                            void upload({
                                                id: project.id,
                                                file,
                                                phase_id: phaseId,
                                            })
                                                .unwrap()
                                                .then((result) =>
                                                    toast.success(
                                                        result.message,
                                                    ),
                                                )
                                                .catch((error) =>
                                                    toast.error(
                                                        errorMessage(error),
                                                    ),
                                                );
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        loading={uploading}
                                        onClick={() => picker.current?.click()}
                                    >
                                        <Upload className="size-4" />{' '}
                                        {prd ? 'Replace' : 'Upload'}
                                    </Button>
                                </>
                            ) : null}
                        </div>
                        {prd ? (
                            <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-bold text-slate-900">
                                        {prd.name ?? 'PRD'}
                                    </p>
                                    <Badge
                                        tone={
                                            prd.status === 'ready'
                                                ? 'success'
                                                : prd.status === 'failed'
                                                  ? 'danger'
                                                  : 'warning'
                                        }
                                        className="capitalize"
                                    >
                                        {prd.status}
                                    </Badge>
                                    {prd.ai_status !== 'idle' ? (
                                        <Badge
                                            tone="info"
                                            className="capitalize"
                                        >
                                            AI:{' '}
                                            {prd.ai_status.replace('_', ' ')}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="text-xs text-slate-500">
                                    {bytes(prd.size)} · uploaded{' '}
                                    {formatDateTime(prd.uploaded_at)}
                                </p>
                                {prd.ai_message ? (
                                    <p className="text-xs text-slate-600">
                                        {prd.ai_message}
                                    </p>
                                ) : null}
                                {prd.error ? (
                                    <p
                                        role="alert"
                                        className="text-xs text-red-600"
                                    >
                                        {prd.error}
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4">
                                <FileText className="size-5 shrink-0 text-slate-400" />
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        No PRD uploaded
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        PDF or DOCX, up to 10 MB
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <Card className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <CardTitle className="text-base">
                                Team contribution
                            </CardTitle>
                            <CardDescription>
                                {t('Completed tasks in the selected phase')}
                            </CardDescription>
                        </div>
                        <span className="text-xs text-slate-500">
                            {detail.project_developers.length} member
                            {detail.project_developers.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                            {project.owner ? (
                                <Avatar
                                    name={project.owner.name}
                                    className="bg-blue-100 text-blue-700"
                                />
                            ) : (
                                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                                    <UserRound className="size-4" />
                                </span>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-slate-400">
                                    {t('Phase owner')}
                                </p>
                                <p className="truncate text-sm font-bold text-slate-900">
                                    {project.owner?.name ?? 'No owner'}
                                </p>
                            </div>
                            {canOwner ? (
                                <div className="flex items-center gap-1">
                                    {project.owner ? (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            disabled={savingOwner}
                                            onClick={() => void setOwner(null)}
                                        >
                                            Clear
                                        </Button>
                                    ) : null}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={savingOwner}
                                        onClick={() =>
                                            setPickingOwner((value) => !value)
                                        }
                                    >
                                        {project.owner ? 'Change' : 'Assign'}
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                        {canOwner && pickingOwner ? (
                            <DeveloperPicker
                                autoFocus
                                placeholder="Search to choose the owner"
                                options={detail.available_developers.filter(
                                    (developer) =>
                                        developer.id !== project.owner?.id,
                                )}
                                onPick={async (developer) => {
                                    await setOwner(developer.id);
                                    setPickingOwner(false);
                                }}
                            />
                        ) : null}
                    </div>

                    {canAssign ? (
                        <DeveloperPicker
                            placeholder="Add a member by name or ID"
                            disabled={savingTeam || assignedIds === undefined}
                            options={detail.available_developers.filter(
                                (developer) =>
                                    !assignedIds?.includes(developer.id),
                            )}
                            onPick={(developer) =>
                                void setTeam([
                                    ...(assignedIds ?? []),
                                    developer.id,
                                ])
                            }
                        />
                    ) : null}

                    {detail.project_developers.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No developers assigned
                        </p>
                    ) : (
                        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                            {detail.project_developers.map((developer) => (
                                <li key={developer.id} className="py-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar
                                            name={developer.name}
                                            className="bg-blue-100 text-blue-700"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-slate-900">
                                                {developer.name}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {developer.developer_code}
                                            </p>
                                        </div>
                                        <span className="text-xs whitespace-nowrap text-slate-500">
                                            {developer.completed_tasks}{' '}
                                            {developer.completed_tasks === 1
                                                ? 'task'
                                                : 'tasks'}{' '}
                                            ·{' '}
                                            {developer.contribution_percentage}%
                                        </span>
                                        {canAssign &&
                                        assignedIds?.includes(developer.id) ? (
                                            <button
                                                type="button"
                                                disabled={savingTeam}
                                                title={t(
                                                    'Remove from this phase',
                                                )}
                                                aria-label={`Remove ${developer.name}`}
                                                className="inline-flex size-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                                onClick={() =>
                                                    void setTeam(
                                                        assignedIds.filter(
                                                            (id) =>
                                                                id !==
                                                                developer.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                <X className="size-3.5" />
                                            </button>
                                        ) : null}
                                    </div>
                                    <ProgressBar
                                        value={
                                            developer.contribution_percentage
                                        }
                                        label={`${developer.name} contribution`}
                                        className="mt-2 h-1.5"
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}
