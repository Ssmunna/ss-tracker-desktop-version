import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';

import { Avatar } from '@/components/ui/avatar';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { useActiveNavGroup } from './navGroupContext';

export interface NavItem {
    label: string;
    to: string;
    icon?: LucideIcon;
    /** Count badge (pending requests, unread chat). */
    badge?: number;
    /** Match only the exact path (for index routes like /admin). */
    end?: boolean;
    /** Shows a colour dot instead of an icon (project groups). */
    color?: string;
    /** The item is active only while this query param has this value (e.g. group_id). */
    param?: { key: string; value: string };
}

export interface NavGroup {
    label: string;
    items: NavItem[];
}

export interface ShellUser {
    name: string;
    email?: string;
    avatar?: string | null;
}

interface AppShellProps {
    brand: string;
    logoUrl?: string | null;
    homeTo: string;
    groups: NavGroup[];
    user: ShellUser;
    accountLinks?: Array<{ label: string; to: string }>;
    onLogout: () => void;
    /** Topbar right side: notification bell, chat shortcut. */
    actions?: ReactNode;
    /** Rendered instead of <Outlet /> when the shell is used outside the router tree. */
    children?: ReactNode;
}

function Brand({
    name,
    to,
    logoUrl,
}: {
    name: string;
    to: string;
    logoUrl?: string | null;
}) {
    return (
        <Link to={to} className="flex items-center gap-2.5">
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt=""
                    className="size-9 rounded-xl object-contain"
                />
            ) : (
                <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-r from-brand to-ember-600 text-sm font-extrabold text-on-brand">
                    {name.charAt(0)}
                </span>
            )}
            <span className="truncate text-sm font-extrabold text-slate-900">
                {name}
            </span>
        </Link>
    );
}

/** Guide s5 sidebar item: inactive `hover:bg-slate-100`, active `bg-brand text-on-brand`. */
function SidebarNav({
    groups,
    onNavigate,
}: {
    groups: NavGroup[];
    onNavigate?: () => void;
}) {
    const { pathname, search, state } = useLocation();
    const query = new URLSearchParams(search);
    // The group of the open project: from its page once loaded, until then from the list
    // row that opened it (navigation state), so the highlight does not jump meanwhile.
    const fromRow = (state as { groupId?: number | null } | null)?.groupId;
    const activeGroupId = useActiveNavGroup() ?? fromRow ?? null;

    return (
        <nav aria-label="Main" className="space-y-5">
            {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                    <p className="px-3 text-[11px] font-bold tracking-wide text-slate-400 uppercase">
                        {group.label}
                    </p>
                    {group.items.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={onNavigate}
                            className={({ isActive: pathActive }) => {
                                // Group links share a path and differ by query; the plain
                                // projects link steps aside while a group is selected, or
                                // while one of that group's projects is open.
                                const [itemPath] = item.to.split('?');
                                const inGroupProject =
                                    activeGroupId !== null &&
                                    pathname.startsWith(`${itemPath}/`);
                                const isActive = item.param
                                    ? pathActive &&
                                      (query.get(item.param.key) ===
                                          item.param.value ||
                                          (inGroupProject &&
                                              String(activeGroupId) ===
                                                  item.param.value))
                                    : pathActive &&
                                      !(
                                          (query.has('group_id') &&
                                              item.to === pathname) ||
                                          inGroupProject
                                      );

                                return cn(
                                    'flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors lg:min-h-9',
                                    isActive
                                        ? 'bg-brand font-medium text-on-brand shadow-brand'
                                        : 'text-slate-900 hover:bg-slate-100',
                                );
                            }}
                        >
                            {item.icon ? (
                                <item.icon className="size-4 shrink-0" />
                            ) : item.color ? (
                                <span
                                    aria-hidden
                                    className="mx-1 size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                            ) : null}
                            <span className="min-w-0 flex-1 truncate">
                                {item.label}
                            </span>
                            {item.badge ? (
                                <span className="rounded-full bg-brand-badge px-1.5 text-[10px] font-bold text-on-brand">
                                    {item.badge > 99 ? '99+' : item.badge}
                                </span>
                            ) : null}
                        </NavLink>
                    ))}
                </div>
            ))}
        </nav>
    );
}

export function AppShell({
    brand,
    logoUrl,
    homeTo,
    groups,
    user,
    accountLinks = [],
    onLogout,
    actions,
    children,
}: AppShellProps) {
    const [navOpen, setNavOpen] = useState(false);

    return (
        <div className="min-h-dvh">
            {/* Large screens: fixed sidebar */}
            <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 overflow-y-auto border-r border-white/60 bg-glass-nav p-4 shadow-[8px_0_30px_-12px_rgba(38,53,68,0.12)] glass-blur lg:flex">
                <Brand name={brand} to={homeTo} logoUrl={logoUrl} />
                <SidebarNav groups={groups} />
            </aside>

            <div className="lg:pl-64">
                <header className="pt-safe sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-white/60 bg-glass-nav px-4 shadow-[0_8px_30px_-14px_rgba(38,53,68,0.18)] glass-blur">
                    <Drawer open={navOpen} onOpenChange={setNavOpen}>
                        <button
                            type="button"
                            aria-label="Open navigation"
                            onClick={() => setNavOpen(true)}
                            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none lg:hidden"
                        >
                            <Menu className="size-5" />
                        </button>
                        <DrawerContent
                            title="Navigation"
                            side="left"
                            hideHeader
                        >
                            <div className="space-y-6 p-4">
                                <Brand
                                    name={brand}
                                    to={homeTo}
                                    logoUrl={logoUrl}
                                />
                                <SidebarNav
                                    groups={groups}
                                    onNavigate={() => setNavOpen(false)}
                                />
                            </div>
                        </DrawerContent>
                    </Drawer>

                    <div className="min-w-0 flex-1 lg:hidden">
                        <Brand name={brand} to={homeTo} logoUrl={logoUrl} />
                    </div>
                    <div className="hidden flex-1 lg:block" />

                    <div className="flex items-center gap-1">
                        {actions}
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                aria-label="Account menu"
                                className="flex size-11 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-10"
                            >
                                <Avatar
                                    name={user.name}
                                    src={user.avatar}
                                    size="sm"
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>
                                    <span className="block text-sm font-bold text-slate-900">
                                        {user.name}
                                    </span>
                                    {user.email ? (
                                        <span>{user.email}</span>
                                    ) : null}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {accountLinks.map((link) => (
                                    <DropdownMenuItem key={link.to} asChild>
                                        <Link to={link.to}>{link.label}</Link>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuItem
                                    destructive
                                    onSelect={onLogout}
                                >
                                    <LogOut className="size-4" /> Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6">
                    {children ?? <Outlet />}
                </main>
            </div>
        </div>
    );
}
