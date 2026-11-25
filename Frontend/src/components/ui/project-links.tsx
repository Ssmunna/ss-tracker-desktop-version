import { ExternalLink, FolderOpen, Link2 } from 'lucide-react';

import type { ProjectLink } from '@/api/project-types';

const isDrive = (url: string) =>
    /^https?:\/\/(drive|docs)\.google\.com\//i.test(url);

const hostOf = (url: string) => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

/** The Google Drive and other links kept on a project, each opening in a new tab. */
export function ProjectLinks({
    links,
}: {
    links: ProjectLink[] | null | undefined;
}) {
    if (!links || links.length === 0) {
        return null;
    }

    return (
        <ul className="flex flex-wrap gap-2" aria-label="Project links">
            {links.map((link) => {
                const Icon = isDrive(link.url) ? FolderOpen : Link2;

                return (
                    <li key={link.url}>
                        <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.url}
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-xs font-semibold text-brand-600 hover:border-ember-300 hover:bg-brand-50"
                        >
                            <Icon className="size-3.5 shrink-0" />
                            <span className="truncate">
                                {link.label || hostOf(link.url)}
                            </span>
                            <ExternalLink className="size-3 shrink-0 opacity-60" />
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}
