import type { MascotItem } from './mascotSlice';
import { firstName } from './names';

/**
 * Pre-rendered voice clips (`public/mascot/voice`, built by `npm run voice:build`).
 * The app only plays tiny mp3 files: no speech model runs in the browser or in Electron.
 *   message      -> "<Name> just sent you a message." (no clip for that name -> generic line)
 *   notification -> one line per kind, or "You have a new notification."
 * Lip-sync follows the clip's loudness through an AnalyserNode.
 */

interface Manifest {
    greet?: string[];
    msg?: Record<string, string[]>;
    msgGeneric?: string;
    notif?: Record<string, string>;
    text: Record<string, string>;
}

export interface Line {
    file: string | null;
    text: string;
}

const slug = (value = '') =>
    value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const pick = <T>(items: T[]): T =>
    items[Math.floor(Math.random() * items.length)];

class MascotVoice {
    enabled = true;
    private base = '';
    private manifest: Manifest | null = null;
    private ctx: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private samples = new Float32Array(512);
    private current: AudioBufferSourceNode | null = null;
    private clips = new Map<string, Promise<ArrayBuffer | null>>();
    private decoded = new Map<string, AudioBuffer>();
    // Redux items are frozen, so the chosen variant is remembered here.
    private lines = new Map<string, Line>();
    private ready: Promise<void> | null = null;

    /** Loads the manifest (~2 KB); the clips (~10 KB each) load on demand. */
    init(base: string) {
        this.base = base.endsWith('/') ? base : `${base}/`;
        if (!this.ready) {
            // Browsers only allow sound after a gesture.
            for (const name of ['pointerdown', 'keydown']) {
                window.addEventListener(name, () => this.unlock(), {
                    capture: true,
                });
            }
        }

        this.ready ??= fetch(`${this.base}manifest.json`)
            .then((response) => response.json() as Promise<Manifest>)
            .then((manifest) => {
                this.manifest = manifest;
            })
            .catch(() => {
                // No clips: the bubble still shows the text.
            });
        return this.ready;
    }

    private unlock() {
        if (typeof AudioContext === 'undefined') {
            return;
        }

        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.connect(this.ctx.destination);
        }

        if (this.ctx.state === 'suspended') {
            void this.ctx.resume();
        }
    }

    /** Which clip and bubble text an item gets. Stable per item. */
    line(item: MascotItem): Line {
        const known = this.lines.get(item.id);

        if (known) {
            return known;
        }

        const manifest = this.manifest;
        let line: Line;

        if (item.type === 'message') {
            const variants = manifest?.msg?.[slug(firstName(item.name))];
            const file = variants
                ? pick(variants)
                : (manifest?.msgGeneric ?? null);

            line = {
                file,
                // The bubble keeps the name even when only the generic clip exists.
                text:
                    variants && file
                        ? (manifest?.text[file] ?? '')
                        : `${item.name || 'Someone'} sent you a message.`,
            };
        } else {
            const file =
                manifest?.notif?.[item.kind] ??
                manifest?.notif?.default ??
                null;

            line = {
                file,
                text:
                    (file && manifest?.text[file]) ||
                    'You have a new notification.',
            };
        }

        this.lines.set(item.id, line);

        if (this.lines.size > 50) {
            this.lines.delete(this.lines.keys().next().value as string);
        }

        return line;
    }

    greeting(): Line {
        const greetings = this.manifest?.greet;

        if (!greetings?.length) {
            return { file: null, text: 'Hi!' };
        }

        const file = pick(greetings);

        return { file, text: this.manifest?.text[file] ?? 'Hi!' };
    }

    /** Fetch the clip as soon as the item is queued, while the house opens. */
    prefetch(item: MascotItem) {
        void this.fetchClip(this.line(item).file);
        void this.fetchClip(this.manifest?.greet?.[0] ?? null);
    }

    private fetchClip(file: string | null) {
        if (!file) {
            return Promise.resolve(null);
        }

        let clip = this.clips.get(file);

        if (!clip) {
            clip = fetch(this.base + file)
                .then((response) =>
                    response.ok ? response.arrayBuffer() : null,
                )
                .catch(() => null);
            this.clips.set(file, clip);
        }

        return clip;
    }

    private async decode(file: string): Promise<AudioBuffer | null> {
        const cached = this.decoded.get(file);

        if (cached) {
            return cached;
        }

        const bytes = await this.fetchClip(file);

        if (!bytes || !this.ctx) {
            return null;
        }

        try {
            // decodeAudioData detaches its input, so give it a copy.
            const buffer = await this.ctx.decodeAudioData(bytes.slice(0));

            this.decoded.set(file, buffer);

            return buffer;
        } catch {
            return null;
        }
    }

    /** Plays a clip; resolves when it ends (at once if muted or not allowed to play yet). */
    async play(file: string | null) {
        if (!this.enabled || !file) {
            return;
        }

        this.unlock();

        const buffer = await this.decode(file);

        if (
            !buffer ||
            !this.ctx ||
            !this.analyser ||
            this.ctx.state !== 'running'
        ) {
            return;
        }

        this.stop();

        const source = this.ctx.createBufferSource();

        source.buffer = buffer;
        source.connect(this.analyser);
        source.start();
        this.current = source;

        return new Promise<void>((resolve) => {
            source.onended = () => {
                if (this.current === source) {
                    this.current = null;
                }

                resolve();
            };
        });
    }

    get speaking() {
        return this.current !== null;
    }

    /** 0..1 loudness of what is playing, for the mouth. */
    level() {
        if (!this.current || !this.analyser) {
            return 0;
        }

        this.analyser.getFloatTimeDomainData(this.samples);

        let sum = 0;

        for (const sample of this.samples) {
            sum += sample * sample;
        }

        return Math.min(1, Math.sqrt(sum / this.samples.length) * 7);
    }

    stop() {
        try {
            this.current?.stop();
        } catch {
            // already ended
        }

        this.current = null;
    }
}

export const voice = new MascotVoice();
