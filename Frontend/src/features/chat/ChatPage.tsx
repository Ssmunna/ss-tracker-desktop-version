import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';

import { useGetConversationsQuery } from '@/api/endpoints/chat';
import { useAppSelector } from '@/app/hooks';
import { EmptyState } from '@/components/ui/empty-state';
import { selectMe } from '@/features/auth/authSlice';
import { ChatLayout } from '@/layouts/ChatLayout';

import { ConversationList } from './ConversationList';
import { NewConversationDialog } from './NewConversationDialog';
import { Thread } from './Thread';

export function ChatPage() {
    const me = useAppSelector(selectMe)!;
    const params = useParams();
    const activeId = params.conversationId
        ? Number(params.conversationId)
        : null;
    const { data, isLoading, isError, refetch } = useGetConversationsQuery();
    const [creating, setCreating] = useState(false);
    const isClient = me.client !== null;

    return (
        <>
            <ChatLayout
                showThread={activeId !== null}
                list={
                    <ConversationList
                        conversations={data?.conversations}
                        activeId={activeId}
                        loading={isLoading}
                        error={isError}
                        canStart={!isClient}
                        onNew={() => setCreating(true)}
                        onRetry={() => refetch()}
                    />
                }
                thread={
                    activeId !== null ? (
                        <Thread
                            key={activeId}
                            conversationId={activeId}
                            self={{
                                id: me.user.id,
                                name: me.user.name,
                                isClient,
                            }}
                        />
                    ) : (
                        <EmptyState
                            icon={MessageSquare}
                            title="Pick a conversation"
                            description="Your messages show up here."
                            className="m-auto"
                        />
                    )
                }
            />
            <NewConversationDialog
                open={creating}
                onOpenChange={setCreating}
                options={data}
            />
        </>
    );
}
