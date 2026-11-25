import { Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import type { ConversationList } from '@/api/chat-types';
import { useCreateConversationMutation } from '@/api/endpoints/chat';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { matches } from '@/lib/search';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function SearchBox({
    value,
    onChange,
    label,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
}) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
                type="search"
                value={value}
                aria-label={label}
                placeholder={label}
                className="pl-9"
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );
}

/** One row of a pick-one list (a person or a project). */
function PickRow({
    selected,
    onPick,
    name,
    code,
}: {
    selected: boolean;
    onPick: () => void;
    name: string;
    code: string | null | undefined;
}) {
    return (
        <li>
            <button
                type="button"
                aria-pressed={selected}
                onClick={onPick}
                className={cn(
                    'flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none',
                    selected
                        ? 'bg-brand-50 font-bold text-slate-900 ring-1 ring-brand-200'
                        : 'text-slate-700 hover:bg-slate-100',
                )}
            >
                <span className="min-w-0 truncate">{name}</span>
                <span className="shrink-0 text-xs text-slate-500">{code}</span>
            </button>
        </li>
    );
}

export function NewConversationDialog({
    open,
    onOpenChange,
    options,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    options: ConversationList | undefined;
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            {open ? (
                <Form options={options} onDone={() => onOpenChange(false)} />
            ) : null}
        </Modal>
    );
}

function Form({
    options,
    onDone,
}: {
    options: ConversationList | undefined;
    onDone: () => void;
}) {
    const navigate = useNavigate();
    const [create, { isLoading }] = useCreateConversationMutation();
    const [kind, setKind] = useState<'direct' | 'group' | 'project'>('direct');
    const [person, setPerson] = useState('');
    const [name, setName] = useState('');
    const [members, setMembers] = useState<number[]>([]);
    const [project, setProject] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [query, setQuery] = useState('');
    const users = options?.users ?? [];
    const projects = options?.projects ?? [];
    const foundUsers = users.filter((user) =>
        matches(query, user.name, user.developer_code),
    );
    const foundProjects = projects.filter((item) =>
        matches(query, item.name, item.project_code),
    );

    const submit = async () => {
        try {
            const body =
                kind === 'direct'
                    ? { type: kind, user_id: Number(person) }
                    : kind === 'group'
                      ? { type: kind, name, user_ids: members }
                      : { type: kind, project_id: Number(project) };
            const result = await create(body).unwrap();
            onDone();
            navigate(`/chat/${result.conversation.id}`);
        } catch (error) {
            const fields = fieldErrors(error);
            setErrors(fields);

            if (Object.keys(fields).length === 0) {
                toast.error(errorMessage(error));
            }
        }
    };

    return (
        <ModalContent
            title="New chat"
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        loading={isLoading}
                        disabled={
                            (kind === 'direct' && !person) ||
                            (kind === 'group' &&
                                (!name.trim() || members.length === 0)) ||
                            (kind === 'project' && !project)
                        }
                        onClick={() => void submit()}
                    >
                        Start chat
                    </Button>
                </>
            }
        >
            <Tabs
                value={kind}
                onValueChange={(value) => {
                    setKind(value as typeof kind);
                    // A search typed on one tab must not hide the list of the next.
                    setQuery('');
                }}
            >
                <TabsList>
                    <TabsTrigger value="direct">Direct</TabsTrigger>
                    <TabsTrigger value="group">Group</TabsTrigger>
                    {projects.length > 0 ? (
                        <TabsTrigger value="project">Project</TabsTrigger>
                    ) : null}
                </TabsList>
                <TabsContent value="direct" className="space-y-2 pt-3">
                    <SearchBox
                        value={query}
                        onChange={setQuery}
                        label="Search people"
                    />
                    {errors.user_id ? (
                        <p className="text-xs text-red-600">{errors.user_id}</p>
                    ) : null}
                    <ul className="max-h-64 overflow-y-auto">
                        {foundUsers.map((user) => (
                            <PickRow
                                key={user.id}
                                selected={person === String(user.id)}
                                onPick={() => setPerson(String(user.id))}
                                name={user.name}
                                code={user.developer_code}
                            />
                        ))}
                    </ul>
                    {foundUsers.length === 0 ? (
                        <p className="py-3 text-center text-sm text-slate-500">
                            No one matches &ldquo;{query}&rdquo;.
                        </p>
                    ) : null}
                </TabsContent>
                <TabsContent value="group" className="space-y-3 pt-3">
                    <Field label="Group name" error={errors.name}>
                        <Input
                            value={name}
                            maxLength={255}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </Field>
                    <fieldset>
                        <legend className="mb-1 text-sm font-bold text-slate-900">
                            Members
                        </legend>
                        {errors.user_ids ? (
                            <p className="text-xs text-red-600">
                                {errors.user_ids}
                            </p>
                        ) : null}
                        <SearchBox
                            value={query}
                            onChange={setQuery}
                            label="Search people"
                        />
                        <ul className="mt-1 max-h-56 overflow-y-auto">
                            {foundUsers.map((user) => (
                                <li key={user.id}>
                                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700">
                                        <Checkbox
                                            checked={members.includes(user.id)}
                                            onCheckedChange={(value) =>
                                                setMembers((current) =>
                                                    value === true
                                                        ? [...current, user.id]
                                                        : current.filter(
                                                              (id) =>
                                                                  id !==
                                                                  user.id,
                                                          ),
                                                )
                                            }
                                        />
                                        {user.name}{' '}
                                        <span className="text-xs text-slate-500">
                                            {user.developer_code}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                        {foundUsers.length === 0 ? (
                            <p className="py-3 text-center text-sm text-slate-500">
                                No one matches &ldquo;{query}&rdquo;.
                            </p>
                        ) : null}
                        {members.length > 0 ? (
                            <p className="mt-1 text-xs text-slate-500">
                                {members.length} selected
                            </p>
                        ) : null}
                    </fieldset>
                </TabsContent>
                <TabsContent value="project" className="space-y-2 pt-3">
                    <p className="text-xs text-slate-500">
                        Opens a group with the project team.
                    </p>
                    <SearchBox
                        value={query}
                        onChange={setQuery}
                        label="Search projects"
                    />
                    {errors.project_id ? (
                        <p className="text-xs text-red-600">
                            {errors.project_id}
                        </p>
                    ) : null}
                    <ul className="max-h-64 overflow-y-auto">
                        {foundProjects.map((item) => (
                            <PickRow
                                key={item.id}
                                selected={project === String(item.id)}
                                onPick={() => setProject(String(item.id))}
                                name={item.name}
                                code={item.project_code}
                            />
                        ))}
                    </ul>
                    {foundProjects.length === 0 ? (
                        <p className="py-3 text-center text-sm text-slate-500">
                            No project matches &ldquo;{query}&rdquo;.
                        </p>
                    ) : null}
                </TabsContent>
            </Tabs>
        </ModalContent>
    );
}
