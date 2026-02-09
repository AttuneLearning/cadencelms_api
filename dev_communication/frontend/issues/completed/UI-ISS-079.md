# UI-ISS-079: Question System API Integration

## Status: PENDING
## Priority: Medium
## Created: 2026-01-29
## Updated: 2026-01-29
## Requested By: UI Team
## Assigned To: Unassigned
## Related: UI-ISS-075, UI-ISS-076, UI-ISS-077, UI-ISS-078, API-ISS-009, API-ISS-010, API-ISS-011
## Depends-On: UI-ISS-075

---

## Overview

Connect the UI to the new API endpoints for flashcards, matching exercises, and the updated Question model. This includes adding new React Query hooks, updating existing hooks, and ensuring proper data transformation between UI and API formats.

---

## Requirements

1. Update Question API calls for monolithic design
2. Add Flashcard-specific API hooks
3. Add Matching-specific API hooks
4. Add Media upload API integration
5. Handle backward compatibility with legacy data

---

## Technical Specification

### 1. Question API Updates

**File:** `src/entities/question/api/questionApi.ts`

**Current Payload:**
```typescript
// Uses questionType singular in some places
const payload = {
  questionText: data.questionText,
  questionTypes: [data.questionType],  // Converting singular to array
  options: data.options,
  correctAnswer: data.correctAnswer,   // Singular
  // ...
};
```

**Required Payload:**
```typescript
const payload = {
  questionText: data.questionText,
  questionTypes: data.questionTypes,    // Already array
  options: data.options,
  correctAnswers: data.correctAnswers,  // Array
  distractors: data.distractors,        // New field
  flashcardData: data.flashcardData,    // New field
  matchingData: data.matchingData,      // New field
  // ...
};
```

### 2. Flashcard API Hooks

**New File:** `src/features/flashcard-player/api/flashcardApi.ts`

```typescript
import { apiClient } from '@/shared/api/client';

// Types
export interface FlashcardConfig {
  enabled: boolean;
  flashcardsPerCheck: number;
  failureThreshold: number;
  checkFrequency: 'every_module' | 'every_n_modules' | 'end_of_course';
  requireContentReview: boolean;
  requireFinalRetake: boolean;
}

export interface FlashcardSession {
  sessionId: string;
  courseId: string;
  cards: FlashcardCard[];
  totalCards: number;
  masteredCards: number;
}

export interface FlashcardCard {
  cardId: string;
  questionId: string;
  front: MediaContent;
  back: MediaContent;
  difficulty: number;  // SM-2 difficulty
  dueDate: string;
}

export interface FlashcardResult {
  cardId: string;
  quality: 0 | 1 | 2 | 3 | 4 | 5;  // SM-2 quality rating
  responseTime: number;
}

// API Functions
export const flashcardApi = {
  // Course configuration
  getConfig: (courseId: string) =>
    apiClient.get<FlashcardConfig>(`/api/v2/courses/${courseId}/flashcard-config`),

  updateConfig: (courseId: string, config: Partial<FlashcardConfig>) =>
    apiClient.put<FlashcardConfig>(`/api/v2/courses/${courseId}/flashcard-config`, config),

  // Learner sessions
  getSession: (courseId: string) =>
    apiClient.get<FlashcardSession>(`/api/v2/courses/${courseId}/flashcard-session`),

  recordResult: (courseId: string, result: FlashcardResult) =>
    apiClient.post(`/api/v2/courses/${courseId}/flashcard-result`, result),

  getProgress: (courseId: string) =>
    apiClient.get(`/api/v2/courses/${courseId}/flashcard-progress`),

  resetProgress: (courseId: string) =>
    apiClient.delete(`/api/v2/courses/${courseId}/flashcard-progress`),
};
```

**New File:** `src/features/flashcard-player/model/useFlashcard.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flashcardApi } from '../api/flashcardApi';

export const flashcardKeys = {
  all: ['flashcard'] as const,
  config: (courseId: string) => [...flashcardKeys.all, 'config', courseId] as const,
  session: (courseId: string) => [...flashcardKeys.all, 'session', courseId] as const,
  progress: (courseId: string) => [...flashcardKeys.all, 'progress', courseId] as const,
};

export function useFlashcardConfig(courseId: string) {
  return useQuery({
    queryKey: flashcardKeys.config(courseId),
    queryFn: () => flashcardApi.getConfig(courseId),
    enabled: !!courseId,
  });
}

export function useUpdateFlashcardConfig(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: Partial<FlashcardConfig>) =>
      flashcardApi.updateConfig(courseId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.config(courseId) });
    },
  });
}

export function useFlashcardSession(courseId: string) {
  return useQuery({
    queryKey: flashcardKeys.session(courseId),
    queryFn: () => flashcardApi.getSession(courseId),
    enabled: !!courseId,
  });
}

export function useRecordFlashcardResult(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (result: FlashcardResult) =>
      flashcardApi.recordResult(courseId, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.session(courseId) });
      queryClient.invalidateQueries({ queryKey: flashcardKeys.progress(courseId) });
    },
  });
}

export function useFlashcardProgress(courseId: string) {
  return useQuery({
    queryKey: flashcardKeys.progress(courseId),
    queryFn: () => flashcardApi.getProgress(courseId),
    enabled: !!courseId,
  });
}
```

### 3. Matching Exercise API Hooks

**New File:** `src/features/matching-player/api/matchingApi.ts`

```typescript
import { apiClient } from '@/shared/api/client';

export interface MatchingSession {
  sessionId: string;
  exerciseId: string;
  columnA: MatchingItem[];
  columnB: MatchingItem[];  // Shuffled
  timeLimit: number | null;
  startedAt: string;
}

export interface MatchingItem {
  id: string;
  content: MediaContent;
  isDistractor?: boolean;
}

export interface MatchingSubmission {
  matches: Array<{
    columnAId: string;
    columnBId: string;
  }>;
  completedAt: string;
}

export interface MatchingResult {
  score: number;
  maxScore: number;
  correct: number;
  incorrect: number;
  feedback: Array<{
    columnAId: string;
    columnBId: string;
    isCorrect: boolean;
    correctMatch?: string;
    explanation?: string;
  }>;
}

export const matchingApi = {
  getSession: (exerciseId: string) =>
    apiClient.get<MatchingSession>(`/api/v2/content/exercises/${exerciseId}/matching-session`),

  submitResult: (exerciseId: string, submission: MatchingSubmission) =>
    apiClient.post<MatchingResult>(`/api/v2/content/exercises/${exerciseId}/matching-result`, submission),

  getAttempts: (exerciseId: string) =>
    apiClient.get(`/api/v2/content/exercises/${exerciseId}/matching-attempts`),
};
```

**New File:** `src/features/matching-player/model/useMatching.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchingApi } from '../api/matchingApi';

export const matchingKeys = {
  all: ['matching'] as const,
  session: (exerciseId: string) => [...matchingKeys.all, 'session', exerciseId] as const,
  attempts: (exerciseId: string) => [...matchingKeys.all, 'attempts', exerciseId] as const,
};

export function useMatchingSession(exerciseId: string) {
  return useQuery({
    queryKey: matchingKeys.session(exerciseId),
    queryFn: () => matchingApi.getSession(exerciseId),
    enabled: !!exerciseId,
  });
}

export function useSubmitMatching(exerciseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: MatchingSubmission) =>
      matchingApi.submitResult(exerciseId, submission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.attempts(exerciseId) });
    },
  });
}

export function useMatchingAttempts(exerciseId: string) {
  return useQuery({
    queryKey: matchingKeys.attempts(exerciseId),
    queryFn: () => matchingApi.getAttempts(exerciseId),
    enabled: !!exerciseId,
  });
}
```

### 4. Media Upload API Integration

**New File:** `src/shared/api/mediaApi.ts`

```typescript
import { apiClient } from './client';

export interface UploadUrlRequest {
  filename: string;
  contentType: string;
  size: number;
  context: 'flashcard' | 'matching' | 'question' | 'content';
}

export interface UploadUrlResponse {
  uploadId: string;
  uploadUrl: string;
  cdnUrl: string;
  expiresAt: string;
}

export interface MediaRecord {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string;
  cdnUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export const mediaApi = {
  requestUploadUrl: (request: UploadUrlRequest) =>
    apiClient.post<UploadUrlResponse>('/api/v2/media/upload-url', request),

  confirmUpload: (uploadId: string) =>
    apiClient.post<MediaRecord>('/api/v2/media/confirm', { uploadId }),

  getMedia: (mediaId: string) =>
    apiClient.get<MediaRecord>(`/api/v2/media/${mediaId}`),

  deleteMedia: (mediaId: string) =>
    apiClient.delete(`/api/v2/media/${mediaId}`),
};
```

### 5. Backward Compatibility Layer

**Update:** `src/entities/question/model/useQuestion.ts`

```typescript
// Transform API response for backward compatibility
function normalizeQuestion(question: ApiQuestion): Question {
  return {
    ...question,
    // Ensure questionTypes is always an array
    questionTypes: question.questionTypes || [question.questionType].filter(Boolean),
    // Ensure correctAnswers is always an array
    correctAnswers: Array.isArray(question.correctAnswers)
      ? question.correctAnswers
      : question.correctAnswer
        ? [question.correctAnswer]
        : [],
    // Legacy fields for old UI components
    questionType: question.questionTypes?.[0] || question.questionType,
    correctAnswer: question.correctAnswers?.[0] || question.correctAnswer,
  };
}

// Transform UI data for API
function prepareQuestionPayload(data: QuestionFormData): CreateQuestionPayload {
  return {
    ...data,
    questionTypes: data.questionTypes || [data.questionType].filter(Boolean),
    correctAnswers: Array.isArray(data.correctAnswers)
      ? data.correctAnswers
      : data.correctAnswer
        ? [data.correctAnswer]
        : [],
    // Don't send legacy fields to API
    questionType: undefined,
    correctAnswer: undefined,
  };
}
```

---

## Implementation

### Files to Create

| File | Description |
|------|-------------|
| `src/features/flashcard-player/api/flashcardApi.ts` | Flashcard API functions |
| `src/features/flashcard-player/model/useFlashcard.ts` | Flashcard hooks |
| `src/features/matching-player/api/matchingApi.ts` | Matching API functions |
| `src/features/matching-player/model/useMatching.ts` | Matching hooks |
| `src/shared/api/mediaApi.ts` | Media upload API |

### Files to Modify

| File | Description |
|------|-------------|
| `src/entities/question/api/questionApi.ts` | Update payloads |
| `src/entities/question/model/useQuestion.ts` | Add transformers |

---

## Tests Required

1. [ ] Question create with new payload format
2. [ ] Question update with new payload format
3. [ ] Legacy questions still load correctly
4. [ ] Flashcard config CRUD works
5. [ ] Flashcard session loads cards
6. [ ] Flashcard result recording works
7. [ ] Matching session loads shuffled items
8. [ ] Matching submission returns results
9. [ ] Media upload flow works
10. [ ] Backward compatibility transforms work

---

## Acceptance Criteria

- [ ] Question API uses monolithic payload format
- [ ] Flashcard hooks work with live API
- [ ] Matching hooks work with live API
- [ ] Media upload works (S3 or local)
- [ ] Legacy data transforms correctly
- [ ] No TypeScript errors
- [ ] API error handling works
- [ ] Code reviewed

---

## Questions / Clarifications

1. Should we cache flashcard sessions or always fetch fresh?
2. How should we handle offline flashcard practice?
3. Should media upload show progress?

---

## Implementation Notes

*To be added during implementation*

---

## Completion

**Completed Date:**
**Commits:**
| Hash | Description |
|------|-------------|
| | |

**Verification:**
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Response message sent (if cross-team)

---

*Status values: PENDING -> IN PROGRESS -> REVIEW -> COMPLETE*
*Move file: queue/ -> active/ -> completed/*
