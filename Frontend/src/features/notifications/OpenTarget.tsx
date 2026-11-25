import { Navigate, useParams } from 'react-router';

import { useAppSelector } from '@/app/hooks';
import { selectMe } from '@/features/auth/authSlice';
import { notificationPath } from '@/lib/notificationLink';

/** `/open/:type/:id` is what a web push click opens; it resolves to the right page for the viewer. */
export function OpenTarget() {
    const me = useAppSelector(selectMe)!;
    const { type = '', id = '' } = useParams();

    return <Navigate replace to={notificationPath(me.home, { type, id })} />;
}
