import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useGetNotificationPreferencesQuery,
    useGetNotificationsQuery,
    useMarkNotificationsReadMutation,
    useSaveNotificationPreferencesMutation,
} from '@/api/endpoints/chat';
import type { AppNotification, NotificationPreference } from '@/api/chat-types';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { selectMe } from '@/features/auth/authSlice';
import { DesktopSettingsCard } from '@/features/desktop/DesktopSettingsCard';
import { MascotSettingsCard } from '@/features/mascot/MascotSettingsCard';
import { getDesktop } from '@/lib/desktop';
import { formatDateTime } from '@/lib/date';
import { notificationPath } from '@/lib/notificationLink';
import { cn } from '@/lib/utils';

import { usePush } from './push';

export function NotificationsPage() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'settings' ? 'settings' : 'list';

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Notifications
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    What happened, and how you want to hear about it.
                </p>
            </div>
            <Tabs
                value={tab}
                onValueChange={(value) =>
                    setParams(value === 'settings' ? { tab: 'settings' } : {}, {
                        replace: true,
                    })
                }
            >
                <TabsList>
                    <TabsTrigger value="list">Inbox</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="list">
                    <Inbox />
                </TabsContent>
                <TabsContent value="settings">
                    <Settings />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Inbox() {
    const me = useAppSelector(selectMe)!;
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const page = Number(params.get('page') ?? 1);
    const unreadOnly = params.get('unread') === '1';
    const { data, isLoading, isError, refetch } = useGetNotificationsQuery({
        page,
        unread: unreadOnly || undefined,
    });
    const [markRead, { isLoading: marking }] =
        useMarkNotificationsReadMutation();

    const open = async (item: AppNotification) => {
        if (!item.read_at) {
            void markRead({ ids: [item.id] });
        }

        navigate(notificationPath(me.home, item.target));
    };

    if (isError) {
        return (
            <ErrorState
                title="Could not load notifications"
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

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2" role="group" aria-label="Filter">
                    {[
                        ['All', false],
                        ['Unread', true],
                    ].map(([label, flag]) => (
                        <button
                            key={String(label)}
                            type="button"
                            aria-pressed={unreadOnly === flag}
                            onClick={() =>
                                setParams(flag ? { unread: '1' } : {}, {
                                    replace: true,
                                })
                            }
                            className={cn(
                                'min-h-10 rounded-full border px-4 text-xs font-bold transition-colors',
                                unreadOnly === flag
                                    ? 'border-brand bg-brand text-on-brand'
                                    : 'border-slate-200 bg-surface text-slate-700 hover:border-ember-300 hover:bg-brand-50',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    loading={marking}
                    disabled={!data || data.unread_count === 0}
                    onClick={async () => {
                        try {
                            await markRead().unwrap();
                        } catch (error) {
                            toast.error(errorMessage(error));
                        }
                    }}
                >
                    <CheckCheck className="size-4" /> Mark all read
                </Button>
            </div>
            {isLoading || !data ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                    ))}
                </div>
            ) : data.notifications.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        icon={Bell}
                        title={
                            unreadOnly
                                ? 'Nothing unread'
                                : 'No notifications yet'
                        }
                    />
                </Card>
            ) : (
                <ul className="space-y-2">
                    {data.notifications.map((item) => (
                        <li key={item.id}>
                            <Card
                                variant={item.read_at ? 'standard' : 'tinted'}
                                interactive
                                className="p-0"
                            >
                                <button
                                    type="button"
                                    onClick={() => void open(item)}
                                    className="flex min-h-16 w-full items-start gap-3 rounded-2xl p-4 text-left focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'mt-1.5 size-2 shrink-0 rounded-full',
                                            item.read_at
                                                ? 'bg-transparent'
                                                : 'bg-brand',
                                        )}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className={cn(
                                                'block text-sm text-slate-900',
                                                !item.read_at && 'font-bold',
                                            )}
                                        >
                                            {item.title}
                                        </span>
                                        <span className="block text-sm text-slate-600">
                                            {item.body}
                                        </span>
                                        <span className="mt-1 block text-[11px] text-slate-500">
                                            {formatDateTime(item.created_at)}
                                        </span>
                                    </span>
                                </button>
                            </Card>
                        </li>
                    ))}
                </ul>
            )}
            {data ? (
                <Pagination
                    page={data.meta.current_page}
                    pageCount={data.meta.last_page}
                    total={data.meta.total}
                    onPageChange={(next) => {
                        const copy = new URLSearchParams(params);
                        copy.set('page', String(next));
                        setParams(copy, { replace: true });
                    }}
                />
            ) : null}
        </div>
    );
}

function Settings() {
    const { data, isLoading, isError, refetch } =
        useGetNotificationPreferencesQuery();
    const [save] = useSaveNotificationPreferencesMutation();
    const push = usePush();

    const change = async (
        item: NotificationPreference,
        channel: 'in_app' | 'push',
        value: boolean,
    ) => {
        try {
            await save([{ type: item.type, [channel]: value }]).unwrap();
            await refetch();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <div className="space-y-5">
            <MascotSettingsCard />
            {getDesktop() ? (
                <DesktopSettingsCard />
            ) : (
                <Card className="space-y-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Browser notifications
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Get a pop-up on this device when something needs
                            you.
                        </p>
                    </div>
                    {push.state === 'unsupported' ? (
                        <p className="text-sm text-slate-600">
                            This browser does not support push notifications.
                        </p>
                    ) : push.state === 'denied' ? (
                        <p className="flex items-center gap-2 text-sm text-slate-600">
                            <BellOff className="size-4" /> Notifications are
                            blocked. Allow them in your browser's site settings.
                        </p>
                    ) : push.state === 'unavailable' ? (
                        <p className="text-sm text-slate-600">
                            Push notifications are not set up on the server yet.
                        </p>
                    ) : push.state === 'subscribed' ? (
                        <Button
                            variant="outline"
                            loading={push.busy}
                            onClick={() =>
                                void push
                                    .disable()
                                    .catch((error) =>
                                        toast.error(errorMessage(error)),
                                    )
                            }
                        >
                            Turn off on this device
                        </Button>
                    ) : (
                        <Button
                            loading={push.busy}
                            onClick={() =>
                                void push
                                    .enable()
                                    .catch((error) =>
                                        toast.error(errorMessage(error)),
                                    )
                            }
                        >
                            <Bell className="size-4" /> Turn on for this device
                        </Button>
                    )}
                </Card>
            )}
            <Card className="space-y-2">
                <h2 className="text-base font-bold text-slate-900">
                    What to notify
                </h2>
                {isError ? (
                    <ErrorState title="Could not load preferences" />
                ) : isLoading || !data ? (
                    <Skeleton className="h-40 w-full" />
                ) : (
                    <>
                        <div className="hidden grid-cols-[1fr_5rem_5rem] gap-2 px-1 text-[11px] font-bold text-slate-500 sm:grid">
                            <span>Event</span>
                            <span>In app</span>
                            <span>Push</span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {data.preferences.map((item) => (
                                <li
                                    key={item.type}
                                    className="grid min-h-14 items-center gap-2 py-2 sm:grid-cols-[1fr_5rem_5rem]"
                                >
                                    <span className="text-sm font-bold text-slate-900">
                                        {item.label}
                                    </span>
                                    <label className="flex items-center justify-between gap-2 text-xs text-slate-600 sm:justify-start">
                                        <span className="sm:hidden">
                                            In app
                                        </span>
                                        <Switch
                                            checked={item.in_app}
                                            aria-label={`${item.label}, in app`}
                                            onCheckedChange={(value) =>
                                                void change(
                                                    item,
                                                    'in_app',
                                                    value,
                                                )
                                            }
                                        />
                                    </label>
                                    <label className="flex items-center justify-between gap-2 text-xs text-slate-600 sm:justify-start">
                                        <span className="sm:hidden">Push</span>
                                        <Switch
                                            checked={item.push}
                                            aria-label={`${item.label}, push`}
                                            onCheckedChange={(value) =>
                                                void change(item, 'push', value)
                                            }
                                        />
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </Card>
        </div>
    );
}
