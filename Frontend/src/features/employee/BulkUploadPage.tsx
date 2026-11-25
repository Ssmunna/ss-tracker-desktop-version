import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import {
    useGetBulkUploadStatusQuery,
    useStartBulkUploadMutation,
} from '@/api/endpoints/employeeProject';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { downloadFile } from '@/lib/download';

/** Upload an Excel or CSV of tasks. Processing is queued; this page polls until it finishes. */
/** `scope` picks the employee or the admin (`/manage`) endpoints and the page to return to. */
export function BulkUploadPage({
    scope = 'employee',
}: {
    scope?: 'employee' | 'admin';
}) {
    const admin = scope === 'admin';
    const projectId = Number(useParams().projectId);
    const picker = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [justStarted, setJustStarted] = useState(false);
    const [start, { isLoading }] = useStartBulkUploadMutation();
    const { data: status, refetch } = useGetBulkUploadStatusQuery({
        projectId,
        admin,
    });
    const running = ['processing', 'queued', 'pending'].includes(
        status?.status ?? '',
    );

    // Poll while a job runs (or was just started) and stop once it reaches a final state.
    useEffect(() => {
        if (!running && !justStarted) {
            return;
        }

        const timer = window.setInterval(async () => {
            const result = await refetch();

            if (
                result.data &&
                !['processing', 'queued', 'pending'].includes(
                    result.data.status ?? '',
                )
            ) {
                setJustStarted(false);
            }
        }, 2000);

        return () => window.clearInterval(timer);
    }, [running, justStarted, refetch]);

    const upload = async () => {
        if (!file) {
            return;
        }

        try {
            const result = await start({ projectId, file, admin }).unwrap();
            toast.success(result.message);
            setFile(null);
            setJustStarted(true);
            void refetch();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const percent = status?.total
        ? Math.round(((status.processed ?? 0) / status.total) * 100)
        : 0;

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <div>
                <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                    Bulk task upload
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Add many tasks at once from a spreadsheet.
                </p>
            </div>
            <Card className="space-y-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                        <FileSpreadsheet className="size-5" />
                    </span>
                    <div>
                        <CardTitle>1. Download the template</CardTitle>
                        <CardDescription>
                            It lists this project's milestones so each task
                            lands in the right one.
                        </CardDescription>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={async () => {
                        try {
                            await downloadFile(
                                `${admin ? '/manage' : ''}/projects/${projectId}/tasks/bulk-upload/template`,
                                'task-upload-template.xlsx',
                            );
                        } catch (error) {
                            toast.error(
                                error instanceof Error
                                    ? error.message
                                    : 'The download failed.',
                            );
                        }
                    }}
                >
                    <Download className="size-4" /> Download template
                </Button>
            </Card>
            <Card className="space-y-4">
                <div>
                    <CardTitle>2. Upload the filled file</CardTitle>
                    <CardDescription>
                        .xlsx, .xls or .csv, up to 10 MB.
                    </CardDescription>
                </div>
                <input
                    ref={picker}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    hidden
                    onChange={(event) =>
                        setFile(event.target.files?.[0] ?? null)
                    }
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button
                        variant="outline"
                        onClick={() => picker.current?.click()}
                    >
                        Choose file
                    </Button>
                    <span className="truncate text-sm text-slate-600">
                        {file ? file.name : 'No file chosen'}
                    </span>
                </div>
                <Button
                    disabled={!file || running}
                    loading={isLoading}
                    onClick={upload}
                >
                    <Upload className="size-4" /> Upload tasks
                </Button>
            </Card>
            {status?.status ? (
                <Card
                    variant={status.status === 'failed' ? 'standard' : 'tinted'}
                    className="space-y-3"
                    role="status"
                >
                    <CardTitle>
                        Status:{' '}
                        <span className="capitalize">{status.status}</span>
                    </CardTitle>
                    {running ? (
                        <ProgressBar value={percent} label="Upload progress" />
                    ) : null}
                    {status.message ? (
                        <p className="text-sm text-slate-700">
                            {status.message}
                        </p>
                    ) : null}
                    {status.error ? (
                        <p
                            role="alert"
                            className="text-sm whitespace-pre-line text-red-600"
                        >
                            {status.error}
                        </p>
                    ) : null}
                </Card>
            ) : null}
            <Button asChild variant="ghost">
                <Link
                    to={
                        admin
                            ? `/admin/projects/${projectId}?tab=tasks`
                            : `/my-projects/${projectId}`
                    }
                >
                    Back to project
                </Link>
            </Button>
        </div>
    );
}

export function AdminBulkUploadPage() {
    return <BulkUploadPage scope="admin" />;
}
