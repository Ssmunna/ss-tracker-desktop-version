import { baseApi } from '../baseApi';
import type {
    AdminGeneralTask,
    GeneralEmployee,
    GeneralIndex,
    GeneralOverview,
    GeneralTaskInput,
} from '../general-types';

export const generalTasksApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getGeneralIndex: build.query<
            GeneralIndex,
            { month?: string; developer_id?: string; status?: string }
        >({
            query: (params) => ({ url: '/manage/general-tasks', params }),
            providesTags: ['GeneralTask'],
        }),
        getGeneralOverview: build.query<
            GeneralOverview,
            { month?: string; search?: string }
        >({
            query: (params) => ({
                url: '/manage/general-tasks/overview',
                params,
            }),
            providesTags: ['GeneralTask'],
        }),
        getGeneralEmployee: build.query<
            GeneralEmployee,
            { id: number; month?: string }
        >({
            query: ({ id, ...params }) => ({
                url: `/manage/general-tasks/employees/${id}`,
                params,
            }),
            providesTags: ['GeneralTask'],
        }),
        saveGeneralTask: build.mutation<
            AdminGeneralTask,
            { id?: number } & GeneralTaskInput
        >({
            query: ({ id, ...body }) => ({
                url: id
                    ? `/manage/general-tasks/${id}`
                    : '/manage/general-tasks',
                method: id ? 'PATCH' : 'POST',
                body,
            }),
            invalidatesTags: ['GeneralTask'],
        }),
        deleteGeneralTask: build.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/manage/general-tasks/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['GeneralTask'],
        }),
        setGeneralWeight: build.mutation<
            { monthly_weight: number },
            { monthly_weight: number }
        >({
            query: (body) => ({
                url: '/manage/general-tasks/weight',
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['GeneralTask'],
        }),
    }),
});

export const {
    useGetGeneralIndexQuery,
    useGetGeneralOverviewQuery,
    useGetGeneralEmployeeQuery,
    useSaveGeneralTaskMutation,
    useDeleteGeneralTaskMutation,
    useSetGeneralWeightMutation,
} = generalTasksApi;
