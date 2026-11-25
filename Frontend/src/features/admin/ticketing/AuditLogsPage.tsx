import { useGetTicketingClientsQuery } from '@/api/endpoints/ticketing';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/features/admin/org/shared';

import { AuditTable } from './AuditTable';
import { AUDIT_ACTIONS } from './constants';
import { useUrlParams } from './useUrlParams';

export function TicketingAuditLogsPage() {
    const { params, set, reset } = useUrlParams();
    const clientId = params.get('client_id') ?? '';
    const action = params.get('action') ?? '';
    const from = params.get('from') ?? '';
    const to = params.get('to') ?? '';
    const clients = useGetTicketingClientsQuery({ per_page: 100 });
    const active = [clientId, action, from, to].filter(Boolean).length;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Ticketing audit log"
                description="Key changes, suspensions, status changes, settings edits and failed sign-ins, with who did them and from where."
            />
            <FilterBar activeCount={active} onReset={reset}>
                <Field label="Client" className="lg:w-52">
                    <Select
                        density="compact"
                        value={clientId || 'all'}
                        onValueChange={(value) =>
                            set({ client_id: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All clients' },
                            ...(clients.data?.items ?? []).map((client) => ({
                                value: String(client.id),
                                label: client.name,
                            })),
                        ]}
                    />
                </Field>
                <Field label="Action" className="lg:w-56">
                    <Select
                        density="compact"
                        value={action || 'all'}
                        onValueChange={(value) =>
                            set({ action: value === 'all' ? null : value })
                        }
                        options={[
                            { value: 'all', label: 'All actions' },
                            ...AUDIT_ACTIONS.map((value) => ({
                                value,
                                label: value,
                            })),
                        ]}
                    />
                </Field>
                <Field label="From" className="lg:w-40">
                    <Input
                        type="date"
                        density="compact"
                        value={from}
                        onChange={(event) =>
                            set({ from: event.target.value || null })
                        }
                    />
                </Field>
                <Field label="To" className="lg:w-40">
                    <Input
                        type="date"
                        density="compact"
                        value={to}
                        onChange={(event) =>
                            set({ to: event.target.value || null })
                        }
                    />
                </Field>
            </FilterBar>
            <AuditTable
                filters={{
                    client_id: clientId || undefined,
                    action: action || undefined,
                    from: from || undefined,
                    to: to ? `${to} 23:59:59` : undefined,
                }}
                page={Number(params.get('page') ?? 1)}
                onPage={(next) => set({ page: String(next) })}
            />
        </div>
    );
}
