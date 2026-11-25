import type { InboxQuery, Option, StatusCounts } from '@/api/approval-types';
import type { useInboxParams } from './useInboxParams';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { usePhaseLabel } from '@/hooks/usePhaseLabel';

const TABS: { value: string; label: string; key: keyof StatusCounts }[] = [
    { value: '', label: 'All', key: 'all' },
    { value: 'pending', label: 'Pending', key: 'pending' },
    { value: 'approved', label: 'Approved', key: 'approved' },
    { value: 'rejected', label: 'Rejected', key: 'rejected' },
];

export function StatusTabs({
    value,
    counts,
    onChange,
}: {
    value: string;
    counts: StatusCounts | undefined;
    onChange: (value: string | null) => void;
}) {
    return (
        <div
            role="group"
            aria-label="Status filter"
            className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
        >
            {TABS.map((tab) => {
                const active = value === tab.value;

                return (
                    <button
                        key={tab.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(tab.value || null)}
                        className={cn(
                            'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-bold transition-colors',
                            active
                                ? 'border-brand bg-brand text-on-brand'
                                : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                        )}
                    >
                        {tab.label}
                        <span
                            className={cn(
                                'rounded-full px-1.5 text-[10px]',
                                active
                                    ? 'bg-white/25'
                                    : 'bg-slate-100 text-slate-500',
                            )}
                        >
                            {counts?.[tab.key] ?? 0}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

const all = <T extends Option>(
    label: string,
    items: T[] | undefined,
    text?: (item: T) => string,
) => [
    { value: 'all', label },
    ...(items ?? []).map((item) => ({
        value: String(item.id),
        label: text ? text(item) : item.name,
    })),
];

type Set = ReturnType<typeof useInboxParams>['set'];

export function InboxFilters({
    query,
    set,
    activeFilters,
    reset,
    departments,
    projects,
    phases,
    categories,
    priority,
}: {
    query: InboxQuery;
    set: Set;
    activeFilters: number;
    reset: () => void;
    departments: Option[] | undefined;
    projects: (Option & { project_code?: string })[] | undefined;
    phases: Option[] | undefined;
    categories?: Option[];
    priority?: boolean;
}) {
    const { phaseLabel, phaseLabelPlural } = usePhaseLabel();
    return (
        <FilterBar activeCount={activeFilters} onReset={reset}>
            <Field label="From" className="lg:w-40">
                <Input
                    density="compact"
                    type="date"
                    value={query.date_from ?? ''}
                    onChange={(event) =>
                        set({ date_from: event.target.value || null })
                    }
                />
            </Field>
            <Field label="To" className="lg:w-40">
                <Input
                    density="compact"
                    type="date"
                    value={query.date_to ?? ''}
                    onChange={(event) =>
                        set({ date_to: event.target.value || null })
                    }
                />
            </Field>
            {priority ? (
                <Field label="Priority" className="lg:w-36">
                    <Select
                        density="compact"
                        value={query.priority ?? 'all'}
                        onValueChange={(value) =>
                            set({ priority: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'Any' },
                            { value: 'urgent', label: 'Urgent' },
                            { value: 'high', label: 'High' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'low', label: 'Low' },
                        ]}
                    />
                </Field>
            ) : null}
            <Field label="Department" className="lg:w-48">
                <Select
                    density="compact"
                    value={query.department_id ?? 'all'}
                    onValueChange={(value) =>
                        set({
                            department_id: value === 'all' ? null : value,
                            project_id: null,
                            phase_id: null,
                        })
                    }
                    options={all('All departments', departments)}
                />
            </Field>
            {categories ? (
                <Field label="Category" className="lg:w-44">
                    <Select
                        density="compact"
                        value={query.category_id ?? 'all'}
                        onValueChange={(value) =>
                            set({ category_id: value === 'all' ? null : value })
                        }
                        options={all('All categories', categories)}
                    />
                </Field>
            ) : null}
            <Field label="Project" className="lg:w-56">
                <Select
                    density="compact"
                    value={query.project_id ?? 'all'}
                    disabled={!categories && !query.department_id}
                    onValueChange={(value) =>
                        set({
                            project_id: value === 'all' ? null : value,
                            phase_id: null,
                        })
                    }
                    options={all<Option & { project_code?: string }>(
                        'All projects',
                        projects,
                        (item) =>
                            item.project_code
                                ? `${item.name} (${item.project_code})`
                                : item.name,
                    )}
                />
            </Field>
            <Field label={phaseLabel} className="lg:w-44">
                <Select
                    density="compact"
                    value={query.phase_id ?? 'all'}
                    disabled={!query.project_id}
                    onValueChange={(value) =>
                        set({ phase_id: value === 'all' ? null : value })
                    }
                    options={all(
                        `All ${phaseLabelPlural.toLowerCase()}`,
                        phases,
                    )}
                />
            </Field>
        </FilterBar>
    );
}
