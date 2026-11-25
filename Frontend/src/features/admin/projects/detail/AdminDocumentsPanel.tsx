import { ExternalLink, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import type { AdminProjectDetail } from '@/api/admin-detail-types';
import type { DriveDocument } from '@/api/project-types';
import {
    useDeleteAdminDocumentMutation,
    useUploadAdminDocumentMutation,
} from '@/api/endpoints/adminProjectDetail';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/features/employee/workspace/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useRun } from '@/hooks/useRun';
import { formatDateTime } from '@/lib/date';
import { fileIconFor } from '@/lib/file-icon';

const size = (bytes: number) =>
    bytes > 1048576
        ? `${(bytes / 1048576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function AdminDocumentsPanel({
    detail,
}: {
    detail: AdminProjectDetail;
}) {
    const { can } = usePermissions();
    const run = useRun();
    const projectId = detail.project.id;
    const picker = useRef<HTMLInputElement>(null);
    const [deleting, setDeleting] = useState<DriveDocument | null>(null);
    const [upload, { isLoading: uploading }] = useUploadAdminDocumentMutation();
    const [remove, { isLoading: removing }] = useDeleteAdminDocumentMutation();

    return (
        <div className="space-y-4">
            <SectionHeader
                title="Documents"
                description="Files in the project's Google Drive folder."
                action={
                    can('projects.documents.upload') ? (
                        <>
                            <input
                                ref={picker}
                                type="file"
                                hidden
                                onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    event.target.value = '';
                                    if (file)
                                        void run(upload({ projectId, file }));
                                }}
                            />
                            <Button
                                size="sm"
                                loading={uploading}
                                onClick={() => picker.current?.click()}
                            >
                                <Upload className="size-4" /> Upload
                            </Button>
                        </>
                    ) : undefined
                }
            />
            {detail.documents_error ? (
                <ErrorState
                    title="Documents are not available"
                    description={detail.documents_error}
                />
            ) : null}
            {!detail.documents_error && detail.documents.length === 0 ? (
                <Card variant="flush">
                    <EmptyState
                        title="No documents yet"
                        description={
                            detail.project.has_drive_folder
                                ? undefined
                                : 'This project has no Drive folder yet.'
                        }
                    />
                </Card>
            ) : (
                <ul className="space-y-2">
                    {detail.documents.map((document) => {
                        const Icon = fileIconFor(
                            document.mime_type,
                            document.name,
                        );

                        return (
                            <li key={document.id}>
                                <Card className="flex items-center gap-3 p-3.5">
                                    <Icon className="size-5 shrink-0 text-slate-400" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-900">
                                            {document.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {size(document.size)} ·{' '}
                                            {formatDateTime(
                                                document.created_at,
                                            )}
                                        </p>
                                    </div>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        aria-label={`Open ${document.name}`}
                                    >
                                        <a
                                            href={document.web_view_link}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <ExternalLink className="size-4" />
                                        </a>
                                    </Button>
                                    {can('projects.documents.delete') ? (
                                        <Button
                                            variant="destructiveSoft"
                                            size="icon"
                                            aria-label={`Delete ${document.name}`}
                                            onClick={() =>
                                                setDeleting(document)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    ) : null}
                                </Card>
                            </li>
                        );
                    })}
                </ul>
            )}
            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                destructive
                title="Delete document?"
                description={
                    deleting
                        ? `"${deleting.name}" will be removed from Google Drive.`
                        : ''
                }
                confirmLabel="Delete"
                loading={removing}
                onConfirm={async () => {
                    if (
                        deleting &&
                        (await run(remove({ projectId, fileId: deleting.id })))
                    ) {
                        setDeleting(null);
                    }
                }}
            />
        </div>
    );
}
