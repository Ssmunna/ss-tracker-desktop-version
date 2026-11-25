import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { enqueue, setEnabled, setVoice } from './mascotSlice';

/** Per-device switches for the mascot; kept in this browser / desktop app only. */
export function MascotSettingsCard() {
    const dispatch = useAppDispatch();
    const { enabled, voice } = useAppSelector((state) => state.mascot);
    const rows = [
        {
            label: 'Show the mascot',
            hint: 'A little character comes out of the house in the top bar to tell you about new messages, tasks and reminders.',
            checked: enabled,
            disabled: false,
            onChange: (value: boolean) => dispatch(setEnabled(value)),
        },
        {
            label: 'Mascot voice',
            hint: 'Let the mascot say it out loud as well.',
            checked: voice,
            disabled: !enabled,
            onChange: (value: boolean) => dispatch(setVoice(value)),
        },
    ];

    return (
        <Card className="space-y-3">
            <div>
                <h2 className="text-base font-bold text-slate-900">Mascot</h2>
                <p className="mt-1 text-sm text-slate-500">
                    Shown only while the app is in front. Otherwise you get a
                    normal notification.
                </p>
            </div>
            <ul className="divide-y divide-slate-100">
                {rows.map((row) => (
                    <li
                        key={row.label}
                        className="flex min-h-14 items-center justify-between gap-4 py-2"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {row.label}
                            </p>
                            <p className="text-xs text-slate-500">{row.hint}</p>
                        </div>
                        <Switch
                            checked={row.checked}
                            disabled={row.disabled}
                            aria-label={row.label}
                            onCheckedChange={row.onChange}
                        />
                    </li>
                ))}
            </ul>
            <Button
                variant="outline"
                disabled={!enabled}
                onClick={() => {
                    dispatch(enqueue({ type: 'message', name: 'Tanvir' }));
                    dispatch(
                        enqueue({ type: 'notification', kind: 'deadline' }),
                    );
                }}
            >
                Preview the mascot
            </Button>
        </Card>
    );
}
