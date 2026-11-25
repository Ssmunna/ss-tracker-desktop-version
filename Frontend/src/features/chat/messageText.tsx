import type { ReactNode } from 'react';

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

/**
 * Message text as React nodes. Everything is rendered as text (React escapes it); only
 * http(s) links become anchors and @mentions of known members are highlighted. No HTML is
 * ever injected, so a message cannot run script.
 */
export function messageText(
    body: string,
    mentionNames: string[],
    own: boolean,
): ReactNode[] {
    return body.split(URL_PATTERN).flatMap<ReactNode>((part, index) => {
        if (index % 2 === 1) {
            const clean = part.replace(/[.,;:!?)]+$/, '');
            const tail = part.slice(clean.length);

            return [
                <a
                    key={`l${index}`}
                    href={clean}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold [overflow-wrap:anywhere] underline underline-offset-2"
                >
                    {clean}
                </a>,
                tail,
            ];
        }

        return withMentions(part, mentionNames, own, index);
    });
}

function withMentions(
    text: string,
    names: string[],
    own: boolean,
    key: number,
): ReactNode[] {
    if (names.length === 0 || !text.includes('@')) {
        return [text];
    }

    const escaped = names
        .sort((a, b) => b.length - a.length)
        .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const pattern = new RegExp(`(@(?:${escaped.join('|')}))`, 'g');

    return text.split(pattern).map((chunk, index) =>
        index % 2 === 1 ? (
            <span
                key={`m${key}-${index}`}
                className={
                    own
                        ? 'font-bold underline'
                        : 'text-brand-700 rounded bg-brand-100 px-1 font-bold'
                }
            >
                {chunk}
            </span>
        ) : (
            chunk
        ),
    );
}

export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

/** A recorded voice message is an audio attachment. */
export const isVoice = (attachment: { mime_type: string | null }) =>
    (attachment.mime_type ?? '').startsWith('audio/');

export function formatBytes(size: number): string {
    if (size < 1024) {
        return `${size} B`;
    }

    return size < 1024 * 1024
        ? `${(size / 1024).toFixed(0)} KB`
        : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function conversationTitle(item: {
    type: string;
    name: string | null;
    other_participant_name?: string | null;
    project_code?: string | null;
}): string {
    if (item.type === 'saved') {
        return 'Saved Messages';
    }

    if (item.type === 'direct') {
        return item.other_participant_name ?? 'Direct chat';
    }

    const name = item.name ?? 'Conversation';

    return item.project_code ? `${name} (${item.project_code})` : name;
}
