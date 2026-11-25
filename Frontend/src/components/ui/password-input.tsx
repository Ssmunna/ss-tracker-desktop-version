import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useState } from 'react';

import { Input, type InputProps } from './input';

/** Input with a show/hide toggle (44 px tap target on phones). */
export const PasswordInput = forwardRef<
    HTMLInputElement,
    Omit<InputProps, 'type'>
>(({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Input
                ref={ref}
                type={visible ? 'text' : 'password'}
                className={`pr-12 ${className ?? ''}`}
                {...props}
            />
            <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? 'Hide password' : 'Show password'}
                aria-pressed={visible}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none"
            >
                {visible ? (
                    <EyeOff className="size-4" />
                ) : (
                    <Eye className="size-4" />
                )}
            </button>
        </div>
    );
});
PasswordInput.displayName = 'PasswordInput';
