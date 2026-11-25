import { Toaster as Sonner } from 'sonner';

/** Light only; toasts sit at the bottom on phones and top-right on large screens. */
export function Toaster() {
    return (
        <Sonner
            theme="light"
            position="top-right"
            mobileOffset={{ bottom: 16 }}
            toastOptions={{
                classNames: {
                    toast: '!rounded-2xl !border !border-slate-200/90 !bg-surface !text-sm !shadow-float',
                    description: '!text-slate-500',
                },
            }}
        />
    );
}
