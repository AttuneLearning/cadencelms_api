# Learning Activity Editor Forms Specification

**Date:** 2026-01-23
**Owner:** UI Team
**Scope:** Editor forms for each Learning Activity (Learning Unit) type

> Note: API naming uses Learning Units. UI uses Learning Activities.

**Related Documents:**
- [Implementation Plan](./LEARNING_ACTIVITY_IMPLEMENTATION_PLAN.md) - Architecture, component library mapping, timeline
- [Question Bank Editor](./QUESTION_BANK_EDITOR_FORM.md) - Question management system
- [UI Component Library](../../dev_guidance/architecture/ui/UI_COMPONENT_LIBRARY.md) - Reusable components
- [Feature Development Checklist](../../dev_guidance/FEATURE_DEVELOPMENT_CHECKLIST.md) - Coding standards

---

## 1) SCORM Activity Editor

### Purpose
Upload a SCORM package to S3 and associate it with the learning activity.

### Form Fields
- **Title** (required)
- **Description** (optional)
- **SCORM Package Upload** (required)
- **Thumbnail** (optional)
- **Duration (minutes)** (optional)
- **Required for completion** (toggle)

### Behavior
- Upload dialog posts to S3 and returns a content reference.
- After upload succeeds, allow Save to create the learning activity.

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ SCORM Activity                                              │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│                (multi-line)                                 │
│ SCORM Upload: [ Select .zip ] (Upload Progress 65%)         │
│ Thumbnail:    [ Choose Image ] (optional)                   │
│ Duration:     [ 60 ] minutes                                │
│ Required:     [✓] Required for completion                   │
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 2) Media Activity Editor

### Purpose
Upload media assets (video/audio/images) to S3 and associate with the activity.

### Form Fields
- **Title** (required)
- **Description** (optional)
- **Media Type** (video/audio/image)
- **Media Upload** (required)
- **Duration (minutes)** (optional, for video/audio)
- **Required for completion** (toggle)

### Behavior
- Upload dialog posts to S3 and returns a content reference.
- Supports multiple formats by type.

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ Media Activity                                              │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│ Media Type:   (●) Video ( ) Audio ( ) Image                 │
│ Media Upload: [ Select File ] (Upload Progress 20%)         │
│ Duration:     [ 15 ] minutes                                │
│ Required:     [✓] Required for completion                   │
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 3) Quiz Activity Editor (Assessment)

### Purpose
Create a quiz by selecting questions from the Question Bank. Support random selection so the quiz varies per attempt, with non-repeating rotation until all questions are used.

### Form Fields
- **Title** (required)
- **Description** (optional)
- **Time Limit (minutes)** (optional)
- **Passing Score (%)** (optional)
- **Shuffle Questions** (toggle)
- **Question Source**
  - **Manual Selection** (add question cards from bank)
  - **Random Selection** (count + filters)
- **Question Bank Filters** (type, difficulty, tags)

### Behavior
- Manual mode: add/remove/reorder selected question cards.
- Random mode: store `randomPool` criteria and `randomCount`.
- Rotation logic: track used question IDs and only repeat when all have been used.
- Provide a "Question Bank Editor" link for managing questions.

**Question Bank Editor Spec:** See [QUESTION_BANK_EDITOR_FORM.md](./QUESTION_BANK_EDITOR_FORM.md)

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ Quiz (Assessment)                                           │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│ Time Limit:   [ 30 ] minutes    Passing: [ 70 ] %           │
│ Shuffle:      [✓] Shuffle questions                         │
│                                                         ┌──┐│
│ Question Source: (●) Manual  ( ) Random                    │
│                                                         ┌──┐│
│ Manual: [ Add from Question Bank ]                         │
│   ┌──────────────────────────────────────────────────┐     │
│   │ Q1: Multiple choice - Basics of React            │     │
│   │ Q2: True/False - Hooks usage                     │     │
│   │ Q3: Short answer - useEffect                     │     │
│   └──────────────────────────────────────────────────┘     │
│                                                         ┌──┐│
│ Random: [ Count: 20 ] [ Filters: Type | Difficulty | Tags ]│
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 4) Assignment Activity Editor

### Purpose
Create an assignment activity with learner upload support.

### Form Fields
- **Assignment Title** (required)
- **Assignment Description** (required)
- **Allowed File Types** (optional)
- **Learner Upload Requirement** (toggle)
- **Instructor Upload (starter file)** (optional)

### Behavior
- Instructor upload attaches starter file.
- Learner sees a submission upload panel.

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ Assignment                                                  │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│                (multi-line)                                 │
│ Allowed Files: [ .pdf, .docx, .zip ] (optional)             │
│ Learner Upload: [✓] Required                                │
│ Starter File:  [ Upload File ] (optional)                   │
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 5) Flashcard Activity Editor

### Purpose
Create a flashcard deck for practice.

### Form Fields
- **Title** (required)
- **Description** (optional)
- **Cards** (front/back, optional hint)

### Behavior
- Add/reorder/delete cards.
- Support rich text or simple text.

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ Flashcards                                                  │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│                                                         ┌──┐│
│ Cards                                                     Add│
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Card 1: Front [___________]  Back [___________]       │   │
│ │ Hint (optional): [__________________________]         │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Card 2: Front [___________]  Back [___________]       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 6) Matching Activity Editor

### Purpose
Create matching pairs for practice.

### Form Fields
- **Title** (required)
- **Description** (optional)
- **Pairs** (left/right + optional hint)

### Behavior
- Add/reorder/delete pairs.
- Support text or simple media (optional future enhancement).

### Wireframe
```
┌─────────────────────────────────────────────────────────────┐
│ Create Learning Activity                                    │
│ Matching                                                    │
├─────────────────────────────────────────────────────────────┤
│ Title:        [________________________________________]    │
│ Description:  [________________________________________]    │
│                                                         ┌──┐│
│ Pairs                                                     Add│
│ ┌───────────────────────────────────────────────────────┐   │
│ │ Pair 1: Left [___________]  Right [___________]        │   │
│ │ Hint (optional): [__________________________]         │   │
│ ├───────────────────────────────────────────────────────┤   │
│ │ Pair 2: Left [___________]  Right [___________]        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                         ┌──┐│
│                                                     Save│  ││
│                                                    Cancel ││
└─────────────────────────────────────────────────────────────┘
```

---

## 7) Common Validation Rules

- Title is required for all activity types.
- For upload-based activities (SCORM/Media/Assignment), upload is required unless explicitly marked optional.
- For Quiz, either manual questions or random selection must be configured.
- For Flashcards/Matching, at least 1 card/pair required.

---

## 8) Notes & Future Enhancements

- Add dependencies/prerequisites to activity metadata (future scope).
- Support additional content types in lookup values (future scope).
- Add rich text editor for content fields (optional).
