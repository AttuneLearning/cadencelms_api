# UI-ISS-104: Audio Content Type in Course Player

## Status: PENDING
## Priority: Medium
## Created: 2026-02-07
## Updated: 2026-02-07
## Requested By: Internal
## Assigned To: Unassigned
## Related: UI-ISS-094
## Category: Next Phase — After Critical Gaps

---

## Overview

**Next-phase feature — implement after critical gaps (UI-ISS-094, 095, 096) are resolved.**

The course player supports SCORM, video, and document content types, but has no audio player. Courses may include podcasts, audio lectures, language learning audio, or other audio-only content. An audio player component is needed as a new content type in the player.

---

## Requirements

1. **Audio player component** in course player (alongside video, SCORM, document renderers)
2. **HTML5 audio** with standard controls: play/pause, seek, volume, speed (0.5x–2x)
3. **Progress tracking**: Track listening progress similar to video (debounced save every 5 seconds)
4. **Resume playback**: Resume from last position on return
5. **Completion threshold**: Configurable completion percentage (default 95%, matching video)
6. **Auto-complete**: Mark content as completed when threshold reached
7. **Visual design**: Audio waveform visualization or album art/lesson image display (since there's no video to show)
8. **Transcript support** (optional): Display text transcript alongside audio if available
9. **Multiple audio formats**: Support MP3, WAV, OGG, M4A

---

## Technical Specification

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/widgets/course-player/ui/AudioPlayer.tsx` | Create | Audio player component with controls |
| `src/widgets/course-player/ui/ContentRenderer.tsx` | Modify | Add `audio` case to content type routing |
| `src/entities/content-attempt/` | Verify | Ensure audio progress tracking works like video |

### Approach

1. Model `AudioPlayer` similarly to the existing `VideoPlayer` component
2. Reuse video progress tracking hooks (`useVideoProgress` → generalize to `useMediaProgress`)
3. Add `audio` content type to the content type switch in the player
4. Design a visually appealing player UI for the content area (waveform or artwork)
5. Support the same progress/completion flow as video

---

## Tests Required

1. [ ] Audio plays and pauses correctly
2. [ ] Seek bar works
3. [ ] Speed controls work (0.5x, 1x, 1.5x, 2x)
4. [ ] Progress saves every 5 seconds
5. [ ] Resumes from last position
6. [ ] Auto-completes at threshold
7. [ ] Multiple audio formats play correctly
8. [ ] Transcript displays alongside audio (if provided)

---

## Acceptance Criteria

- [ ] Audio content type renders in course player
- [ ] Standard audio controls functional
- [ ] Progress tracking and completion work like video
- [ ] Resume from last position works
- [ ] Tests pass
- [ ] Code reviewed

---

*Status values: PENDING → IN PROGRESS → REVIEW → COMPLETE*
*Move file: queue/ → active/ → completed/*
