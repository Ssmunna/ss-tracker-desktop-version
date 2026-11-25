/** Look shared by the project task table and the ongoing task table. */

export const PRIORITY_STYLE: Record<string, string> = {
    urgent: 'border-rose-300 bg-rose-50 text-rose-700',
    high: 'border-amber-300 bg-amber-50 text-amber-700',
    normal: 'border-indigo-300 bg-indigo-50 text-indigo-700',
    low: 'border-slate-300 bg-slate-100 text-slate-600',
    none: 'border-slate-300 bg-white text-slate-400',
};
export const PRIORITY_LABEL: Record<string, string> = {
    urgent: 'Urgent',
    high: 'High',
    normal: 'Normal',
    low: 'Low',
    none: 'None',
};
export const PRIORITY_ICON: Record<string, string> = {
    urgent: 'text-rose-600',
    high: 'text-amber-600',
    normal: 'text-indigo-600',
    low: 'text-slate-500',
};

export const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

export const selectClass =
    'h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-brand';
