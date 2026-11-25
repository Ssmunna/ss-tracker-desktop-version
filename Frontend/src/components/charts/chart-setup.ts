import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';

import { themeColor } from '@/lib/theme';

Chart.register(
    ArcElement,
    BarElement,
    CategoryScale,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
);

/** Brand-led series colours, resolved from theme tokens at render time. */
export function seriesColors(): string[] {
    return [
        themeColor('ember-500'),
        themeColor('ember-300'),
        themeColor('ember-700'),
        themeColor('brand-grad'),
        themeColor('mono-500'),
        themeColor('mono-300'),
    ];
}

export const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
} as const;
