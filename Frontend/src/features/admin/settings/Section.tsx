import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';

/** A settings block: title, short help and a body. */
export function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="space-y-4">
            <div>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                {description ? (
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                ) : null}
            </div>
            {children}
        </Card>
    );
}
