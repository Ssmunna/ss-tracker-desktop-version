import {
    Copy,
    KeyRound,
    LogOut,
    MonitorSmartphone,
    Send,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useConfirmTwoFactorMutation,
    useDisableTwoFactorMutation,
    useEnableTwoFactorMutation,
    useGetRecoveryCodesMutation,
    useGetTokensQuery,
    useGetTwoFactorQuery,
    useRegenerateRecoveryCodesMutation,
    useRevokeTokenMutation,
    useTelegramLinkMutation,
} from '@/api/endpoints/account';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { selectMe } from '@/features/auth/authSlice';
import { passwordConfirmationRequested } from '@/features/ui/uiSlice';
import { useRun } from '@/hooks/useRun';
import { formatDateTime } from '@/lib/date';

export function SecurityPage() {
    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Security
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Two-factor sign-in, your devices and Telegram.
                </p>
            </div>
            <TwoFactor />
            <Devices />
            <Telegram />
        </div>
    );
}

const isLocked = (error: unknown) =>
    (error as { status?: number } | undefined)?.status === 423;

function TwoFactor() {
    const dispatch = useAppDispatch();
    const { data, isLoading, error } = useGetTwoFactorQuery();
    const [enable, { isLoading: enabling }] = useEnableTwoFactorMutation();
    const [confirm, { isLoading: confirming }] = useConfirmTwoFactorMutation();
    const [disable, { isLoading: disabling }] = useDisableTwoFactorMutation();
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState<string | undefined>();
    const [disabling2, setDisabling2] = useState(false);

    return (
        <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                        <ShieldCheck className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Two-factor authentication
                        </h2>
                        <p className="text-sm text-slate-500">
                            A code from an authenticator app when you sign in.
                        </p>
                    </div>
                </div>
                {data ? (
                    <Badge tone={data.enabled ? 'success' : 'neutral'}>
                        {data.enabled ? 'On' : 'Off'}
                    </Badge>
                ) : null}
            </div>

            {isLocked(error) ? (
                <div className="space-y-3 rounded-xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-700">
                        Confirm your password to manage two-factor sign-in.
                    </p>
                    <Button
                        onClick={() =>
                            dispatch(passwordConfirmationRequested())
                        }
                    >
                        <KeyRound className="size-4" /> Confirm password
                    </Button>
                </div>
            ) : isLoading ? (
                <Skeleton className="h-24 w-full" />
            ) : !data ? (
                <p className="text-sm text-slate-600">
                    Could not load the two-factor status. Try again later.
                </p>
            ) : data.pending_confirmation && data.setup ? (
                <form
                    className="space-y-4"
                    onSubmit={async (event) => {
                        event.preventDefault();

                        try {
                            await confirm({ code: code.trim() }).unwrap();
                            toast.success('Two-factor authentication is on.');
                            setCode('');
                            setCodeError(undefined);
                        } catch (e) {
                            setCodeError(
                                fieldErrors(e).code ?? errorMessage(e),
                            );
                        }
                    }}
                >
                    <p className="text-sm text-slate-700">
                        Scan this code with your authenticator app, then enter
                        the 6-digit code it shows.
                    </p>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                        {/* An SVG in an image cannot run script, so the server's QR is shown safely. */}
                        <img
                            alt="QR code for your authenticator app"
                            className="size-44 rounded-xl border border-slate-200 bg-white p-2"
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(data.setup.qr_svg)}`}
                        />
                        <div className="min-w-0 space-y-1">
                            <p className="text-xs text-slate-500">
                                Cannot scan? Enter this key by hand:
                            </p>
                            <code className="block rounded-lg bg-slate-100 px-3 py-2 text-xs break-all text-slate-900">
                                {data.setup.secret}
                            </code>
                        </div>
                    </div>
                    <Field label="Code" required error={codeError}>
                        <Input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(event) =>
                                setCode(event.target.value.replace(/\D/g, ''))
                            }
                        />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="submit"
                            loading={confirming}
                            disabled={code.length !== 6}
                        >
                            Confirm and turn on
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDisabling2(true)}
                        >
                            Cancel setup
                        </Button>
                    </div>
                </form>
            ) : data.enabled ? (
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        On since {formatDateTime(data.confirmed_at)}.
                    </p>
                    <RecoveryCodes />
                    <Button
                        variant="destructiveSoft"
                        onClick={() => setDisabling2(true)}
                    >
                        Turn off
                    </Button>
                </div>
            ) : (
                <Button
                    loading={enabling}
                    onClick={() =>
                        void enable()
                            .unwrap()
                            .catch((e) => toast.error(errorMessage(e)))
                    }
                >
                    Turn on two-factor
                </Button>
            )}

            <ConfirmDialog
                open={disabling2}
                onOpenChange={setDisabling2}
                destructive
                title={data?.enabled ? 'Turn off two-factor?' : 'Cancel setup?'}
                description={
                    data?.enabled
                        ? 'Your account will be protected by the password only.'
                        : 'The setup key is discarded.'
                }
                confirmLabel={data?.enabled ? 'Turn off' : 'Cancel setup'}
                loading={disabling}
                onConfirm={async () => {
                    try {
                        await disable().unwrap();
                        setDisabling2(false);
                    } catch (e) {
                        toast.error(errorMessage(e));
                    }
                }}
            />
        </Card>
    );
}

function RecoveryCodes() {
    const [load, { data, isLoading }] = useGetRecoveryCodesMutation();
    const [regenerate, regenerating] = useRegenerateRecoveryCodesMutation();
    const [codes, setCodes] = useState<string[] | null>(null);
    const shown = codes ?? data?.recovery_codes ?? null;

    return (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <div>
                <p className="text-sm font-bold text-slate-900">
                    Recovery codes
                </p>
                <p className="text-xs text-slate-500">
                    Each code works once if you lose your phone. Keep them
                    somewhere safe.
                </p>
            </div>
            {shown ? (
                <>
                    <ul className="grid grid-cols-2 gap-2 font-mono text-sm text-slate-900">
                        {shown.map((item) => (
                            <li
                                key={item}
                                className="rounded-lg bg-white px-3 py-2"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(
                                    shown.join('\n'),
                                );
                                toast.success('Codes copied.');
                            } catch {
                                toast.error(
                                    'Could not copy. Select the codes and copy them by hand.',
                                );
                            }
                        }}
                    >
                        <Copy className="size-4" /> Copy
                    </Button>
                </>
            ) : null}
            <div className="flex flex-wrap gap-2">
                {!shown ? (
                    <Button
                        size="sm"
                        variant="outline"
                        loading={isLoading}
                        onClick={() =>
                            void load()
                                .unwrap()
                                .catch((e) => toast.error(errorMessage(e)))
                        }
                    >
                        Show recovery codes
                    </Button>
                ) : null}
                <Button
                    size="sm"
                    variant="outline"
                    loading={regenerating.isLoading}
                    onClick={async () => {
                        try {
                            const result = await regenerate().unwrap();
                            setCodes(result.recovery_codes);
                            toast.success(
                                'New recovery codes created. The old ones no longer work.',
                            );
                        } catch (e) {
                            toast.error(errorMessage(e));
                        }
                    }}
                >
                    Create new codes
                </Button>
            </div>
        </div>
    );
}

function Devices() {
    const run = useRun();
    const { data, isLoading, isError } = useGetTokensQuery();
    const [revoke] = useRevokeTokenMutation();
    const [target, setTarget] = useState<{ id: number; name: string } | null>(
        null,
    );

    return (
        <Card className="space-y-3">
            <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                    <MonitorSmartphone className="size-5" />
                </span>
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Signed-in devices
                    </h2>
                    <p className="text-sm text-slate-500">
                        Sign out a device you no longer use.
                    </p>
                </div>
            </div>
            {isLoading ? (
                <Skeleton className="h-20 w-full" />
            ) : isError || !data ? (
                <p className="text-sm text-slate-600">
                    Could not load your devices.
                </p>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {data.map((device) => (
                        <li
                            key={device.id}
                            className="flex min-h-14 items-center justify-between gap-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                    {device.name}
                                    {device.is_current ? (
                                        <Badge tone="success" className="ml-2">
                                            This device
                                        </Badge>
                                    ) : null}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Last used{' '}
                                    {device.last_used_at
                                        ? formatDateTime(device.last_used_at)
                                        : 'never'}{' '}
                                    · signed in{' '}
                                    {formatDateTime(device.created_at)}
                                </p>
                            </div>
                            {!device.is_current ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        setTarget({
                                            id: device.id,
                                            name: device.name,
                                        })
                                    }
                                >
                                    <LogOut className="size-4" /> Sign out
                                </Button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
            <ConfirmDialog
                open={target !== null}
                onOpenChange={(open) => !open && setTarget(null)}
                destructive
                title="Sign out this device?"
                description={
                    target ? `"${target.name}" will need to sign in again.` : ''
                }
                confirmLabel="Sign out"
                onConfirm={async () => {
                    if (target && (await run(revoke(target.id)))) {
                        setTarget(null);
                    }
                }}
            />
        </Card>
    );
}

function Telegram() {
    const me = useAppSelector(selectMe)!;
    const [link, { isLoading }] = useTelegramLinkMutation();
    const info = me.telegram;

    if (!info.configured || !info.has_employee) {
        return null;
    }

    return (
        <Card className="space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                        <Send className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Telegram
                        </h2>
                        <p className="text-sm text-slate-500">
                            Get reminders and send your daily report from
                            Telegram.
                        </p>
                    </div>
                </div>
                <Badge tone={info.connected ? 'success' : 'neutral'}>
                    {info.connected ? 'Connected' : 'Not connected'}
                </Badge>
            </div>
            <Button
                variant={info.connected ? 'outline' : 'primary'}
                loading={isLoading}
                onClick={async () => {
                    try {
                        const result = await link().unwrap();
                        window.open(
                            result.link_url,
                            '_blank',
                            'noopener,noreferrer',
                        );
                    } catch (e) {
                        toast.error(errorMessage(e));
                    }
                }}
            >
                {info.connected ? 'Link again' : 'Connect Telegram'}
            </Button>
            <p className="text-xs text-slate-500">
                The link opens Telegram and works for 15 minutes.
            </p>
        </Card>
    );
}
