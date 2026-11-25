import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { errorBody } from '@/api/baseApi';
import { useTwoFactorChallengeMutation } from '@/api/endpoints/auth';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { applyServerErrors } from '@/lib/forms';

import { AuthCard, FormMessage } from './AuthCard';
import {
    challengeCleared,
    selectChallengeToken,
    tokenReceived,
} from './authSlice';
import type { AuthLocationState } from './LoginPage';

const codeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});
type CodeValues = { code?: string; recovery_code?: string };
const recoverySchema = z.object({
    recovery_code: z.string().trim().min(1, 'Enter a recovery code.'),
});

export function TwoFactorPage() {
    const challengeToken = useAppSelector(selectChallengeToken);
    const [useRecovery, setUseRecovery] = useState(false);

    if (challengeToken === null) {
        return <Navigate to="/login" replace />;
    }

    return (
        <TwoFactorForm
            key={useRecovery ? 'recovery' : 'code'}
            challengeToken={challengeToken}
            useRecovery={useRecovery}
            onToggle={() => setUseRecovery((value) => !value)}
        />
    );
}

function TwoFactorForm({
    challengeToken,
    useRecovery,
    onToggle,
}: {
    challengeToken: string;
    useRecovery: boolean;
    onToggle: () => void;
}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const state = (useLocation().state ?? {}) as AuthLocationState;
    const [challenge, { isLoading }] = useTwoFactorChallengeMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const field = useRecovery ? 'recovery_code' : 'code';
    const form = useForm<CodeValues>({
        resolver: zodResolver(
            useRecovery ? recoverySchema : codeSchema,
        ) as Resolver<CodeValues>,
    });

    const onSubmit = async (values: CodeValues) => {
        setFormError(null);

        try {
            const result = await challenge({
                challenge_token: challengeToken,
                ...(useRecovery
                    ? { recovery_code: values.recovery_code }
                    : { code: values.code }),
            }).unwrap();

            dispatch(tokenReceived(result.token));
            navigate(
                state.from
                    ? `${state.from.pathname}${state.from.search ?? ''}`
                    : '/',
                { replace: true },
            );
        } catch (error) {
            const body = errorBody(error);

            if (body.code === 'account_inactive') {
                dispatch(challengeCleared());
                navigate('/inactive', { replace: true });

                return;
            }

            if (body.code === 'challenge_expired') {
                dispatch(challengeCleared());
                navigate('/login', {
                    replace: true,
                    state: { ...state, status: undefined },
                });

                return;
            }

            form.resetField(field);
            setFormError(applyServerErrors(error, form.setError, [field]));
        }
    };

    return (
        <AuthCard
            title="Two-factor authentication"
            description={
                useRecovery
                    ? 'Enter one of your emergency recovery codes.'
                    : 'Enter the 6-digit code from your authenticator app.'
            }
        >
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
            >
                <FormMessage>{formError}</FormMessage>
                <Field
                    label={
                        useRecovery ? 'Recovery code' : 'Authentication code'
                    }
                    error={form.formState.errors[field]?.message}
                >
                    <Input
                        autoFocus
                        autoComplete="one-time-code"
                        inputMode={useRecovery ? 'text' : 'numeric'}
                        maxLength={useRecovery ? undefined : 6}
                        className={
                            useRecovery
                                ? ''
                                : 'text-center text-lg tracking-[0.5em]'
                        }
                        {...form.register(field, {
                            onChange: (event) => {
                                if (
                                    !useRecovery &&
                                    /^\d{6}$/.test(event.target.value)
                                ) {
                                    void form.handleSubmit(onSubmit)();
                                }
                            },
                        })}
                    />
                </Field>
                <Button type="submit" block size="lg" loading={isLoading}>
                    Continue
                </Button>
                <div className="flex justify-between text-xs font-bold">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="text-brand-600 hover:underline"
                    >
                        {useRecovery
                            ? 'Use authentication code'
                            : 'Use a recovery code'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            dispatch(challengeCleared());
                            navigate('/login', { replace: true });
                        }}
                        className="text-slate-500 hover:underline"
                    >
                        Back to log in
                    </button>
                </div>
            </form>
        </AuthCard>
    );
}
