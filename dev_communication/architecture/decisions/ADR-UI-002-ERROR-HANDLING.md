# ADR-UI-002: Error Handling Strategy

**Status:** Accepted
**Date:** 2026-01-27
**Domain:** UI

## Context

Error handling in the UI needs a consistent approach to ensure:
- Users understand what went wrong and how to recover
- Developers can debug issues effectively
- Accessibility requirements are met
- UX remains cohesive across the application

Without a defined strategy, error handling becomes inconsistent, leading to poor user experience and difficult debugging.

## Decision

### 1. Error Categories & Display Methods

| Category | Display Method | Component | Duration |
|----------|---------------|-----------|----------|
| API errors (mutations) | Toast | `useToast()` | 5 seconds |
| API errors (queries) | Inline error state | Error boundary / component | Persistent |
| Form validation | Inline messages | `<FormMessage>` | Until fixed |
| Network failures | Toast with retry | `useToast()` | Persistent until dismissed |
| Authentication | Redirect + toast | Router + `useToast()` | 5 seconds |
| Authorization | Inline or redirect | Depends on context | Persistent |
| Unexpected errors | Error boundary | `<ErrorBoundary>` | Persistent |

### 2. Error Handling Patterns

#### API Mutation Errors (React Query)

```typescript
import { useToast } from '@/shared/ui/use-toast';

const { toast } = useToast();

const mutation = useMutation({
  mutationFn: updateUser,
  onError: (error: ApiError) => {
    toast({
      variant: 'destructive',
      title: 'Failed to update user',
      description: error.message || 'Please try again.',
    });
  },
  onSuccess: () => {
    toast({
      title: 'User updated',
      description: 'Changes saved successfully.',
    });
  },
});
```

#### API Query Errors (React Query)

```typescript
const { data, error, isError, refetch } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});

if (isError) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error loading users</AlertTitle>
      <AlertDescription>
        {error.message}
        <Button variant="link" onClick={() => refetch()}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

#### Form Validation Errors (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const form = useForm({
  resolver: zodResolver(schema),
});

// In JSX - errors display inline via FormMessage
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage /> {/* Auto-displays validation errors */}
    </FormItem>
  )}
/>
```

#### Network Failures

```typescript
const mutation = useMutation({
  mutationFn: saveData,
  onError: (error) => {
    if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
      toast({
        variant: 'destructive',
        title: 'Connection lost',
        description: 'Check your internet connection.',
        action: (
          <ToastAction altText="Retry" onClick={() => mutation.mutate()}>
            Retry
          </ToastAction>
        ),
        duration: Infinity, // Persist until dismissed
      });
    }
  },
});
```

#### Authentication Errors (401)

```typescript
// In API client interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth state
      useAuthStore.getState().logout();

      // Redirect to login
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);

// On login page, show toast if redirected
useEffect(() => {
  if (searchParams.get('session') === 'expired') {
    toast({
      variant: 'destructive',
      title: 'Session expired',
      description: 'Please log in again.',
    });
  }
}, []);
```

#### Authorization Errors (403)

```typescript
// Option 1: Inline (for partial page access)
if (error?.response?.status === 403) {
  return (
    <Alert>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>
        You don't have permission to view this content.
      </AlertDescription>
    </Alert>
  );
}

// Option 2: Redirect (for full page access)
if (error?.response?.status === 403) {
  router.push('/unauthorized');
}
```

### 3. Error Boundary Pattern

```typescript
// src/shared/ui/error-boundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Optional: Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-muted-foreground">
            Please refresh the page or try again later.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage: Wrap pages or critical sections
<ErrorBoundary>
  <DashboardPage />
</ErrorBoundary>
```

### 4. Developer Error Logging

```typescript
// Always include context for debugging
try {
  await riskyOperation();
} catch (error) {
  console.error('[UserService] Failed to update preferences:', {
    error,
    userId: user.id,
    payload: sanitizedPayload, // Remove sensitive data
  });
  throw error; // Re-throw for UI handling
}
```

### 5. Error Message Guidelines

| Do | Don't |
|----|-------|
| "Failed to save changes. Please try again." | "Error: ECONNREFUSED" |
| "Email address is invalid" | "Validation failed" |
| "You don't have permission to edit this course" | "403 Forbidden" |
| "Connection lost. Check your internet." | "Network error" |
| "Session expired. Please log in again." | "401 Unauthorized" |

### 6. Accessibility Requirements

- All error messages must be announced to screen readers
- Use `role="alert"` for dynamic error messages
- Toast notifications use `aria-live="polite"`
- Form errors associated with inputs via `aria-describedby`
- Error states have sufficient color contrast (not just red)

```typescript
// shadcn Alert handles accessibility
<Alert variant="destructive" role="alert">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>{message}</AlertDescription>
</Alert>
```

### 7. Error State Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Error Occurs                                                │
│       │                                                      │
│       ├─── Is it a form validation error?                    │
│       │         YES → Display inline with FormMessage        │
│       │                                                      │
│       ├─── Is it a mutation (write) error?                   │
│       │         YES → Show toast notification                │
│       │                                                      │
│       ├─── Is it a query (read) error?                       │
│       │         YES → Show inline error state with retry     │
│       │                                                      │
│       ├─── Is it 401 Unauthorized?                           │
│       │         YES → Redirect to login                      │
│       │                                                      │
│       ├─── Is it 403 Forbidden?                              │
│       │         YES → Show access denied (inline or page)    │
│       │                                                      │
│       ├─── Is it a network error?                            │
│       │         YES → Toast with retry action                │
│       │                                                      │
│       └─── Unexpected error                                  │
│                 → ErrorBoundary catches, shows fallback      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Consequences

### Positive
- Consistent error UX across the application
- Users always know what went wrong and how to recover
- Developers have clear patterns to follow
- Accessible error handling by default

### Negative
- More boilerplate for error handling
- Toast overuse could annoy users (mitigated by guidelines)
- Requires discipline to follow patterns

### Neutral
- Existing error handling should migrate gradually
- Works with current shadcn + React Query stack

## Alternatives Considered

### Global Error Handler Only
- **Rejected**: Too generic; loses context-specific recovery options.

### Alert Dialogs for All Errors
- **Rejected**: Too intrusive; blocks user flow unnecessarily.

### Console-Only Logging
- **Rejected**: Users need feedback; console is developer-only.

## Links

- Decision log: [[../decision-log]]
- Related ADRs:
  - [[ADR-UI-001-FSD-ARCHITECTURE]] (component organization)
  - [[ADR-UI-FORM-001-STANDARDIZED-FORM-PATTERN]] (form validation)
  - [[ADR-API-001-API-DESIGN-STANDARDS]] (API error response format)
- Guidance:
  - `../../guidance/FEATURE_DEVELOPMENT_CHECKLIST.md` (E1 rule)
- Implementation:
  - `src/shared/ui/use-toast.ts` - Toast hook
  - `src/shared/ui/alert.tsx` - Alert component
  - `src/shared/ui/error-boundary.tsx` - Error boundary
