import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { AuthLayout } from '@/layouts/AuthLayout';

/** Hero card on the auth background with a title, a description and an optional status line. */
export function AuthCard({
    title,
    description,
    status,
    children,
}: {
    title: string;
    description?: string;
    status?: string | null;
    children: ReactNode;
}) {
    return (
        <AuthLayout>
            <Card variant="hero" animate className="space-y-6">
                <div className="space-y-1.5 text-center">
                    <h1 className="text-xl font-extrabold text-slate-900">
                        {title}
                    </h1>
                    {description ? (
                        <p className="text-sm text-slate-500">{description}</p>
                    ) : null}
                </div>
                {status ? (
                    <p
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700"
                    >
                        {status}
                    </p>
                ) : null}
                {children}
            </Card>
        </AuthLayout>
    );
}

export function FormMessage({ children }: { children?: string | null }) {
    return children ? (
        <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
            {children}
        </p>
    ) : null;
}
