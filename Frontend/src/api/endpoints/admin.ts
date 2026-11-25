import { baseApi } from '../baseApi';
import type { AdminDashboard, ChartData } from '../admin-types';

export const adminApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getAdminDashboard: build.query<AdminDashboard, void>({
            query: () => '/dashboard',
            providesTags: ['Project', 'Report'],
        }),
        getChartData: build.query<ChartData, { year: number; month: number }>({
            query: (params) => ({ url: '/manage/chart-data', params }),
        }),
    }),
});

export const { useGetAdminDashboardQuery, useGetChartDataQuery } = adminApi;
