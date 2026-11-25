import {
    Bell,
    FolderKanban,
    Inbox,
    ListChecks,
    Trash2,
    Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import { BarChart, DoughnutChart, LineChart } from '@/components/charts/charts';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Breadcrumbs } from '@/components/ui/breadcrumb-trail';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { FilterBar } from '@/components/ui/filter-bar';
import { Input, Textarea } from '@/components/ui/input';
import {
    Modal,
    ModalClose,
    ModalContent,
    ModalTrigger,
} from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { StatCard } from '@/components/ui/stat-card';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';

interface DemoProject {
    id: number;
    name: string;
    owner: string;
    status: string;
    progress: number;
}

const projects: DemoProject[] = [
    {
        id: 1,
        name: 'Northbeam Website',
        owner: 'Rahim Uddin',
        status: 'Active',
        progress: 72,
    },
    {
        id: 2,
        name: 'Mobile Banking App',
        owner: 'Nusrat Jahan',
        status: 'Delayed',
        progress: 38,
    },
    {
        id: 3,
        name: 'Inventory Portal',
        owner: 'Tanvir Ahmed',
        status: 'Completed',
        progress: 100,
    },
];

const columns: Column<DemoProject>[] = [
    { key: 'name', header: 'Project', primary: true, cell: (row) => row.name },
    { key: 'owner', header: 'Owner', cell: (row) => row.owner },
    {
        key: 'status',
        header: 'Status',
        cell: (row) => (
            <Badge
                tone={
                    row.status === 'Completed'
                        ? 'success'
                        : row.status === 'Delayed'
                          ? 'danger'
                          : 'brand'
                }
            >
                {row.status}
            </Badge>
        ),
    },
    {
        key: 'progress',
        header: 'Progress',
        cell: (row) => <ProgressBar value={row.progress} label={row.name} />,
    },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {title}
            </h2>
            {children}
        </section>
    );
}

export function GalleryPage() {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [page, setPage] = useState(2);
    const [department, setDepartment] = useState<string>();

    return (
        <div className="mx-auto max-w-6xl space-y-10 p-4 sm:p-6">
            <header className="space-y-2">
                <Breadcrumbs
                    items={[
                        { label: 'Dev', to: '/__ui' },
                        { label: 'UI gallery' },
                    ]}
                />
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    UI gallery
                </h1>
                <p className="text-sm text-slate-500">
                    Every component and state, built from THEME-STYLE-GUIDE.md.
                    Resize to 360, 768, 1280 and 1536 px to review.{' '}
                    <Link
                        to="/__ui/shell"
                        className="font-bold text-brand-600 hover:underline"
                    >
                        App shell
                    </Link>
                    {' · '}
                    <Link
                        to="/__ui/auth"
                        className="font-bold text-brand-600 hover:underline"
                    >
                        Auth layout
                    </Link>
                    {' · '}
                    <Link
                        to="/__ui/chat"
                        className="font-bold text-brand-600 hover:underline"
                    >
                        Chat layout
                    </Link>
                </p>
            </header>

            <Section title="Buttons">
                <div className="flex flex-wrap items-center gap-3">
                    <Button>Primary gradient</Button>
                    <Button size="sm">Small</Button>
                    <Button variant="solid">Solid orange</Button>
                    <Button variant="brand">Sidebar CTA</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructiveSoft">Delete</Button>
                    <Button variant="destructive">Delete</Button>
                    <Button disabled>Disabled</Button>
                    <Button loading>Saving</Button>
                    <Button size="icon" aria-label="Notifications">
                        <Bell className="size-4" />
                    </Button>
                </div>
                <div className="max-w-sm">
                    <Button block size="lg">
                        Full width (auth)
                    </Button>
                </div>
            </Section>

            <Section title="Cards">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card animate>
                        <CardTitle>Standard card</CardTitle>
                        <CardDescription>
                            Faint border, almost flat shadow.
                        </CardDescription>
                    </Card>
                    <Card variant="tinted" animate delay={80}>
                        <CardTitle>Tinted card</CardTitle>
                        <CardDescription>
                            For features and suggestions.
                        </CardDescription>
                    </Card>
                    <Card variant="accent" animate delay={160}>
                        <CardTitle>Accent card</CardTitle>
                        <CardDescription>
                            Brand border for the key block.
                        </CardDescription>
                    </Card>
                    <Card interactive animate delay={240}>
                        <div className="flex items-start gap-3">
                            <FolderKanban className="size-5 text-brand" />
                            <div>
                                <CardTitle>Clickable card</CardTitle>
                                <CardDescription>
                                    Hover: lift, orange border, glow.
                                </CardDescription>
                            </div>
                        </div>
                    </Card>
                    <Card variant="tinted" interactive animate delay={320}>
                        <CardTitle>Tinted clickable</CardTitle>
                        <CardDescription>
                            Hovers one step deeper.
                        </CardDescription>
                    </Card>
                    <Card variant="success">
                        <p className="text-sm font-bold text-emerald-800">
                            Saved successfully
                        </p>
                    </Card>
                </div>
            </Section>

            <Section title="Stats and progress">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard
                        label="Active projects"
                        value={12}
                        icon={FolderKanban}
                    />
                    <StatCard
                        label="Tasks today"
                        value={34}
                        icon={ListChecks}
                        highlight
                        delay={60}
                    />
                    <StatCard label="Team" value={8} icon={Users} delay={120} />
                    <StatCard
                        label="Unread"
                        value={5}
                        icon={Inbox}
                        hint="3 mentions"
                        delay={180}
                    />
                </div>
                <Card className="space-y-3">
                    <ProgressBar value={72} label="Overall" />
                    <div className="flex items-center gap-3">
                        <span className="size-2.5 animate-live-pulse rounded-full bg-ember-400" />
                        <span className="text-xs font-medium text-slate-600">
                            Live pulse
                        </span>
                    </div>
                </Card>
            </Section>

            <Section title="Form controls">
                <Card className="grid gap-4 md:grid-cols-2">
                    <Field label="Name" required hint="Shown to your team">
                        <Input placeholder="Project name" />
                    </Field>
                    <Field
                        label="Email"
                        error="The email has already been taken."
                    >
                        <Input defaultValue="rahim@example.com" />
                    </Field>
                    <Field label="Department">
                        <Select
                            value={department}
                            onValueChange={setDepartment}
                            placeholder="Choose a department"
                            options={[
                                { value: 'eng', label: 'Engineering' },
                                { value: 'design', label: 'Design' },
                                { value: 'qa', label: 'Quality' },
                            ]}
                        />
                    </Field>
                    <Field label="Compact input">
                        <Input density="compact" placeholder="Dense forms" />
                    </Field>
                    <Field label="Notes" className="md:col-span-2">
                        <Textarea placeholder="Write something" />
                    </Field>
                    <label className="flex items-center gap-3 text-sm font-medium">
                        <Checkbox defaultChecked /> Remember me
                    </label>
                    <label className="flex items-center gap-3 text-sm font-medium">
                        <Switch defaultChecked /> Email notifications
                    </label>
                    <Field label="Disabled">
                        <Input disabled placeholder="Disabled" />
                    </Field>
                </Card>
            </Section>

            <Section title="Overlays">
                <div className="flex flex-wrap gap-3">
                    <Modal>
                        <ModalTrigger asChild>
                            <Button variant="outline">Open modal</Button>
                        </ModalTrigger>
                        <ModalContent
                            title="Add milestone"
                            description="Bottom sheet on phones, dialog from sm."
                            footer={
                                <>
                                    <ModalClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </ModalClose>
                                    <Button>Save</Button>
                                </>
                            }
                        >
                            <Field label="Title">
                                <Input />
                            </Field>
                        </ModalContent>
                    </Modal>
                    <Drawer>
                        <DrawerTrigger asChild>
                            <Button variant="outline">Open drawer</Button>
                        </DrawerTrigger>
                        <DrawerContent title="Task details">
                            <p className="p-5 text-sm text-slate-600">
                                Side panel for detail and edit forms.
                            </p>
                        </DrawerContent>
                    </Drawer>
                    <Button
                        variant="destructiveSoft"
                        onClick={() => setConfirmOpen(true)}
                    >
                        <Trash2 className="size-4" /> Confirm delete
                    </Button>
                    <ConfirmDialog
                        open={confirmOpen}
                        onOpenChange={setConfirmOpen}
                        destructive
                        title="Delete project?"
                        description="It moves to Restore and can be recovered by an admin."
                        confirmLabel="Delete"
                        onConfirm={() => setConfirmOpen(false)}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">Menu</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem destructive>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip content="Hover or focus">
                        <Button variant="ghost">Tooltip</Button>
                    </Tooltip>
                    <Button
                        variant="outline"
                        onClick={() =>
                            toast.success('Saved', {
                                description: 'Task updated.',
                            })
                        }
                    >
                        Toast
                    </Button>
                </div>
            </Section>

            <Section title="Tabs, badges, avatars">
                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="phases">Phases</TabsTrigger>
                        <TabsTrigger value="tasks">Tasks</TabsTrigger>
                        <TabsTrigger value="milestones">Milestones</TabsTrigger>
                        <TabsTrigger value="requests">Requests</TabsTrigger>
                        <TabsTrigger value="credentials">
                            Credentials
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview">
                        <Card>Tabs scroll sideways on phones.</Card>
                    </TabsContent>
                </Tabs>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>Neutral</Badge>
                    <Badge tone="brand">Brand</Badge>
                    <Badge tone="success">Done</Badge>
                    <Badge tone="green">Green</Badge>
                    <Badge tone="warning">Pending</Badge>
                    <Badge tone="danger">Overdue</Badge>
                    <Badge tone="info">Info</Badge>
                    <Avatar name="Rahim Uddin" size="sm" />
                    <Avatar name="Nusrat Jahan" />
                    <Avatar name="Tanvir" size="lg" />
                </div>
            </Section>

            <Section title="Table (cards on phones)">
                <FilterBar activeCount={1} onReset={() => undefined}>
                    <Field label="Search">
                        <Input density="compact" placeholder="Name" />
                    </Field>
                    <Field label="Status">
                        <Select
                            density="compact"
                            onValueChange={() => undefined}
                            options={[{ value: 'a', label: 'Active' }]}
                            placeholder="Any"
                        />
                    </Field>
                </FilterBar>
                <DataTable
                    columns={columns}
                    rows={projects}
                    rowKey={(row) => row.id}
                    onRowClick={() => undefined}
                />
                <Pagination
                    page={page}
                    pageCount={5}
                    total={48}
                    onPageChange={setPage}
                />
            </Section>

            <Section title="States">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="space-y-3">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-3/4" />
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Spinner /> Loading
                        </div>
                    </Card>
                    <Card variant="flush">
                        <EmptyState
                            icon={Inbox}
                            title="No requests"
                            description="New requests from your team show up here."
                            action={<Button size="sm">Create request</Button>}
                        />
                    </Card>
                    <ErrorState
                        description="The server did not respond."
                        action={
                            <Button size="sm" variant="outline">
                                Try again
                            </Button>
                        }
                    />
                </div>
            </Section>

            <Section title="Charts">
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card>
                        <CardTitle>Tasks per week</CardTitle>
                        <BarChart
                            labels={['W1', 'W2', 'W3', 'W4']}
                            series={[{ label: 'Done', data: [12, 19, 8, 15] }]}
                        />
                    </Card>
                    <Card>
                        <CardTitle>Progress</CardTitle>
                        <LineChart
                            dashedFirst
                            labels={['Mon', 'Tue', 'Wed', 'Thu']}
                            series={[
                                { label: 'Expected', data: [10, 30, 50, 70] },
                                { label: 'Actual', data: [8, 22, 41, null] },
                            ]}
                        />
                    </Card>
                    <Card>
                        <CardTitle>By status</CardTitle>
                        <DoughnutChart
                            labels={['Active', 'Delayed', 'Done']}
                            data={[6, 2, 4]}
                        />
                    </Card>
                </div>
            </Section>
        </div>
    );
}
