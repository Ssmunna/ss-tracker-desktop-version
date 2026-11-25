import { FileQuestion, Lock, RefreshCw } from 'lucide-react';
import { Link, Navigate, useLocation, useRouteError } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { legacyPath } from '@/lib/legacyPath';

export function Splash() {
    return (
        <div
            role="status"
            aria-label="Loading"
            className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4"
        >
            <span className="flex size-12 animate-pulse items-center justify-center rounded-2xl bg-linear-to-r from-brand to-ember-600 text-lg font-extrabold text-on-brand">
                D
            </span>
            <Skeleton className="h-2 w-40" />
        </div>
    );
}

export function Forbidden() {
    return (
        <Card variant="flush">
            <EmptyState
                icon={Lock}
                title="You do not have access to this page"
                description="Ask an administrator if you think you should."
                action={
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">Go to my dashboard</Link>
                    </Button>
                }
            />
        </Card>
    );
}

export function NotFound() {
    return (
        <div className="mx-auto max-w-lg p-4 pt-16">
            <Card variant="flush">
                <EmptyState
                    icon={FileQuestion}
                    title="Page not found"
                    description="The page you are looking for does not exist or was moved."
                    action={
                        <Button asChild variant="outline" size="sm">
                            <Link to="/">Back to start</Link>
                        </Button>
                    }
                />
            </Card>
        </div>
    );
}

export function RouteError() {
    const error = useRouteError();
    const message =
        error instanceof Error
            ? error.message
            : 'An unexpected error happened.';

    return (
        <div className="mx-auto max-w-lg p-4 pt-16">
            <Card variant="flush">
                <EmptyState
                    icon={RefreshCw}
                    title="Something went wrong"
                    description={message}
                    action={
                        <Button
                            size="sm"
                            onClick={() => window.location.reload()}
                        >
                            Reload
                        </Button>
                    }
                />
            </Card>
        </div>
    );
}

/** An address from the old web app goes to its new page; anything else is not found. */
export function LegacyOrNotFound() {
    const { pathname } = useLocation();
    const target = legacyPath(pathname);

    return target ? <Navigate to={target} replace /> : <NotFound />;
}
