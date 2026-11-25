import {
    Bell,
    FolderKanban,
    LayoutDashboard,
    MessageSquare,
    Settings,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AppShell, type NavGroup } from '@/layouts/AppShell';
import { AuthLayout } from '@/layouts/AuthLayout';
import { ChatLayout } from '@/layouts/ChatLayout';

const groups: NavGroup[] = [
    {
        label: 'Navigation',
        items: [
            {
                label: 'Dashboard',
                to: '/__ui/shell',
                icon: LayoutDashboard,
                end: true,
            },
        ],
    },
    {
        label: 'Work',
        items: [
            {
                label: 'Projects',
                to: '/__ui/shell/projects',
                icon: FolderKanban,
            },
            {
                label: 'Requests',
                to: '/__ui/shell/requests',
                icon: Bell,
                badge: 4,
            },
            {
                label: 'Chat',
                to: '/__ui/shell/chat',
                icon: MessageSquare,
                badge: 120,
            },
        ],
    },
    {
        label: 'System',
        items: [
            { label: 'Settings', to: '/__ui/shell/settings', icon: Settings },
        ],
    },
];

export function ShellDemo() {
    return (
        <AppShell
            brand="SS Manager"
            homeTo="/__ui/shell"
            groups={groups}
            user={{ name: 'Rahim Uddin', email: 'rahim@example.com' }}
            accountLinks={[{ label: 'Profile', to: '/__ui/shell' }]}
            onLogout={() => undefined}
            actions={
                <Button variant="ghost" size="icon" aria-label="Notifications">
                    <Bell className="size-5" />
                </Button>
            }
        ></AppShell>
    );
}

export function ShellPlaceholder() {
    return (
        <Card>
            <p className="text-sm text-slate-600">
                Page content. Back to the{' '}
                <Link className="font-bold text-brand-600" to="/__ui">
                    gallery
                </Link>
                .
            </p>
        </Card>
    );
}

export function AuthDemo() {
    return (
        <AuthLayout>
            <Card variant="hero" animate className="space-y-5">
                <div className="space-y-1">
                    <h1 className="text-xl font-extrabold text-slate-900">
                        Welcome back
                    </h1>
                    <p className="text-sm text-slate-500">
                        Sign in to continue.
                    </p>
                </div>
                <Field label="Email">
                    <Input type="email" placeholder="you@company.com" />
                </Field>
                <Field label="Password">
                    <Input type="password" />
                </Field>
                <Button block size="lg">
                    Sign in
                </Button>
            </Card>
        </AuthLayout>
    );
}

export function ChatDemo() {
    const [showThread, setShowThread] = useState(false);

    return (
        <ChatLayout
            showThread={showThread}
            list={
                <div className="space-y-2 p-4">
                    <p className="text-sm font-bold">Conversations</p>
                    <Button
                        variant="outline"
                        block
                        onClick={() => setShowThread(true)}
                    >
                        Open thread
                    </Button>
                </div>
            }
            thread={
                <div className="space-y-3 p-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setShowThread(false)}
                    >
                        Back
                    </Button>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-none border border-slate-200 bg-surface p-2.5 text-slate-800 shadow-sm">
                        Incoming message
                    </div>
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-none bg-bubble p-2.5 text-slate-800">
                        Outgoing message
                    </div>
                </div>
            }
        />
    );
}
