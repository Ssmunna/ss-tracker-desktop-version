import { FilePenLine, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage, fieldErrors } from '@/api/baseApi';
import { useSubmitManualReportMutation } from '@/api/endpoints/employee';
import { useAppSelector } from '@/app/hooks';
import { selectMe } from '@/features/auth/authSlice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/input';
import { Tooltip } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/usePermissions';
import { readStorage, writeStorage } from '@/lib/storage';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
});

function timeLabel(value: string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : timeFormatter.format(date);
}

/** Same sample the Vue report panel starts from. */
function defaultTemplate(date: string, code: string): string {
    return [
        `Date: ${date}`,
        `Employee ID: ${code}`,
        'Project: Project Name (PRJ-001)',
        'Hours: 4',
        '1. Built login API #1 | 2h',
        '2. Fixed pagination bug #2 | 2h',
        '',
        'Project: Another Project (PRJ-002)',
        'Hours: 3.5',
        '1. Added invoice export #5 | 1.5h',
        '2. Reviewed PR #6 | 2h',
    ].join('\n');
}

/** Topbar button + dialog to submit or edit today's report. Hidden without the permission or a profile. */
export function DailyReportButton() {
    const me = useAppSelector(selectMe);
    const { can } = usePermissions();
    const [open, setOpen] = useState(false);
    const report = me?.manual_report ?? null;
    const allowed =
        report !== null &&
        me?.developer != null &&
        can('employee-dashboard.manual-report.submit');

    if (!allowed) {
        return null;
    }

    return (
        <>
            <Tooltip content="Daily report">
                <button
                    type="button"
                    aria-label="Daily report"
                    onClick={() => setOpen(true)}
                    className="relative flex size-11 items-center justify-center rounded-xl text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none sm:size-10"
                >
                    <FilePenLine className="size-5" />
                    {!report.is_submitted_today ? (
                        <span className="absolute top-2 right-2 size-2 animate-live-pulse rounded-full bg-ember-400" />
                    ) : null}
                </button>
            </Tooltip>
            <DailyReportDialog open={open} onOpenChange={setOpen} />
        </>
    );
}

export function DailyReportDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            {open ? <DailyReportForm onOpenChange={onOpenChange} /> : null}
        </Modal>
    );
}

/** Mounted only while the dialog is open, so the draft is chosen fresh each time. */
function DailyReportForm({
    onOpenChange,
}: {
    onOpenChange: (open: boolean) => void;
}) {
    const report = useAppSelector(selectMe)!.manual_report!;
    const draftKey = `manual-report-draft:${report.developer_code.toUpperCase()}:${report.date}`;
    const [draft, setDraft] = useState(() => {
        const saved = readStorage(draftKey);

        if (saved && saved.trim() !== '') {
            return saved;
        }

        if (
            report.is_submitted_today &&
            (report.submitted_text ?? '').trim() !== ''
        ) {
            return report.submitted_text!;
        }

        return defaultTemplate(report.date, report.developer_code);
    });
    const [error, setError] = useState<string | null>(null);
    const [submit, { isLoading }] = useSubmitManualReportMutation();

    const send = async () => {
        setError(null);

        try {
            const result = await submit({ report_text: draft }).unwrap();
            writeStorage(draftKey, null);
            toast.success(result.message);
            onOpenChange(false);
        } catch (failure) {
            setError(fieldErrors(failure).report_text ?? errorMessage(failure));
        }
    };

    const submittedAt = timeLabel(report.submitted_at);
    const editedAt = timeLabel(report.updated_at);

    return (
        <>
            <ModalContent
                size="lg"
                title="Daily report"
                description={`Date: ${report.date} · Employee: ${report.developer_code}`}
                footer={
                    <>
                        <ModalClose asChild>
                            <Button variant="secondary">Close</Button>
                        </ModalClose>
                        <Button loading={isLoading} onClick={send}>
                            <Send className="size-4" />
                            {report.is_submitted_today
                                ? 'Update report'
                                : 'Submit report'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {report.is_edited ? (
                            <Badge tone="info">Edited</Badge>
                        ) : report.is_submitted_today ? (
                            <Badge tone="success">Submitted today</Badge>
                        ) : (
                            <Badge tone="warning">Draft</Badge>
                        )}
                        {submittedAt ? (
                            <span className="text-xs text-slate-500">
                                Submitted at {submittedAt}
                            </span>
                        ) : null}
                        {report.is_edited && editedAt ? (
                            <span className="text-xs text-slate-500">
                                Edited at {editedAt}
                            </span>
                        ) : null}
                    </div>
                    <Textarea
                        aria-label="Report text"
                        value={draft}
                        onChange={(event) => {
                            setDraft(event.target.value);
                            writeStorage(draftKey, event.target.value);
                        }}
                        rows={14}
                        className="font-mono text-xs"
                    />
                    {error ? (
                        <p
                            role="alert"
                            className="text-xs font-medium text-red-600"
                        >
                            {error}
                        </p>
                    ) : null}
                </div>
            </ModalContent>
        </>
    );
}
