import { Checkbox } from '@/components/ui/checkbox';
import type { PermissionGroup } from '@/api/people-types';

/** Permissions grouped by area, with a select-all per group. Controlled by a set of ids. */
export function PermissionChecklist({
    groups,
    selected,
    onChange,
    disabled = false,
}: {
    groups: PermissionGroup[];
    selected: number[];
    onChange: (next: number[]) => void;
    disabled?: boolean;
}) {
    const chosen = new Set(selected);

    const toggle = (ids: number[], on: boolean) => {
        const next = new Set(chosen);

        for (const id of ids) {
            if (on) {
                next.add(id);
            } else {
                next.delete(id);
            }
        }

        onChange([...next]);
    };

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => {
                const ids = group.permissions.map(
                    (permission) => permission.id,
                );
                const count = ids.filter((id) => chosen.has(id)).length;
                const all = count === ids.length;
                const headingId = `group-${group.group}`;

                return (
                    <fieldset
                        key={group.group}
                        aria-labelledby={headingId}
                        className="rounded-2xl border border-slate-200/90 bg-surface p-4"
                    >
                        <div className="mb-2 flex min-h-11 items-center justify-between gap-3 border-b border-slate-100 pb-2">
                            <p
                                id={headingId}
                                className="text-sm font-bold text-slate-900 capitalize"
                            >
                                {group.group.replace(/[-_]/g, ' ')}
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    {count}/{ids.length}
                                </span>
                            </p>
                            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
                                <Checkbox
                                    disabled={disabled}
                                    checked={
                                        all
                                            ? true
                                            : count > 0
                                              ? 'indeterminate'
                                              : false
                                    }
                                    onCheckedChange={(value) =>
                                        toggle(ids, value === true)
                                    }
                                    aria-label={`Select all ${group.group}`}
                                />
                                All
                            </label>
                        </div>
                        <ul className="space-y-0.5">
                            {group.permissions.map((permission) => (
                                <li key={permission.id}>
                                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-700 lg:min-h-9">
                                        <Checkbox
                                            disabled={disabled}
                                            checked={chosen.has(permission.id)}
                                            onCheckedChange={(value) =>
                                                toggle(
                                                    [permission.id],
                                                    value === true,
                                                )
                                            }
                                        />
                                        <span className="break-all">
                                            {permission.name}
                                        </span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </fieldset>
                );
            })}
        </div>
    );
}
