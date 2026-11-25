import type { ChartOptions } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

import { themeColor } from '@/lib/theme';

import { baseOptions, seriesColors } from './chart-setup';

export interface Series {
    label: string;
    data: Array<number | null>;
}

function frame(height: string) {
    return { height } as const;
}

const grid = () => ({ color: themeColor('mono-200') });

export function BarChart({
    labels,
    series,
    height = '16rem',
}: {
    labels: string[];
    series: Series[];
    height?: string;
}) {
    const colors = seriesColors();
    const options: ChartOptions<'bar'> = {
        ...baseOptions,
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: grid() },
        },
        plugins: { legend: { display: series.length > 1 } },
    };

    return (
        <div style={frame(height)}>
            <Bar
                options={options}
                data={{
                    labels,
                    datasets: series.map((item, index) => ({
                        label: item.label,
                        data: item.data,
                        backgroundColor: colors[index % colors.length],
                        borderRadius: 8,
                        maxBarThickness: 36,
                    })),
                }}
            />
        </div>
    );
}

export function LineChart({
    labels,
    series,
    height = '16rem',
    dashedFirst = false,
}: {
    labels: string[];
    series: Series[];
    height?: string;
    /** Draw the first series dashed (e.g. expected vs actual progress). */
    dashedFirst?: boolean;
}) {
    const colors = seriesColors();
    const options: ChartOptions<'line'> = {
        ...baseOptions,
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: grid() },
        },
        plugins: { legend: { display: series.length > 1 } },
    };

    return (
        <div style={frame(height)}>
            <Line
                options={options}
                data={{
                    labels,
                    datasets: series.map((item, index) => ({
                        label: item.label,
                        data: item.data,
                        borderColor:
                            dashedFirst && index === 0
                                ? themeColor('mono-400')
                                : colors[index % colors.length],
                        backgroundColor: 'transparent',
                        borderDash: dashedFirst && index === 0 ? [6, 5] : [],
                        borderWidth: 2,
                        tension: 0.25,
                        pointRadius: 3,
                    })),
                }}
            />
        </div>
    );
}

export function DoughnutChart({
    labels,
    data,
    height = '14rem',
}: {
    labels: string[];
    data: number[];
    height?: string;
}) {
    const colors = seriesColors();
    const options: ChartOptions<'doughnut'> = {
        ...baseOptions,
        cutout: '68%',
        plugins: { legend: { position: 'bottom' } },
    };

    return (
        <div style={frame(height)}>
            <Doughnut
                options={options}
                data={{
                    labels,
                    datasets: [
                        {
                            data,
                            backgroundColor: labels.map(
                                (_, index) => colors[index % colors.length],
                            ),
                            borderWidth: 0,
                        },
                    ],
                }}
            />
        </div>
    );
}
