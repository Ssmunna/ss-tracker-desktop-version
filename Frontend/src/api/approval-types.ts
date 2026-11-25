import type { PageMeta } from './admin-project-types';
import type { Priority } from './employee-types';
import type { PersonRef, RequestStatus } from './project-types';

export interface Option {
    id: number;
    name: string;
}

export interface ProjectOption extends Option {
    project_code: string;
}

export interface InboxProject extends ProjectOption {
    departments?: Option[];
}

export interface InboxRequest {
    id: number;
    project_id: number;
    project_phase_id: number | null;
    title: string;
    description: string | null;
    links: string[] | null;
    priority: Priority;
    status: RequestStatus;
    approved_date: string | null;
    reason: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
    project: InboxProject | null;
    phase: Option | null;
}

export interface InboxExtension {
    id: number;
    project_id: number;
    project_phase_id: number | null;
    reason: string;
    status: RequestStatus;
    extension_type: 'Regular' | 'Failed' | null;
    current_deadline_snapshot: string | null;
    requested_deadline: string | null;
    new_deadline: string | null;
    previous_weight: number | string | null;
    new_weight: number | string | null;
    review_note: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    requested_by: PersonRef | null;
    reviewed_by: PersonRef | null;
    project:
        | (InboxProject & {
              deadline: string | null;
              effective_weight: number | string | null;
              category: (Option & { weight: number | string | null }) | null;
          })
        | null;
    phase: Option | null;
    weight_preview: { base: number; failed: number; regular: number };
}

export type StatusCounts = Record<
    'all' | 'pending' | 'approved' | 'rejected',
    number
>;

export interface InboxQuery {
    status?: string;
    priority?: string;
    date_from?: string;
    date_to?: string;
    department_id?: string;
    project_id?: string;
    category_id?: string;
    phase_id?: string;
    per_page?: number;
    page?: number;
}

interface InboxBase {
    departments: Option[];
    projects: ProjectOption[];
    phases: Option[];
    status_counts: StatusCounts;
    meta: PageMeta;
}

export interface RequestInbox extends InboxBase {
    requests: InboxRequest[];
}

export interface ExtensionInbox extends InboxBase {
    extensions: InboxExtension[];
    categories: Option[];
}
