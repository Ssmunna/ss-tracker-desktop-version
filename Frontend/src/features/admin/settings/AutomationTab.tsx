import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useSaveAiAutomationMutation,
    useSaveStaleAlertsMutation,
} from '@/api/endpoints/settings';
import type { AppSettings } from '@/api/settings-types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { Section } from './Section';

export function AutomationTab({ settings }: { settings: AppSettings }) {
    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <Ai settings={settings} />
            <Stale settings={settings} />
        </div>
    );
}

function Ai({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const run = useRun();
    const allowed = can('settings.ai-automation.update');
    const [save, { isLoading }] = useSaveAiAutomationMutation();
    const [enabled, setEnabled] = useState(settings.ai_task_creation_enabled);

    return (
        <Section
            title="PRD AI automation"
            description="When on, an uploaded PRD is analysed and its tasks are created automatically."
        >
            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-900">
                Create tasks from PRDs
                <Switch
                    checked={enabled}
                    disabled={!allowed}
                    onCheckedChange={setEnabled}
                    aria-label="Create tasks from PRDs"
                />
            </label>
            {allowed ? (
                <Button
                    loading={isLoading}
                    onClick={() =>
                        void run(save({ ai_task_creation_enabled: enabled }))
                    }
                >
                    Save
                </Button>
            ) : null}
        </Section>
    );
}

function Stale({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const allowed = can('settings.stale-task-alerts.update');
    const [save, { isLoading }] = useSaveStaleAlertsMutation();
    const [enabled, setEnabled] = useState(settings.stale_task_alert_enabled);
    const [reminder, setReminder] = useState(settings.stale_task_reminder_time);
    const [digest, setDigest] = useState(settings.stale_task_digest_time);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <Section
            title="Task update alerts"
            description="Remind employees about tasks with no update, then send the admins a digest."
        >
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await save({
                            stale_task_alert_enabled: enabled,
                            stale_task_reminder_time: reminder,
                            stale_task_digest_time: digest,
                        }).unwrap();
                        toast.success(result.message);
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
                <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 text-sm font-bold text-slate-900">
                    Alerts on
                    <Switch
                        checked={enabled}
                        disabled={!allowed}
                        onCheckedChange={setEnabled}
                        aria-label="Alerts on"
                    />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Reminder time"
                        required
                        error={errors.stale_task_reminder_time}
                    >
                        <Input
                            type="time"
                            disabled={!allowed}
                            value={reminder}
                            onChange={(event) =>
                                setReminder(event.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="Digest time"
                        required
                        hint="Must be after the reminder."
                        error={errors.stale_task_digest_time}
                    >
                        <Input
                            type="time"
                            disabled={!allowed}
                            value={digest}
                            onChange={(event) => setDigest(event.target.value)}
                        />
                    </Field>
                </div>
                {allowed ? (
                    <Button type="submit" loading={isLoading}>
                        Save alerts
                    </Button>
                ) : null}
            </form>
        </Section>
    );
}
