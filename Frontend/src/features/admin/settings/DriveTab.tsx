import { ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useDisconnectDriveMutation,
    useDriveConnectUrlMutation,
    useSaveDriveFolderMutation,
} from '@/api/endpoints/settings';
import { settingsApi } from '@/api/endpoints/settings';
import { useAppDispatch } from '@/app/hooks';
import type { AppSettings } from '@/api/settings-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';

import { Section } from './Section';

export function DriveTab({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const run = useRun();
    const dispatch = useAppDispatch();
    const allowed = can('settings.google-drive.connect');
    const [saveFolder, { isLoading }] = useSaveDriveFolderMutation();
    const [disconnect, { isLoading: disconnecting }] =
        useDisconnectDriveMutation();
    const [connectUrl, { isLoading: connecting }] =
        useDriveConnectUrlMutation();
    const [folder, setFolder] = useState(
        settings.google_drive_parent_folder_name,
    );
    const [confirming, setConfirming] = useState(false);
    const popup = useRef<Window | null>(null);

    // The consent screen runs in a popup on the web app. When it closes, read the status again.
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (popup.current?.closed) {
                popup.current = null;
                dispatch(settingsApi.util.invalidateTags(['Setting']));
            }
        }, 800);

        return () => window.clearInterval(timer);
    }, [dispatch]);

    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <Section
                title="Google Drive"
                description="Project documents are stored in a Drive folder."
            >
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        tone={
                            settings.google_drive_connected
                                ? 'success'
                                : 'neutral'
                        }
                    >
                        {settings.google_drive_connected
                            ? 'Connected'
                            : 'Not connected'}
                    </Badge>
                    {settings.google_drive_email ? (
                        <span className="text-sm text-slate-600">
                            {settings.google_drive_email}
                        </span>
                    ) : null}
                </div>
                {allowed ? (
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={
                                settings.google_drive_connected
                                    ? 'outline'
                                    : 'primary'
                            }
                            loading={connecting}
                            onClick={async () => {
                                // Opened at once, so the browser does not block it; sent to Google when the link arrives.
                                const win = window.open(
                                    '',
                                    'google-drive-connect',
                                    'width=560,height=720',
                                );

                                popup.current = win;

                                try {
                                    const { url } = await connectUrl().unwrap();

                                    if (win) {
                                        win.location.href = url;
                                    } else {
                                        window.location.href = url;
                                    }
                                } catch (error) {
                                    win?.close();
                                    toast.error(errorMessage(error));
                                }
                            }}
                        >
                            <ExternalLink className="size-4" />
                            {settings.google_drive_connected
                                ? 'Reconnect'
                                : 'Connect Google Drive'}
                        </Button>
                        {settings.google_drive_connected ? (
                            <Button
                                variant="destructiveSoft"
                                onClick={() => setConfirming(true)}
                            >
                                Disconnect
                            </Button>
                        ) : null}
                    </div>
                ) : null}
                <p className="text-xs text-slate-500">
                    Connecting opens Google in a new window. When it closes, the
                    status above updates.
                </p>
            </Section>
            <Section
                title="Parent folder"
                description="Name of the Drive folder that holds all project folders."
            >
                <form
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void run(saveFolder({ name: folder }));
                    }}
                >
                    <Field label="Folder name" required>
                        <Input
                            disabled={!allowed}
                            value={folder}
                            onChange={(event) => setFolder(event.target.value)}
                        />
                    </Field>
                    {allowed ? (
                        <Button type="submit" loading={isLoading}>
                            Save folder name
                        </Button>
                    ) : null}
                </form>
            </Section>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                destructive
                title="Disconnect Google Drive?"
                description="New uploads will stop working until you connect again. Existing files stay in Drive."
                confirmLabel="Disconnect"
                loading={disconnecting}
                onConfirm={async () => {
                    if (await run(disconnect())) {
                        setConfirming(false);
                    }
                }}
            />
        </div>
    );
}
