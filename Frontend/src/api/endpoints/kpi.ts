import { baseApi } from '../baseApi';
import type {
    KpiBreakdown,
    KpiHistory,
    KpiSheet,
    KpiSheetQuery,
    KpiTimelineEvent,
} from '../kpi-types';

export const kpiApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getKpiSheet: build.query<KpiSheet, KpiSheetQuery>({
            query: (params) => ({ url: '/manage/kpi-sheet', params }),
            providesTags: ['Kpi'],
        }),
        getKpiBreakdown: build.query<
            KpiBreakdown,
            { developer_id: number; month: number; year: number }
        >({
            query: (params) => ({ url: '/manage/kpi-sheet/breakdown', params }),
            providesTags: ['Kpi'],
        }),
        getKpiHistory: build.query<
            KpiHistory,
            { year?: number; month?: number; developer_id?: string }
        >({
            query: (params) => ({ url: '/manage/phase-kpi-history', params }),
            providesTags: ['Kpi'],
        }),
        getPhaseTimeline: build.query<
            { phase_id: number; events: KpiTimelineEvent[] },
            number
        >({
            query: (id) => `/manage/phases/${id}/kpi-timeline`,
            providesTags: ['Kpi'],
        }),
        adjustKpi: build.mutation<
            { message: string },
            {
                snapshotId: number;
                adjustment_percentage: number;
                reason: string;
            }
        >({
            query: ({ snapshotId, ...body }) => ({
                url: `/manage/phase-kpi-snapshots/${snapshotId}/adjustments`,
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Kpi'],
        }),
    }),
});

export const {
    useGetKpiSheetQuery,
    useGetKpiBreakdownQuery,
    useGetKpiHistoryQuery,
    useGetPhaseTimelineQuery,
    useAdjustKpiMutation,
} = kpiApi;
