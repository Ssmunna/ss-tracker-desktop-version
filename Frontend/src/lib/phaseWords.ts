export interface PhaseWordsLabel {
    singular: string;
    plural: string;
}

/**
 * Puts the workspace's word for a phase into a sentence written with "phase", keeping the
 * case: "This phase is closed." becomes "This sprint is closed.".
 */
export function phaseWords(
    label: PhaseWordsLabel | undefined,
    text: string,
): string {
    const singular = label?.singular ?? 'Phase';
    const plural = label?.plural ?? 'Phases';

    return text.replace(/\b([Pp])hase(s?)\b/g, (_match, first, s) => {
        const word = s === 's' ? plural : singular;

        return first === 'P' ? word : word.toLowerCase();
    });
}
