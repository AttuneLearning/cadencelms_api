# Adaptive Learning UI Implementation Plan

**Date:** 2026-01-25
**Owner:** UI Team
**Status:** Ready for Implementation
**Related Issues:** UI-ISS-068 (Learning Activity Flow)

---

## Executive Summary

This plan details the remaining UI work needed to achieve full compatibility with the API team's adaptive learning system. It cross-references the [FEATURE_DEVELOPMENT_CHECKLIST](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) and [UI_COMPONENT_LIBRARY](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) to ensure consistent patterns.

**API Status:** All adaptive learning endpoints are LIVE and tested (Phases 1-7 complete on API side).

---

## Checklist Compliance Matrix

| Code | Rule | How We'll Comply |
|------|------|------------------|
| **P1** | Permission strings | Use permissions from API contracts (e.g., `content:assessments:manage`) |
| **P2** | Endpoint paths | All endpoints verified in `contracts/api/*.contract.ts` |
| **P3** | Field/type names | Generate types from contracts; match API response shapes |
| **A1** | API changes | N/A - API is complete; no changes needed |
| **A2** | New endpoints | N/A - All endpoints confirmed and tested |
| **F1** | FSD structure | `entities/` for data, `features/` for business logic, `pages/` for routes |
| **S1** | State management | React Query for server state, Zustand for UI state |
| **E1** | Error handling | `ErrorPanel` for page errors, `useToast()` for mutations, `Alert` for forms |
| **T1** | Tests per phase | Write tests after each sprint completion |
| **T3** | TypeScript check | Run `npx tsc --noEmit` before marking each phase complete |

---

## Component Library Usage Plan

| Component | Where Used |
|-----------|------------|
| `PageHeader` | QuestionBankPage, KnowledgeNodePage, LearnerProgressPage |
| `ErrorPanel` | All page-level error states with retry |
| `DataTable` | Question lists, knowledge node lists, progress tables |
| `Skeleton` | All loading states |
| `ConfirmDialog` | Delete confirmations (questions, banks, nodes) |
| `Card` | Question cards, bank cards, node cards, settings panels |
| `Tabs` | Course settings, assessment settings |
| `Badge` | Question type indicators, depth level indicators, source badges |
| `Progress` | Mastery progress bars |
| `Alert` | Form validation errors, dependency warnings |
| `Button` | All actions (primary: Save, secondary: Cancel, destructive: Delete) |
| `Dialog` | Question editor, node editor, bulk operations |
| `Select` | Department picker, bank picker, depth level picker |
| `Switch` | Enable/disable toggles (adaptive mode, course overrides) |
| `Tooltip` | Help text on complex fields |

---

## Architecture Overview

### New Entities (FSD Layer: `entities/`)

```
src/entities/
├── question-bank/               # NEW - Question Bank collections
│   ├── api/
│   │   └── questionBankApi.ts
│   ├── model/
│   │   ├── types.ts
│   │   ├── questionBankKeys.ts
│   │   └── useQuestionBank.ts
│   ├── ui/
│   │   ├── QuestionBankCard.tsx
│   │   └── QuestionBankList.tsx
│   └── index.ts
│
├── knowledge-node/              # NEW - Knowledge Nodes
│   ├── api/
│   │   └── knowledgeNodeApi.ts
│   ├── model/
│   │   ├── types.ts
│   │   ├── knowledgeNodeKeys.ts
│   │   └── useKnowledgeNode.ts
│   ├── ui/
│   │   ├── KnowledgeNodeCard.tsx
│   │   ├── KnowledgeNodeTree.tsx
│   │   └── KnowledgeNodeBadge.tsx
│   └── index.ts
│
├── cognitive-depth/             # NEW - Cognitive Depth Levels
│   ├── api/
│   │   └── cognitiveDepthApi.ts
│   ├── model/
│   │   ├── types.ts
│   │   └── useCognitiveDepth.ts
│   ├── ui/
│   │   └── DepthLevelBadge.tsx
│   └── index.ts
│
├── learner-progress/            # NEW - Learner Knowledge Progress
│   ├── api/
│   │   └── learnerProgressApi.ts
│   ├── model/
│   │   ├── types.ts
│   │   └── useLearnerProgress.ts
│   ├── ui/
│   │   ├── ProgressCard.tsx
│   │   └── MasteryIndicator.tsx
│   └── index.ts
│
└── question/                    # UPDATE - Department-scoped
    ├── api/
    │   └── questionApi.ts       # Change endpoints to /departments/:id/questions
    └── ...
```

### New Features (FSD Layer: `features/`)

```
src/features/
├── adaptive-testing/            # EXISTS - Connect to real API
│   ├── api/
│   │   └── adaptiveApi.ts       # NEW - Connect to /adaptive/* endpoints
│   └── ...
│
├── question-bank-management/    # NEW - Question Bank CRUD
│   ├── ui/
│   │   ├── CreateBankDialog.tsx
│   │   ├── EditBankDialog.tsx
│   │   ├── QuestionBankFilters.tsx
│   │   └── BulkQuestionOperations.tsx
│   └── ...
│
├── knowledge-node-management/   # NEW - Knowledge Node CRUD
│   ├── ui/
│   │   ├── CreateNodeDialog.tsx
│   │   ├── EditNodeDialog.tsx
│   │   ├── PrerequisiteEditor.tsx
│   │   └── NodeTreeView.tsx
│   └── ...
│
├── course-depth-settings/       # NEW - Course-level depth overrides
│   ├── ui/
│   │   ├── CourseDepthSettings.tsx
│   │   ├── DepthOverrideEditor.tsx
│   │   └── DepartmentAdaptiveSettings.tsx
│   └── ...
│
└── admin-question-copy/         # NEW - Cross-department copy (admin)
    ├── ui/
    │   ├── CrossDepartmentCopyDialog.tsx
    │   └── BankCopyDialog.tsx
    └── ...
```

### New Pages (FSD Layer: `pages/`)

```
src/pages/
├── staff/
│   ├── QuestionBankPage.tsx           # /staff/departments/:id/question-banks
│   ├── KnowledgeNodePage.tsx          # /staff/departments/:id/knowledge-nodes
│   └── CourseDepthSettingsPage.tsx    # /staff/courses/:id/settings/adaptive
│
├── learner/
│   └── KnowledgeProgressPage.tsx      # /learn/progress
│
└── admin/
    └── QuestionAdminPage.tsx          # /admin/questions (cross-dept copy)
```

---

## Sprint 1: Question Bank Foundation (Week 1-2)

### 1.1 Update Question Entity API

**Task:** Change Question entity from `/questions` to `/departments/:id/questions`

**Checklist Compliance:**
- [P2] Endpoints verified in `contracts/api/question-banks.contract.ts`
- [P3] Types generated from contract
- [F1] Update existing `src/entities/question/`

**Files to Modify:**

```typescript
// src/entities/question/api/questionApi.ts
// BEFORE:
export async function getQuestions(params?: QuestionListParams) {
  const response = await client.get('/questions', { params });
  return response.data.data;
}

// AFTER:
export async function getQuestions(
  departmentId: string,
  params?: QuestionListParams
) {
  const response = await client.get(
    `/departments/${departmentId}/questions`,
    { params }
  );
  return response.data.data;
}
```

**New Fields to Add:**

```typescript
// src/entities/question/model/types.ts
interface Question {
  id: string;
  departmentId: string;
  questionBankId: string;  // Single bank reference
  questionBankIds?: string[];  // Legacy - to be deprecated
  questionText: string;
  questionTypes: string[];  // Array, not single type
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  // ... existing fields ...
  
  // NEW: Adaptive learning fields (optional)
  knowledgeNodeId?: string;
  cognitiveDepth?: string;  // 'exposure' | 'practice' | 'proficiency' | 'mastery'
  
  // NEW: Hierarchy fields (optional)
  hierarchy?: {
    parentQuestionId?: string;
    relatedQuestionIds: string[];
    prerequisiteQuestionIds: string[];
    conceptTag?: string;
    difficultyProgression?: number;
  };
}
```

**Hook Updates:**

```typescript
// src/entities/question/model/useQuestion.ts
export function useQuestions(departmentId: string, params?: QuestionListParams) {
  return useQuery({
    queryKey: questionKeys.list(departmentId, params),
    queryFn: () => questionApi.getQuestions(departmentId, params),
    enabled: !!departmentId,
  });
}
```

### 1.2 Create Question Bank Entity

**Task:** New entity for question bank collections

**Checklist Compliance:**
- [P2] Endpoints from `contracts/api/question-banks.contract.ts`
- [F1] New entity at `src/entities/question-bank/`
- [S1] React Query for server state

**Files to Create:**

```typescript
// src/entities/question-bank/model/types.ts
export interface QuestionBank {
  id: string;
  departmentId: string;
  name: string;
  description: string | null;
  questionCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuestionBankListParams {
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface QuestionBankListResponse {
  questionBanks: QuestionBank[];
  pagination: Pagination;
}

export interface CreateQuestionBankPayload {
  name: string;
  description?: string;
  tags?: string[];
}

export interface UpdateQuestionBankPayload {
  name?: string;
  description?: string;
  tags?: string[];
}
```

```typescript
// src/entities/question-bank/api/questionBankApi.ts
import { client } from '@/shared/api/client';
import type {
  QuestionBankListResponse,
  QuestionBankListParams,
  QuestionBank,
  CreateQuestionBankPayload,
  UpdateQuestionBankPayload,
} from '../model/types';

const BASE_PATH = (deptId: string) => `/departments/${deptId}/question-banks`;

export async function getQuestionBanks(
  departmentId: string,
  params?: QuestionBankListParams
): Promise<QuestionBankListResponse> {
  const response = await client.get(BASE_PATH(departmentId), { params });
  return response.data.data;
}

export async function getQuestionBank(
  departmentId: string,
  bankId: string
): Promise<QuestionBank> {
  const response = await client.get(`${BASE_PATH(departmentId)}/${bankId}`);
  return response.data.data;
}

export async function createQuestionBank(
  departmentId: string,
  payload: CreateQuestionBankPayload
): Promise<QuestionBank> {
  const response = await client.post(BASE_PATH(departmentId), payload);
  return response.data.data;
}

export async function updateQuestionBank(
  departmentId: string,
  bankId: string,
  payload: UpdateQuestionBankPayload
): Promise<QuestionBank> {
  const response = await client.put(
    `${BASE_PATH(departmentId)}/${bankId}`,
    payload
  );
  return response.data.data;
}

export async function deleteQuestionBank(
  departmentId: string,
  bankId: string
): Promise<void> {
  await client.delete(`${BASE_PATH(departmentId)}/${bankId}`);
}
```

```typescript
// src/entities/question-bank/model/useQuestionBank.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/ui/use-toast';
import * as questionBankApi from '../api/questionBankApi';
import { questionBankKeys } from './questionBankKeys';
import type {
  QuestionBankListParams,
  CreateQuestionBankPayload,
  UpdateQuestionBankPayload,
} from './types';

export function useQuestionBanks(
  departmentId: string,
  params?: QuestionBankListParams
) {
  return useQuery({
    queryKey: questionBankKeys.list(departmentId, params),
    queryFn: () => questionBankApi.getQuestionBanks(departmentId, params),
    enabled: !!departmentId,
  });
}

export function useQuestionBank(departmentId: string, bankId: string) {
  return useQuery({
    queryKey: questionBankKeys.detail(departmentId, bankId),
    queryFn: () => questionBankApi.getQuestionBank(departmentId, bankId),
    enabled: !!departmentId && !!bankId,
  });
}

export function useCreateQuestionBank(departmentId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateQuestionBankPayload) =>
      questionBankApi.createQuestionBank(departmentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists(departmentId) });
      toast({
        title: 'Question bank created',
        description: 'The question bank has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create question bank',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateQuestionBank(departmentId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ bankId, payload }: { bankId: string; payload: UpdateQuestionBankPayload }) =>
      questionBankApi.updateQuestionBank(departmentId, bankId, payload),
    onSuccess: (_, { bankId }) => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists(departmentId) });
      queryClient.invalidateQueries({ queryKey: questionBankKeys.detail(departmentId, bankId) });
      toast({
        title: 'Question bank updated',
        description: 'Changes have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update question bank',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteQuestionBank(departmentId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (bankId: string) =>
      questionBankApi.deleteQuestionBank(departmentId, bankId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionBankKeys.lists(departmentId) });
      toast({
        title: 'Question bank deleted',
        description: 'The question bank has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete question bank',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### 1.3 Question Bank Page

**Task:** Create Question Bank management page

**Component Library Usage:**
- `PageHeader` - Page title with "Create Bank" action
- `DataTable` - List of question banks with sorting/filtering
- `Card` - Bank cards in grid view option
- `ConfirmDialog` - Delete confirmation
- `Skeleton` - Loading state
- `ErrorPanel` - Error state with retry
- `Badge` - Question count, tag display

**File:** `src/pages/staff/QuestionBankPage.tsx`

```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel } from '@/shared/ui/error-panel';
import { Skeleton } from '@/shared/ui/skeleton';
import { Button } from '@/shared/ui/button';
import { DataTable } from '@/shared/ui/data-table';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Badge } from '@/shared/ui/badge';

import {
  useQuestionBanks,
  useDeleteQuestionBank,
} from '@/entities/question-bank';
import { CreateBankDialog } from '@/features/question-bank-management';

export function QuestionBankPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuestionBanks(departmentId!);

  const deleteMutation = useDeleteQuestionBank(departmentId!);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorPanel
        error={error}
        onRetry={refetch}
        title="Failed to load question banks"
      />
    );
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'questionCount',
      header: 'Questions',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.questionCount}</Badge>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Updated',
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeleteTarget(row.original.id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Banks"
        description="Manage question collections for assessments and exercises"
      >
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Bank
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data?.questionBanks ?? []}
        searchable
        searchPlaceholder="Search question banks..."
      />

      <CreateBankDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        departmentId={departmentId!}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        title="Delete Question Bank"
        description="Are you sure you want to delete this question bank? Questions will be unlinked but not deleted."
        confirmText="Delete"
        isDestructive
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
```

### 1.4 Sprint 1 Completion Checklist

- [ ] [T3] Run `npx tsc --noEmit` - no new TypeScript errors
- [ ] [T1] Write tests for `questionBankApi.ts`
- [ ] [T1] Write tests for `useQuestionBank.ts` hooks
- [ ] [T1] Write component tests for `QuestionBankPage.tsx`
- [ ] Verify all API calls match contract shapes

---

## Sprint 2: Knowledge Nodes & Adaptive Selection (Week 3-4)

### 2.1 Create Knowledge Node Entity

**Task:** New entity for knowledge nodes with tree structure support

**Checklist Compliance:**
- [P2] Endpoints from `contracts/api/knowledge-nodes.contract.ts`
- [F1] New entity at `src/entities/knowledge-node/`

**Types:**

```typescript
// src/entities/knowledge-node/model/types.ts
export interface KnowledgeNode {
  id: string;
  departmentId: string;
  name: string;
  slug: string;
  description: string | null;
  parentNodeId: string | null;
  prerequisiteNodeIds: string[];
  relatedNodeIds: string[];
  depthRange: {
    min: string;  // cognitive depth slug
    max: string;
  };
  tags: string[];
  questionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNodeTree {
  node: KnowledgeNode;
  children: KnowledgeNodeTree[];
}

export interface CreateKnowledgeNodePayload {
  name: string;
  description?: string;
  parentNodeId?: string;
  prerequisiteNodeIds?: string[];
  relatedNodeIds?: string[];
  depthRange?: {
    min: string;
    max: string;
  };
  tags?: string[];
}
```

**API:**

```typescript
// src/entities/knowledge-node/api/knowledgeNodeApi.ts
const BASE_PATH = (deptId: string) => `/departments/${deptId}/knowledge-nodes`;

export async function getKnowledgeNodes(
  departmentId: string,
  params?: KnowledgeNodeListParams
): Promise<KnowledgeNodeListResponse> {
  const response = await client.get(BASE_PATH(departmentId), { params });
  return response.data.data;
}

export async function getKnowledgeNodeTree(
  departmentId: string
): Promise<KnowledgeNodeTree[]> {
  const response = await client.get(`${BASE_PATH(departmentId)}/tree`);
  return response.data.data;
}

export async function getKnowledgeNode(
  departmentId: string,
  nodeId: string
): Promise<KnowledgeNode> {
  const response = await client.get(`${BASE_PATH(departmentId)}/${nodeId}`);
  return response.data.data;
}

export async function createKnowledgeNode(
  departmentId: string,
  payload: CreateKnowledgeNodePayload
): Promise<KnowledgeNode> {
  const response = await client.post(BASE_PATH(departmentId), payload);
  return response.data.data;
}

export async function addPrerequisite(
  departmentId: string,
  nodeId: string,
  prerequisiteId: string
): Promise<void> {
  await client.post(
    `${BASE_PATH(departmentId)}/${nodeId}/prerequisites`,
    { prerequisiteNodeId: prerequisiteId }
  );
}

export async function removePrerequisite(
  departmentId: string,
  nodeId: string,
  prerequisiteId: string
): Promise<void> {
  await client.delete(
    `${BASE_PATH(departmentId)}/${nodeId}/prerequisites/${prerequisiteId}`
  );
}
```

### 2.2 Knowledge Node Tree UI

**Task:** Hierarchical tree view for knowledge nodes

**Component Library Usage:**
- `Card` - Node cards in tree
- `Collapsible` - Expandable tree branches
- `Badge` - Question count, depth range
- `Button` - Add child, edit, delete actions
- `Tooltip` - Help text for prerequisites

**File:** `src/entities/knowledge-node/ui/KnowledgeNodeTree.tsx`

```tsx
import { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

import type { KnowledgeNodeTree as NodeTree } from '../model/types';

interface KnowledgeNodeTreeProps {
  tree: NodeTree[];
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
}

export function KnowledgeNodeTree({
  tree,
  onEdit,
  onDelete,
  onAddChild,
}: KnowledgeNodeTreeProps) {
  return (
    <div className="space-y-2">
      {tree.map((item) => (
        <TreeNode
          key={item.node.id}
          item={item}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddChild={onAddChild}
          depth={0}
        />
      ))}
    </div>
  );
}

function TreeNode({
  item,
  onEdit,
  onDelete,
  onAddChild,
  depth,
}: {
  item: NodeTree;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
  depth: number;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const hasChildren = item.children.length > 0;

  return (
    <div style={{ marginLeft: depth * 24 }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-2 rounded hover:bg-muted">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1">
            <span className="font-medium">{item.node.name}</span>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">
                {item.node.questionCount} questions
              </Badge>
              <Badge variant="outline">
                {item.node.depthRange.min} → {item.node.depthRange.max}
              </Badge>
              {item.node.prerequisiteNodeIds.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline">
                      {item.node.prerequisiteNodeIds.length} prereqs
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Prerequisites must be mastered first
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddChild(item.node.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item.node.id)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item.node.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            {item.children.map((child) => (
              <TreeNode
                key={child.node.id}
                item={child}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
                depth={depth + 1}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
```

### 2.3 Connect Adaptive Testing to Real API

**Task:** Wire existing adaptive testing UI components to live API endpoints

**Checklist Compliance:**
- [P2] Endpoints from `contracts/api/adaptive-selection.contract.ts`
- [S1] React Query for server state
- [E1] Toast for errors

**File:** `src/features/adaptive-testing/api/adaptiveApi.ts`

```typescript
import { client } from '@/shared/api/client';

interface SelectQuestionParams {
  learnerId?: string;
  knowledgeNodeId?: string;
  departmentId: string;
  questionBankIds?: string[];
  excludeQuestionIds?: string[];
  preferredStrategy?: 'advancing' | 'reinforcing' | 'reviewing';
  contextType?: 'exercise' | 'assessment' | 'practice' | 'review';
}

interface SelectQuestionsParams extends SelectQuestionParams {
  count: number;
}

interface RecordResponseParams {
  learnerId?: string;
  questionId: string;
  knowledgeNodeId: string;
  cognitiveDepth: string;
  isCorrect: boolean;
}

interface AdaptiveQuestionResponse {
  question: Question;
  presentationType: string;
  cognitiveDepth: string;
  selectionReason: 'advancing' | 'reinforcing' | 'reviewing';
  adaptiveMetadata: {
    currentMastery: number;
    targetDepth: string;
    progressToNextDepth: number;
  };
}

interface RecordResponseResult {
  progressUpdated: boolean;
  newMasteryScore: number;
  levelAdvanced: boolean;
  previousDepth: string;
  newDepth?: string;
  isNodeComplete: boolean;
}

export async function selectQuestion(
  params: SelectQuestionParams
): Promise<AdaptiveQuestionResponse> {
  const response = await client.post('/adaptive/select-question', params);
  return response.data.data;
}

export async function selectQuestions(
  params: SelectQuestionsParams
): Promise<AdaptiveQuestionResponse[]> {
  const response = await client.post('/adaptive/select-questions', params);
  return response.data.data;
}

export async function recordResponse(
  params: RecordResponseParams
): Promise<RecordResponseResult> {
  const response = await client.post('/adaptive/record-response', params);
  return response.data.data;
}
```

**Hook Update:**

```typescript
// src/features/adaptive-testing/model/useAdaptiveQuiz.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/ui/use-toast';
import * as adaptiveApi from '../api/adaptiveApi';
import { learnerProgressKeys } from '@/entities/learner-progress';

export function useSelectQuestion() {
  return useMutation({
    mutationFn: adaptiveApi.selectQuestion,
  });
}

export function useSelectQuestions() {
  return useMutation({
    mutationFn: adaptiveApi.selectQuestions,
  });
}

export function useRecordResponse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: adaptiveApi.recordResponse,
    onSuccess: (result, variables) => {
      // Invalidate learner progress cache
      queryClient.invalidateQueries({
        queryKey: learnerProgressKeys.forNode(
          variables.learnerId!,
          variables.knowledgeNodeId
        ),
      });

      if (result.levelAdvanced) {
        toast({
          title: 'Level Up!',
          description: `You've advanced to ${result.newDepth} level!`,
        });
      }

      if (result.isNodeComplete) {
        toast({
          title: 'Mastery Achieved!',
          description: 'You have mastered this knowledge area.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to record response',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

### 2.4 Sprint 2 Completion Checklist

- [ ] [T3] Run `npx tsc --noEmit` - no new TypeScript errors
- [ ] [T1] Write tests for `knowledgeNodeApi.ts`
- [ ] [T1] Write tests for `adaptiveApi.ts`
- [ ] [T1] Write component tests for `KnowledgeNodeTree.tsx`
- [ ] Verify tree rendering with nested nodes

---

## Sprint 3: Course Depth Settings & Progress (Week 5-6)

### 3.1 Create Cognitive Depth Entity

**Task:** Entity for cognitive depth levels with course overrides

**Types:**

```typescript
// src/entities/cognitive-depth/model/types.ts
export interface CognitiveDepthLevel {
  slug: string;
  name: string;
  description: string;
  order: number;
  advanceThreshold: number;  // 0.0 - 1.0 decimal
  minAttempts: number;
  source: 'system' | 'department' | 'course';
  isActive: boolean;
}

export interface CourseDepthLevelsResponse {
  levels: CognitiveDepthLevel[];
  canOverride: boolean;
  hasOverrides: boolean;
}

export interface DepthOverridePayload {
  advanceThreshold?: number;
  minAttempts?: number;
  description?: string;
}
```

**API:**

```typescript
// src/entities/cognitive-depth/api/cognitiveDepthApi.ts
// System defaults
export async function getSystemDepthLevels(): Promise<CognitiveDepthLevel[]> {
  const response = await client.get('/cognitive-depth-levels');
  return response.data.data;
}

// Department levels (merged with system)
export async function getDepartmentDepthLevels(
  departmentId: string
): Promise<CognitiveDepthLevel[]> {
  const response = await client.get(
    `/departments/${departmentId}/cognitive-depth-levels`
  );
  return response.data.data;
}

// Course levels (merged with department and system)
export async function getCourseDepthLevels(
  courseId: string
): Promise<CourseDepthLevelsResponse> {
  const response = await client.get(
    `/courses/${courseId}/cognitive-depth-levels`
  );
  return response.data.data;
}

// Create/update course override
export async function setCourseDepthOverride(
  courseId: string,
  slug: string,
  payload: DepthOverridePayload
): Promise<void> {
  await client.put(
    `/courses/${courseId}/cognitive-depth-levels/${slug}`,
    payload
  );
}

// Remove course override
export async function removeCourseDepthOverride(
  courseId: string,
  slug: string
): Promise<void> {
  await client.delete(
    `/courses/${courseId}/cognitive-depth-levels/${slug}`
  );
}

// Remove all course overrides
export async function removeAllCourseDepthOverrides(
  courseId: string
): Promise<void> {
  await client.delete(`/courses/${courseId}/cognitive-depth-levels`);
}
```

### 3.2 Course Depth Settings Page

**Task:** UI for course-level cognitive depth overrides

**Component Library Usage:**
- `PageHeader` - With back button to course settings
- `Card` - Settings panels
- `Tabs` - If combining with other course settings
- `Badge` - Source indicator (system/department/course)
- `Switch` - Enable/disable overrides at department level
- `Alert` - Warning when overrides disabled
- `ConfirmDialog` - Reset confirmation

**File:** `src/features/course-depth-settings/ui/CourseDepthSettings.tsx`

```tsx
import { useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Skeleton } from '@/shared/ui/skeleton';
import { ErrorPanel } from '@/shared/ui/error-panel';

import {
  useCourseDepthLevels,
  useSetCourseDepthOverride,
  useRemoveCourseDepthOverride,
  useRemoveAllCourseDepthOverrides,
} from '@/entities/cognitive-depth';
import type { CognitiveDepthLevel } from '@/entities/cognitive-depth';

interface CourseDepthSettingsProps {
  courseId: string;
}

export function CourseDepthSettings({ courseId }: CourseDepthSettingsProps) {
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [showResetAll, setShowResetAll] = useState(false);

  const { data, isLoading, error, refetch } = useCourseDepthLevels(courseId);
  const setOverride = useSetCourseDepthOverride(courseId);
  const removeOverride = useRemoveCourseDepthOverride(courseId);
  const removeAll = useRemoveAllCourseDepthOverrides(courseId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorPanel error={error} onRetry={refetch} />;
  }

  const { levels, canOverride, hasOverrides } = data!;

  // Source badge color helper
  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'system':
        return <Badge variant="secondary">🌐 System</Badge>;
      case 'department':
        return <Badge variant="outline">🏢 Department</Badge>;
      case 'course':
        return <Badge>📚 Course Override</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cognitive Depth Levels</CardTitle>
            <CardDescription>
              Customize mastery thresholds for this course
            </CardDescription>
          </div>
          {hasOverrides && canOverride && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetAll(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All to Defaults
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!canOverride && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Course-level overrides are not enabled for this department.
              Contact a department administrator to enable this feature.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {levels.map((level) => (
            <DepthLevelRow
              key={level.slug}
              level={level}
              canOverride={canOverride}
              isEditing={editingLevel === level.slug}
              onEdit={() => setEditingLevel(level.slug)}
              onCancel={() => setEditingLevel(null)}
              onSave={(payload) => {
                setOverride.mutate(
                  { slug: level.slug, payload },
                  { onSuccess: () => setEditingLevel(null) }
                );
              }}
              onReset={() => {
                removeOverride.mutate(level.slug);
              }}
              getSourceBadge={getSourceBadge}
            />
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={showResetAll}
        onOpenChange={setShowResetAll}
        onConfirm={() => {
          removeAll.mutate();
          setShowResetAll(false);
        }}
        title="Reset All Overrides"
        description="This will remove all course-level customizations and revert to department/system defaults."
        confirmText="Reset All"
        isDestructive
        isLoading={removeAll.isPending}
      />
    </Card>
  );
}

// Helper component for each depth level row
function DepthLevelRow({
  level,
  canOverride,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onReset,
  getSourceBadge,
}: {
  level: CognitiveDepthLevel;
  canOverride: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (payload: { advanceThreshold?: number; minAttempts?: number }) => void;
  onReset: () => void;
  getSourceBadge: (source: string) => React.ReactNode;
}) {
  const [threshold, setThreshold] = useState(
    Math.round(level.advanceThreshold * 100)
  );
  const [minAttempts, setMinAttempts] = useState(level.minAttempts);

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-medium">{level.name}</span>
          {getSourceBadge(level.source)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Advance Threshold (%)</Label>
            <Input
              type="number"
              min={50}
              max={100}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label>Minimum Attempts</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={minAttempts}
              onChange={(e) => setMinAttempts(parseInt(e.target.value))}
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={() =>
              onSave({
                advanceThreshold: threshold / 100,
                minAttempts,
              })
            }
          >
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border rounded-lg p-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{level.name}</span>
          {getSourceBadge(level.source)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {Math.round(level.advanceThreshold * 100)}% success rate,{' '}
          {level.minAttempts} min attempts
        </div>
      </div>
      {canOverride && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Customize
          </Button>
          {level.source === 'course' && (
            <Button size="sm" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3.3 Learner Progress Entity

**Task:** Entity for learner knowledge progress tracking

**Types:**

```typescript
// src/entities/learner-progress/model/types.ts
export interface LearnerKnowledgeProgress {
  id: string;
  learnerId: string;
  knowledgeNodeId: string;
  departmentId: string;
  currentDepth: string;
  masteryScore: number;  // 0-100
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptAt: string | null;
  lastCorrectAt: string | null;
  depthProgress: Record<string, DepthLevelProgress>;
  isComplete: boolean;
  isActive: boolean;
}

export interface DepthLevelProgress {
  attempts: number;
  correct: number;
  mastered: boolean;
  masteredAt?: string;
  lastAttemptAt?: string;
}

export interface ProgressSummary {
  totalNodes: number;
  masteredNodes: number;
  inProgressNodes: number;
  notStartedNodes: number;
  overallMasteryPercent: number;
  depthDistribution: Record<string, number>;
}
```

**API:**

```typescript
// src/entities/learner-progress/api/learnerProgressApi.ts
export async function getLearnerProgress(
  learnerId: string,
  departmentId?: string
): Promise<LearnerKnowledgeProgress[]> {
  const response = await client.get(
    `/learners/${learnerId}/knowledge-progress`,
    { params: { departmentId } }
  );
  return response.data.data;
}

export async function getProgressSummary(
  learnerId: string,
  departmentId: string
): Promise<ProgressSummary> {
  const response = await client.get(
    `/learners/${learnerId}/knowledge-progress/summary`,
    { params: { departmentId } }
  );
  return response.data.data;
}

export async function getNodeProgress(
  learnerId: string,
  nodeId: string
): Promise<LearnerKnowledgeProgress> {
  const response = await client.get(
    `/learners/${learnerId}/knowledge-progress/${nodeId}`
  );
  return response.data.data;
}

export async function resetNodeProgress(
  learnerId: string,
  nodeId: string
): Promise<void> {
  await client.delete(`/learners/${learnerId}/knowledge-progress/${nodeId}`);
}
```

### 3.4 Learner Progress Dashboard

**Task:** Progress visualization for learners

**Component Library Usage:**
- `PageHeader` - "My Learning Progress"
- `Card` - Summary cards, node progress cards
- `Progress` - Mastery progress bars
- `Badge` - Current depth level
- `Skeleton` - Loading state

**File:** `src/entities/learner-progress/ui/MasteryIndicator.tsx`

```tsx
import { Progress } from '@/shared/ui/progress';
import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

interface MasteryIndicatorProps {
  masteryScore: number;
  currentDepth: string;
  isComplete: boolean;
}

export function MasteryIndicator({
  masteryScore,
  currentDepth,
  isComplete,
}: MasteryIndicatorProps) {
  const getDepthColor = (depth: string) => {
    switch (depth) {
      case 'exposure':
        return 'bg-blue-500';
      case 'practice':
        return 'bg-yellow-500';
      case 'proficiency':
        return 'bg-orange-500';
      case 'mastery':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger>
            <Badge className={getDepthColor(currentDepth)}>
              {currentDepth}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Current cognitive depth level
          </TooltipContent>
        </Tooltip>
        <span className="text-sm font-medium">
          {Math.round(masteryScore)}%
          {isComplete && ' ✓'}
        </span>
      </div>
      <Progress value={masteryScore} className="h-2" />
    </div>
  );
}
```

### 3.5 Sprint 3 Completion Checklist

- [ ] [T3] Run `npx tsc --noEmit` - no new TypeScript errors
- [ ] [T1] Write tests for `cognitiveDepthApi.ts`
- [ ] [T1] Write tests for `learnerProgressApi.ts`
- [ ] [T1] Write component tests for `CourseDepthSettings.tsx`
- [ ] Verify threshold format (0.0-1.0 decimal, display as %)

---

## Sprint 4: Admin Features & Polish (Week 7-8)

### 4.1 Cross-Department Copy UI (Admin)

**Task:** System admin tool for copying questions/banks between departments

**Checklist Compliance:**
- [P1] Permission: `system:admin:access` or similar admin permission
- [P2] Endpoints from `contracts/api/question-banks.contract.ts`

**File:** `src/features/admin-question-copy/ui/CrossDepartmentCopyDialog.tsx`

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { useToast } from '@/shared/ui/use-toast';

import { useDepartments } from '@/entities/department';
import { useQuestionBanks, useQuestions } from '@/entities/question-bank';

interface CrossDepartmentCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrossDepartmentCopyDialog({
  open,
  onOpenChange,
}: CrossDepartmentCopyDialogProps) {
  const { toast } = useToast();
  const [sourceDeptId, setSourceDeptId] = useState<string>('');
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [sourceBankId, setSourceBankId] = useState<string>('');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const { data: departments } = useDepartments();
  const { data: sourceBanks } = useQuestionBanks(sourceDeptId);
  const { data: questions } = useQuestions(sourceDeptId, {
    bankId: sourceBankId || undefined,
  });

  const handleCopy = async () => {
    try {
      // Call admin copy API
      await adminQuestionCopyApi.copyQuestions({
        questionIds: selectedQuestionIds,
        sourceDepartmentId: sourceDeptId,
        targetDepartmentId: targetDeptId,
      });
      toast({
        title: 'Questions copied',
        description: `${selectedQuestionIds.length} questions copied successfully.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Copy Questions Between Departments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              This will create copies of the selected questions in the target department.
              Original questions remain unchanged.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source Department</Label>
              <Select value={sourceDeptId} onValueChange={setSourceDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Target Department</Label>
              <Select value={targetDeptId} onValueChange={setTargetDeptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target..." />
                </SelectTrigger>
                <SelectContent>
                  {departments
                    ?.filter((d) => d.id !== sourceDeptId)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceDeptId && (
            <div>
              <Label>Filter by Bank (optional)</Label>
              <Select value={sourceBankId} onValueChange={setSourceBankId}>
                <SelectTrigger>
                  <SelectValue placeholder="All banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All banks</SelectItem>
                  {sourceBanks?.questionBanks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name} ({bank.questionCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {questions && (
            <div className="border rounded-lg p-4 max-h-64 overflow-auto">
              <Label className="mb-2 block">Select Questions</Label>
              {questions.questions.map((q) => (
                <div key={q.id} className="flex items-center gap-2 py-1">
                  <Checkbox
                    id={q.id}
                    checked={selectedQuestionIds.includes(q.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedQuestionIds([...selectedQuestionIds, q.id]);
                      } else {
                        setSelectedQuestionIds(
                          selectedQuestionIds.filter((id) => id !== q.id)
                        );
                      }
                    }}
                  />
                  <Label htmlFor={q.id} className="font-normal cursor-pointer">
                    {q.questionText.substring(0, 80)}...
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={!targetDeptId || selectedQuestionIds.length === 0}
          >
            Copy {selectedQuestionIds.length} Questions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.2 Bulk Question Depth Assignment

**Task:** Multi-select questions and assign cognitive depth

**File:** `src/features/question-bank-management/ui/BulkQuestionOperations.tsx`

```tsx
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useToast } from '@/shared/ui/use-toast';
import { useBulkUpdateQuestionDepth } from '@/entities/question';

interface BulkQuestionOperationsProps {
  selectedQuestionIds: string[];
  departmentId: string;
  onComplete: () => void;
}

export function BulkQuestionOperations({
  selectedQuestionIds,
  departmentId,
  onComplete,
}: BulkQuestionOperationsProps) {
  const { toast } = useToast();
  const [cognitiveDepth, setCognitiveDepth] = useState<string>('');
  const bulkUpdate = useBulkUpdateQuestionDepth(departmentId);

  const handleBulkUpdate = () => {
    bulkUpdate.mutate(
      {
        questionIds: selectedQuestionIds,
        cognitiveDepth,
      },
      {
        onSuccess: (result) => {
          toast({
            title: 'Bulk update complete',
            description: `${result.updated} questions updated, ${result.failed} failed.`,
          });
          onComplete();
        },
      }
    );
  };

  if (selectedQuestionIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {selectedQuestionIds.length} selected
      </span>

      <Select value={cognitiveDepth} onValueChange={setCognitiveDepth}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Set cognitive depth..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="exposure">Exposure</SelectItem>
          <SelectItem value="practice">Practice</SelectItem>
          <SelectItem value="proficiency">Proficiency</SelectItem>
          <SelectItem value="mastery">Mastery</SelectItem>
        </SelectContent>
      </Select>

      <Button
        onClick={handleBulkUpdate}
        disabled={!cognitiveDepth || bulkUpdate.isPending}
      >
        Apply to Selected
      </Button>
    </div>
  );
}
```

### 4.3 Integration Testing & Polish

**Tasks:**
- End-to-end flow testing
- Error boundary implementation
- Loading state consistency
- Accessibility audit

### 4.4 Sprint 4 Completion Checklist

- [ ] [T3] Run `npx tsc --noEmit` - no new TypeScript errors
- [ ] [T2] Run `npm run build && npm test` - all tests pass
- [ ] [T1] Write integration tests for full adaptive learning flow
- [ ] Accessibility audit with keyboard navigation
- [ ] Error states tested for all API failures

---

## Routes to Add

```typescript
// src/app/router/index.tsx additions

// Staff routes
{
  path: 'departments/:departmentId/question-banks',
  element: <QuestionBankPage />,
},
{
  path: 'departments/:departmentId/knowledge-nodes',
  element: <KnowledgeNodePage />,
},
{
  path: 'courses/:courseId/settings/adaptive',
  element: <CourseDepthSettingsPage />,
},

// Learner routes
{
  path: 'progress',
  element: <KnowledgeProgressPage />,
},

// Admin routes
{
  path: 'questions',
  element: <QuestionAdminPage />,
},
```

---

## API Endpoint Summary

All endpoints are LIVE per API team messages.

| Entity | Endpoints | Contract File |
|--------|-----------|---------------|
| Question Banks | `/departments/:id/question-banks` | `question-banks.contract.ts` |
| Questions (Dept) | `/departments/:id/questions` | `question-banks.contract.ts` |
| Knowledge Nodes | `/departments/:id/knowledge-nodes` | `knowledge-nodes.contract.ts` |
| Cognitive Depth | `/cognitive-depth-levels`, `/courses/:id/cognitive-depth-levels` | `cognitive-depth-levels.contract.ts` |
| Learner Progress | `/learners/:id/knowledge-progress` | `learner-knowledge-progress.contract.ts` |
| Adaptive Selection | `/adaptive/select-question`, `/adaptive/record-response` | `adaptive-selection.contract.ts` |
| Admin Copy | `/admin/questions/copy`, `/admin/question-banks/copy` | `question-banks.contract.ts` |
| Dept Settings | `/departments/:id/adaptive-settings` | `department-adaptive-settings.contract.ts` |

---

## Success Metrics

1. **API Compatibility:** 100% of API endpoints integrated with correct request/response shapes
2. **Component Reuse:** All pages use standardized components from UI_COMPONENT_LIBRARY
3. **Error Handling:** All API calls have proper error handling per E1 guidelines
4. **Type Safety:** Zero TypeScript errors at sprint completion
5. **Test Coverage:** Core hooks and API functions have unit tests

---

## Related Documents

- [FEATURE_DEVELOPMENT_CHECKLIST](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) - Coding standards
- [UI_COMPONENT_LIBRARY](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) - Component reference
- [API Contracts](../../../contracts/api/) - Endpoint specifications
- [LEARNING_ACTIVITY_IMPLEMENTATION_PLAN](./LEARNING_ACTIVITY_IMPLEMENTATION_PLAN.md) - Original activity editor plan
- [QUESTION_BANK_EDITOR_FORM](./QUESTION_BANK_EDITOR_FORM.md) - Question bank wireframes

---

## Appendix: Quick Reference

### Permission Strings (P1)

```
content:assessments:manage   - Question bank CRUD
content:courses:manage       - Course depth settings
system:admin:access          - Cross-department copy
```

### Common Imports

```tsx
// Page-level components
import { PageHeader } from '@/shared/ui/page-header';
import { ErrorPanel } from '@/shared/ui/error-panel';
import { Skeleton } from '@/shared/ui/skeleton';

// Data display
import { DataTable } from '@/shared/ui/data-table';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';

// Forms
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';

// Dialogs
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

// Layout
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

// Hooks
import { useToast } from '@/shared/ui/use-toast';
```

### State Management Pattern (S1)

```tsx
// Server state - React Query
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => api.getEntity(id),
});

// Mutations with toast feedback
const mutation = useMutation({
  mutationFn: api.updateEntity,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity'] });
    toast({ title: 'Saved successfully' });
  },
  onError: (error) => {
    toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
  },
});

// Local UI state
const [isOpen, setIsOpen] = useState(false);
```

### Error Handling Pattern (E1)

```tsx
// Page-level error
if (error) {
  return <ErrorPanel error={error} onRetry={refetch} />;
}

// Form validation error
{errors.fieldName && (
  <Alert variant="destructive">
    <AlertDescription>{errors.fieldName.message}</AlertDescription>
  </Alert>
)}

// Mutation error (handled in onError callback with toast)
```
