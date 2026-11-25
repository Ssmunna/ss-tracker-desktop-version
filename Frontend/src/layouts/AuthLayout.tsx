import type { ReactNode } from 'react';

/** Login, 2FA, recovery. Hero card on the light landing gradient (guide s4, s6). */
export function AuthLayout({
    children,
    brand = 'SS Manager',
}: {
    children: ReactNode;
    brand?: string;
}) {
    return (
        <div className="pb-safe pt-safe flex min-h-dvh flex-col items-center justify-center gap-6 bg-linear-to-br from-landing-from via-landing-via to-landing-to p-4">
            <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-r from-brand to-ember-600 text-base font-extrabold text-on-brand shadow-[0_4px_6px_-1px_color-mix(in_oklab,var(--color-ember-500)_25%,transparent)]">
                    {brand.charAt(0)}
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                    {brand}
                </span>
            </div>
            {children}
        </div>
    );
}
