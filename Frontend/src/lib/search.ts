/** Every word typed must appear in the fields, in any order, ignoring case. */
export function matches(
    query: string,
    ...fields: (string | null | undefined)[]
): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const text = fields.join(' ').toLowerCase();

    return words.every((word) => text.includes(word));
}
