import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import {
    useGetMeQuery,
    useResendVerificationMutation,
    useVerifyEmailMutation,
} from '@/api/endpoints/auth';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { isTrustedVerifyUrl } from '@/lib/verify-url';

import { AuthCard, FormMessage } from './AuthCard';
import { logout, selectMe, selectToken } from './authSlice';

/**
 * Two jobs: finish verification from the emailed link (`?verify=<signed api url>`, works
 * signed out), and block an unverified signed-in account until it verifies.
 */
export function VerifyEmailPage() {
    const [params] = useSearchParams();
    const verifyUrl = params.get('verify');

    return verifyUrl !== null ? (
        <VerifyFromLink url={verifyUrl} />
    ) : (
        <VerifyGate />
    );
}

function VerifyFromLink({ url }: { url: string }) {
    const navigate = useNavigate();
    const [verify, { isError, isSuccess }] = useVerifyEmailMutation();
    const started = useRef(false);
    const trusted = isTrustedVerifyUrl(url);

    useEffect(() => {
        if (trusted && !started.current) {
            started.current = true;
            void verify({ url });
        }
    }, [trusted, url, verify]);

    const failed = !trusted || isError;

    return (
        <AuthCard
            title={isSuccess ? 'Email verified' : 'Verifying your email'}
            description={
                isSuccess
                    ? 'Thank you. Your email address is confirmed.'
                    : failed
                      ? undefined
                      : 'One moment please.'
            }
        >
            {failed ? (
                <FormMessage>
                    This verification link is invalid or has expired. Sign in
                    and request a new one.
                </FormMessage>
            ) : null}
            {!failed && !isSuccess ? (
                <div className="flex justify-center">
                    <Spinner />
                </div>
            ) : (
                <Button
                    block
                    size="lg"
                    onClick={() => navigate('/', { replace: true })}
                >
                    Continue
                </Button>
            )}
        </AuthCard>
    );
}

function VerifyGate() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const token = useAppSelector(selectToken);
    const me = useAppSelector(selectMe);
    const [resend, { isLoading }] = useResendVerificationMutation();
    const [sent, setSent] = useState(false);
    const { refetch, isFetching } = useGetMeQuery(undefined, {
        skip: token === null,
    });

    if (token === null) {
        return <Navigate to="/login" replace />;
    }

    if (me?.user.email_verified_at) {
        return <Navigate to="/" replace />;
    }

    return (
        <AuthCard
            title="Verify email"
            description="Please verify your email address by clicking the link we just emailed to you."
            status={
                sent
                    ? 'A new verification link has been sent to your email address.'
                    : null
            }
        >
            <div className="space-y-3">
                <Button
                    block
                    size="lg"
                    loading={isLoading}
                    onClick={async () => {
                        try {
                            const result = await resend().unwrap();
                            setSent(true);

                            if (result.verified) {
                                void refetch();
                            }
                        } catch {
                            toast.error(
                                'Could not send the link. Try again shortly.',
                            );
                        }
                    }}
                >
                    Resend verification email
                </Button>
                <Button
                    block
                    variant="outline"
                    loading={isFetching}
                    onClick={() => void refetch()}
                >
                    I have verified my email
                </Button>
                <Button
                    block
                    variant="ghost"
                    onClick={() => {
                        void dispatch(logout()).then(() =>
                            navigate('/login', { replace: true }),
                        );
                    }}
                >
                    Log out
                </Button>
            </div>
        </AuthCard>
    );
}
