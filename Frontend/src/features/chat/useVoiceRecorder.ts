import { useCallback, useEffect, useRef, useState } from 'react';

/** Longest voice message, in seconds. A 20 MB upload is far above what this produces. */
export const MAX_VOICE_SECONDS = 300;

const MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
];

const extensionFor = (mime: string) =>
    mime.includes('ogg') ? 'ogg' : mime.includes('mp4') ? 'm4a' : 'webm';

export const voiceSupported = () =>
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

/**
 * Records the microphone. `stop()` resolves with the recording as a File (or null when it
 * was cancelled), ready to go through the same upload as any other attachment.
 */
export function useVoiceRecorder() {
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const recorder = useRef<MediaRecorder | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const chunks = useRef<Blob[]>([]);
    const timer = useRef<number | null>(null);
    const finish = useRef<((file: File | null) => void) | null>(null);
    const discard = useRef(false);

    const release = useCallback(() => {
        if (timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
        }

        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
        setRecording(false);
        setSeconds(0);
    }, []);

    useEffect(() => release, [release]);

    const start = useCallback(async () => {
        const media = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });
        const mime = MIME_CANDIDATES.find((item) =>
            MediaRecorder.isTypeSupported(item),
        );
        const instance = new MediaRecorder(
            media,
            mime ? { mimeType: mime } : undefined,
        );

        stream.current = media;
        recorder.current = instance;
        chunks.current = [];
        discard.current = false;

        instance.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.current.push(event.data);
            }
        };
        instance.onstop = () => {
            const type = (instance.mimeType || mime || 'audio/webm').split(
                ';',
            )[0];
            const file =
                discard.current || chunks.current.length === 0
                    ? null
                    : new File(
                          chunks.current,
                          `voice-${new Date()
                              .toISOString()
                              .replace(/[-:T]/g, '')
                              .slice(0, 14)}.${extensionFor(type)}`,
                          { type },
                      );

            release();
            finish.current?.(file);
            finish.current = null;
        };

        instance.start();
        setRecording(true);
        setSeconds(0);
        timer.current = window.setInterval(() => {
            setSeconds((current) => {
                if (current + 1 >= MAX_VOICE_SECONDS) {
                    recorder.current?.stop();
                }

                return current + 1;
            });
        }, 1000);
    }, [release]);

    const stop = useCallback(
        () =>
            new Promise<File | null>((resolve) => {
                if (
                    !recorder.current ||
                    recorder.current.state === 'inactive'
                ) {
                    resolve(null);

                    return;
                }

                finish.current = resolve;
                recorder.current.stop();
            }),
        [],
    );

    const cancel = useCallback(() => {
        discard.current = true;

        if (recorder.current && recorder.current.state !== 'inactive') {
            recorder.current.stop();
        } else {
            release();
        }
    }, [release]);

    return { recording, seconds, start, stop, cancel };
}
