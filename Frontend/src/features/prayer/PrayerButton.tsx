import { Check, MoonStar } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import { useGetPrayerOverviewQuery } from '@/api/endpoints/prayer';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalContent } from '@/components/ui/modal';
import { formatClock, formatCountdown, resolvePrayers } from '@/lib/prayer';
import { cn } from '@/lib/utils';

/** Re-ask the server now and then in case a prayer was edited. */
const POLL_MS = 5 * 60_000;
/** Never ask more often than this because the clock says the answer is stale. */
const MIN_REFETCH_MS = 10_000;

/** Topbar prayer icon: opens today's prayers with the next one highlighted. */
export function PrayerButton() {
    const [clicked, setClicked] = useState(false);
    const [params, setParams] = useSearchParams();
    const {
        data: answer,
        fulfilledTimeStamp,
        isFetching,
        refetch,
    } = useGetPrayerOverviewQuery(undefined, { pollingInterval: POLL_MS });
    // Server clock = the device clock shifted by how far apart they were when the answer arrived.
    // A malformed answer (no clock or list) is treated as no prayers rather than breaking the header.
    const data =
        answer &&
        Array.isArray(answer.prayers) &&
        !Number.isNaN(Date.parse(answer.now))
            ? answer
            : undefined;
    const offset =
        data && fulfilledTimeStamp
            ? Date.parse(data.now) - fulfilledTimeStamp
            : 0;
    const [now, setNow] = useState(() => Date.now());
    const lastRefetch = useRef(0);

    // A notification (mascot bubble, bell list, desktop pop-up) links here with ?prayer=1.
    const open = clicked || params.has('prayer');
    const setOpen = (value: boolean) => {
        setClicked(value);

        if (!value && params.has('prayer')) {
            setParams(
                (current) => {
                    current.delete('prayer');

                    return current;
                },
                { replace: true },
            );
        }
    };

    useEffect(() => {
        const timer = setInterval(
            () => setNow(Date.now()),
            open ? 1000 : 15_000,
        );

        return () => clearInterval(timer);
    }, [open]);

    const resolved = data ? resolvePrayers(data, now + offset) : null;
    const stale = resolved?.stale ?? false;

    useEffect(() => {
        if (
            stale &&
            !isFetching &&
            Date.now() - lastRefetch.current > MIN_REFETCH_MS
        ) {
            lastRefetch.current = Date.now();
            void refetch();
        }
    }, [stale, isFetching, refetch, now]);

    // Nothing to show until an admin sets prayer times (or while loading): no icon.
    if (!resolved || data?.prayers.length === 0) {
        return null;
    }

    const { next, prayers, secondsUntil, inAlertWindow } = resolved;
    const label = next
        ? `Prayer times, next ${next.name} in ${formatCountdown(secondsUntil)}`
        : 'Prayer times';

    return (
        <>
            <button
                type="button"
                aria-label={label}
                onClick={() => setOpen(true)}
                className="relative flex size-11 items-center justify-center rounded-xl text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-10"
            >
                <MoonStar className="size-5" />
                {inAlertWindow ? (
                    <span
                        data-testid="prayer-alert-dot"
                        className="absolute top-2 right-2 size-2.5 rounded-full bg-brand motion-safe:animate-pulse"
                    />
                ) : null}
            </button>
            <Modal open={open} onOpenChange={setOpen}>
                <ModalContent
                    title="Prayer times"
                    description={
                        next
                            ? `Next: ${next.name} in ${formatCountdown(secondsUntil)}`
                            : 'No more prayers scheduled'
                    }
                >
                    <ul className="space-y-2">
                        {prayers.map((prayer) => (
                            <PrayerRow
                                key={prayer.id}
                                name={prayer.name}
                                time={prayer.start_time}
                                state={prayer.state}
                                alertMinutes={prayer.alert_minutes_before}
                                countdown={
                                    prayer.state === 'next'
                                        ? formatCountdown(secondsUntil)
                                        : null
                                }
                            />
                        ))}
                        {next?.is_tomorrow ? (
                            <PrayerRow
                                name={next.name}
                                time={next.start_time}
                                state="next"
                                alertMinutes={next.alert_minutes_before}
                                countdown={formatCountdown(secondsUntil)}
                                tomorrow
                            />
                        ) : null}
                    </ul>
                </ModalContent>
            </Modal>
        </>
    );
}

function PrayerRow({
    name,
    time,
    state,
    alertMinutes,
    countdown,
    tomorrow = false,
}: {
    name: string;
    time: string;
    state: 'past' | 'next' | 'upcoming';
    alertMinutes: number;
    countdown: string | null;
    tomorrow?: boolean;
}) {
    const isNext = state === 'next';

    return (
        <li
            aria-current={isNext ? 'true' : undefined}
            className={cn(
                'flex items-center justify-between gap-3 rounded-xl border px-4 py-3',
                isNext
                    ? 'border-brand bg-brand-100'
                    : 'border-slate-200 bg-surface',
                state === 'past' && 'opacity-50',
            )}
        >
            <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    {name}
                    {isNext ? (
                        <Badge tone="brand">
                            {tomorrow ? 'Tomorrow' : 'Next'}
                        </Badge>
                    ) : null}
                </p>
                <p className="text-xs text-slate-500">
                    {alertMinutes > 0
                        ? `Alert ${alertMinutes} min before`
                        : 'No early alert'}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">
                    {formatClock(time)}
                </p>
                {countdown ? (
                    <p className="text-xs font-bold text-brand-600">
                        in {countdown}
                    </p>
                ) : null}
                {state === 'past' ? (
                    <Check
                        aria-label="Done"
                        className="ml-auto size-4 text-emerald-600"
                    />
                ) : null}
            </div>
        </li>
    );
}
