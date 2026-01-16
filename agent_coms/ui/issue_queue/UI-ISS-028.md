# UI-UI-ISS-028: Fix System Reports Page

**Priority:** Critical  
**Phase:** 2 - Core Pages  
**Status:** 🔲 Not Started  
**Created:** 2026-01-15  
**Estimated Hours:** 4  
**Depends On:** UI-ISS-027  
**Blocks:** UI-ISS-029  
**Related:** UI-ISS-023 (Admin Sidebar Reports Navigation)

---

## Summary

Fix the System Reports page that is currently causing navigation issues (UI-ISS-023). The page needs to be refactored to use the new Report System types and hooks.

---

## Background

UI-ISS-023 identified that clicking "Reports" in the admin sidebar causes issues. This is likely due to:
1. The Reports page expecting endpoints that don't exist yet
2. Missing error handling for API failures
3. Incorrect routing configuration

This issue unblocks UI-ISS-023 by providing a working Reports page.

---

## Requirements

### 1. Identify Current Reports Page Location

First, locate the existing reports page(s) in the codebase:
- Check `src/pages/admin/reports/`
- Check routing configuration in `src/app/router.tsx`
- Identify any existing report-related components

### 2. Refactor Reports Page

Create or update the main Reports page to:
- Use the new hooks (useReportJobs, useReportTemplates)
- Handle loading and error states gracefully
- Show a dashboard-style overview

**File:** `src/pages/admin/reports/ReportsPage.tsx`

```typescript
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useReportJobs } from '@/entities/report-job';
import { useSystemReportTemplates, useMyReportTemplates } from '@/entities/report-template';
import { Loader2, FileText, Clock, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use hooks with error handling
  const { data: recentJobs, isLoading: jobsLoading, error: jobsError } = useReportJobs({
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const { data: systemTemplates, isLoading: templatesLoading } = useSystemReportTemplates();
  const { data: myTemplates } = useMyReportTemplates();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and manage reports for your organization
          </p>
        </div>
        <Link to="/admin/reports/builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Recent Jobs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickStatCard
              title="Pending Reports"
              value={recentJobs?.data.filter(j => j.state === 'pending').length ?? 0}
              icon={<Clock className="h-4 w-4" />}
              loading={jobsLoading}
            />
            <QuickStatCard
              title="Ready for Download"
              value={recentJobs?.data.filter(j => j.state === 'ready').length ?? 0}
              icon={<CheckCircle className="h-4 w-4" />}
              loading={jobsLoading}
            />
            <QuickStatCard
              title="System Templates"
              value={systemTemplates?.length ?? 0}
              icon={<FileText className="h-4 w-4" />}
              loading={templatesLoading}
            />
            <QuickStatCard
              title="My Templates"
              value={myTemplates?.length ?? 0}
              icon={<FileText className="h-4 w-4" />}
              loading={templatesLoading}
            />
          </div>

          {/* Error State */}
          {jobsError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Unable to load report data. The reporting API may not be available yet.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : systemTemplates && systemTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {systemTemplates.slice(0, 6).map((template) => (
                    <TemplateCard key={template._id} template={template} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No system templates available. Check back later.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Report Jobs</CardTitle>
              <Link to="/admin/reports/jobs">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : recentJobs && recentJobs.data.length > 0 ? (
                <ReportJobsList jobs={recentJobs.data} />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No report jobs yet. Create your first report!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Report Templates</CardTitle>
              <Link to="/admin/reports/templates">
                <Button variant="outline" size="sm">Manage Templates</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {myTemplates && myTemplates.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">My Templates</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {myTemplates.map((template) => (
                          <TemplateCard key={template._id} template={template} />
                        ))}
                      </div>
                    </div>
                  )}
                  {systemTemplates && systemTemplates.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">System Templates</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {systemTemplates.map((template) => (
                          <TemplateCard key={template._id} template={template} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper components - implement in separate files
function QuickStatCard({ title, value, icon, loading }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateCard({ template }) {
  return (
    <Link to={`/admin/reports/builder?template=${template._id}`}>
      <Card className="hover:bg-accent cursor-pointer transition-colors">
        <CardContent className="pt-4">
          <h4 className="font-medium">{template.name}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description || 'No description'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ReportJobsList({ jobs }) {
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <Link key={job._id} to={`/admin/reports/jobs/${job._id}`}>
          <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer">
            <div>
              <p className="font-medium">{job.name}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>
            <JobStatusBadge state={job.state} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function JobStatusBadge({ state }) {
  const variants = {
    pending: 'bg-yellow-100 text-yellow-800',
    queued: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    downloaded: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
    expired: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${variants[state] || 'bg-gray-100'}`}>
      {state}
    </span>
  );
}

export default ReportsPage;
```

### 3. Add Error Boundary

Wrap the Reports page with an error boundary to prevent crashes:

```typescript
// In router configuration
<Route 
  path="reports" 
  element={
    <ErrorBoundary fallback={<ReportsErrorFallback />}>
      <ReportsPage />
    </ErrorBoundary>
  } 
/>
```

### 4. Verify Routing

Ensure routing is correctly configured in `src/app/router.tsx`:

```typescript
// Admin routes
{
  path: 'reports',
  children: [
    { index: true, element: <ReportsPage /> },
    { path: 'jobs', element: <ReportJobsListPage /> },
    { path: 'jobs/:id', element: <ReportJobDetailPage /> },
    { path: 'templates', element: <ReportTemplatesPage /> },
    { path: 'templates/:id', element: <ReportTemplateDetailPage /> },
    { path: 'schedules', element: <ReportSchedulesPage /> },
    { path: 'builder', element: <CustomReportBuilderPage /> },
  ],
}
```

---

## Acceptance Criteria

- [ ] Reports page loads without errors
- [ ] Clicking "Reports" in admin sidebar works (UI-ISS-023 resolved)
- [ ] Loading states display correctly
- [ ] Error states are handled gracefully (API not available message)
- [ ] Quick stats cards show correct data
- [ ] Template cards are clickable and link to builder
- [ ] Recent jobs list shows job status
- [ ] Page is responsive

---

## Testing Notes

- Test with API unavailable (should show error message, not crash)
- Test with empty data (no jobs, no templates)
- Test navigation from sidebar
- Test tab switching

---

## Notes

- This issue unblocks UI-ISS-023
- Page should work even if API is not ready (graceful degradation)
- Consider creating placeholder pages for sub-routes initially
