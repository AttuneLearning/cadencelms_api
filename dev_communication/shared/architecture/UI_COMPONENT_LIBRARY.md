# UI Component Library Reference

**Version:** 1.0.0
**Last Updated:** 2026-01-22
**Location:** `src/shared/ui/`

This document provides a comprehensive reference for all standardized UI components available in the application. Components are organized by category and include usage examples, props, and best practices.

---

## Table of Contents

1. [Page-Level Components](#page-level-components)
   - [PageHeader](#pageheader)
   - [ErrorPanel](#errorpanel)
   - [DataShapeWarning](#datashapewarning)
2. [Data Display Components](#data-display-components)
   - [DataTable](#datatable)
   - [UserCard](#usercard)
   - [Skeleton](#skeleton)
3. [Navigation Components](#navigation-components)
   - [ProtectedLink](#protectedlink)
4. [Form Components](#form-components)
   - [Form (RHF)](#form-rhf)
   - [PasswordInput](#passwordinput)
   - [DateRangePicker](#daterangepicker)
5. [Dialog Components](#dialog-components)
   - [ConfirmDialog](#confirmdialog)
6. [Primitive Components (shadcn/ui)](#primitive-components-shadcnui)

---

## Page-Level Components

### PageHeader

**File:** `src/shared/ui/page-header.tsx`

Standardized page header component for consistent page titles across the application.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Page title text |
| `description` | `React.ReactNode` | No | - | Optional subtitle/description |
| `children` | `React.ReactNode` | No | - | Action buttons (rendered on the right) |
| `backButton` | `React.ReactNode` | No | - | Back navigation element (rendered before title) |
| `className` | `string` | No | - | Additional CSS classes |

#### Usage Examples

```tsx
import { PageHeader } from '@/shared/ui/page-header';

// Basic usage
<PageHeader
  title="My Courses"
  description="Track your learning progress"
/>

// With action buttons
<PageHeader
  title="Course Management"
  description="Create and manage courses"
>
  <Button onClick={handleCreate}>
    <Plus className="mr-2 h-4 w-4" />
    Create Course
  </Button>
</PageHeader>

// With back navigation
<PageHeader
  title="Edit Module"
  description="Configure module settings"
  backButton={
    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Button>
  }
/>

// Dynamic title
<PageHeader
  title={`Welcome back, ${user?.firstName || 'Learner'}!`}
  description="Here's your learning overview"
/>
```

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [BackButton] Title                              [Action Buttons]│
│              Description text                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### ErrorPanel

**File:** `src/shared/ui/error-panel.tsx`

Standardized error display panel with retry functionality, navigation links, and technical details.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | `"Unable to load page"` | Error title |
| `message` | `string` | No | - | Error message (auto-extracted from error if not provided) |
| `error` | `unknown` | No | - | Error object (supports `ApiClientError`, `Error`) |
| `details` | `ErrorPanelDetails` | No | - | Technical details object |
| `onRetry` | `() => void` | No | - | Retry callback function |
| `links` | `ErrorPanelLink[]` | No | - | Navigation links array |

#### Interfaces

```tsx
interface ErrorPanelDetails {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  requestId?: string;
  component?: string;
  stack?: string;
}

interface ErrorPanelLink {
  label: string;
  to: string;
}
```

#### Usage Examples

```tsx
import { ErrorPanel } from '@/shared/ui/error-panel';

// Basic error
<ErrorPanel
  title="Failed to load courses"
  message="Unable to fetch course data from the server."
/>

// With retry
<ErrorPanel
  error={error}
  onRetry={() => refetch()}
/>

// With navigation links
<ErrorPanel
  title="Course not found"
  message="The requested course does not exist."
  links={[
    { label: 'Go to Dashboard', to: '/dashboard' },
    { label: 'Browse Courses', to: '/courses' },
  ]}
/>

// With full details
<ErrorPanel
  error={error}
  details={{
    endpoint: '/api/courses/123',
    method: 'GET',
    component: 'CourseDetailPage',
  }}
  onRetry={() => refetch()}
/>
```

---

### DataShapeWarning

**File:** `src/shared/ui/data-shape-warning.tsx`

Warning alert for API data validation issues. Shows when received data doesn't match expected format.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | No | `"Unexpected data shape"` | Warning title |
| `message` | `string` | No | `"Some data did not match..."` | Warning message |
| `details` | `DataShapeWarningDetails` | No | - | Technical details |

#### Usage

```tsx
import { DataShapeWarning } from '@/shared/ui/data-shape-warning';

<DataShapeWarning
  title="Invalid course data"
  message="Course structure doesn't match expected format."
  details={{
    endpoint: '/api/courses/123',
    expected: 'Course object with modules array',
    received: data,
  }}
/>
```

---

## Data Display Components

### DataTable

**File:** `src/shared/ui/data-table.tsx`

Reusable data table built on TanStack Table with sorting, filtering, pagination, and row selection.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | `ColumnDef<TData, TValue>[]` | Yes | - | Column definitions |
| `data` | `TData[]` | Yes | - | Table data array |
| `searchable` | `boolean` | No | `false` | Enable global search |
| `searchPlaceholder` | `string` | No | `"Search..."` | Search input placeholder |
| `onRowSelectionChange` | `(selectedRows: TData[]) => void` | No | - | Selection change callback |

#### Usage

```tsx
import { DataTable } from '@/shared/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
];

<DataTable
  columns={columns}
  data={users}
  searchable
  searchPlaceholder="Search users..."
  onRowSelectionChange={(selected) => setSelectedUsers(selected)}
/>
```

#### Features

- **Sorting:** Click column headers to sort
- **Pagination:** Built-in pagination with first/prev/next/last controls
- **Global Search:** Optional search across all columns
- **Row Selection:** Checkbox selection with callback

---

### UserCard

**File:** `src/shared/ui/UserCard.tsx`

Display user information card with Person data support.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `person` | `IPerson` | No | - | Person data object (v2.0) |
| `displayName` | `string` | No | - | Name override |
| `email` | `string` | No | - | Email override |
| `phone` | `string` | No | - | Phone override |
| `avatar` | `string` | No | - | Avatar URL override |
| `showPronouns` | `boolean` | No | `false` | Show pronouns badge |
| `showContact` | `boolean` | No | `true` | Show contact info |
| `showBio` | `boolean` | No | `false` | Show bio/headline |
| `layout` | `'vertical' \| 'horizontal'` | No | `'vertical'` | Layout orientation |
| `avatarSize` | `AvatarSize` | No | `'lg'` | Avatar size |
| `onClick` | `() => void` | No | - | Click handler |

#### Usage

```tsx
import { UserCard } from '@/shared/ui/UserCard';

// With Person data
<UserCard
  person={personData}
  showPronouns
  showContact
  layout="horizontal"
/>

// With manual props
<UserCard
  displayName="John Doe"
  email="john@example.com"
  avatar="/avatars/john.jpg"
/>
```

---

### Skeleton

**File:** `src/shared/ui/skeleton.tsx`

Loading placeholder component for skeleton loading states.

#### Usage

```tsx
import { Skeleton } from '@/shared/ui/skeleton';

// Loading state
<div className="space-y-2">
  <Skeleton className="h-8 w-64" />      {/* Title */}
  <Skeleton className="h-4 w-96" />      {/* Description */}
  <Skeleton className="h-32 w-full" />   {/* Content */}
</div>
```

---

## Navigation Components

### ProtectedLink

**File:** `src/shared/ui/ProtectedLink.tsx`

Permission-aware navigation link that only renders if user has required permissions.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `to` | `string` | Yes | - | Link destination |
| `requiredPermission` | `string` | No | - | Single permission requirement |
| `requiredPermissions` | `string[]` | No | - | Multiple permission requirements |
| `requireAll` | `boolean` | No | `false` | If true, ALL permissions required |
| `departmentScoped` | `boolean` | No | `false` | Check in current department |
| `departmentId` | `string` | No | - | Specific department ID |
| `fallback` | `React.ReactNode` | No | `null` | Render when no access |
| `children` | `React.ReactNode` | No | - | Link content |

#### Usage Examples

```tsx
import { ProtectedLink } from '@/shared/ui/ProtectedLink';

// Single permission
<ProtectedLink
  to="/courses/create"
  requiredPermission="content:courses:create"
>
  Create Course
</ProtectedLink>

// Multiple permissions (ANY - OR logic)
<ProtectedLink
  to="/courses"
  requiredPermissions={['content:courses:read', 'content:courses:manage']}
>
  View Courses
</ProtectedLink>

// Multiple permissions (ALL - AND logic)
<ProtectedLink
  to="/admin/settings"
  requiredPermissions={['system:settings:read', 'system:settings:manage']}
  requireAll
>
  Admin Settings
</ProtectedLink>

// Department-scoped
<ProtectedLink
  to="/department/reports"
  requiredPermission="reports:department:read"
  departmentScoped
>
  Department Reports
</ProtectedLink>

// With fallback
<ProtectedLink
  to="/admin/settings"
  requiredPermission="system:admin:access"
  fallback={<span className="text-gray-400">Settings (No Access)</span>}
>
  Settings
</ProtectedLink>
```

---

## Form Components

### Form (RHF)

**File:** `src/shared/ui/form.tsx`

Standardized React Hook Form + shadcn pattern for consistent layout, validation, and accessibility.

**Decision Doc:** `api/agent_coms/docs/architecture/decisions/ADR-UI-FORM-001-STANDARDIZED-FORM-PATTERN.md`

#### Usage Example

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: '' },
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### Guidance

- Wrap forms with `<Form {...form}>` to provide RHF context.
- Use `FormField` with `control` + `render` instead of `register()` for consistency.
- Place inputs directly inside `FormControl` so IDs and aria props attach to the input.

### PasswordInput

**File:** `src/shared/ui/password-input.tsx`

Password input with visibility toggle button.

#### Props

Inherits all standard `<input>` props except `type`.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `wrapperClassName` | `string` | No | - | Wrapper div className |

#### Usage

```tsx
import { PasswordInput } from '@/shared/ui/password-input';

<PasswordInput
  placeholder="Enter password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>

// With react-hook-form
<PasswordInput {...register('password')} />
```

---

### DateRangePicker

**File:** `src/shared/ui/date-range-picker.tsx`

Date range selection component with dual-month calendar.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `DateRange` | No | - | Selected date range |
| `onChange` | `(range: DateRange \| undefined) => void` | No | - | Change handler |
| `placeholder` | `string` | No | `"Select date range"` | Placeholder text |
| `disabled` | `boolean` | No | `false` | Disable picker |
| `className` | `string` | No | - | Additional classes |

#### Usage

```tsx
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';

const [dateRange, setDateRange] = useState<DateRange | undefined>();

<DateRangePicker
  value={dateRange}
  onChange={setDateRange}
  placeholder="Select report period"
/>
```

---

## Dialog Components

### ConfirmDialog

**File:** `src/shared/ui/confirm-dialog.tsx`

Reusable confirmation dialog for destructive or important actions.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `open` | `boolean` | Yes | - | Dialog open state |
| `onOpenChange` | `(open: boolean) => void` | Yes | - | Open state handler |
| `onConfirm` | `() => void` | Yes | - | Confirm callback |
| `title` | `string` | Yes | - | Dialog title |
| `description` | `string` | Yes | - | Dialog description |
| `confirmText` | `string` | No | `"Confirm"` | Confirm button text |
| `cancelText` | `string` | No | `"Cancel"` | Cancel button text |
| `isDestructive` | `boolean` | No | `false` | Use destructive button variant |
| `isLoading` | `boolean` | No | `false` | Show loading state |

#### Usage

```tsx
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

const [showDialog, setShowDialog] = useState(false);

<ConfirmDialog
  open={showDialog}
  onOpenChange={setShowDialog}
  onConfirm={handleDelete}
  title="Delete Course"
  description="Are you sure you want to delete this course? This action cannot be undone."
  confirmText="Delete"
  isDestructive
  isLoading={isDeleting}
/>
```

---

## Primitive Components (shadcn/ui)

These components are based on [shadcn/ui](https://ui.shadcn.com/) and Radix UI primitives.

### Layout & Container

| Component | File | Description |
|-----------|------|-------------|
| `Card` | `card.tsx` | Container with header, content, footer |
| `Separator` | `separator.tsx` | Visual divider |
| `Collapsible` | `collapsible.tsx` | Expandable/collapsible content |

### Forms & Input

| Component | File | Description |
|-----------|------|-------------|
| `Button` | `button.tsx` | Standard button with variants |
| `Input` | `input.tsx` | Text input field |
| `Textarea` | `textarea.tsx` | Multi-line text input |
| `Select` | `select.tsx` | Dropdown select |
| `Checkbox` | `checkbox.tsx` | Checkbox input |
| `Switch` | `switch.tsx` | Toggle switch |
| `RadioGroup` | `radio-group.tsx` | Radio button group |
| `Label` | `label.tsx` | Form labels |
| `Form` | `form.tsx` | Form wrapper with validation |

### Feedback & Display

| Component | File | Description |
|-----------|------|-------------|
| `Alert` | `alert.tsx` | Alert messages |
| `Badge` | `badge.tsx` | Status badges/tags |
| `Progress` | `progress.tsx` | Progress bar |
| `Toast/Toaster` | `toast.tsx`, `toaster.tsx` | Toast notifications |
| `Tooltip` | `tooltip.tsx` | Hover tooltips |

### Overlay & Dialog

| Component | File | Description |
|-----------|------|-------------|
| `Dialog` | `dialog.tsx` | Modal dialog |
| `AlertDialog` | `alert-dialog.tsx` | Alert/confirmation dialog |
| `Popover` | `popover.tsx` | Popover content |
| `DropdownMenu` | `dropdown-menu.tsx` | Dropdown menus |

### Navigation & Display

| Component | File | Description |
|-----------|------|-------------|
| `Tabs` | `tabs.tsx` | Tab navigation |
| `Table` | `table.tsx` | HTML table primitives |
| `Avatar` | `avatar.tsx` | User avatars |
| `Calendar` | `calendar.tsx` | Date picker calendar |

---

## Best Practices

### 1. Use PageHeader for All Pages

```tsx
// DO: Use PageHeader
<PageHeader title="My Page" description="Page description" />

// DON'T: Create inline headers
<div>
  <h1 className="text-3xl font-bold">My Page</h1>
  <p>Page description</p>
</div>
```

### 2. Use ErrorPanel for Error States

```tsx
// DO: Use ErrorPanel
if (error) {
  return <ErrorPanel error={error} onRetry={refetch} />;
}

// DON'T: Create custom error displays
if (error) {
  return <div className="text-red-500">Error: {error.message}</div>;
}
```

### 3. Use Skeleton for Loading States

```tsx
// DO: Use Skeleton components
if (isLoading) {
  return (
    <div>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>
  );
}
```

### 4. Use ProtectedLink for Permission-Gated Navigation

```tsx
// DO: Use ProtectedLink
<ProtectedLink to="/admin" requiredPermission="admin:access">
  Admin Panel
</ProtectedLink>

// DON'T: Manually check permissions
{hasPermission('admin:access') && <Link to="/admin">Admin Panel</Link>}
```

### 5. Use ConfirmDialog for Destructive Actions

```tsx
// DO: Use ConfirmDialog
<ConfirmDialog
  open={showDelete}
  onConfirm={handleDelete}
  title="Delete Item"
  description="This cannot be undone."
  isDestructive
/>
```

---

## Import Paths

All shared UI components should be imported from `@/shared/ui/`:

```tsx
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel } from '@/shared/ui/error-panel';
import { DataTable } from '@/shared/ui/data-table';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ProtectedLink } from '@/shared/ui/ProtectedLink';
import { PasswordInput } from '@/shared/ui/password-input';
import { DateRangePicker } from '@/shared/ui/date-range-picker';
import { UserCard } from '@/shared/ui/UserCard';
import { DataShapeWarning } from '@/shared/ui/data-shape-warning';
import { Skeleton } from '@/shared/ui/skeleton';

// Primitives
import { Button } from '@/shared/ui/button';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Alert, AlertDescription } from '@/shared/ui/alert';
// ... etc
```
