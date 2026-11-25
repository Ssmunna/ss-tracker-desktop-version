import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useAddHolidaysMutation,
    useDeleteHolidayMutation,
    useGetHolidaysQuery,
    useSaveWeeklyHolidaysMutation,
} from '@/api/endpoints/settings';
import type { AppSettings } from '@/api/settings-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDate } from '@/lib/date';

import { Section } from './Section';

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

export function CalendarTab({ settings }: { settings: AppSettings }) {
    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <Weekly settings={settings} />
            <Holidays />
        </div>
    );
}

function Weekly({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const run = useRun();
    const allowed = can('settings.holiday-rules.update');
    const [save, { isLoading }] = useSaveWeeklyHolidaysMutation();
    const [days, setDays] = useState<number[]>(settings.weekly_holidays);

    return (
        <Section
            title="Weekly holidays"
            description="Days of the week that count as a day off."
        >
            <ul className="grid grid-cols-2 gap-x-4">
                {DAYS.map((name, index) => (
                    <li key={name}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700 lg:min-h-9">
                            <Checkbox
                                disabled={!allowed}
                                checked={days.includes(index)}
                                onCheckedChange={(value) =>
                                    setDays((current) =>
                                        value === true
                                            ? [...current, index]
                                            : current.filter(
                                                  (day) => day !== index,
                                              ),
                                    )
                                }
                            />
                            {name}
                        </label>
                    </li>
                ))}
            </ul>
            {allowed ? (
                <Button
                    loading={isLoading}
                    onClick={() =>
                        void run(save({ weekly_holidays: [...days].sort() }))
                    }
                >
                    Save weekly holidays
                </Button>
            ) : null}
        </Section>
    );
}

function Holidays() {
    const { can } = usePermissions();
    const run = useRun();
    const allowed = can('settings.holidays.manage');
    const [page, setPage] = useState(1);
    const { data, isLoading } = useGetHolidaysQuery({ page });
    const [add, { isLoading: adding }] = useAddHolidaysMutation();
    const [remove] = useDeleteHolidayMutation();
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const columns: Column<NonNullable<typeof data>['holidays'][number]>[] = [
        {
            key: 'date',
            header: 'Date',
            primary: true,
            cell: (holiday) => (
                <span className="font-bold text-slate-900">
                    {formatDate(holiday.holiday_date)}
                </span>
            ),
        },
        {
            key: 'name',
            header: 'Description',
            cell: (holiday) => (
                <span className="text-xs">{holiday.name ?? '-'}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-12',
            cell: (holiday) =>
                allowed ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${formatDate(holiday.holiday_date)}`}
                        onClick={() => void run(remove(holiday.id))}
                    >
                        <Trash2 className="size-4 text-red-600" />
                    </Button>
                ) : null,
        },
    ];

    return (
        <Section
            title="Holidays"
            description="Specific days off. Add a single day or a range."
        >
            {allowed ? (
                <form
                    className="space-y-3"
                    onSubmit={async (event) => {
                        event.preventDefault();

                        try {
                            const result = await add({
                                ranges: [
                                    {
                                        from_date: from,
                                        to_date: to || from,
                                        description: description || undefined,
                                    },
                                ],
                            }).unwrap();
                            toast.success(result.message);
                            setFrom('');
                            setTo('');
                            setDescription('');
                            setErrors({});
                        } catch (error) {
                            const fields = fieldErrors(error);
                            setErrors(fields);

                            if (Object.keys(fields).length === 0) {
                                toast.error(errorMessage(error));
                            }
                        }
                    }}
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="From"
                            required
                            error={
                                errors['ranges.0.from_date'] ?? errors.ranges
                            }
                        >
                            <Input
                                type="date"
                                value={from}
                                onChange={(event) =>
                                    setFrom(event.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="To"
                            hint="Leave empty for one day"
                            error={errors['ranges.0.to_date']}
                        >
                            <Input
                                type="date"
                                value={to}
                                onChange={(event) => setTo(event.target.value)}
                            />
                        </Field>
                    </div>
                    <Field
                        label="Description"
                        error={errors['ranges.0.description']}
                    >
                        <Input
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                        />
                    </Field>
                    <Button type="submit" loading={adding}>
                        Add holiday
                    </Button>
                </form>
            ) : null}
            <div className="space-y-3">
                <DataTable
                    columns={columns}
                    rows={data?.holidays}
                    rowKey={(holiday) => holiday.id}
                    loading={isLoading}
                    emptyTitle="No holidays added"
                />
                {data ? (
                    <Pagination
                        page={data.meta.current_page}
                        pageCount={data.meta.last_page}
                        total={data.meta.total}
                        onPageChange={setPage}
                    />
                ) : null}
            </div>
        </Section>
    );
}
