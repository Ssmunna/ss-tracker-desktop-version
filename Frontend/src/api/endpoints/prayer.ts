import { baseApi } from '../baseApi';
import type {
    PrayerOverview,
    PrayerTimeInput,
    PrayerTimeRow,
} from '../prayer-types';

type Saved = { message: string; prayer_time: PrayerTimeRow };

export const prayerApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        /** Today's prayers and the next one, from the server clock. */
        getPrayerOverview: build.query<PrayerOverview, void>({
            query: () => '/prayer-times',
            providesTags: ['Prayer'],
        }),
        getManagedPrayerTimes: build.query<
            { prayer_times: PrayerTimeRow[] },
            void
        >({
            query: () => '/manage/prayer-times',
            providesTags: ['Prayer'],
        }),
        addPrayerTime: build.mutation<Saved, PrayerTimeInput>({
            query: (body) => ({
                url: '/manage/prayer-times',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Prayer'],
        }),
        updatePrayerTime: build.mutation<
            Saved,
            { id: number; body: PrayerTimeInput }
        >({
            query: ({ id, body }) => ({
                url: `/manage/prayer-times/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Prayer'],
        }),
        deletePrayerTime: build.mutation<{ message: string }, number>({
            query: (id) => ({
                url: `/manage/prayer-times/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Prayer'],
        }),
    }),
});

export const {
    useGetPrayerOverviewQuery,
    useGetManagedPrayerTimesQuery,
    useAddPrayerTimeMutation,
    useUpdatePrayerTimeMutation,
    useDeletePrayerTimeMutation,
} = prayerApi;
