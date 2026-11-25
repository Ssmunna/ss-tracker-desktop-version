import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { getDesktop, type DesktopSettings } from '@/lib/desktop';

const rows: { key: keyof DesktopSettings; label: string; hint: string }[] = [
    {
        key: 'notifications',
        label: 'Desktop notifications',
        hint: 'Show a pop-up for new messages and updates while the window is not in front.',
    },
    {
        key: 'closeToTray',
        label: 'Keep running in the tray',
        hint: 'Closing the window hides the app instead of quitting, so you still get notified.',
    },
    {
        key: 'autoLaunch',
        label: 'Start with my computer',
        hint: 'Open quietly in the tray when you sign in to your computer.',
    },
];

/** Settings of the desktop app itself; shown instead of the browser push card inside the app. */
export function DesktopSettingsCard() {
    const desktop = getDesktop();
    const [settings, setSettings] = useState<DesktopSettings | null>(null);

    useEffect(() => {
        void desktop?.getSettings().then(setSettings);
    }, [desktop]);

    const change = (key: keyof DesktopSettings, value: boolean) => {
        desktop
            ?.setSettings({ [key]: value })
            .then(setSettings)
            .catch(() => toast.error('Could not save this setting.'));
    };

    return (
        <Card className="space-y-3">
            <div>
                <h2 className="text-base font-bold text-slate-900">
                    Desktop app
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                    How this computer tells you when something needs you.
                </p>
            </div>
            <ul className="divide-y divide-slate-100">
                {rows.map((row) => (
                    <li
                        key={row.key}
                        className="flex min-h-14 items-center justify-between gap-4 py-2"
                    >
                        <div>
                            <p className="text-sm font-bold text-slate-900">
                                {row.label}
                            </p>
                            <p className="text-xs text-slate-500">{row.hint}</p>
                        </div>
                        <Switch
                            checked={settings?.[row.key] ?? false}
                            disabled={!settings}
                            aria-label={row.label}
                            onCheckedChange={(value) => change(row.key, value)}
                        />
                    </li>
                ))}
            </ul>
            <div className="space-y-1">
                <Button
                    variant="outline"
                    onClick={() =>
                        void desktop
                            ?.testNotification()
                            .then((result) =>
                                result.ok
                                    ? toast.success(
                                          'Test sent. If you saw no pop-up, allow notifications for SS Manager in your system settings.',
                                      )
                                    : toast.error(
                                          result.error ??
                                              'The system did not accept the notification.',
                                      ),
                            )
                    }
                >
                    Send a test notification
                </Button>
            </div>
        </Card>
    );
}
