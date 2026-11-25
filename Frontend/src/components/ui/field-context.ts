import { createContext, useContext } from 'react';

/** Lets controls that cannot take `id` directly (a Controller-wrapped Select) join their Field. */
export const FieldContext = createContext<{
    id: string;
    invalid: boolean;
    describedBy?: string;
} | null>(null);

export function useFieldContext() {
    return useContext(FieldContext);
}
