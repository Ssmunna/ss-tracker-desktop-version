import type {
    AdminGeneralTask,
    GeneralSummaryRow,
    Person,
} from './general-types';

export interface OngoingTask extends AdminGeneralTask {
    /** A closed month's task that was not finished. */
    is_missed: boolean;
    carried_over: boolean;
    can_carry_over: boolean;
    /** Who created the task (a user's name). */
    created_by?: string | null;
}

export interface OngoingProjectRef {
    id: number;
    name: string;
    project_code: string;
}

/** The switches and team of one project's ongoing tasks. */
export interface OngoingSettings {
    project: OngoingProjectRef;
    enabled: boolean;
    /** The weight in use: the project's own, else the default. */
    weight: number;
    own_weight: number | null;
    default_weight: number;
    members: Person[];
}

export interface OngoingProject extends OngoingSettings {
    tasks: OngoingTask[];
    summary: GeneralSummaryRow[];
    developers: Person[];
    /** The real project's own team (owner included), for a one click add. */
    project_team: Person[];
    month: string;
    today: string;
}

export interface MyOngoingTask extends OngoingTask {
    spent_minutes: number | null;
    /** Created by this employee, who may then edit or delete it. */
    created_by_me: boolean;
}

/** An employee's own ongoing tasks of one project for a month. */
export interface ProjectOngoingTasks {
    enabled: boolean;
    is_member: boolean;
    has_open_work: boolean;
    monthly_weight: number;
    /** The ongoing team: who a task can be given to. */
    members: Person[];
    tasks: MyOngoingTask[];
    summary: GeneralSummaryRow | null;
    month: string;
    today: string;
}

export interface OngoingTaskInput {
    title: string;
    description: string | null;
    assigned_developer_id: number;
    priority: string | null;
    deadline: string;
}

export interface OngoingListTask extends OngoingTask {
    project: OngoingProjectRef | null;
    created_by: string | null;
    assigned_by: string | null;
}

export interface OngoingListProject extends OngoingProjectRef {
    enabled: boolean;
    members: Person[];
}

/** Every ongoing task of a month across projects. */
export interface OngoingList {
    tasks: OngoingListTask[];
    projects: OngoingListProject[];
    developers: Person[];
    creators: { id: number; name: string }[];
    filters: {
        month: string;
        project_id: string | number | null;
        developer_id: string | number | null;
        created_by: string | number | null;
        status: string | null;
    };
}
