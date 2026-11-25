import {
    CalendarClock,
    Check,
    Clock,
    Copy,
    Hourglass,
    Target,
    TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { useGetEmployeeDashboardQuery } from '@/api/endpoints/employee';
import { useAppSelector } from '@/app/hooks';
import { selectMe } from '@/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { buildDailyReportText } from '@/lib/dailyReport';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

const today = () => new Date().toISOString().slice(0, 10);

export function EmployeeDashboardPage() {
    const { t, phaseLabel } = usePhaseLabel();
    const me = useAppSelector(selectMe)!;
    const [date, setDate] = useState(today);
    const { data, isLoading, isError, refetch } = useGetEmployeeDashboardQuery({
        history_date: date,
    });
    const [expanded, setExpanded] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const reportText = useMemo(
        () =>
            buildDailyReportText(date, data?.workedProjects ?? [], phaseLabel),
        [date, data?.workedProjects, phaseLabel],
    );
    const dayName = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
    }).format(new Date());

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(reportText);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    if (isError) {
        return (
            <ErrorState
                title="Could not load your dashboard"
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

    // The same endpoint serves admins; an account whose home is the admin dashboard
    // gets a different payload here, so say so instead of failing.
    if (data && data.type !== 'employee') {
        return (
            <Card variant="flush">
                <EmptyState
                    title="This is the employee dashboard"
                    description="Your account opens the admin dashboard."
                    action={
                        <Button asChild size="sm" variant="outline">
                            <Link to="/">Go to my dashboard</Link>
                        </Button>
                    }
                />
            </Card>
        );
    }

    const stats = data?.hourStats;

    return (
        <div className="space-y-5">
            <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-500 via-orange-600 to-red-600 p-5 text-white shadow-brand-lg sm:p-6">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent)]" />
                <div className="relative">
                    <p className="text-xs font-bold tracking-[0.2em] text-white/80 uppercase">
                        Employee workspace
                    </p>
                    <h1 className="mt-2 text-xl font-extrabold sm:text-3xl">
                        Hello {me.user.name}, happy {dayName}
                    </h1>
                    {data &&
                    (data.general_tasks?.overdue > 0 ||
                        data.general_tasks?.due_today > 0) ? (
                        <p className="mt-2 text-sm text-white/90">
                            General tasks: {data.general_tasks?.due_today ?? 0}{' '}
                            due today, {data.general_tasks?.overdue ?? 0}{' '}
                            overdue
                        </p>
                    ) : null}
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {isLoading || !stats ? (
                    Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-24 rounded-2xl" />
                    ))
                ) : (
                    <>
                        <StatCard
                            label="Today hours"
                            value={`${stats.today_hours}h`}
                            icon={Clock}
                            highlight
                        />
                        <StatCard
                            label="Month hours"
                            value={`${stats.month_hours}h`}
                            icon={TrendingUp}
                            delay={60}
                        />
                        <StatCard
                            label="Target"
                            value={`${stats.target_hours}h`}
                            icon={Target}
                            delay={120}
                        />
                        <StatCard
                            label="Need to make up"
                            value={`${stats.remaining_hours}h`}
                            icon={Hourglass}
                            delay={180}
                        />
                        <StatCard
                            label="Previous month"
                            value={`${stats.previous_month_hours}h`}
                            icon={CalendarClock}
                            delay={240}
                        />
                    </>
                )}
            </section>

            <Card className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">
                        My KPI snapshot (live)
                    </CardTitle>
                    <CardDescription>Current month</CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {isLoading
                        ? Array.from({ length: 2 }, (_, index) => (
                              <Skeleton key={index} className="h-28" />
                          ))
                        : (data?.kpiCards ?? []).map((kpi) => (
                              <div
                                  key={kpi.key}
                                  className="rounded-xl border border-slate-200/90 bg-brand-50 p-4"
                              >
                                  <p className="text-sm font-bold text-slate-900">
                                      {kpi.title}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                      Target:{' '}
                                      <span className="font-bold text-slate-700">
                                          {kpi.target_label}
                                      </span>
                                  </p>
                                  <p className="text-xs text-slate-500">
                                      Achieved:{' '}
                                      <span className="font-bold text-slate-700">
                                          {kpi.achieved_label}
                                      </span>
                                  </p>
                                  <p className="mt-2 text-sm font-bold text-slate-900">
                                      Score {kpi.score}/{kpi.max_score}
                                  </p>
                                  <ProgressBar
                                      value={kpi.progress_percent}
                                      label={kpi.title}
                                      className="mt-2"
                                  />
                              </div>
                          ))}
                </div>
            </Card>

            <Card className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Project work history
                        </CardTitle>
                        <CardDescription>
                            Select a date, then open a project to see completed
                            tasks
                        </CardDescription>
                    </div>
                    <Input
                        type="date"
                        aria-label="History date"
                        value={date}
                        max={today()}
                        onChange={(event) =>
                            event.target.value && setDate(event.target.value)
                        }
                        density="compact"
                        className="sm:w-48"
                    />
                </div>
                {isLoading ? (
                    <Skeleton className="h-28" />
                ) : (data?.workedProjects.length ?? 0) === 0 ? (
                    <EmptyState title="No project work found for this date" />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {data!.workedProjects.map((work) => {
                            const id = `${work.project_id}:${work.phase_id ?? 0}`;

                            return (
                                <div
                                    key={id}
                                    className="rounded-xl border border-slate-200/90 bg-slate-50 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-900">
                                                {work.project_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {work.project_code}
                                                {work.phase_name &&
                                                work.phase_name !==
                                                    work.project_code
                                                    ? ` · ${work.phase_name}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <p className="text-xl font-extrabold text-slate-900">
                                            {work.hours}h
                                        </p>
                                    </div>
                                    <div className="mt-3 space-y-1">
                                        <div className="flex items-center justify-between text-xs text-slate-600">
                                            <span>
                                                {work.phase_name
                                                    ? `${work.phase_name} progress`
                                                    : 'Progress'}
                                            </span>
                                            <span className="font-bold text-slate-900">
                                                {work.completion_percentage}%
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={work.completion_percentage}
                                            label={t('Phase progress')}
                                        />
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                                        <span>Completed tasks</span>
                                        <span className="font-bold text-slate-900">
                                            {work.completed_tasks_count}
                                        </span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        block
                                        className="mt-3"
                                        aria-expanded={expanded === id}
                                        onClick={() =>
                                            setExpanded(
                                                expanded === id ? null : id,
                                            )
                                        }
                                    >
                                        {expanded === id
                                            ? 'Hide tasks'
                                            : 'View tasks'}
                                    </Button>
                                    {expanded === id ? (
                                        <div className="mt-3 rounded-lg border border-slate-200/90 bg-white p-3">
                                            <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                                                Completed task list
                                            </p>
                                            {work.completed_tasks_count > 0 ? (
                                                <ul className="mt-2 space-y-1.5">
                                                    {work.completed_tasks.map(
                                                        (task) => (
                                                            <li
                                                                key={task.id}
                                                                className="text-xs text-slate-700"
                                                            >
                                                                <span className="font-bold text-slate-900">
                                                                    {task.task_code ||
                                                                        '#'}
                                                                </span>{' '}
                                                                {task.title}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            ) : (
                                                <p className="mt-2 text-xs text-slate-500">
                                                    No completed tasks on this
                                                    date.
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <Card className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-base">
                            Daily task report
                        </CardTitle>
                        <CardDescription>
                            Copy and send to your Telegram group
                        </CardDescription>
                    </div>
                    <Button
                        variant={copied ? 'secondary' : 'outline'}
                        onClick={copy}
                    >
                        {copied ? (
                            <Check className="size-4 text-emerald-600" />
                        ) : (
                            <Copy className="size-4" />
                        )}
                        {copied ? 'Copied!' : 'Copy report'}
                    </Button>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-slate-200/90 bg-slate-50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800 sm:text-sm">
                    {reportText}
                </pre>
            </Card>
        </div>
    );
}
