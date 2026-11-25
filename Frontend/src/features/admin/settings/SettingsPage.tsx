import { useSearchParams } from 'react-router';

import { useGetSettingsQuery } from '@/api/endpoints/settings';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/features/admin/org/shared';

import { AutomationTab } from './AutomationTab';
import { CalendarTab } from './CalendarTab';
import { DriveTab } from './DriveTab';
import { GeneralTab } from './GeneralTab';
import { PrayerTab } from './PrayerTab';

export function SettingsPage() {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') ?? 'general';
    const { data, isLoading, isError, refetch } = useGetSettingsQuery();

    if (isError) {
        return (
            <ErrorState
                title="Could not load settings"
                action={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetch()}
                    >
                        Try again
                    </Button>
                }
            />
        );
    }

    return (
        <div className="space-y-5">
            <PageHeader
                title="Settings"
                description="Workspace branding, calendar, automation and integrations."
            />
            {isLoading || !data ? (
                <div className="space-y-4">
                    <Skeleton className="h-11 w-full max-w-md" />
                    <Skeleton className="h-64 w-full" />
                </div>
            ) : (
                <Tabs
                    value={tab}
                    onValueChange={(value) =>
                        setParams(value === 'general' ? {} : { tab: value }, {
                            replace: true,
                        })
                    }
                >
                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="calendar">Calendar</TabsTrigger>
                        <TabsTrigger value="automation">Automation</TabsTrigger>
                        <TabsTrigger value="prayer">Prayer times</TabsTrigger>
                        <TabsTrigger value="drive">Google Drive</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general">
                        <GeneralTab
                            key={data.settings.website_name}
                            settings={data.settings}
                        />
                    </TabsContent>
                    <TabsContent value="calendar">
                        <CalendarTab settings={data.settings} />
                    </TabsContent>
                    <TabsContent value="automation">
                        <AutomationTab settings={data.settings} />
                    </TabsContent>
                    <TabsContent value="prayer">
                        <PrayerTab />
                    </TabsContent>
                    <TabsContent value="drive">
                        <DriveTab settings={data.settings} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
