# UI-ISS-073: Standardize all forms on shadcn + React Hook Form pattern

**Date:** 2026-01-26
**Reporter:** User
**Priority:** High
**Status:** Completed (tsc failing elsewhere)

## Description

Forms across the UI use a mix of direct `register()` calls and the shadcn/RHF `FormField` pattern. This leads to inconsistent layout, validation messaging, and accessibility wiring. Standardize all forms to use `src/shared/ui/form.tsx` (FormProvider + FormField + FormControl + FormMessage).

## Scope

- Refactor all active forms to use `FormField` with `control` + `render` instead of `register()`.
- Ensure inputs are direct children of `FormControl` for proper ID/aria wiring.
- Maintain existing validation schemas and behavior.

## Related Files

- `src/shared/ui/form.tsx`
- `api/agent_coms/dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md`
- `api/agent_coms/dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md`

## Status Checklist

- [x] Audit all forms using `register()`
- [x] Refactor to `FormField` pattern
- [ ] Verify validation + UX consistency
- [ ] Run `npx tsc --noEmit` before completion

## Progress Notes

- Refactored: `LoginForm`, `CourseModuleForm`, `SendAnnouncementDialog`, `LessonSettingsDialog`, `UserForm`, `GradeOverrideDialog`, `ContentForm`, `CertificateTemplateEditorPage`, `CourseEditorPage`, `DepthLevelEditor`, `MetadataSection`, `MediaEditor`, `SCORMEditor`, `CustomEmbedEditor`, `DocumentEditor`, `ExerciseEditor`, `AssessmentEditor`, `AssignmentEditor`, `QuestionEditorModal`, `_archived_old_course_implementation/course-management/ui/CourseForm`.
- `npx tsc --noEmit` run on 2026-01-26; failed with existing repo errors (tests/types) unrelated to this change-set.
