import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

export interface Crumb {
    label: string;
    to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
    return (
        <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                {items.map((item, index) => {
                    const last = index === items.length - 1;

                    return (
                        <li
                            key={`${item.label}-${index}`}
                            className="flex items-center gap-1"
                        >
                            {item.to && !last ? (
                                <Link
                                    to={item.to}
                                    className="font-medium transition-colors hover:text-brand-600"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span
                                    aria-current={last ? 'page' : undefined}
                                    className={
                                        last ? 'font-bold text-slate-900' : ''
                                    }
                                >
                                    {item.label}
                                </span>
                            )}
                            {!last ? (
                                <ChevronRight className="size-3.5" />
                            ) : null}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
