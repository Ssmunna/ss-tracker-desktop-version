import { Navigate, Outlet, useLocation } from 'react-router';

import { useAppSelector } from '@/app/hooks';
import { useGetMeQuery } from '@/api/endpoints/auth';
import { homePath } from '@/lib/nav';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { Splash } from '@/pages/StatusPages';

import type { AuthLocationState } from './LoginPage';

import {
    selectEndedReason,
    selectHome,
    selectMe,
    selectToken,
} from './authSlice';

/**
 * Everything behind login. Loads `/me`, keeps it fresh on focus/reconnect, and
 * sends the user to login (or the inactive page) when the session ends.
 */
export function RequireAuth() {
    const token = useAppSelector(selectToken);
    const me = useAppSelector(selectMe);
    const reason = useAppSelector(selectEndedReason);
    const location = useLocation();
    const { isError, refetch } = useGetMeQuery(undefined, {
        skip: token === null,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    if (token === null) {
        if (reason === 'inactive') {
            return <Navigate to="/inactive" replace />;
        }

        return (
            <Navigate
                to="/login"
                replace
                state={reason === 'logout' ? undefined : { from: location }}
            />
        );
    }

    if (me === null) {
        return isError ? (
            <div className="mx-auto max-w-md p-4 pt-16">
                <ErrorState
                    title="Could not load your account"
                    description="Check your connection and try again."
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
            </div>
        ) : (
            <Splash />
        );
    }

    // Same rule as the web `verified` middleware: unverified accounts must verify first.
    if (me.user.email_verified_at === null) {
        return <Navigate to="/verify-email" replace />;
    }

    return <Outlet />;
}

/**
 * Login and recovery pages: a signed-in visitor goes to the page they first asked
 * for (login passes it as `state.from`), otherwise to their dashboard.
 */
export function GuestOnly() {
    const token = useAppSelector(selectToken);
    const from = (useLocation().state as AuthLocationState | null)?.from;

    if (token === null) {
        return <Outlet />;
    }

    return (
        <Navigate
            to={from ? `${from.pathname}${from.search ?? ''}` : '/'}
            replace
        />
    );
}

/** `/` sends each account to its own dashboard (admin, employee or client). */
export function HomeRedirect() {
    const home = useAppSelector(selectHome);

    if (home === null) {
        return (
            <div className="mx-auto max-w-md p-4 pt-16">
                <ErrorState
                    title="No dashboard is assigned to your account"
                    description="Ask an administrator to give your role access."
                />
            </div>
        );
    }

    return <Navigate to={homePath[home]} replace />;
}
