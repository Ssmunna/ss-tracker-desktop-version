import type { Priority } from '@/api/employee-types';

export const PRIORITIES: Priority[] = ['urgent', 'high', 'normal', 'low'];

export const priorityOptions = [
    { value: 'none', label: 'No priority' },
    ...PRIORITIES.map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
    })),
];
