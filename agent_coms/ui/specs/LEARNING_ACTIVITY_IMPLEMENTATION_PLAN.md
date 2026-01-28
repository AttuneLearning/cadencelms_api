# Learning Activity Editor Implementation Plan

## Overview

This document outlines the implementation plan for the Learning Activity (Learning Unit) editor system within the Course Builder. It follows a **Hybrid Wizard + Contextual Editor** approach that provides consistency across all activity types while optimizing for each type's complexity.

**Related Specs:**
- [Learning Activity Editor Forms](./LEARNING_ACTIVITY_EDITOR_FORMS.md) - Detailed wireframes for each editor
- [Question Bank Editor Form](./QUESTION_BANK_EDITOR_FORM.md) - Question management system

**Development Guidelines:**
- [FEATURE_DEVELOPMENT_CHECKLIST](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) - Coding standards
- [UI_COMPONENT_LIBRARY](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) - Reusable components

---

## Design System Compliance

### Required UI Components (from UI_COMPONENT_LIBRARY)

| Component | Usage in Activity Editors |
|-----------|--------------------------|
| `PageHeader` | All full-page editors (Assessment, Assignment, Exercise) |
| `ErrorPanel` | API error states with retry |
| `Skeleton` | Loading states for forms and lists |
| `DataTable` | Question Bank list view |
| `ConfirmDialog` | Delete confirmations, unsaved changes |
| `Dialog` | Type selection modal, question editor, import picker |
| `Card` | Form sections, question cards |
| `Button` | All actions (primary: Save, secondary: Cancel) |
| `Input`, `Textarea`, `Select` | Form fields |
| `Label` | Field labels with required indicators |
| `Alert` | Form validation errors, warnings |
| `Tabs` | Multi-section editors (Assessment, Assignment) |
| `Progress` | File upload progress |
| `Badge` | Question type indicators, status |
| `Checkbox`, `Switch` | Boolean settings |
| `Tooltip` | Help text on complex fields |

### Form Patterns (from existing codebase)

```tsx
// Standard form pattern (see LearningUnitForm.tsx, SendAnnouncementDialog.tsx)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  // ... more fields
});

const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
  resolver: zodResolver(schema),
  mode: 'onChange',
});
```

### State Management (F1, S1 from checklist)

| State Type | Pattern | Location |
|------------|---------|----------|
| Form state | `react-hook-form` + zod | Component-local |
| Server state | React Query (`useQuery`/`useMutation`) | `src/entities/*/api/` |
| UI state (modal open) | `useState` | Component-local |
| Global UI | Zustand | `src/shared/stores/` |

### Error Handling (E1 from checklist)

```tsx
// API errors → Toast notification
const mutation = useMutation({
  onError: (error) => {
    toast({
      title: 'Failed to save activity',
      description: error.message,
      variant: 'destructive',
    });
  },
});

// Form validation → Inline Alert
{errors.title && (
  <Alert variant="destructive">
    <AlertDescription>{errors.title.message}</AlertDescription>
  </Alert>
)}

// Page-level errors → ErrorPanel
if (error) {
  return <ErrorPanel error={error} onRetry={refetch} />;
}
```

---

## Architecture Overview

### User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LEARNING ACTIVITY CREATION FLOW                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐      ┌────────────────────────┐ │
│  │  MODULE EDITOR   │      │  TYPE SELECTION  │      │   ACTIVITY EDITOR      │ │
│  │     PAGE         │ ──▶  │     MODAL        │ ──▶  │   (Context-Aware)      │ │
│  │                  │      │                  │      │                        │ │
│  │ /staff/courses/  │      │   Card Grid      │      │  Simple → Drawer       │ │
│  │ :courseId/       │      │   Selection      │      │  Complex → Full Page   │ │
│  │ modules/:id      │      │                  │      │                        │ │
│  └──────────────────┘      └──────────────────┘      └────────────────────────┘ │
│         │                         │                           │                 │
│         │                         │                           ▼                 │
│    "Add Activity"           Type Selected              ┌──────────────────┐    │
│       Button                                           │ QUESTION BANK    │    │
│         │                                              │ (for Quiz types) │    │
│         ▼                                              │                  │    │
│  ┌──────────────────┐                                  │ Import/Create    │    │
│  │ Empty State CTA  │                                  │ Questions        │    │
│  │ or Card List     │                                  └──────────────────┘    │
│  └──────────────────┘                                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### UI Pattern by Activity Type

| Type | Complexity | UI Pattern | Rationale |
|------|------------|------------|-----------|
| **Media** | Simple | Slide-out Drawer | Quick upload + minimal metadata |
| **Document** | Simple | Slide-out Drawer | Quick upload + minimal metadata |
| **SCORM** | Simple | Slide-out Drawer | Upload + validation feedback |
| **Custom** | Medium | Slide-out Drawer | Embed code + live preview |
| **Assignment** | Medium | Full Page | Rubric builder, submission settings |
| **Exercise** | Complex | Full Page | Question builder, Question Bank integration |
| **Assessment** | Complex | Full Page | Question Bank, scoring rules, time limits |

---

## Component Architecture

### Directory Structure

```
src/features/learning-activity-editor/
├── index.ts                           # Public exports
│
├── ui/
│   ├── TypeSelectionModal.tsx         # Entry point - card grid for type selection
│   ├── ActivityEditorDrawer.tsx       # Wrapper for simple types (drawer shell)
│   ├── ActivityEditorPage.tsx         # Wrapper for complex types (page shell)
│   │
│   ├── editors/                       # Type-specific form components
│   │   ├── MediaEditor.tsx            # Video/Audio upload + metadata
│   │   ├── DocumentEditor.tsx         # PDF/Slides upload + metadata
│   │   ├── SCORMEditor.tsx            # SCORM package upload + validation
│   │   ├── CustomEmbedEditor.tsx      # Embed code + preview
│   │   ├── AssignmentEditor.tsx       # Rubric builder + submission settings
│   │   ├── ExerciseEditor.tsx         # Practice quiz (Question Bank integration)
│   │   └── AssessmentEditor.tsx       # Graded assessment (Question Bank integration)
│   │
│   └── shared/                        # Reusable form sections
│       ├── MetadataSection.tsx        # Title, description, category
│       ├── FileUploadSection.tsx      # Drag-drop with progress bar
│       ├── ScoringSection.tsx         # Points, passing score, weight
│       ├── TimeLimitsSection.tsx      # Duration, attempts, availability
│       ├── QuestionListSection.tsx    # Displays questions (for quiz types)
│       └── QuestionBankPicker.tsx     # Modal to select from Question Bank
│
├── model/
│   ├── types.ts                       # Editor-specific types
│   ├── use-activity-editor.ts         # Form state management hook
│   ├── use-file-upload.ts             # S3 upload hook
│   └── editor-config.ts               # Type → UI mapping configuration
│
└── lib/
    ├── validation.ts                  # Form validation schemas (zod)
    └── transforms.ts                  # API payload transformers


src/features/question-bank/
├── index.ts                           # Public exports
│
├── ui/
│   ├── QuestionBankPage.tsx           # Full question bank management page (department-scoped)
│   ├── QuestionBankModal.tsx          # Modal version for inline picking
│   ├── QuestionBankList.tsx           # Bank cards with question counts
│   ├── QuestionList.tsx               # Filterable/searchable question list
│   ├── QuestionEditor.tsx             # Create/edit question modal
│   ├── QuestionHierarchyEditor.tsx    # Adaptive testing relationships
│   ├── CrossDepartmentCopyModal.tsx   # System admin: copy between departments
│   │
│   └── question-types/                # Type-specific question editors
│       ├── MultipleChoiceEditor.tsx
│       ├── TrueFalseEditor.tsx
│       ├── ShortAnswerEditor.tsx
│       ├── LongAnswerEditor.tsx
│       ├── MatchingEditor.tsx
│       ├── FlashcardEditor.tsx
│       └── FillInBlankEditor.tsx
│
├── model/
│   ├── types.ts                       # Question types, bank types, hierarchy
│   ├── use-question-bank.ts           # CRUD operations hook (department-scoped)
│   ├── use-question-filters.ts        # Search/filter state
│   └── use-question-hierarchy.ts      # Adaptive relationships
│
└── lib/
    └── validation.ts                  # Question validation schemas


src/features/adaptive-testing/            # NEW - Adaptive testing features
├── index.ts
├── ui/
│   ├── AdaptiveSettingsPanel.tsx       # Instructor settings for adaptive mode
│   ├── RandomizationSelector.tsx       # In-order, by-difficulty, random
│   └── RepetitionSettings.tsx          # Mastery threshold configuration
├── model/
│   ├── types.ts                        # Adaptive config types
│   ├── use-learner-progress.ts         # Track question progress per learner
│   └── use-adaptive-engine.ts          # Client-side question selection logic
└── lib/
    └── adaptive-algorithms.ts          # Repetition, skip-related logic


src/features/ai-quizzing/                 # NEW - AI-assisted quizzing (Low Priority)
├── index.ts
├── ui/
│   ├── AIQuizSettingsPanel.tsx         # Instructor enable/configure
│   └── AIQuizFeedbackDisplay.tsx       # Learner-facing AI feedback
├── model/
│   ├── types.ts                        # AI quiz session types
│   └── use-ai-quiz-session.ts          # Manage AI quiz sessions
└── lib/
    └── ai-quiz-api.ts                  # API shell for AI quiz endpoints
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Question Scope** | Department-level | Questions shared across courses in department |
| **Cross-Department** | System admin copy only | Controlled sharing via admin tools |
| **Deletion** | Block if linked | Prevents orphaned quiz configurations |
| **Randomization** | 3 levels | in_order, by_difficulty, completely_random |
| **Repetition** | Mastery-based | Questions "turn off" after N correct answers |
| **Adaptive Testing** | Medium priority | Hierarchy-based question skipping |
| **AI Quizzing** | Low priority (build shell) | LLM-driven adaptive questioning (future) |

---

## Phase 1: Foundation

### 1.1 Type Selection Modal

**File:** `src/features/learning-activity-editor/ui/TypeSelectionModal.tsx`

**Uses:** `Dialog`, `DialogHeader`, `DialogContent`, `Card`, `Button` from `@/shared/ui/`

**Implementation Pattern:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import { Card, CardContent } from '@/shared/ui/card';
import { EDITOR_CONFIGS } from '../model/editor-config';
import type { LearningUnitType } from '@/entities/learning-unit';

interface TypeSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: LearningUnitType) => void;
  moduleId: string;
  courseId: string;
}

export function TypeSelectionModal({
  open,
  onClose,
  onSelectType,
}: TypeSelectionModalProps) {
  const types = Object.values(EDITOR_CONFIGS);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Learning Activity</DialogTitle>
          <DialogDescription>
            What type of activity would you like to create?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {types.map((config) => (
            <Card
              key={config.type}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onSelectType(config.type)}
            >
              <CardContent className="flex flex-col items-center p-4 text-center">
                <span className="text-3xl mb-2">{config.icon}</span>
                <span className="font-medium">{config.label}</span>
                <span className="text-sm text-muted-foreground">
                  {config.description}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✕                     Add Learning Activity                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   What type of activity would you like to create?               │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  🎬         │  │  📄         │  │  📦         │            │
│   │   Media     │  │  Document   │  │   SCORM     │            │
│   │             │  │             │  │             │            │
│   │ Video/Audio │  │ PDF, Slides │  │ Upload pkg  │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  🔗         │  │  📝         │  │  📋         │            │
│   │   Custom    │  │  Exercise   │  │ Assessment  │            │
│   │             │  │             │  │             │            │
│   │ Embed/Link  │  │ Practice Qs │  │ Graded Quiz │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                  │
│   ┌─────────────┐                                               │
│   │  📤         │                                               │
│   │ Assignment  │                                               │
│   │             │                                               │
│   │ Submissions │                                               │
│   └─────────────┘                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Props:**
```typescript
interface TypeSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: LearningUnitType) => void;
  moduleId: string;
  courseId: string;
}
```

**Behavior:**
- Opens when user clicks "Add Activity" button
- Displays card grid of available activity types
- On selection, determines UI pattern (drawer vs page)
- Closes modal and opens appropriate editor

### 1.2 Editor Shell Components

#### ActivityEditorDrawer.tsx - For simple types (Media, Document, SCORM, Custom)

**Uses:** `Dialog` (as side sheet), `DialogHeader`, `Button`, `Skeleton`, `Alert` from `@/shared/ui/`

> **Note:** We use Dialog with custom positioning as a drawer since there's no Sheet component in the library. Alternatively, we can add a Sheet component to `src/shared/ui/`.

**Implementation Pattern:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { useToast } from '@/shared/ui/use-toast';
import { useCreateLearningUnit } from '@/entities/learning-unit';
import { EDITOR_CONFIGS, type EditorConfig } from '../model/editor-config';

interface ActivityEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  type: LearningUnitType;
  moduleId: string;
  courseId: string;
  onSuccess?: () => void;
}

export function ActivityEditorDrawer({
  open,
  onClose,
  type,
  moduleId,
  courseId,
  onSuccess,
}: ActivityEditorDrawerProps) {
  const config = EDITOR_CONFIGS[type];
  const { toast } = useToast();

  const createMutation = useCreateLearningUnit({
    onSuccess: () => {
      toast({ title: 'Activity created successfully' });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create activity',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const EditorComponent = getEditorComponent(type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="fixed right-0 top-0 h-full w-[500px] max-w-full rounded-none border-l">
        <DialogHeader>
          <DialogTitle>{config.label} Editor</DialogTitle>
        </DialogHeader>

        <EditorComponent
          moduleId={moduleId}
          courseId={courseId}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="activity-editor-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Wireframe:**
```
┌─────────────────────────────────────┬──────────────────────────────────┐
│        MODULE EDITOR                │       [TYPE] EDITOR        ✕     │
│        (stays visible)              │──────────────────────────────────│
│                                     │                                  │
│  ┌───────────────────────────────┐  │  [Type-specific editor form     │
│  │ Existing Activities...        │  │   rendered here]                │
│  └───────────────────────────────┘  │                                  │
│                                     │                                  │
│  ┌───────────────────────────────┐  │                                  │
│  │ + Add Activity (disabled)     │  │                                  │
│  └───────────────────────────────┘  │                                  │
│                                     │                                  │
│                                     │  ┌─────────┐  ┌──────────────┐  │
│                                     │  │ Cancel  │  │    Save      │  │
│                                     │  └─────────┘  └──────────────┘  │
└─────────────────────────────────────┴──────────────────────────────────┘
```

#### ActivityEditorPage.tsx - For complex types (Exercise, Assessment, Assignment)

**Uses:** `PageHeader`, `Button`, `Tabs`, `Card`, `Skeleton`, `ErrorPanel`, `ConfirmDialog` from `@/shared/ui/`

**Route:** `/staff/courses/:courseId/modules/:moduleId/activities/new/:type`

**Implementation Pattern:**
```tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { PageHeader } from '@/shared/ui/page-header';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorPanel } from '@/shared/ui/error-panel';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useToast } from '@/shared/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

export function ActivityEditorPage() {
  const { courseId, moduleId, type } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const config = EDITOR_CONFIGS[type as LearningUnitType];

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate(`/staff/courses/${courseId}/modules/${moduleId}`);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title={`${config.label} Editor`}
        description={`Create a new ${config.label.toLowerCase()} activity`}
        backButton={
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Module
          </Button>
        }
      >
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </PageHeader>

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {config.hasQuestions && (
            <TabsTrigger value="questions">Questions</TabsTrigger>
          )}
          {config.hasRubric && (
            <TabsTrigger value="rubric">Rubric</TabsTrigger>
          )}
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <MetadataSection {...metadataProps} />
        </TabsContent>

        {/* Type-specific tab content */}
      </Tabs>

      <ConfirmDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={() => navigate(-1)}
        title="Unsaved Changes"
        description="You have unsaved changes. Are you sure you want to leave?"
        confirmText="Leave"
        isDestructive
      />
    </div>
  );
}
```

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Module                        [TYPE] Editor           Save   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Details  │  [Type-specific tabs]  │  Settings  │                │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │  [Type-specific editor form rendered here]                      │    │
│  │                                                                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Editor Configuration

**File:** `src/features/learning-activity-editor/model/editor-config.ts`

```typescript
import { LearningUnitType } from '@/entities/learning-unit';

export type EditorUIPattern = 'drawer' | 'page';

export interface EditorConfig {
  type: LearningUnitType;
  label: string;
  description: string;
  icon: string;
  uiPattern: EditorUIPattern;
  defaultCategory: LearningUnitCategory;
  hasQuestions: boolean;
  hasFileUpload: boolean;
  hasRubric: boolean;
}

export const EDITOR_CONFIGS: Record<LearningUnitType, EditorConfig> = {
  media: {
    type: 'media',
    label: 'Media',
    description: 'Video or audio content',
    icon: '🎬',
    uiPattern: 'drawer',
    defaultCategory: 'topic',
    hasQuestions: false,
    hasFileUpload: true,
    hasRubric: false,
  },
  document: {
    type: 'document',
    label: 'Document',
    description: 'PDF, slides, or documents',
    icon: '📄',
    uiPattern: 'drawer',
    defaultCategory: 'topic',
    hasQuestions: false,
    hasFileUpload: true,
    hasRubric: false,
  },
  scorm: {
    type: 'scorm',
    label: 'SCORM',
    description: 'SCORM package upload',
    icon: '📦',
    uiPattern: 'drawer',
    defaultCategory: 'topic',
    hasQuestions: false,
    hasFileUpload: true,
    hasRubric: false,
  },
  custom: {
    type: 'custom',
    label: 'Custom Embed',
    description: 'External link or embed code',
    icon: '🔗',
    uiPattern: 'drawer',
    defaultCategory: 'topic',
    hasQuestions: false,
    hasFileUpload: false,
    hasRubric: false,
  },
  exercise: {
    type: 'exercise',
    label: 'Exercise',
    description: 'Practice questions (ungraded)',
    icon: '📝',
    uiPattern: 'page',
    defaultCategory: 'practice',
    hasQuestions: true,
    hasFileUpload: false,
    hasRubric: false,
  },
  assessment: {
    type: 'assessment',
    label: 'Assessment',
    description: 'Graded quiz or exam',
    icon: '📋',
    uiPattern: 'page',
    defaultCategory: 'graded',
    hasQuestions: true,
    hasFileUpload: false,
    hasRubric: false,
  },
  assignment: {
    type: 'assignment',
    label: 'Assignment',
    description: 'File submission with rubric',
    icon: '📤',
    uiPattern: 'page',
    defaultCategory: 'assignment',
    hasQuestions: false,
    hasFileUpload: false,
    hasRubric: true,
  },
};

export function getEditorConfig(type: LearningUnitType): EditorConfig {
  return EDITOR_CONFIGS[type];
}

export function getEditorUIPattern(type: LearningUnitType): EditorUIPattern {
  return EDITOR_CONFIGS[type].uiPattern;
}
```

---

## Phase 2: Simple Editors (Drawer-based)

### Shared Form Pattern

All simple editors follow the same form pattern using `react-hook-form` + `zod`:

```tsx
// Standard imports for all simple editors
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Progress } from '@/shared/ui/progress';
import { Card, CardContent } from '@/shared/ui/card';
import { useLookupValues } from '@/entities/lookup-value';
```

### 2.1 Media Editor

**File:** `src/features/learning-activity-editor/ui/editors/MediaEditor.tsx`

**Uses:** `Input`, `Textarea`, `Label`, `Select`, `Progress`, `Card`, `Alert` from `@/shared/ui/`

**Implementation Pattern:**
```tsx
const mediaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  fileUrl: z.string().min(1, 'Media file is required'),
  category: z.string().optional(),
  estimatedDuration: z.number().optional(),
});

type MediaFormData = z.infer<typeof mediaSchema>;

export function MediaEditor({ moduleId, onSubmit, isLoading }: EditorProps) {
  const { data: categoryOptions } = useLookupValues({ category: 'learning-unit-category' });
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MediaFormData>({
    resolver: zodResolver(mediaSchema),
    mode: 'onChange',
  });

  return (
    <form id="activity-editor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input id="title" {...register('title')} />
        {errors.title && (
          <Alert variant="destructive">
            <AlertDescription>{errors.title.message}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
      </div>

      {/* File Upload with Progress */}
      <div className="space-y-2">
        <Label>
          Media File <span className="text-destructive">*</span>
        </Label>
        <FileUploadSection
          accept={['.mp4', '.webm', '.mp3', '.wav']}
          maxSize={500 * 1024 * 1024}
          onProgress={setUploadProgress}
          onComplete={(url) => setValue('fileUrl', url)}
        />
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Progress value={uploadProgress} className="h-2" />
        )}
      </div>

      {/* Category Select */}
      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select onValueChange={(val) => setValue('category', val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions?.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
```

**Wireframe:**
```
┌──────────────────────────────────────────────────────────────────┐
│                        MEDIA EDITOR                         ✕    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Title *                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Introduction to Module                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Description                                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ A brief overview of what you'll learn...                    │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Media File *                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │     ┌────────────────────────────────────────────┐          │ │
│  │     │  📁                                        │          │ │
│  │     │  Drag & drop your file here               │          │ │
│  │     │  or click to browse                        │          │ │
│  │     │                                            │          │ │
│  │     │  Supported: MP4, WebM, MP3, WAV            │          │ │
│  │     │  Max size: 500MB                           │          │ │
│  │     └────────────────────────────────────────────┘          │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ── Upload Progress ──────────────────────────────────────────── │
│  │ video.mp4                              ████████░░ 80%    ✕ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Category                                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Topic                                                    ▼  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Duration (auto-detected)                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 12:34                                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────┐                      ┌────────────────────┐   │
│  │   Cancel     │                      │       Save         │   │
│  └──────────────┘                      └────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Form Fields:**
- `title` (required) - Activity name
- `description` (optional) - Rich text description
- `file` (required) - Media file upload to S3
- `category` (optional) - From lookup values
- `duration` (auto) - Detected from media metadata

### 2.2 Document Editor

Similar to Media Editor but with:
- Different file types: PDF, PPTX, DOCX
- Optional "pages" count instead of duration
- Preview thumbnail generation

### 2.3 SCORM Editor

**Uses:** `Input`, `Label`, `Select`, `Progress`, `Alert`, `Badge` from `@/shared/ui/`

**Wireframe:**
```
┌──────────────────────────────────────────────────────────────────┐
│                       SCORM EDITOR                          ✕    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Title *                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Safety Training Module                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  SCORM Package *                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │     ┌────────────────────────────────────────────┐          │ │
│  │     │  📦                                        │          │ │
│  │     │  Upload SCORM Package (.zip)              │          │ │
│  │     │                                            │          │ │
│  │     │  Supports: SCORM 1.2, SCORM 2004           │          │ │
│  │     └────────────────────────────────────────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ── Package Validation ─────────────────────────────────────────│
│  │ ✅ Valid SCORM 2004 package                                 │ │
│  │ ✅ Manifest found (imsmanifest.xml)                         │ │
│  │ ✅ Launch file: index.html                                  │ │
│  │ ⚠️  Warning: Large package (45MB)                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Completion Tracking                                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ SCORM Reporting                                          ▼  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Category                                                        │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Topic                                                    ▼  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────┐                      ┌────────────────────┐   │
│  │   Cancel     │                      │       Save         │   │
│  └──────────────┘                      └────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.4 Custom Embed Editor

**Wireframe:**
```
┌──────────────────────────────────────────────────────────────────┐
│                     CUSTOM EMBED EDITOR                     ✕    │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Title *                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Interactive Simulation                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Embed Type                                                      │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │ ○ URL Link  │  │ ● Embed Code│                               │
│  └─────────────┘  └─────────────┘                               │
│                                                                   │
│  Embed Code *                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ <iframe src="https://example.com/sim"                       │ │
│  │   width="100%" height="600"                                 │ │
│  │   frameborder="0" allowfullscreen>                          │ │
│  │ </iframe>                                                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Preview                                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │   ┌─────────────────────────────────────────────────────┐   │ │
│  │   │                                                      │   │ │
│  │   │           [Live Preview of Embed]                   │   │ │
│  │   │                                                      │   │ │
│  │   └─────────────────────────────────────────────────────┘   │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌──────────────┐                      ┌────────────────────┐   │
│  │   Cancel     │                      │       Save         │   │
│  └──────────────┘                      └────────────────────┘   │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Complex Editors (Page-based)

### 3.1 Exercise Editor (Practice Quiz)

**Route:** `/staff/courses/:courseId/modules/:moduleId/activities/new/exercise`

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Module                        Exercise Editor      Save  Preview │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Details  │  Questions  │  Settings  │                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           QUESTIONS TAB                                      │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Questions (3)                                                      │     │
│  │                                                                     │     │
│  │  ┌─────────────────────┐  ┌───────────────────────────────────┐   │     │
│  │  │  + Add Question  ▼  │  │  📚 Import from Question Bank     │   │     │
│  │  └─────────────────────┘  └───────────────────────────────────┘   │     │
│  │      │                                                             │     │
│  │      ├─ Multiple Choice                                            │     │
│  │      ├─ True/False                                                 │     │
│  │      ├─ Short Answer                                               │     │
│  │      ├─ Matching                                                   │     │
│  │      └─ Flashcard                                                  │     │
│  │                                                                     │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ≡  1. What is the capital of France?                               │     │
│  │      Multiple Choice • Practice (no points)          [Edit][Delete]│     │
│  │      ───────────────────────────────────────────────────────────   │     │
│  │      A. London  B. Paris ✓  C. Berlin  D. Madrid                   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ≡  2. The Earth is flat.                                           │     │
│  │      True/False • Practice (no points)               [Edit][Delete]│     │
│  │      ───────────────────────────────────────────────────────────   │     │
│  │      Answer: False                                                 │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ≡  3. Match the countries to their capitals                        │     │
│  │      Matching • Practice (no points)                 [Edit][Delete]│     │
│  │      ───────────────────────────────────────────────────────────   │     │
│  │      France → Paris, Germany → Berlin, Spain → Madrid              │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Assessment Editor (Graded Quiz)

**Route:** `/staff/courses/:courseId/modules/:moduleId/activities/new/assessment`

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Module                       Assessment Editor     Save  Preview │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Details  │  Questions  │  Scoring  │  Settings  │                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           QUESTIONS TAB                                      │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Questions (5)                              Total Points: 100        │   │
│  │                                                                      │   │
│  │  ┌─────────────────────┐  ┌───────────────────────────────────┐     │   │
│  │  │  + Add Question  ▼  │  │  📚 Import from Question Bank     │     │   │
│  │  └─────────────────────┘  └───────────────────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ≡  1. What is the capital of France?                                 │   │
│  │      Multiple Choice • 20 points                      [Edit][Delete] │   │
│  │      ─────────────────────────────────────────────────────────────   │   │
│  │      A. London  B. Paris ✓  C. Berlin  D. Madrid                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ≡  2. Explain the process of photosynthesis                          │   │
│  │      Long Answer • 30 points                          [Edit][Delete] │   │
│  │      ─────────────────────────────────────────────────────────────   │   │
│  │      Sample Answer: Photosynthesis is the process by which...        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           SCORING TAB                                        │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Passing Score                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ 70                                                              %  │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Grading Method                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ○ Highest Attempt   ● Latest Attempt   ○ Average of Attempts      │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           SETTINGS TAB                                       │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Time Limit                                                                 │
│  ┌───────────────────────┐                                                  │
│  │ 30                    │ minutes   ☐ No time limit                       │
│  └───────────────────────┘                                                  │
│                                                                              │
│  Attempts Allowed                                                           │
│  ┌───────────────────────┐                                                  │
│  │ 3                     │           ☐ Unlimited attempts                  │
│  └───────────────────────┘                                                  │
│                                                                              │
│  Show Correct Answers                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ○ Never   ● After Submission   ○ After Due Date                   │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  Shuffle Questions    ☑ Yes                                                 │
│  Shuffle Answers      ☑ Yes                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Assignment Editor

**Route:** `/staff/courses/:courseId/modules/:moduleId/activities/new/assignment`

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Module                       Assignment Editor     Save  Preview │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Details  │  Instructions  │  Rubric  │  Submission Settings  │      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           DETAILS TAB                                        │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Title *                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Final Project Submission                                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Total Points *                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 100                                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           RUBRIC TAB                                         │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Rubric Criteria                                    + Add Criterion  │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ 1. Content Quality                              40 points   │    │   │
│  │  │    ─────────────────────────────────────────────────────    │    │   │
│  │  │    Excellent (40) │ Good (30) │ Fair (20) │ Poor (10)       │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ 2. Formatting                                   20 points   │    │   │
│  │  │    ─────────────────────────────────────────────────────    │    │   │
│  │  │    Excellent (20) │ Good (15) │ Fair (10) │ Poor (5)        │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │ 3. Timeliness                                   40 points   │    │   │
│  │  │    ─────────────────────────────────────────────────────    │    │   │
│  │  │    On Time (40) │ 1 Day Late (30) │ 2+ Days Late (0)        │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                           SUBMISSION SETTINGS TAB                            │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Allowed File Types                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ☑ PDF   ☑ DOCX   ☑ TXT   ☐ Images   ☐ Video   ☐ Any                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Max File Size                                                              │
│  ┌───────────────────────┐                                                  │
│  │ 50                    │ MB                                              │
│  └───────────────────────┘                                                  │
│                                                                              │
│  Submission Attempts                                                        │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │ ● Single Submission   ○ Multiple (resubmit until due date)        │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Question Bank Integration

### 4.1 Question Bank Overview

The Question Bank serves as a centralized repository for reusable questions across the course. It integrates with Exercise and Assessment editors to allow importing existing questions.

**Access Points:**
1. **Standalone Page:** `/staff/courses/:courseId/question-bank` - Full management
2. **Modal/Picker:** Triggered from Exercise/Assessment editors for importing

### 4.2 Question Bank Page

**Route:** `/staff/courses/:courseId/question-bank`

**Uses:** `PageHeader`, `DataTable`, `Input`, `Select`, `Button`, `Badge`, `Checkbox`, `ConfirmDialog`, `Skeleton`, `ErrorPanel` from `@/shared/ui/`

**Implementation Pattern:**
```tsx
import { PageHeader } from '@/shared/ui/page-header';
import { DataTable } from '@/shared/ui/data-table';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorPanel } from '@/shared/ui/error-panel';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useToast } from '@/shared/ui/use-toast';
import { ArrowLeft, Plus, Search } from 'lucide-react';

export function QuestionBankPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, error, refetch } = useQuestions(courseId!);
  const deleteMutation = useDeleteQuestion();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (error) {
    return <ErrorPanel error={error} onRetry={refetch} />;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Question Bank"
        description="Manage reusable questions for your course"
        backButton={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
        }
      >
        <Button onClick={() => setShowEditor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Question
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-4 mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
            <SelectItem value="true_false">True/False</SelectItem>
            <SelectItem value="matching">Matching</SelectItem>
            <SelectItem value="flashcard">Flashcard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Question List */}
      {isLoading ? (
        <div className="space-y-4 mt-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <DataTable
          columns={questionColumns}
          data={filteredQuestions}
          searchable={false}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget!)}
        title="Delete Question"
        description="This will remove the question from all activities using it. This cannot be undone."
        confirmText="Delete"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
```

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Course                        Question Bank        + New Question│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search questions...                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Filters:                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Type      ▼  │  │ Module    ▼  │  │ Difficulty▼  │  │ Tags      ▼  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Showing 24 questions                                      ☐ Select All     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ☐ │ What is the capital of France?                                   │   │
│  │   │ Multiple Choice • Module 1 • Easy • Used in 2 activities         │   │
│  │   │                                                      [Edit][Del] │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ☐ │ Match the following terms to their definitions                   │   │
│  │   │ Matching • Module 2 • Medium • Used in 1 activity                │   │
│  │   │                                                      [Edit][Del] │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ☐ │ Vocabulary Set: Chapter 3                                        │   │
│  │   │ Flashcard Set (15 cards) • Module 3 • Easy • Used in 1 activity  │   │
│  │   │                                                      [Edit][Del] │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────     │
│  │  ◀  │  1  │  2  │  3  │  ...  │  10  │  ▶  │                        │     │
│  ──────────────────────────────────────────────────────────────────────     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Question Bank Picker Modal

**Trigger:** "Import from Question Bank" button in Exercise/Assessment editors

**Uses:** `Dialog`, `DialogHeader`, `DialogContent`, `DialogFooter`, `Input`, `Select`, `Checkbox`, `Button`, `Badge` from `@/shared/ui/`

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✕                    Import from Question Bank                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search questions...                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  Filters:                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Type      ▼  │  │ Module    ▼  │  │ Difficulty▼  │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ ☑ │ What is the capital of France?                                  │    │
│  │   │ Multiple Choice • Easy                                          │    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ ☐ │ The Earth orbits around the Sun.                                │    │
│  │   │ True/False • Easy                                               │    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ ☑ │ Match the countries to their capitals                           │    │
│  │   │ Matching • Medium                                               │    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  │ ☐ │ Vocabulary Set: Chapter 3                                       │    │
│  │   │ Flashcard Set (15 cards) • Easy                                 │    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Selected: 2 questions                                                      │
│                                                                              │
│  ┌──────────────┐                                   ┌────────────────────┐  │
│  │    Cancel    │                                   │  Import Selected   │  │
│  └──────────────┘                                   └────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.4 Question Editor Modal

**Trigger:** "Add Question" or "Edit" in Question Bank or Activity editors

**Uses:** `Dialog`, `DialogHeader`, `DialogContent`, `DialogFooter`, `Input`, `Textarea`, `Label`, `Select`, `RadioGroup`, `Button`, `Alert` from `@/shared/ui/`

**Wireframe (Multiple Choice):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✕                    Edit Question                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Question Type                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Multiple Choice                                                   ▼  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Question Text *                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ What is the capital of France?                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Answer Options *                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ○ A. │ London                                                │  ✕   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ● B. │ Paris                                                 │  ✕   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ○ C. │ Berlin                                                │  ✕   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ○ D. │ Madrid                                                │  ✕   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                     + Add Option            │
│                                                                              │
│  Points (for graded activities)                                             │
│  ┌────────────────────┐                                                     │
│  │ 10                 │                                                     │
│  └────────────────────┘                                                     │
│                                                                              │
│  Difficulty                            Tags                                 │
│  ┌────────────────────┐               ┌──────────────────────────────────┐  │
│  │ Easy            ▼  │               │ geography, europe               │  │
│  └────────────────────┘               └──────────────────────────────────┘  │
│                                                                              │
│  Explanation (shown after answer)                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Paris has been the capital of France since 987 AD when Hugh Capet... │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ☑ Save to Question Bank for reuse                                          │
│                                                                              │
│  ┌──────────────┐                                   ┌────────────────────┐  │
│  │    Cancel    │                                   │       Save         │  │
│  └──────────────┘                                   └────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Data Flow for Quiz/Flashcard/Matching

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        QUESTION DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                    ┌──────────────────────────┐                             │
│                    │     QUESTION BANK        │                             │
│                    │     (Course-level)       │                             │
│                    │                          │                             │
│                    │  - All question types    │                             │
│                    │  - Reusable across       │                             │
│                    │    activities            │                             │
│                    │  - Searchable/filterable │                             │
│                    └────────────┬─────────────┘                             │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              │                  │                  │                       │
│              ▼                  ▼                  ▼                       │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐           │
│  │    EXERCISE      │ │   ASSESSMENT     │ │  FLASHCARD SET   │           │
│  │   (Practice)     │ │   (Graded)       │ │  (Learning)      │           │
│  │                  │ │                  │ │                  │           │
│  │ - Links to Qs    │ │ - Links to Qs    │ │ - Links to cards │           │
│  │ - No scoring     │ │ - Points/scoring │ │ - Spaced repeat  │           │
│  │ - Instant FB     │ │ - Time limits    │ │ - Progress track │           │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘           │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  API Endpoints:                                                             │
│                                                                              │
│  Question Bank:                                                             │
│    GET  /api/v2/courses/:courseId/questions                                 │
│    POST /api/v2/courses/:courseId/questions                                 │
│    GET  /api/v2/courses/:courseId/questions/:id                             │
│    PUT  /api/v2/courses/:courseId/questions/:id                             │
│    DEL  /api/v2/courses/:courseId/questions/:id                             │
│                                                                              │
│  Learning Unit Questions (linking):                                         │
│    GET  /api/v2/learning-units/:id/questions                                │
│    POST /api/v2/learning-units/:id/questions      (link existing)           │
│    POST /api/v2/learning-units/:id/questions/bulk (link multiple)           │
│    DEL  /api/v2/learning-units/:id/questions/:qId (unlink)                  │
│                                                                              │
│  Question Types in Bank:                                                    │
│    - multiple_choice                                                        │
│    - true_false                                                             │
│    - short_answer                                                           │
│    - long_answer                                                            │
│    - matching                                                               │
│    - flashcard                                                              │
│    - fill_in_blank                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Shared Components

All shared components follow FSD structure and reuse primitives from `@/shared/ui/`.

### 5.1 MetadataSection

**File:** `src/features/learning-activity-editor/ui/shared/MetadataSection.tsx`

**Uses:** `Input`, `Textarea`, `Label`, `Select`, `Alert` from `@/shared/ui/`

Used by all editor types for common fields.

```typescript
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { useLookupValues } from '@/entities/lookup-value';

interface MetadataSectionProps {
  title: string;
  onTitleChange: (title: string) => void;
  description?: string;
  onDescriptionChange?: (desc: string) => void;
  category?: LearningUnitCategory;
  onCategoryChange?: (cat: LearningUnitCategory) => void;
  errors?: Record<string, string>;
}

export function MetadataSection({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  errors,
}: MetadataSectionProps) {
  const { data: categoryOptions } = useLookupValues({ category: 'learning-unit-category' });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        {errors?.title && (
          <Alert variant="destructive">
            <AlertDescription>{errors.title}</AlertDescription>
          </Alert>
        )}
      </div>

      {onDescriptionChange && (
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      )}

      {onCategoryChange && (
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions?.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
```

### 5.2 FileUploadSection

**File:** `src/features/learning-activity-editor/ui/shared/FileUploadSection.tsx`

**Uses:** `Card`, `Progress`, `Button`, `Alert` from `@/shared/ui/`

Used by Media, Document, SCORM, Assignment editors.

```typescript
import { Card, CardContent } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Upload, X, File } from 'lucide-react';

interface FileUploadSectionProps {
  label: string;
  accept: string[];  // e.g., ['.mp4', '.webm', '.mp3']
  maxSize: number;   // bytes
  value?: UploadedFile;
  onChange: (file: UploadedFile | null) => void;
  onUploadProgress?: (percent: number) => void;
  uploadEndpoint: string;  // S3 presigned URL endpoint
  error?: string;
}

export function FileUploadSection({
  label,
  accept,
  maxSize,
  value,
  onChange,
  onUploadProgress,
  error,
}: FileUploadSectionProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // ... drag/drop and upload logic

  return (
    <div className="space-y-2">
      <Card
        className={cn(
          'border-2 border-dashed cursor-pointer transition-colors',
          isDragging && 'border-primary bg-primary/5',
          error && 'border-destructive'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center p-8">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">Drag & drop your file here</p>
          <p className="text-xs text-muted-foreground">
            or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: {accept.join(', ')} • Max: {formatBytes(maxSize)}
          </p>
        </CardContent>
      </Card>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress value={uploadProgress} className="h-2" />
      )}

      {value && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded">
          <File className="h-4 w-4" />
          <span className="text-sm flex-1">{value.name}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### 5.3 QuestionListSection

**File:** `src/features/learning-activity-editor/ui/shared/QuestionListSection.tsx`

**Uses:** `Card`, `Button`, `Badge`, `DropdownMenu` from `@/shared/ui/`

Used by Exercise and Assessment editors.

```typescript
interface QuestionListSectionProps {
  questions: Question[];
  onReorder: (questions: Question[]) => void;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
  onAddQuestion: (type: QuestionType) => void;
  onImportFromBank: () => void;
  showPoints: boolean;  // false for Exercise, true for Assessment
}
```

### 5.4 QuestionBankPicker

Modal component for selecting questions from the bank.

```typescript
interface QuestionBankPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (questions: Question[]) => void;
  courseId: string;
  excludeIds?: string[];  // Already added questions
  allowedTypes?: QuestionType[];  // Filter by type
}
```

---

## Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- [ ] TypeSelectionModal component
- [ ] ActivityEditorDrawer shell
- [ ] ActivityEditorPage shell
- [ ] Editor configuration system
- [ ] Routes setup

### Sprint 2 (Week 3-4): Simple Editors
- [ ] MetadataSection shared component
- [ ] FileUploadSection shared component
- [ ] MediaEditor
- [ ] DocumentEditor
- [ ] SCORMEditor
- [ ] CustomEmbedEditor

### Sprint 3 (Week 5-6): Question Bank
- [ ] Question entity & API integration
- [ ] QuestionBankPage
- [ ] QuestionBankModal (picker)
- [ ] QuestionEditor modal
- [ ] Question type-specific editors (MC, TF, Short, Long)

### Sprint 4 (Week 7-8): Complex Editors Part 1
- [ ] QuestionListSection shared component
- [ ] ExerciseEditor (practice quiz)
- [ ] Matching question type
- [ ] Flashcard question type

### Sprint 5 (Week 9-10): Complex Editors Part 2
- [ ] AssessmentEditor (graded quiz)
- [ ] ScoringSection shared component
- [ ] TimeLimitsSection shared component
- [ ] AssignmentEditor with rubric builder

### Sprint 6 (Week 11-12): Polish & Integration
- [ ] End-to-end testing
- [ ] Error handling & validation
- [ ] Loading states & skeletons
- [ ] Accessibility audit
- [ ] Performance optimization

---

## API Dependencies

### Required Endpoints (verify with API team - A2)

> **Note:** Per checklist rule A1/A2, create message in `./api/agent_coms/messages/` before implementing any endpoint that isn't confirmed.

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/v2/learning-units` | POST | Create learning unit | ✅ Exists |
| `/api/v2/learning-units/:id` | PUT | Update learning unit | ✅ Exists |
| `/api/v2/upload/presigned` | POST | Get S3 upload URL | ✅ Exists |
| `/api/v2/departments/:id/questions` | GET | List question bank | 📨 Proposed |
| `/api/v2/departments/:id/questions` | POST | Create question | 📨 Proposed |
| `/api/v2/departments/:id/question-banks` | CRUD | Question bank collections | 📨 Proposed |
| `/api/v2/learning-units/:id/questions` | GET | Get unit questions | 📨 Proposed |
| `/api/v2/learning-units/:id/questions` | POST | Link questions | 📨 Proposed |
| `/api/v2/learning-units/:id/progress/:learnerId/questions` | GET | Learner progress | 📨 Proposed |
| `/api/v2/admin/questions/copy` | POST | Cross-dept copy | 📨 Proposed |
| `/api/v2/learning-units/:id/ai-quiz/*` | POST/GET | AI quiz shell | 📨 Proposed (Low) |

> **📨 = Proposed** in `api/agent_coms/messages/2026-01-23_ui_question_bank_api_proposal.md`

---

## Phase 6: Adaptive Testing (Medium Priority)

### 6.1 RandomizationSelector

**File:** `src/features/adaptive-testing/ui/RandomizationSelector.tsx`

Allows instructors to set question order preferences and optionally let learners choose.

```tsx
interface RandomizationSelectorProps {
  value: 'in_order' | 'by_difficulty' | 'completely_random';
  onChange: (level: RandomizationLevel) => void;
  allowUserChoice: boolean;
  onAllowUserChoiceChange: (allow: boolean) => void;
}

export function RandomizationSelector({
  value,
  onChange,
  allowUserChoice,
  onAllowUserChoiceChange,
}: RandomizationSelectorProps) {
  return (
    <div className="space-y-4">
      <Label>Question Order</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="in_order">
            In Order (questions appear in sequence)
          </SelectItem>
          <SelectItem value="by_difficulty">
            By Difficulty (easy → hard progression)
          </SelectItem>
          <SelectItem value="completely_random">
            Completely Random
          </SelectItem>
        </SelectContent>
      </Select>
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="allow-user-choice"
          checked={allowUserChoice}
          onCheckedChange={onAllowUserChoiceChange}
        />
        <Label htmlFor="allow-user-choice">
          Allow learner to choose their preferred order
        </Label>
      </div>
    </div>
  );
}
```

### 6.2 RepetitionSettings

**File:** `src/features/adaptive-testing/ui/RepetitionSettings.tsx`

Mastery-based repetition: questions "turn off" after N correct answers.

```tsx
interface RepetitionSettingsProps {
  threshold: number | null;
  onChange: (threshold: number | null) => void;
}

export function RepetitionSettings({ threshold, onChange }: RepetitionSettingsProps) {
  const enabled = threshold !== null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Switch
          id="enable-repetition"
          checked={enabled}
          onCheckedChange={(checked) => onChange(checked ? 3 : null)}
        />
        <Label htmlFor="enable-repetition">
          Enable mastery-based repetition
        </Label>
      </div>
      
      {enabled && (
        <div className="ml-6 space-y-2">
          <Label>Correct answers to master question:</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={threshold}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-20"
          />
          <p className="text-sm text-muted-foreground">
            Questions will stop appearing after this many correct answers in a testing round.
          </p>
        </div>
      )}
    </div>
  );
}
```

### 6.3 AdaptiveSettingsPanel

**File:** `src/features/adaptive-testing/ui/AdaptiveSettingsPanel.tsx`

Full adaptive testing configuration for instructors.

```tsx
interface AdaptiveConfig {
  enabled: boolean;
  skipRelatedOnCorrect: boolean;
  repeatWrongAnswers: boolean;
  repeatDelay: number;
  difficultyProgression: 'increase_on_correct' | 'decrease_on_wrong' | 'maintain';
  conceptMastery: {
    correctThreshold: number;
    action: 'skip_related' | 'reduce_weight' | 'complete';
  };
}

interface AdaptiveSettingsPanelProps {
  config: AdaptiveConfig;
  onChange: (config: AdaptiveConfig) => void;
}

export function AdaptiveSettingsPanel({ config, onChange }: AdaptiveSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Adaptive Testing</CardTitle>
        <CardDescription>
          Adjust question flow based on learner performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onChange({ ...config, enabled })}
          />
          <Label>Enable Adaptive Mode</Label>
        </div>
        
        {config.enabled && (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.skipRelatedOnCorrect}
                onCheckedChange={(checked) => 
                  onChange({ ...config, skipRelatedOnCorrect: !!checked })
                }
              />
              <Label>Skip related questions on correct answer</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.repeatWrongAnswers}
                onCheckedChange={(checked) => 
                  onChange({ ...config, repeatWrongAnswers: !!checked })
                }
              />
              <Label>Repeat wrong answers</Label>
            </div>
            
            {config.repeatWrongAnswers && (
              <div className="ml-6 flex items-center gap-2">
                <Label>Delay:</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.repeatDelay}
                  onChange={(e) => 
                    onChange({ ...config, repeatDelay: parseInt(e.target.value) })
                  }
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">questions between repeat</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Difficulty Progression</Label>
              <Select
                value={config.difficultyProgression}
                onValueChange={(value) => 
                  onChange({ ...config, difficultyProgression: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase_on_correct">
                    Increase on correct answer
                  </SelectItem>
                  <SelectItem value="decrease_on_wrong">
                    Decrease on wrong answer
                  </SelectItem>
                  <SelectItem value="maintain">
                    Maintain current level
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.4 Question Hierarchy Types

**File:** `src/features/question-bank/model/types.ts` (additions)

```typescript
interface QuestionHierarchy {
  parentQuestionId: string | null;
  relatedQuestionIds: string[];
  prerequisiteQuestionIds: string[];
  conceptTag: string | null;
  difficultyProgression: number | null;
}

interface Question {
  id: string;
  departmentId: string;
  bankId: string;
  type: QuestionType;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: number;
  explanation: string | null;
  // ... type-specific fields
  hierarchy: QuestionHierarchy;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 6.5 Learner Progress Hook

**File:** `src/features/adaptive-testing/model/use-learner-progress.ts`

```typescript
interface QuestionProgress {
  questionId: string;
  correctCount: number;
  incorrectCount: number;
  lastAttemptAt: string | null;
  isActive: boolean;  // false if mastered (turned off)
  masteredAt: string | null;
}

export function useLearnerProgress(learningUnitId: string, learnerId: string) {
  const { data: progress, isLoading } = useQuery({
    queryKey: ['learner-progress', learningUnitId, learnerId],
    queryFn: () => learnerProgressApi.getProgress(learningUnitId, learnerId),
  });
  
  const recordAnswer = useMutation({
    mutationFn: (params: { questionId: string; isCorrect: boolean }) =>
      learnerProgressApi.recordAnswer(learningUnitId, learnerId, params),
    onSuccess: () => {
      queryClient.invalidateQueries(['learner-progress', learningUnitId, learnerId]);
    },
  });
  
  return { progress, isLoading, recordAnswer };
}
```

---

## Phase 7: AI-Assisted Quizzing (Low Priority - Build Shell)

> **Note:** This phase builds the API integration shell and UI components, but actual AI functionality depends on backend LLM integration.

### 7.1 AI Quiz Types

**File:** `src/features/ai-quizzing/model/types.ts`

```typescript
interface AIQuizConfig {
  enabled: boolean;
  allowLearnerToggle: boolean;
  adaptationLevel: 'minimal' | 'moderate' | 'aggressive';
  allowQuestionGeneration: boolean;  // Future
  feedbackLevel: 'none' | 'correct_only' | 'detailed' | 'conversational';
  maxSessionDuration: number;  // minutes
  questionBankScope: 'linked_only' | 'department' | 'all_accessible';
}

interface AIQuizSession {
  id: string;
  learningUnitId: string;
  learnerId: string;
  status: 'active' | 'paused' | 'completed';
  aiEnabled: boolean;
  startedAt: string;
  questionsAnswered: number;
  correctRate: number;
  estimatedMastery: number;
}

interface AIQuizAnswer {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
  aiInsight: string | null;
  nextQuestion: Question | null;
  sessionProgress: {
    questionsAnswered: number;
    correctRate: number;
    estimatedMastery: number;
  };
}
```

### 7.2 AI Quiz Settings Panel

**File:** `src/features/ai-quizzing/ui/AIQuizSettingsPanel.tsx`

```tsx
interface AIQuizSettingsPanelProps {
  config: AIQuizConfig;
  onChange: (config: AIQuizConfig) => void;
}

export function AIQuizSettingsPanel({ config, onChange }: AIQuizSettingsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">AI-Assisted Quizzing</CardTitle>
          <Badge variant="outline">Beta</Badge>
        </div>
        <CardDescription>
          Let AI adapt questions based on learner performance in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            ⚠️ AI quizzing is in beta. Results may vary based on question bank quality.
          </AlertDescription>
        </Alert>
        
        <div className="flex items-center gap-2">
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onChange({ ...config, enabled })}
          />
          <Label>Enable AI-Assisted Quizzing</Label>
        </div>
        
        {config.enabled && (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={config.allowLearnerToggle}
                onCheckedChange={(checked) => 
                  onChange({ ...config, allowLearnerToggle: !!checked })
                }
              />
              <Label>Allow learner to toggle AI assistance</Label>
            </div>
            
            <div className="space-y-2">
              <Label>Adaptation Level</Label>
              <Select
                value={config.adaptationLevel}
                onValueChange={(value) => 
                  onChange({ ...config, adaptationLevel: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">
                    Minimal (subtle adjustments)
                  </SelectItem>
                  <SelectItem value="moderate">
                    Moderate (noticeable adaptation)
                  </SelectItem>
                  <SelectItem value="aggressive">
                    Aggressive (significant changes)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Feedback Level</Label>
              <Select
                value={config.feedbackLevel}
                onValueChange={(value) => 
                  onChange({ ...config, feedbackLevel: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (no AI feedback)</SelectItem>
                  <SelectItem value="correct_only">Correct Only</SelectItem>
                  <SelectItem value="detailed">Detailed (explanations)</SelectItem>
                  <SelectItem value="conversational">Conversational (interactive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Question Scope</Label>
              <Select
                value={config.questionBankScope}
                onValueChange={(value) => 
                  onChange({ ...config, questionBankScope: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linked_only">
                    Linked questions only
                  </SelectItem>
                  <SelectItem value="department">
                    Entire department question bank
                  </SelectItem>
                  <SelectItem value="all_accessible">
                    All accessible banks
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 7.3 AI Quiz Session Hook (Shell)

**File:** `src/features/ai-quizzing/model/use-ai-quiz-session.ts`

```typescript
export function useAIQuizSession(learningUnitId: string) {
  const [session, setSession] = useState<AIQuizSession | null>(null);
  
  const startSession = useMutation({
    mutationFn: (config: AIQuizConfig) =>
      aiQuizApi.startSession(learningUnitId, config),
    onSuccess: (data) => setSession(data),
  });
  
  const submitAnswer = useMutation({
    mutationFn: (params: { questionId: string; answer: string; timeSpent: number }) =>
      aiQuizApi.submitAnswer(session!.id, params),
  });
  
  const endSession = useMutation({
    mutationFn: () => aiQuizApi.endSession(session!.id),
    onSuccess: () => setSession(null),
  });
  
  return {
    session,
    startSession,
    submitAnswer,
    endSession,
    isActive: session?.status === 'active',
  };
}
```

### 7.4 AI Quiz API Shell

**File:** `src/features/ai-quizzing/lib/ai-quiz-api.ts`

```typescript
// API shell - endpoints may return 501 Not Implemented until backend is ready

export const aiQuizApi = {
  startSession: async (learningUnitId: string, config: AIQuizConfig) => {
    const response = await api.post(`/learning-units/${learningUnitId}/ai-quiz/start`, {
      aiConfig: config,
    });
    return response.data as AIQuizSession;
  },
  
  submitAnswer: async (
    sessionId: string, 
    params: { questionId: string; answer: string; timeSpent: number }
  ) => {
    const response = await api.post(
      `/learning-units/${sessionId}/ai-quiz/${sessionId}/answer`,
      params
    );
    return response.data as AIQuizAnswer;
  },
  
  endSession: async (sessionId: string) => {
    await api.post(`/ai-quiz/${sessionId}/end`);
  },
  
  getAnalytics: async (learningUnitId: string) => {
    const response = await api.get(`/learning-units/${learningUnitId}/ai-quiz/analytics`);
    return response.data;
  },
};
```

---

## Updated Implementation Timeline

### Sprint 1 (Week 1-2): Foundation
- [ ] TypeSelectionModal component
- [ ] ActivityEditorDrawer shell
- [ ] ActivityEditorPage shell
- [ ] Editor configuration system
- [ ] Routes setup

### Sprint 2 (Week 3-4): Simple Editors
- [ ] MetadataSection shared component
- [ ] FileUploadSection shared component
- [ ] MediaEditor
- [ ] DocumentEditor
- [ ] SCORMEditor
- [ ] CustomEmbedEditor

### Sprint 3 (Week 5-6): Question Bank (Department-Scoped)
- [ ] Question entity & API integration (department-scoped)
- [ ] QuestionBankPage with bank collections
- [ ] QuestionBankModal (picker)
- [ ] QuestionEditor modal with hierarchy fields
- [ ] Question type-specific editors (MC, TF, Short, Long)

### Sprint 4 (Week 7-8): Complex Editors Part 1
- [ ] QuestionListSection shared component
- [ ] ExerciseEditor (practice quiz)
- [ ] Matching question type
- [ ] Flashcard question type

### Sprint 5 (Week 9-10): Complex Editors Part 2 + Randomization
- [ ] AssessmentEditor (graded quiz)
- [ ] RandomizationSelector component
- [ ] RepetitionSettings component
- [ ] ScoringSection shared component
- [ ] TimeLimitsSection shared component
- [ ] AssignmentEditor with rubric builder

### Sprint 6 (Week 11-12): Adaptive Testing
- [ ] AdaptiveSettingsPanel
- [ ] QuestionHierarchyEditor
- [ ] Learner progress tracking UI
- [ ] Adaptive algorithm implementation (client-side)
- [ ] Cross-department copy modal (admin)

### Sprint 7 (Week 13-14): AI Quizzing Shell + Polish
- [ ] AIQuizSettingsPanel
- [ ] AI Quiz session hook (shell)
- [ ] AI Quiz API integration (shell)
- [ ] End-to-end testing
- [ ] Error handling & validation
- [ ] Loading states & skeletons
- [ ] Accessibility audit
- [ ] Performance optimization

---

## Checklist Compliance Summary

| Rule | Requirement | Implementation |
|------|-------------|----------------|
| **F1** | FSD structure | Components in `features/learning-activity-editor/`, entities in `entities/` |
| **S1** | State management | React Query for server, `useState` for local, zod for validation |
| **E1** | Error handling | `useToast()` for API errors, inline `Alert` for form validation, `ErrorPanel` for page errors |
| **P2** | Endpoint paths | Verify with API team before implementing |
| **T1** | Tests per phase | Write tests after each sprint completion |
| **T3** | TypeScript check | Run `npx tsc --noEmit` before marking complete |

---

## Success Metrics

1. **Consistency:** All activity types use the same entry point (TypeSelectionModal)
2. **Efficiency:** Simple activities complete in <30 seconds
3. **Discoverability:** Users find all activity types without documentation
4. **Reusability:** Questions can be reused across 3+ activities on average
5. **Error Prevention:** Form validation catches 95% of errors before submission

---

## Related Documents

- [Learning Activity Editor Forms](./LEARNING_ACTIVITY_EDITOR_FORMS.md) - Detailed wireframes
- [Question Bank Editor Form](./QUESTION_BANK_EDITOR_FORM.md) - Question management
- [FEATURE_DEVELOPMENT_CHECKLIST](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) - Coding standards
- [UI_COMPONENT_LIBRARY](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) - Reusable components
- [API Contracts](/api/contracts/) - Backend API specifications
