import type { AppNotification } from '@/api/chat-types';

/** A line the mascot has a voice clip for (keys of `notifications` in mascot-voice.config.json). */
export type MascotKind =
    | 'task_assigned'
    | 'task_updated'
    | 'task_completed'
    | 'comment'
    | 'mention'
    | 'deadline'
    | 'meeting'
    | 'project_update'
    | 'prayer_alert'
    | 'prayer_start'
    | 'default';

/** API `NotificationType` -> mascot line. Anything not listed says the generic line. */
const KIND_BY_TYPE: Record<string, MascotKind> = {
    task_assigned: 'task_assigned',
    stale_task: 'deadline',
    deadline_extension: 'deadline',
    phase_completed: 'project_update',
    project_request: 'project_update',
    project_issue: 'project_update',
    project_membership: 'project_update',
    chat_mention: 'mention',
    chat_reply: 'comment',
    meeting_reminder: 'meeting',
};

/** Prayer alerts are titled "Asr in 10 min", the start message "Asr time". */
const PRAYER_ALERT_TITLE = /\bin \d+ min$/;

export function kindOf(
    notification: Pick<AppNotification, 'type'> & { title?: string },
): MascotKind {
    if (notification.type === 'prayer_reminder') {
        return PRAYER_ALERT_TITLE.test(notification.title ?? '')
            ? 'prayer_alert'
            : 'prayer_start';
    }

    return (notification.type && KIND_BY_TYPE[notification.type]) || 'default';
}
