import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useUpdatePasswordMutation,
    useUpdateProfileMutation,
} from '@/api/endpoints/account';
import { useAppSelector } from '@/app/hooks';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { selectMe } from '@/features/auth/authSlice';
import { assetUrl } from '@/lib/assetUrl';

const MAX_AVATAR = 2 * 1024 * 1024;

export function ProfilePage() {
    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Profile
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Your name, email, photo and password.
                </p>
            </div>
            <ProfileForm />
            <PasswordForm />
        </div>
    );
}

function ProfileForm() {
    const me = useAppSelector(selectMe)!;
    const [save, { isLoading }] = useUpdateProfileMutation();
    const [name, setName] = useState(me.user.name);
    const [email, setEmail] = useState(me.user.email);
    const [avatar, setAvatar] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const picker = useRef<HTMLInputElement>(null);
    const shown = preview ?? assetUrl(me.user.avatar_url) ?? me.user.avatar;

    return (
        <Card>
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        await save({ name, email, avatar }).unwrap();
                        toast.success('Profile updated.');
                        setAvatar(null);
                        setErrors({});
                    } catch (error) {
                        const fields = fieldErrors(error);
                        setErrors(fields);

                        if (Object.keys(fields).length === 0) {
                            toast.error(errorMessage(error));
                        }
                    }
                }}
            >
                <div className="flex items-center gap-4">
                    <Avatar name={me.user.name} src={shown} size="lg" />
                    <div className="space-y-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => picker.current?.click()}
                        >
                            <Camera className="size-4" /> Change photo
                        </Button>
                        <p className="text-xs text-slate-500">
                            JPG, PNG or WebP, up to 2 MB.
                        </p>
                        {errors.avatar ? (
                            <p className="text-xs text-red-600">
                                {errors.avatar}
                            </p>
                        ) : null}
                    </div>
                    <input
                        ref={picker}
                        type="file"
                        hidden
                        accept=".jpg,.jpeg,.png,.webp"
                        aria-label="Photo"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            event.target.value = '';

                            if (file && file.size > MAX_AVATAR) {
                                toast.error(
                                    'The photo must be 2 MB or smaller.',
                                );

                                return;
                            }

                            setAvatar(file);
                            setPreview((current) => {
                                if (current) {
                                    URL.revokeObjectURL(current);
                                }

                                return file ? URL.createObjectURL(file) : null;
                            });
                        }}
                    />
                </div>
                <Field label="Name" required error={errors.name}>
                    <Input
                        value={name}
                        autoComplete="name"
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field label="Email" required error={errors.email}>
                    <Input
                        type="email"
                        value={email}
                        autoComplete="email"
                        onChange={(event) => setEmail(event.target.value)}
                    />
                </Field>
                <Button type="submit" loading={isLoading}>
                    Save profile
                </Button>
            </form>
        </Card>
    );
}

function PasswordForm() {
    const me = useAppSelector(selectMe)!;
    const policy = me.password_policy;
    const [save, { isLoading }] = useUpdatePasswordMutation();
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const rules = [
        `at least ${policy.min_length} characters`,
        policy.mixed_case ? 'upper and lower case letters' : null,
        policy.numbers ? 'a number' : null,
        policy.symbols ? 'a symbol' : null,
    ].filter(Boolean);

    return (
        <Card>
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();
                    const local: Record<string, string> = {};

                    if (password !== confirmation) {
                        local.password_confirmation =
                            'The passwords do not match.';
                    }

                    setErrors(local);

                    if (Object.keys(local).length > 0) {
                        return;
                    }

                    try {
                        await save({
                            current_password: current,
                            password,
                            password_confirmation: confirmation,
                        }).unwrap();
                        toast.success(
                            'Password updated. Your other devices were signed out.',
                        );
                        setCurrent('');
                        setPassword('');
                        setConfirmation('');
                    } catch (error) {
                        const fields = fieldErrors(error);
                        setErrors(fields);

                        if (Object.keys(fields).length === 0) {
                            toast.error(errorMessage(error));
                        }
                    }
                }}
            >
                <div>
                    <h2 className="text-base font-bold text-slate-900">
                        Change password
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Other devices are signed out. Use {rules.join(', ')}.
                    </p>
                </div>
                <Field
                    label="Current password"
                    required
                    error={errors.current_password}
                >
                    <PasswordInput
                        autoComplete="current-password"
                        value={current}
                        onChange={(event) => setCurrent(event.target.value)}
                    />
                </Field>
                <Field label="New password" required error={errors.password}>
                    <PasswordInput
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />
                </Field>
                <Field
                    label="Confirm new password"
                    required
                    error={errors.password_confirmation}
                >
                    <PasswordInput
                        autoComplete="new-password"
                        value={confirmation}
                        onChange={(event) =>
                            setConfirmation(event.target.value)
                        }
                    />
                </Field>
                <Button type="submit" loading={isLoading}>
                    Update password
                </Button>
            </form>
        </Card>
    );
}
