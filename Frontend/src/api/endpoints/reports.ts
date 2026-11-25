import { baseApi, type ApiMeta } from '../baseApi';
import type { PageMeta } from '../admin-project-types';
import type {
    ReportDetail,
    ReportsQuery,
    ReportsResponse,
} from '../report-types';

export const reportsApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getReports: build.query<ReportsResponse, ReportsQuery>({
            query: (params) => ({ url: '/manage/reports', params }),
            transformResponse: (
                data: Omit<ReportsResponse, 'meta'>,
                meta: ApiMeta | undefined,
            ) => ({ ...data, meta: meta?.envelope as PageMeta }),
            providesTags: ['Report'],
        }),
        getReport: build.query<ReportDetail, number>({
            query: (id) => `/manage/reports/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Report', id }],
        }),
    }),
});

export const { useGetReportsQuery, useGetReportQuery } = reportsApi;
