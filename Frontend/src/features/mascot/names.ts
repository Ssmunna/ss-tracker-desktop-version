const TITLES = new Set(['md', 'mr', 'mrs', 'ms', 'dr', 'engr', 'eng', 'sk']);

/**
 * The name the mascot says: "Md. Sabbir Hossain" -> "Sabbir", "Rohan (Md Robiul Islam)" -> "Rohan".
 * Titles, initials and anything in brackets are skipped. The clip generator
 * (`scripts/voice/build-voice-clips.mjs`) uses the same rule, so keep the two in step.
 */
export function firstName(full = ''): string {
    const words = full
        .replace(/\(.*?\)/g, ' ')
        .split(/[\s.]+/)
        .filter(Boolean);
    const word = words.find(
        (item) => !TITLES.has(item.toLowerCase()) && item.length > 1,
    );

    return word ?? words[0] ?? '';
}
