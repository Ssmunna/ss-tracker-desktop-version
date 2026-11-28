import { Bell } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, Outlet, useMatches, useNavigate } from 'react-router';

import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Breadcrumbs, type Crumb } from '@/components/ui/breadcrumb-trail';
import { logout, selectMe } from '@/features/auth/authSlice';
import { EchoProvider } from '@/features/chat/EchoContext';
import { DesktopBridge } from '@/features/desktop/DesktopBridge';
import { PrayerButton } from '@/features/prayer/PrayerButton';
import { Mascot } from '@/features/mascot/Mascot';
import { MascotBridge } from '@/features/mascot/MascotBridge';
import { ConfirmPasswordHost } from '@/features/auth/ConfirmPasswordModal';
import { usePermissions } from '@/hooks/usePermissions';
import { assetUrl } from '@/lib/assetUrl';
import { buildNav } from '@/lib/nav';
import { Forbidden } from '@/pages/StatusPages';

import { AppShell } from './AppShell';
import { NavGroupProvider } from './NavGroupProvider';

export interface RouteHandle {
    title: string;
    /** Required permission; `a|b` means either. No value = any signed-in user. */
    permission?: string;
}

function handleOf(match: { handle: unknown }): RouteHandle | undefined {
    return match.handle as RouteHandle | undefined;
}

/** Guards the page by the permission its route declares, and sets the tab title. */
function PermissionOutlet({
    siteName,
    unread,
}: {
    siteName: string;
    unread: number;
}) {
    const matches = useMatches();
    const { can } = usePermissions();
    const last = matches[matches.length - 1];
    const handle = last ? handleOf(last) : undefined;
    const crumbs: Crumb[] = matches
        .filter((match) => handleOf(match)?.title)
        .map((match) => ({
            label: handleOf(match)!.title,
            to: match.pathname,
        }));

    useEffect(() => {
        const base = handle?.title ? `${handle.title} · ${siteName}` : siteName;

        document.title = unread > 0 ? `(${unread}) ${base}` : base;
    }, [handle?.title, siteName, unread]);

    if (handle?.permission && !can(handle.permission)) {
        return <Forbidden />;
    }

    return (
        <div className="space-y-4">
            {crumbs.length > 1 ? <Breadcrumbs items={crumbs} /> : null}
            <Outlet />
        </div>
    );
}

/** The signed-in layout: sidebar built from the user's permissions, topbar, guarded outlet. */
export function AppLayout() {
    const me = useAppSelector(selectMe)!;
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const groups = useMemo(() => buildNav(me), [me]);
    const unread = me.unread_notifications_count;
    const favicon = assetUrl(me.app_settings.favicon_url);

    // The uploaded favicon replaces the default one in the browser tab.
    useEffect(() => {
        if (!favicon) {
            return;
        }

        const link =
            document.querySelector<HTMLLinkElement>('link[rel~="icon"]') ??
            document.head.appendChild(
                Object.assign(document.createElement('link'), { rel: 'icon' }),
            );
        link.removeAttribute('type');
        link.href = favicon;
    }, [favicon]);

    return (
        <EchoProvider me={me}>
            <NavGroupProvider>
                <DesktopBridge me={me} />
                <MascotBridge me={me} />
                <AppShell
                    brand={me.app_settings.website_name}
                    logoUrl={assetUrl(me.app_settings.logo_url)}
                    homeTo="/"
                    groups={groups}
                    user={{
                        name: me.user.name,
                        email: me.user.email,
                        avatar: assetUrl(me.user.avatar_url) ?? me.user.avatar,
                    }}
                    accountLinks={[
                        { label: 'Profile', to: '/account/profile' },
                        { label: 'Security', to: '/account/security' },
                    ]}
                    onLogout={() => {
                        void dispatch(logout()).then(() =>
                            navigate('/login', { replace: true }),
                        );
                    }}
                    actions={
                        <>
                            {me.home !== 'client' ? <PrayerButton /> : null}
                            <Mascot />
                            <Link
                                to="/notifications"
                                aria-label={
                                    unread > 0
                                        ? `Notifications, ${unread} unread`
                                        : 'Notifications'
                                }
                                className="relative flex size-11 items-center justify-center rounded-xl text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-10"
                            >
                                <Bell className="size-5" />
                                {unread > 0 ? (
                                    <span className="absolute top-1.5 right-1.5 rounded-full bg-brand-badge px-1.5 text-[10px] leading-4 font-bold text-on-brand">
                                        {unread > 99 ? '99+' : unread}
                                    </span>
                                ) : null}
                            </Link>
                        </>
                    }
                >
                    <PermissionOutlet
                        siteName={me.app_settings.website_name}
                        unread={me.unread_messages_count}
                    />
                    <ConfirmPasswordHost />
                </AppShell>
            </NavGroupProvider>
        </EchoProvider>
    );
}
