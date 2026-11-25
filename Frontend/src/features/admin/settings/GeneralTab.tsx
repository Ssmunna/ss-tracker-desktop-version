import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useSaveBrandingMutation,
    useSavePhaseLabelMutation,
} from '@/api/endpoints/settings';
import type { AppSettings } from '@/api/settings-types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/usePermissions';
import { assetUrl } from '@/lib/assetUrl';

import { Section } from './Section';

const MAX_LOGO = 2 * 1024 * 1024;
const MAX_FAVICON = 512 * 1024;

export function GeneralTab({ settings }: { settings: AppSettings }) {
    return (
        <div className="grid gap-5 xl:grid-cols-2">
            <Branding settings={settings} />
            <PhaseLabel settings={settings} />
        </div>
    );
}

function Branding({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const allowed = can('settings.branding.update');
    const [save, { isLoading }] = useSaveBrandingMutation();
    const [name, setName] = useState(settings.website_name);
    const [logo, setLogo] = useState<File | null>(null);
    const [favicon, setFavicon] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <Section
            title="Branding"
            description="The site name, logo and icon shown across the app."
        >
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await save({
                            website_name: name,
                            logo,
                            favicon,
                        }).unwrap();
                        toast.success(result.message);
                        setLogo(null);
                        setFavicon(null);
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
                <Field label="Site name" required error={errors.website_name}>
                    <Input
                        disabled={!allowed}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field
                    label="Logo"
                    hint="JPG, PNG, WebP or SVG, up to 2 MB."
                    error={errors.website_logo}
                >
                    <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.svg"
                        disabled={!allowed}
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file && file.size > MAX_LOGO) {
                                toast.error(
                                    'The logo must be 2 MB or smaller.',
                                );
                                event.target.value = '';

                                return;
                            }

                            setLogo(file);
                        }}
                    />
                </Field>
                {settings.logo_url ? (
                    <img
                        src={assetUrl(settings.logo_url) ?? undefined}
                        alt="Current logo"
                        className="size-12 rounded-xl border border-slate-200 object-contain"
                    />
                ) : null}
                <Field
                    label="Favicon"
                    hint="ICO, PNG or SVG, up to 512 KB."
                    error={errors.website_favicon}
                >
                    <Input
                        type="file"
                        accept=".ico,.png,.svg"
                        disabled={!allowed}
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            if (file && file.size > MAX_FAVICON) {
                                toast.error(
                                    'The favicon must be 512 KB or smaller.',
                                );
                                event.target.value = '';

                                return;
                            }

                            setFavicon(file);
                        }}
                    />
                </Field>
                {settings.favicon_url ? (
                    <img
                        src={assetUrl(settings.favicon_url) ?? undefined}
                        alt="Current favicon"
                        className="size-8 rounded-lg border border-slate-200 object-contain"
                    />
                ) : null}
                {allowed ? (
                    <Button type="submit" loading={isLoading}>
                        Save branding
                    </Button>
                ) : null}
            </form>
        </Section>
    );
}

function PhaseLabel({ settings }: { settings: AppSettings }) {
    const { can } = usePermissions();
    const allowed = can('settings.phase-label.update');
    const [save, { isLoading }] = useSavePhaseLabelMutation();
    const [singular, setSingular] = useState(settings.phase_label_singular);
    const [plural, setPlural] = useState(settings.phase_label_plural);
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <Section
            title="Phase label"
            description="What a project phase is called in this workspace, for example Sprint or Stage."
        >
            <form
                className="space-y-4"
                onSubmit={async (event) => {
                    event.preventDefault();

                    try {
                        const result = await save({
                            phase_label_singular: singular,
                            phase_label_plural: plural,
                        }).unwrap();
                        toast.success(result.message);
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
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Singular"
                        required
                        error={errors.phase_label_singular}
                    >
                        <Input
                            disabled={!allowed}
                            value={singular}
                            onChange={(event) =>
                                setSingular(event.target.value)
                            }
                        />
                    </Field>
                    <Field
                        label="Plural"
                        required
                        error={errors.phase_label_plural}
                    >
                        <Input
                            disabled={!allowed}
                            value={plural}
                            onChange={(event) => setPlural(event.target.value)}
                        />
                    </Field>
                </div>
                {allowed ? (
                    <Button type="submit" loading={isLoading}>
                        Save label
                    </Button>
                ) : null}
            </form>
        </Section>
    );
}
