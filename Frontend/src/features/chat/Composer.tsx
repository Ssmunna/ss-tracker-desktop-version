import { Mic, Paperclip, Send, Smile, Trash2, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import type {
    ChatMessage,
    OutgoingAttachment,
    Participant,
} from '@/api/chat-types';
import {
    usePresignAttachmentMutation,
    useSendMessageMutation,
} from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { formatBytes } from './messageText';
import { useVoiceRecorder, voiceSupported } from './useVoiceRecorder';

/** The tallest the message box grows to, in pixels (about eight lines). */
const MAX_INPUT_HEIGHT = 200;
const MAX_FILES = 10;
const MAX_SIZE = 20 * 1024 * 1024;
const EMOJI = [
    '😀',
    '😂',
    '😊',
    '😍',
    '👍',
    '🙏',
    '🎉',
    '🔥',
    '❤️',
    '😮',
    '😢',
    '👀',
    '✅',
    '🚀',
    '💡',
    '👏',
];

/**
 * Message box: text, replies, @mentions, emoji and attachments. Files go straight to storage
 * through a presigned URL, then the message references them by key.
 */
/** Small preview of an image waiting to be sent. */
function FileThumb({ file }: { file: File }) {
    const url = useMemo(() => URL.createObjectURL(file), [file]);

    useEffect(() => () => URL.revokeObjectURL(url), [url]);

    return <img src={url} alt="" className="size-8 rounded object-cover" />;
}

export function Composer({
    conversationId,
    members,
    selfId,
    replyTo,
    onClearReply,
    onTyping,
    onSent,
}: {
    conversationId: number;
    members: Participant[];
    selfId: number;
    replyTo: ChatMessage | null;
    onClearReply: () => void;
    onTyping: () => void;
    onSent: (message: ChatMessage) => void;
}) {
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [mentions, setMentions] = useState<{ id: number; name: string }[]>(
        [],
    );
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const area = useRef<HTMLTextAreaElement>(null);

    // The box grows with what is typed, up to a limit; past it, it scrolls inside.
    useLayoutEffect(() => {
        const node = area.current;

        if (!node) {
            return;
        }

        node.style.height = 'auto';

        // scrollHeight leaves out the border, which a border-box height includes.
        const border = node.offsetHeight - node.clientHeight;

        node.style.height = `${Math.min(node.scrollHeight + border, MAX_INPUT_HEIGHT)}px`;
    }, [text]);
    const picker = useRef<HTMLInputElement>(null);
    const [presign] = usePresignAttachmentMutation();
    const [send] = useSendMessageMutation();

    const candidates =
        mentionQuery === null
            ? []
            : members
                  .filter(
                      (member) =>
                          member.user_id !== selfId &&
                          !member.left_at &&
                          member.user,
                  )
                  .filter((member) =>
                      member
                          .user!.name.toLowerCase()
                          .includes(mentionQuery.toLowerCase()),
                  )
                  .slice(0, 5);

    const onChange = (value: string) => {
        setText(value);
        onTyping();
        const match = /(?:^|\s)@([^\s@]*)$/.exec(
            value.slice(0, area.current?.selectionStart ?? value.length),
        );
        setMentionQuery(match ? match[1] : null);
    };

    const insertMention = (id: number, name: string) => {
        const cursor = area.current?.selectionStart ?? text.length;
        const before = text
            .slice(0, cursor)
            .replace(/@([^\s@]*)$/, `@${name} `);

        setText(before + text.slice(cursor));
        setMentions((current) =>
            current.some((item) => item.id === id)
                ? current
                : [...current, { id, name }],
        );
        setMentionQuery(null);
        area.current?.focus();
    };

    const addFiles = (list: FileList | File[]) => {
        const next = [...files];

        for (const file of Array.from(list)) {
            if (file.size > MAX_SIZE) {
                toast.error(`${file.name} is larger than 20 MB.`);
            } else if (next.length >= MAX_FILES) {
                toast.error('You can attach up to 10 files.');
                break;
            } else {
                next.push(file);
            }
        }

        setFiles(next);
    };

    /** Uploads `list`, then sends the message. `fromBox` clears what was typed in the box. */
    const deliver = async (body: string, list: File[], fromBox: boolean) => {
        if ((!body && list.length === 0) || busy) {
            return;
        }

        setBusy(true);

        try {
            const uploaded: OutgoingAttachment[] = [];

            for (const file of list) {
                const mime = file.type || 'application/octet-stream';
                const ticket = await presign({
                    conversationId,
                    original_name: file.name,
                    size: file.size,
                    mime_type: mime,
                }).unwrap();
                const response = await fetch(ticket.url, {
                    method: 'PUT',
                    headers: ticket.headers,
                    body: file,
                });

                if (!response.ok) {
                    throw new Error(`Could not upload ${file.name}.`);
                }

                uploaded.push({
                    key: ticket.key,
                    original_name: file.name,
                    mime_type: mime,
                    size: file.size,
                });
            }

            const result = await send({
                conversationId,
                body: body || null,
                reply_to_id: replyTo?.id ?? null,
                mentions: mentions
                    .filter((item) => body.includes(`@${item.name}`))
                    .map((item) => item.id),
                attachments: uploaded,
            }).unwrap();

            if (fromBox) {
                setText('');
                setFiles([]);
                setMentions([]);
            }

            onClearReply();
            onSent(result.message);
        } catch (error) {
            toast.error(
                error instanceof Error && !('status' in error)
                    ? error.message
                    : errorMessage(error),
            );
        } finally {
            setBusy(false);
        }
    };

    const submit = () => deliver(text.trim(), files, true);

    const voice = useVoiceRecorder();
    const startVoice = async () => {
        try {
            await voice.start();
        } catch {
            toast.error('Allow microphone access to record a voice message.');
        }
    };
    const sendVoice = async () => {
        const file = await voice.stop();

        if (file) {
            await deliver('', [file], false);
        }
    };
    const clock = (total: number) =>
        `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
    const canRecord = voiceSupported();
    const empty = text.trim() === '' && files.length === 0;

    return (
        <div className="relative border-t border-slate-100 bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {replyTo ? (
                <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border-l-4 border-brand bg-slate-50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                            Replying to {replyTo.sender.name}
                        </p>
                        <p className="line-clamp-1 text-slate-600">
                            {replyTo.body ?? 'Attachment'}
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancel reply"
                        className="size-8"
                        onClick={onClearReply}
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            ) : null}
            {files.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-2">
                    {files.map((file, index) => (
                        <li
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pr-1 pl-3 text-xs"
                        >
                            {file.type.startsWith('image/') ? (
                                <FileThumb file={file} />
                            ) : null}
                            <span className="max-w-40 truncate">
                                {file.name}
                            </span>
                            <span className="text-slate-500">
                                {formatBytes(file.size)}
                            </span>
                            <button
                                type="button"
                                aria-label={`Remove ${file.name}`}
                                className="flex size-6 items-center justify-center rounded-full hover:bg-slate-200"
                                onClick={() =>
                                    setFiles((current) =>
                                        current.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {candidates.length > 0 ? (
                <ul
                    role="listbox"
                    aria-label="Mention a member"
                    className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-lg"
                >
                    {candidates.map((member) => (
                        <li
                            key={member.user_id}
                            role="option"
                            aria-selected={false}
                        >
                            <button
                                type="button"
                                className="flex min-h-11 w-full items-center px-3 text-left text-sm hover:bg-slate-50"
                                onClick={() =>
                                    insertMention(
                                        member.user_id,
                                        member.user!.name,
                                    )
                                }
                            >
                                {member.user!.name}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
            {emojiOpen ? (
                <div
                    role="group"
                    aria-label="Emoji"
                    className="mb-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 p-2"
                >
                    {EMOJI.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            aria-label={`Insert ${emoji}`}
                            className="flex size-9 items-center justify-center rounded-lg text-lg hover:bg-slate-100"
                            onClick={() => {
                                setText((current) => current + emoji);
                                area.current?.focus();
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            ) : null}
            {voice.recording ? (
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancel recording"
                        onClick={voice.cancel}
                    >
                        <Trash2 className="size-5 text-red-600" />
                    </Button>
                    <div className="flex min-h-11 flex-1 items-center gap-3 rounded-2xl bg-red-50 px-4 text-sm font-semibold text-red-700">
                        <span className="size-2.5 animate-pulse rounded-full bg-red-600" />
                        Recording {clock(voice.seconds)}
                    </div>
                    <Button
                        size="icon"
                        aria-label="Send voice message"
                        loading={busy}
                        onClick={() => void sendVoice()}
                    >
                        <Send className="size-5" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-end gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Attach files"
                        onClick={() => picker.current?.click()}
                    >
                        <Paperclip className="size-5" />
                    </Button>
                    <input
                        ref={picker}
                        type="file"
                        multiple
                        hidden
                        onChange={(event) => {
                            if (event.target.files) {
                                addFiles(event.target.files);
                            }

                            event.target.value = '';
                        }}
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Emoji"
                        aria-pressed={emojiOpen}
                        onClick={() => setEmojiOpen((open) => !open)}
                    >
                        <Smile className="size-5" />
                    </Button>
                    <textarea
                        ref={area}
                        value={text}
                        rows={1}
                        maxLength={10000}
                        aria-label="Message"
                        placeholder="Message"
                        onChange={(event) => onChange(event.target.value)}
                        onPaste={(event) => {
                            const pasted = Array.from(
                                event.clipboardData.files,
                            );

                            if (pasted.length > 0) {
                                event.preventDefault();
                                addFiles(pasted);
                            }
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key === 'Enter' &&
                                !event.shiftKey &&
                                !event.nativeEvent.isComposing
                            ) {
                                event.preventDefault();
                                void submit();
                            }
                        }}
                        className={cn(
                            'min-h-11 flex-1 resize-none overflow-y-auto rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none sm:text-sm',
                        )}
                    />
                    {empty && canRecord ? (
                        <Button
                            size="icon"
                            aria-label="Record a voice message"
                            title="Record a voice message"
                            onClick={() => void startVoice()}
                        >
                            <Mic className="size-5" />
                        </Button>
                    ) : (
                        <Button
                            size="icon"
                            aria-label="Send"
                            loading={busy}
                            onClick={() => void submit()}
                        >
                            <Send className="size-5" />
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
