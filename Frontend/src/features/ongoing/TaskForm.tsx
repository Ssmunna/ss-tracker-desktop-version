import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import {
    useSaveMyOngoingTaskMutation,
    useSaveOngoingTaskMutation,
} from '@/api/endpoints/ongoingTasks';
import type { Person } from '@/api/general-types';
import type { OngoingTask } from '@/api/ongoing-types';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const PRIORITIES = ['urgent', 'high', 'normal', 'low'].map((value) => ({
    value,
    label: value[0].toUpperCase() + value.slice(1),
}));

/** The add / edit form of an ongoing task, shared by managers and by team members. */
export function TaskForm({
    projectId,
    task,
    people,
    onDone,
    scope = 'manage',
    defaultAssignee = '',
}: {
    projectId: number;
    task: OngoingTask | null;
    people: Person[];
    onDone: () => void;
    /** `manage`: a manager's endpoints; `mine`: an employee on the ongoing team. */
    scope?: 'manage' | 'mine';
    defaultAssignee?: string;
}) {
    const [saveAsManager, { isLoading: managing }] =
        useSaveOngoingTaskMutation();
    const [saveAsMember, { isLoading: working }] =
        useSaveMyOngoingTaskMutation();
    const save = scope === 'mine' ? saveAsMember : saveAsManager;
    const isLoading = scope === 'mine' ? working : managing;
    const [title, setTitle] = useState(task?.title ?? '');
    const [description, setDescription] = useState(task?.description ?? '');
    const [assignee, setAssignee] = useState(
        String(task?.assignee?.id ?? defaultAssignee),
    );
    const [priority, setPriority] = useState<string>(
        task?.priority ?? 'normal',
    );
    const [deadline, setDeadline] = useState(task?.deadline ?? '');
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={async (event) => {
                event.preventDefault();

                try {
                    await save({
                        projectId,
                        id: task?.id,
                        title,
                        description: description || null,
                        assigned_developer_id: Number(assignee),
                        priority,
                        deadline,
                    }).unwrap();
                    toast.success(task ? 'Task updated.' : 'Task added.');
                    onDone();
                } catch (error) {
                    const fields = fieldErrors(error);
                    setErrors(fields);

                    if (Object.keys(fields).length === 0) {
                        toast.error(errorMessage(error));
                    }
                }
            }}
        >
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <Field label="Title" required error={errors.title}>
                    <Input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                </Field>
                <Field label="Description" error={errors.description}>
                    <Textarea
                        rows={3}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                    />
                </Field>
                <Field
                    label="Assign to"
                    required
                    error={errors.assigned_developer_id}
                >
                    <Select
                        value={assignee}
                        onValueChange={setAssignee}
                        placeholder="Choose a team member"
                        options={people.map((person) => ({
                            value: String(person.id),
                            label: `${person.name} (${person.developer_code})`,
                        }))}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Priority" error={errors.priority}>
                        <Select
                            value={priority}
                            onValueChange={setPriority}
                            options={PRIORITIES}
                        />
                    </Field>
                    <Field label="Deadline" required error={errors.deadline}>
                        <Input
                            type="date"
                            value={deadline}
                            onChange={(event) =>
                                setDeadline(event.target.value)
                            }
                        />
                    </Field>
                </div>
            </div>
            <div className="border-t border-slate-100 p-4">
                <Button type="submit" block loading={isLoading}>
                    {task ? 'Save task' : 'Add task'}
                </Button>
            </div>
        </form>
    );
}
