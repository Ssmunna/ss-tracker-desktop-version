import { Download, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getDesktop, type UpdateState } from '@/lib/desktop';

/**
 * The desktop app's update: progress while it downloads, then "Restart and update" (which installs and
 * starts the app again). On macOS, where the app cannot replace itself, it opens the download page.
 * "Hide" shrinks the card to a small button that stays until the update is installed, so it can't be
 * missed. Shows nothing in a browser or when there is no update.
 */
export function UpdateBanner() {
    const desktop = getDesktop();
    const [state, setState] = useState<UpdateState>({ status: 'idle' });
    const [installing, setInstalling] = useState(false);
    // "Hide" collapses the card to a small button for that version; a failure is shown again on its own.
    const [hidden, setHidden] = useState('');

    useEffect(() => {
        if (!desktop) {
            return;
        }

        void desktop.getUpdate().then(setState);

        return desktop.onUpdate((next) => {
            setState(next);

            if (next.status !== 'ready') {
                setInstalling(false);
            }
        });
    }, [desktop]);

    if (!desktop || state.status === 'idle') {
        return null;
    }

    if (
        (state.status === 'ready' || state.status === 'available') &&
        hidden === state.version
    ) {
        return (
            <Button
                loading={installing}
                className="fixed right-4 bottom-4 z-40 shadow-float"
                onClick={() => {
                    if (state.status === 'ready') {
                        setInstalling(true);
                    }

                    desktop.installUpdate();
                }}
            >
                {state.status === 'ready' ? (
                    <RefreshCw className="size-4" />
                ) : (
                    <Download className="size-4" />
                )}
                {state.status === 'ready'
                    ? 'Restart and update'
                    : 'Update available'}
            </Button>
        );
    }

    const later = (
        <Button
            variant="ghost"
            size="icon"
            aria-label="Hide"
            onClick={() => setHidden('version' in state ? state.version : '')}
        >
            <X className="size-4" />
        </Button>
    );

    return (
        <div
            role="status"
            className="fixed right-4 bottom-4 z-40 w-[min(22rem,calc(100vw-2rem))] space-y-2 rounded-2xl border border-white/60 bg-glass-nav p-4 shadow-float glass-blur"
        >
            {state.status === 'downloading' ? (
                <>
                    <p className="text-sm font-bold text-slate-900">
                        Downloading SS Manager {state.version}…
                    </p>
                    <div
                        role="progressbar"
                        aria-valuenow={state.percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="h-2 overflow-hidden rounded-full bg-slate-200"
                    >
                        <div
                            className="h-full rounded-full bg-linear-to-r from-ember-400 to-ember-600 transition-[width]"
                            style={{ width: `${state.percent}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500">{state.percent}%</p>
                </>
            ) : state.status === 'ready' ? (
                <>
                    <p className="text-sm font-bold text-slate-900">
                        SS Manager {state.version} is ready
                    </p>
                    <p className="text-xs text-slate-500">
                        {installing
                            ? 'Installing. If asked, enter your password to allow the update.'
                            : 'Restart to finish the update. Your chats keep working after the restart.'}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            loading={installing}
                            onClick={() => {
                                setInstalling(true);
                                desktop.installUpdate();
                            }}
                        >
                            <RefreshCw className="size-4" /> Restart and update
                        </Button>
                        {installing ? null : later}
                    </div>
                </>
            ) : state.status === 'available' ? (
                <>
                    <p className="text-sm font-bold text-slate-900">
                        SS Manager {state.version} is available
                    </p>
                    <p className="text-xs text-slate-500">
                        This system installs updates by hand. Download it from
                        the release page and open it.
                    </p>
                    <div className="flex items-center justify-between gap-2">
                        <Button onClick={() => desktop.installUpdate()}>
                            <Download className="size-4" /> Open download page
                        </Button>
                        {later}
                    </div>
                </>
            ) : (
                <>
                    <p className="text-sm font-bold text-red-700">
                        The update did not finish
                    </p>
                    <p className="text-xs text-slate-600">{state.message}</p>
                    <div className="flex items-center justify-between gap-2">
                        <Button
                            variant="outline"
                            onClick={() => desktop.installUpdate()}
                        >
                            <Loader2 className="size-4" /> Try again
                        </Button>
                        {later}
                    </div>
                </>
            )}
        </div>
    );
}
