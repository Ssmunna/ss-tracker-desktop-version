import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { useFieldContext } from './field-context';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SelectProps {
    id?: string;
    value?: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    density?: 'default' | 'compact';
    className?: string;
    'aria-label'?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}

/**
 * Radix select styled like Input; the list is a popover on every screen size, with a search box
 * that filters the options by their label.
 */
export function Select({
    id,
    value,
    onValueChange,
    options,
    placeholder = 'Select',
    disabled,
    density = 'default',
    className,
    ...aria
}: SelectProps) {
    const field = useFieldContext();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    id ??= field?.id;
    aria['aria-invalid'] ??= field?.invalid || undefined;
    aria['aria-describedby'] ??= field?.describedBy;

    // Radix focuses the chosen item as the list opens, and again when that item is filtered out
    // of the list; take the focus back for the search box each time.
    useEffect(() => {
        if (!open) {
            return;
        }

        searchRef.current?.focus();
        const timer = window.setTimeout(() => searchRef.current?.focus(), 0);

        return () => window.clearTimeout(timer);
    }, [open, query]);

    const needle = query.trim().toLowerCase();
    const shown = needle
        ? options.filter((option) =>
              option.label.toLowerCase().includes(needle),
          )
        : options;
    const selected = options.find((option) => option.value === value);

    return (
        <SelectPrimitive.Root
            value={value}
            onValueChange={onValueChange}
            disabled={disabled}
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setQuery('');
            }}
        >
            <SelectPrimitive.Trigger
                id={id}
                {...aria}
                className={cn(
                    'flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-slate-900 transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-red-400 data-[placeholder]:font-normal data-[placeholder]:text-slate-400',
                    density === 'default'
                        ? 'min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 focus:bg-white focus:ring-2 focus:ring-orange-500 sm:min-h-10'
                        : 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 focus:ring-2 focus:ring-orange-500/50 sm:min-h-9',
                    className,
                )}
            >
                <SelectPrimitive.Value placeholder={placeholder}>
                    {selected?.label}
                </SelectPrimitive.Value>
                <SelectPrimitive.Icon>
                    <ChevronDown className="size-4 text-slate-400" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>
            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={6}
                    className="z-[60] max-h-72 w-(--radix-select-trigger-width) min-w-40 animate-fade-in overflow-hidden rounded-xl border border-slate-200/90 bg-surface p-1 shadow-float"
                >
                    <div className="relative border-b border-slate-100 p-1 pb-1.5">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search"
                            aria-label="Search options"
                            autoComplete="off"
                            className="h-9 w-full rounded-lg bg-slate-50 pr-3 pl-8 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/50"
                            // Keep typing away from the list's own type-to-select.
                            onKeyDown={(event) => {
                                if (event.key === 'Escape') {
                                    return;
                                }

                                event.stopPropagation();

                                if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    listRef.current
                                        ?.querySelector<HTMLElement>(
                                            '[role="option"]:not([data-disabled])',
                                        )
                                        ?.focus();
                                } else if (event.key === 'Enter') {
                                    event.preventDefault();
                                    const first = shown.find(
                                        (option) => !option.disabled,
                                    );

                                    if (first) {
                                        onValueChange(first.value);
                                        setOpen(false);
                                        setQuery('');
                                    }
                                }
                            }}
                        />
                    </div>
                    <SelectPrimitive.Viewport ref={listRef}>
                        {shown.length === 0 ? (
                            <p className="px-3 py-3 text-center text-sm text-slate-500">
                                No results
                            </p>
                        ) : null}
                        {shown.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={option.value}
                                disabled={option.disabled}
                                // Hovering must not pull the focus out of the search box.
                                onPointerMove={(event) =>
                                    event.preventDefault()
                                }
                                className="relative flex min-h-11 cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 text-sm font-medium text-slate-900 outline-none select-none hover:bg-brand-50 data-[disabled]:opacity-40 data-[highlighted]:bg-brand-50 data-[state=checked]:text-brand-600 sm:min-h-9"
                            >
                                <SelectPrimitive.ItemText>
                                    {option.label}
                                </SelectPrimitive.ItemText>
                                <SelectPrimitive.ItemIndicator className="absolute right-2.5">
                                    <Check className="size-4" />
                                </SelectPrimitive.ItemIndicator>
                            </SelectPrimitive.Item>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
}
