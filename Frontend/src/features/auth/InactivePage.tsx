import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

import { AuthCard } from './AuthCard';

/** Inactive employees and clients are signed out and land here (no app navigation). */
export function InactivePage() {
    const navigate = useNavigate();

    return (
        <AuthCard
            title="Account inactive"
            description="Your account is not active. Please contact your administrator."
        >
            <Button
                variant="outline"
                block
                onClick={() => navigate('/login', { replace: true })}
            >
                Back to log in
            </Button>
        </AuthCard>
    );
}
