import * as LabelPrimitive from '@radix-ui/react-label';
import {
    cloneElement,
    isValidElement,
    useId,
    type ReactElement,
    type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

import { FieldContext } from './field-context';

export function Label({
    className,
    ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return (
        <LabelPrimitive.Root
            className={cn('text-xs font-bold text-slate-700', className)}
            {...props}
        />
    );
}

export function FieldError({
    id,
    children,
}: {
    id?: string;
    children?: ReactNode;
}) {
    if (!children) {
        return null;
    }

    return (
        <p id={id} role="alert" className="text-xs font-medium text-red-600">
            {children}
        </p>
    );
}

interface FieldProps {
    label: string;
    /** Server (422) or client validation message. */
    error?: string;
    hint?: string;
    required?: boolean;
    className?: string;
    children: ReactElement<{
        id?: string;
        'aria-invalid'?: boolean;
        'aria-describedby'?: string;
    }>;
}

/** Label + control + hint + error, wired with ids so screen readers read them. */
export function Field({
    label,
    error,
    hint,
    required,
    className,
    children,
}: FieldProps) {
    const id = useId();
    const messageId = `${id}-message`;
    const control = isValidElement(children)
        ? cloneElement(children, {
              id,
              'aria-invalid': error ? true : undefined,
              'aria-describedby': error || hint ? messageId : undefined,
          })
        : children;

    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id}>
                {label}
                {required ? <span className="text-red-500"> *</span> : null}
            </Label>
            <FieldContext.Provider
                value={{
                    id,
                    invalid: Boolean(error),
                    describedBy: error || hint ? messageId : undefined,
                }}
            >
                {control}
            </FieldContext.Provider>
            {error ? (
                <FieldError id={messageId}>{error}</FieldError>
            ) : hint ? (
                <p id={messageId} className="text-xs text-slate-500">
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
