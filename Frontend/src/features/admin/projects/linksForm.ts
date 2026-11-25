import { z } from 'zod';

export const MAX_LINKS = 20;

export const linksSchema = z.array(
    z.object({
        label: z.string().max(100),
        url: z
            .string()
            .refine(
                (value) =>
                    value.trim() === '' ||
                    /^https?:\/\/\S+$/i.test(value.trim()),
                'Enter a full link starting with http:// or https://',
            ),
    }),
);

export interface LinksFormValues {
    links: Array<{ label: string; url: string }>;
}

/** The links as the API wants them: trimmed, blank rows dropped, an empty label as null. */
export function linksPayload(links: LinksFormValues['links']) {
    return links
        .map((link) => ({
            url: link.url.trim(),
            label: link.label.trim() || null,
        }))
        .filter((link) => link.url !== '');
}
