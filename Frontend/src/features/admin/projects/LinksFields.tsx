import { Plus, Trash2 } from 'lucide-react';
import {
    useFieldArray,
    type Control,
    type FieldErrors,
    type UseFormRegister,
} from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { MAX_LINKS, type LinksFormValues } from './linksForm';

/** Rows to add, label and address, for Google Drive and other links. Used in the project form and the details page. */
export function LinksFields({
    control,
    register,
    errors,
}: {
    control: Control<LinksFormValues>;
    register: UseFormRegister<LinksFormValues>;
    errors: FieldErrors<LinksFormValues>;
}) {
    const links = useFieldArray({ control, name: 'links' });

    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-slate-800">Links</legend>
            <p className="text-xs text-slate-500">
                A Google Drive folder or any other link the team should reach.
                Everyone on the project can open them.
            </p>
            {links.fields.map((field, index) => (
                <div key={field.id} className="space-y-1">
                    <div className="flex items-start gap-2">
                        <Input
                            aria-label={`Link ${index + 1} label`}
                            placeholder="Label (optional)"
                            className="w-2/5"
                            {...register(`links.${index}.label`)}
                        />
                        <Input
                            aria-label={`Link ${index + 1} address`}
                            placeholder="https://drive.google.com/…"
                            inputMode="url"
                            autoComplete="off"
                            {...register(`links.${index}.url`)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove link ${index + 1}`}
                            onClick={() => links.remove(index)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                    {errors.links?.[index]?.url?.message ? (
                        <p
                            role="alert"
                            className="text-xs font-medium text-red-600"
                        >
                            {errors.links[index]?.url?.message}
                        </p>
                    ) : null}
                </div>
            ))}
            {links.fields.length < MAX_LINKS ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => links.append({ label: '', url: '' })}
                >
                    <Plus className="size-4" /> Add link
                </Button>
            ) : null}
        </fieldset>
    );
}
