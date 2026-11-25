import { useState } from 'react';
import { toast } from 'sonner';

import { errorMessage } from '@/api/baseApi';
import { useSaveProjectTeamMutation } from '@/api/endpoints/employeeProject';
import type { ProjectDetail } from '@/api/project-types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';

/** The project owner picks who works on the project (in the selected phase). */
export function TeamDialog({
    detail,
    open,
    onOpenChange,
}: {
    detail: ProjectDetail;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            {open ? (
                <TeamForm detail={detail} onDone={() => onOpenChange(false)} />
            ) : null}
        </Modal>
    );
}

function TeamForm({
    detail,
    onDone,
}: {
    detail: ProjectDetail;
    onDone: () => void;
}) {
    const [selected, setSelected] = useState<number[]>(
        detail.project.team_developers
            .filter((developer) => developer.assigned)
            .map((developer) => developer.id),
    );
    const [save, { isLoading }] = useSaveProjectTeamMutation();

    const submit = async () => {
        try {
            const result = await save({
                projectId: detail.project.id,
                assigned_developer_ids: selected,
                project_phase_id: detail.selected_phase_id,
            }).unwrap();
            toast.success(result.message);
            onDone();
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    return (
        <ModalContent
            title="Project team"
            description="Choose the employees working on this project."
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button loading={isLoading} onClick={submit}>
                        Save team
                    </Button>
                </>
            }
        >
            <ul className="space-y-1 pt-1">
                {detail.project.team_developers.map((developer) => (
                    <li key={developer.id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-slate-50">
                            <Checkbox
                                checked={selected.includes(developer.id)}
                                onCheckedChange={(checked) =>
                                    setSelected((current) =>
                                        checked === true
                                            ? [...current, developer.id]
                                            : current.filter(
                                                  (id) => id !== developer.id,
                                              ),
                                    )
                                }
                            />
                            <span className="font-medium text-slate-900">
                                {developer.name}
                            </span>
                            <span className="text-xs text-slate-400">
                                {developer.developer_code}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </ModalContent>
    );
}
