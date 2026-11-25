import type { WorkedProject } from '@/api/employee-types';

/** One block per worked project phase, ready to paste in Telegram. */
export function buildDailyReportText(
    date: string,
    projects: WorkedProject[],
    phaseLabel = 'Phase',
): string {
    const [year, month, day] = date.split('-');
    const shown = `${day}/${month}/${year}`;

    if (projects.length === 0) {
        return `Date: ${shown}\n\n(No work logged for this date)`;
    }

    return projects
        .map((project) =>
            [
                `Date: ${shown}`,
                `Project: ${project.project_name}`,
                ...(project.phase_name
                    ? [`${phaseLabel}: ${project.phase_name}`]
                    : []),
                `Completion Rate: ${project.completion_percentage}%`,
                `Deadline: ${project.deadline ?? 'N/A'}`,
                '',
                'Task completed:',
                ...(project.completed_tasks.length > 0
                    ? project.completed_tasks.map((task) => `- ${task.title}`)
                    : [`- ${project.hours}h logged`]),
            ].join('\n'),
        )
        .join('\n\n');
}
