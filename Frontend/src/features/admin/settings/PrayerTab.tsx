import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useAddPrayerTimeMutation,
    useDeletePrayerTimeMutation,
    useGetManagedPrayerTimesQuery,
    useUpdatePrayerTimeMutation,
} from '@/api/endpoints/prayer';
import type { PrayerTimeInput, PrayerTimeRow } from '@/api/prayer-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import {
    ALERT_OPTIONS,
    alertClock,
    formatClock,
    formatDays,
} from '@/lib/prayer';

import { Section } from './Section';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY: PrayerTimeInput = {
    name: '',
    start_time: '',
    alert_minutes_before: 10,
    days: [],
    is_active: true,
};

const toInput = (prayer: PrayerTimeRow): PrayerTimeInput => ({
    name: prayer.name,
    start_time: prayer.start_time,
    alert_minutes_before: prayer.alert_minutes_before,
    days: prayer.days ?? [],
    is_active: prayer.is_active,
});

export function PrayerTab() {
    const { can } = usePermissions();
    const run = useRun();
    const allowed = can('settings.prayer-times.manage');
    const { data, isLoading } = useGetManagedPrayerTimesQuery();
    const [update] = useUpdatePrayerTimeMutation();
    const [remove, { isLoading: removing }] = useDeletePrayerTimeMutation();
    const [editing, setEditing] = useState<PrayerTimeRow | 'new' | null>(null);
    const [deleting, setDeleting] = useState<PrayerTimeRow | null>(null);

    const columns: Column<PrayerTimeRow>[] = [
        {
            key: 'name',
            header: 'Prayer',
            primary: true,
            cell: (prayer) => (
                <span className="font-bold text-slate-900">{prayer.name}</span>
            ),
        },
        {
            key: 'start',
            header: 'Starts',
            cell: (prayer) => formatClock(prayer.start_time),
        },
        {
            key: 'alert',
            header: 'Alert',
            cell: (prayer) => {
                const alert = alertClock(
                    prayer.start_time,
                    prayer.alert_minutes_before,
                );

                return alert
                    ? `${prayer.alert_minutes_before} min before (${formatClock(alert)})`
                    : 'None';
            },
        },
        {
            key: 'days',
            header: 'Days',
            cell: (prayer) => (
                <span className="text-xs">{formatDays(prayer.days)}</span>
            ),
        },
        {
            key: 'active',
            header: 'Active',
            cell: (prayer) =>
                allowed ? (
                    <Switch
                        aria-label={`${prayer.name} active`}
                        checked={prayer.is_active}
                        onCheckedChange={(value) =>
                            void run(
                                update({
                                    id: prayer.id,
                                    body: {
                                        ...toInput(prayer),
                                        is_active: value,
                                    },
                                }),
                            )
                        }
                    />
                ) : (
                    <Badge tone={prayer.is_active ? 'success' : 'neutral'}>
                        {prayer.is_active ? 'Active' : 'Off'}
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-24',
            cell: (prayer) =>
                allowed ? (
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${prayer.name}`}
                            onClick={() => setEditing(prayer)}
                        >
                            <Pencil className="size-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${prayer.name}`}
                            onClick={() => setDeleting(prayer)}
                        >
                            <Trash2 className="size-4 text-red-600" />
                        </Button>
                    </div>
                ) : null,
        },
    ];

    return (
        <Section
            title="Prayer times"
            description="Everyone gets a notification before each prayer and when it starts. Times are in the workspace timezone."
        >
            {allowed ? (
                <div>
                    <Button onClick={() => setEditing('new')}>
                        <Plus className="size-4" />
                        Add prayer
                    </Button>
                </div>
            ) : null}
            <DataTable
                columns={columns}
                rows={data?.prayer_times}
                rowKey={(prayer) => prayer.id}
                loading={isLoading}
                emptyTitle="No prayer times yet"
                emptyDescription="Add the daily prayers and when to alert people."
            />
            {editing ? (
                <PrayerForm
                    key={editing === 'new' ? 'new' : editing.id}
                    prayer={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            ) : null}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete prayer time"
                description={`${deleting?.name ?? 'This prayer'} will no longer be announced.`}
                confirmLabel="Delete"
                destructive
                loading={removing}
                onConfirm={() => {
                    if (deleting) {
                        void run(remove(deleting.id)).then(() =>
                            setDeleting(null),
                        );
                    }
                }}
            />
        </Section>
    );
}

function PrayerForm({
    prayer,
    onClose,
}: {
    prayer: PrayerTimeRow | null;
    onClose: () => void;
}) {
    const [add, { isLoading: adding }] = useAddPrayerTimeMutation();
    const [update, { isLoading: updating }] = useUpdatePrayerTimeMutation();
    const [form, setForm] = useState<PrayerTimeInput>(
        prayer ? toInput(prayer) : EMPTY,
    );
    const [errors, setErrors] = useState<Record<string, string>>({});
    const alert = alertClock(form.start_time, form.alert_minutes_before);

    async function submit(event: React.FormEvent) {
        event.preventDefault();

        try {
            const result = prayer
                ? await update({ id: prayer.id, body: form }).unwrap()
                : await add(form).unwrap();
            toast.success(result.message);
            onClose();
        } catch (error) {
            const fields = fieldErrors(error);
            setErrors(fields);

            if (Object.keys(fields).length === 0) {
                toast.error(errorMessage(error));
            }
        }
    }

    return (
        <Modal open onOpenChange={(open) => !open && onClose()}>
            <ModalContent
                title={prayer ? `Edit ${prayer.name}` : 'Add prayer'}
                description="Set when the prayer starts and how early to alert people."
                footer={
                    <>
                        <ModalClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </ModalClose>
                        <Button
                            type="submit"
                            form="prayer-form"
                            loading={adding || updating}
                        >
                            {prayer ? 'Save prayer' : 'Add prayer'}
                        </Button>
                    </>
                }
            >
                <form id="prayer-form" className="space-y-4" onSubmit={submit}>
                    <Field label="Name" required error={errors.name}>
                        <Input
                            value={form.name}
                            placeholder="Asr"
                            onChange={(event) =>
                                setForm({ ...form, name: event.target.value })
                            }
                        />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                            label="Start time"
                            required
                            error={errors.start_time}
                        >
                            <Input
                                type="time"
                                value={form.start_time}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        start_time: event.target.value,
                                    })
                                }
                            />
                        </Field>
                        <Field
                            label="Alert"
                            error={errors.alert_minutes_before}
                        >
                            <Select
                                value={String(form.alert_minutes_before)}
                                options={ALERT_OPTIONS}
                                onValueChange={(value) =>
                                    setForm({
                                        ...form,
                                        alert_minutes_before: Number(value),
                                    })
                                }
                            />
                        </Field>
                    </div>
                    {form.start_time ? (
                        <p className="text-xs text-slate-500">
                            {alert
                                ? `Alert at ${formatClock(alert)}, prayer at ${formatClock(form.start_time)}.`
                                : `Prayer at ${formatClock(form.start_time)}, no early alert.`}
                        </p>
                    ) : null}
                    <fieldset className="space-y-1">
                        <legend className="text-xs font-bold text-slate-700">
                            Days
                        </legend>
                        <p className="text-xs text-slate-500">
                            Leave all unticked for every day (tick Friday only
                            for Jumu&apos;ah).
                        </p>
                        <ul className="grid grid-cols-4 gap-x-3">
                            {DAYS.map((name, index) => (
                                <li key={name}>
                                    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700 lg:min-h-9">
                                        <Checkbox
                                            checked={form.days.includes(index)}
                                            onCheckedChange={(value) =>
                                                setForm({
                                                    ...form,
                                                    days:
                                                        value === true
                                                            ? [
                                                                  ...form.days,
                                                                  index,
                                                              ]
                                                            : form.days.filter(
                                                                  (day) =>
                                                                      day !==
                                                                      index,
                                                              ),
                                                })
                                            }
                                        />
                                        {name}
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                    <label className="flex min-h-11 items-center justify-between gap-3 text-sm text-slate-700">
                        Active
                        <Switch
                            checked={form.is_active}
                            onCheckedChange={(value) =>
                                setForm({ ...form, is_active: value })
                            }
                        />
                    </label>
                </form>
            </ModalContent>
        </Modal>
    );
}
