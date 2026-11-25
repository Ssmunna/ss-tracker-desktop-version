import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { errorMessage } from '@/api/baseApi';
import type { ProjectLink } from '@/api/project-types';
import { useSaveProjectLinksMutation } from '@/api/endpoints/adminProjectDetail';
import { Button } from '@/components/ui/button';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import { FormMessage } from '@/features/auth/AuthCard';
import { applyServerErrors } from '@/lib/forms';

import { LinksFields } from '../LinksFields';
import { linksPayload, linksSchema, type LinksFormValues } from '../linksForm';

const schema = z.object({ links: linksSchema });

/** Add, change or remove the links of a project without opening the whole project form. */
export function LinksDialog({
    projectId,
    links,
    open,
    onOpenChange,
}: {
    projectId: number;
    links: ProjectLink[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            {open ? (
                <LinksForm
                    projectId={projectId}
                    links={links}
                    onDone={() => onOpenChange(false)}
                />
            ) : null}
        </Modal>
    );
}

function LinksForm({
    projectId,
    links,
    onDone,
}: {
    projectId: number;
    links: ProjectLink[];
    onDone: () => void;
}) {
    const [save, { isLoading }] = useSaveProjectLinksMutation();
    const [formError, setFormError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<LinksFormValues>({
        resolver: zodResolver(schema) as unknown as Resolver<LinksFormValues>,
        defaultValues: {
            links:
                links.length > 0
                    ? links.map((link) => ({
                          label: link.label ?? '',
                          url: link.url,
                      }))
                    : [{ label: '', url: '' }],
        },
    });

    const onSubmit = async (values: LinksFormValues) => {
        setFormError(null);

        try {
            const result = await save({
                projectId,
                links: linksPayload(values.links),
            }).unwrap();
            toast.success(result.message);
            onDone();
        } catch (error) {
            setFormError(
                applyServerErrors(
                    error,
                    setError,
                    values.links.map(
                        (_, index) => `links.${index}.url` as never,
                    ),
                ) ?? errorMessage(error),
            );
        }
    };

    return (
        <ModalContent
            title="Project links"
            description="Google Drive or any other link the team should reach."
            size="lg"
            footer={
                <>
                    <ModalClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </ModalClose>
                    <Button
                        type="submit"
                        form="project-links-form"
                        loading={isLoading}
                    >
                        Save links
                    </Button>
                </>
            }
        >
            <form
                id="project-links-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-3 pt-1"
            >
                <FormMessage>{formError}</FormMessage>
                <LinksFields
                    control={control}
                    register={register}
                    errors={errors}
                />
            </form>
        </ModalContent>
    );
}
