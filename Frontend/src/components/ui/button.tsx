import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button-variants';

export interface ButtonProps
    extends
        ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant,
            size,
            block,
            asChild = false,
            loading = false,
            disabled,
            children,
            type = 'button',
            ...props
        },
        ref,
    ) => {
        if (asChild) {
            return (
                <Slot
                    ref={ref}
                    className={cn(
                        buttonVariants({ variant, size, block }),
                        className,
                    )}
                    {...props}
                >
                    {children}
                </Slot>
            );
        }

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || loading}
                aria-busy={loading || undefined}
                className={cn(
                    buttonVariants({ variant, size, block }),
                    className,
                )}
                {...props}
            >
                {loading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {children}
            </button>
        );
    },
);
Button.displayName = 'Button';
