import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './button';

export function Pagination({
    page,
    pageCount,
    onPageChange,
    total,
}: {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    total?: number;
}) {
    if (pageCount <= 1) {
        return total !== undefined ? (
            <p className="text-xs text-slate-500">{total} results</p>
        ) : null;
    }

    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-3"
        >
            <p className="hidden text-xs text-slate-500 sm:block">
                {total !== undefined ? `${total} results · ` : ''}Page {page} of{' '}
                {pageCount}
            </p>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="size-4" /> Previous
                </Button>
                <span className="text-xs font-bold text-slate-700 sm:hidden">
                    {page} / {pageCount}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => onPageChange(page + 1)}
                >
                    Next <ChevronRight className="size-4" />
                </Button>
            </div>
        </nav>
    );
}
