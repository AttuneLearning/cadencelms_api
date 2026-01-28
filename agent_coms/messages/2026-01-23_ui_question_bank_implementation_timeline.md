# UI Team - Question Bank Implementation Timeline & Priorities

## Date: 2026-01-23
## From: UI Team
## To: API Team
## Priority: High
## Related: 2026-01-23_ui_question_bank_api_proposal.md
## Status: Coordination Request

---

## Summary

This message provides a **prioritized implementation timeline** for the Question Bank and Learning Activity Editor API contracts proposed in our earlier message. The goal is to enable **parallel development** between API and UI teams while minimizing blockers.

---

## Recommended Approach

### Phase A: Contract Agreement (1-2 days)

Before parallel work begins, we need agreement on:

1. **Review** the API proposal in `2026-01-23_ui_question_bank_api_proposal.md`
2. **Confirm or modify** endpoint paths, field names, response shapes
3. **Lock contracts** - both teams work against the same spec

**Please reply with any changes to the proposed contracts.**

---

## Phase B: Parallel Development Schedule

### Sprint 1-2 (Weeks 1-4)

| API Team | UI Team |
|----------|---------|
| *(No new endpoints needed yet)* | TypeSelectionModal component |
| *(Can work on Question Bank infra)* | ActivityEditorDrawer shell |
| | ActivityEditorPage shell |
| | Editor configuration system |
| | Routes setup |

**Dependencies:** None - UI uses existing Learning Unit CRUD

---

### Sprint 3-4 (Weeks 5-8)

| API Team | UI Team |
|----------|---------|
| *(No new endpoints needed yet)* | MetadataSection shared component |
| *(Can continue Question Bank work)* | FileUploadSection shared component |
| | MediaEditor |
| | DocumentEditor |
| | SCORMEditor |
| | CustomEmbedEditor |

**Dependencies:** None - UI uses existing upload/learning unit endpoints

---

### Sprint 5 (Weeks 9-10) ⚠️ **CRITICAL HANDOFF**

| API Team (Must Complete) | UI Team |
|--------------------------|---------|
| `GET/POST/PUT/DELETE /departments/:id/questions` | QuestionBankPage |
| `GET/POST/PUT/DELETE /departments/:id/question-banks` | QuestionBankModal (picker) |
| `GET/POST/DELETE /learning-units/:id/questions` | QuestionEditor modal |
| `POST /learning-units/:id/questions/bulk` | Question type editors |
| Learning Unit `questionSelection` settings | ExerciseEditor (practice quiz) |

**⚠️ UI BLOCKED if these endpoints aren't ready by Week 9**

---

### Sprint 6 (Weeks 11-12)

| API Team | UI Team |
|----------|---------|
| `GET/POST /learning-units/:id/progress/:learnerId/questions` | AssessmentEditor (graded quiz) |
| `POST /admin/questions/copy` | RandomizationSelector |
| `POST /admin/question-banks/copy` | RepetitionSettings |
| Question hierarchy fields | AdaptiveSettingsPanel |
| Adaptive testing settings | QuestionHierarchyEditor |
| | Cross-department copy modal (admin) |

**Dependencies:** Learner progress tracking, adaptive config

---

### Sprint 7 (Weeks 13-14) - Low Priority

| API Team | UI Team |
|----------|---------|
| `POST /learning-units/:id/ai-quiz/start` (shell) | AIQuizSettingsPanel |
| `POST /learning-units/:id/ai-quiz/:id/answer` (shell) | AI Quiz session UI (shell) |
| `GET /learning-units/:id/ai-quiz/analytics` (shell) | End-to-end testing |
| | Polish, accessibility, performance |

**Note:** AI endpoints can return 501 Not Implemented until LLM integration is ready

---

## API Priority Order (Critical Path)

Please implement in this order to avoid blocking UI:

### Priority 1 - Must Have by Week 9
```
1. GET  /api/v2/departments/:departmentId/questions
2. POST /api/v2/departments/:departmentId/questions
3. PUT  /api/v2/departments/:departmentId/questions/:id
4. DELETE /api/v2/departments/:departmentId/questions/:id
5. GET  /api/v2/departments/:departmentId/question-banks
6. POST /api/v2/departments/:departmentId/question-banks
7. GET  /api/v2/learning-units/:id/questions
8. POST /api/v2/learning-units/:id/questions
9. DELETE /api/v2/learning-units/:id/questions/:linkId
10. POST /api/v2/learning-units/:id/questions/bulk
```

### Priority 2 - Must Have by Week 11
```
11. Learning Unit settings extension (questionSelection object)
    - mode: 'manual' | 'random' | 'adaptive'
    - randomizationLevel: 'in_order' | 'by_difficulty' | 'completely_random'
    - repetitionThreshold: number | null
    - allowUserRandomizationChoice: boolean
12. GET  /api/v2/learning-units/:id/progress/:learnerId/questions
13. POST /api/v2/learning-units/:id/progress/:learnerId/questions/:questionId
```

### Priority 3 - Must Have by Week 13
```
14. Question hierarchy fields (parentQuestionId, relatedQuestionIds, etc.)
15. Adaptive testing config (skipRelatedOnCorrect, repeatWrongAnswers, etc.)
16. POST /api/v2/admin/questions/copy
17. POST /api/v2/admin/question-banks/copy
```

### Priority 4 - Low (Shell Only)
```
18. POST /api/v2/learning-units/:id/ai-quiz/start (can return 501)
19. POST /api/v2/learning-units/:id/ai-quiz/:id/answer (can return 501)
20. GET  /api/v2/learning-units/:id/ai-quiz/analytics (can return 501)
```

---

## Mock Data Strategy

While waiting for API endpoints, UI team will use mock data:

```typescript
// Example mock for Question Bank
const mockQuestions: Question[] = [
  {
    id: 'mock-1',
    departmentId: 'dept-1',
    bankId: 'bank-1',
    type: 'multiple_choice',
    text: 'What is React?',
    difficulty: 'easy',
    // ... etc
  },
];

// UI can develop against this, swap to real API when ready
```

This allows UI to build and test components before API is complete.

---

## Contract Validation Checkpoints

| Checkpoint | Date | Validation |
|------------|------|------------|
| Contract Lock | Week 1 | Both teams agree on API spec |
| Sprint 5 Start | Week 9 | API confirms Priority 1 endpoints ready |
| Sprint 6 Start | Week 11 | API confirms Priority 2 endpoints ready |
| Sprint 7 Start | Week 13 | API confirms Priority 3 endpoints ready |

---

## Questions for API Team

1. **Can you commit to Priority 1 endpoints by Week 9?**
2. **Any concerns with the department-scoped question model?**
3. **Preferred approach for question deletion with dependencies?**
   - Option A: Return error with dependency list (proposed)
   - Option B: Cascade delete links automatically
4. **AI Quiz endpoints**: Should we define the shell now, or defer entirely?

---

## Response Requested

Please reply with:
1. Confirmation of contract agreement (or proposed changes)
2. Estimated delivery dates for each priority tier
3. Any concerns or blockers
4. Preferred meeting time for contract review (if needed)

Thank you!
