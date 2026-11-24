# Weekly-schedule / class-based attendance redesign

The Attendance page no longer asks for a program plus a three-part hour/minute/AM-PM time. The instructor picks a date, the app derives the weekday, and lists that weekday's scheduled classes (label, time, tag badge). Selecting a class loads its combined, de-duplicated-by-name roster — the union of the referenced programs' live Firestore rosters plus any fixed private-lesson name — and the existing Present/Undo, extras, per-date note, and Save flow runs against a `date/classId` record key. A new Schedule tab adds and removes classes per weekday against a new `schedule` Firestore collection (one doc per weekday, stable ids), seeded once from the bundled timetable without overwriting existing docs. Reports still groups by time earliest-first and labels each class, now reading `classLabel` with a `programName` fallback.

**Watch for:** legacy saved/draft/extras docs without a `classId` are silently dropped by all three snapshot readers, so attendance recorded before this change disappears from both Attendance and Reports (confirmed); a class time typed in the Schedule tab that doesn't match the `H:MM AM/PM` format sorts last in Reports because `timeToMinutes` can't parse it (confirmed); Wednesday/Friday Adult BBC classes the user tagged "SPARRING In Person" are seeded with the single tag "SPARRING", losing "In Person" (confirmed); the `roster` prop passed to the Schedule route is unused (confirmed, harmless).

**Verdict**: APPROVED

## High-level view

The redesign replaces manual program+time entry with a date→weekday→class flow. `weekdayIdFromDate` anchors the date at noon before calling `getDay()` to avoid timezone rollover, mirroring the pattern report.jsx already uses. A class's roster comes from `classRoster`, which unions the live rosters of the class's `programs` and appends `fixedStudents`, de-duplicated by display name with first-seen order preserved. This keeps the roster live: students added in the Students tab flow into every class that references their program.

The record key moved from `date/programId/time` to `date/classId`. Metadata that used to live in the key (time, label, tag) is now carried as fields on the saved/draft/extras docs and threaded through every write via a `classMeta` object. Reports reads `time` for grouping and `classLabel` (falling back to the old `programName`) for display, so new records render correctly. The three snapshot readers skip any doc lacking `classId`, which is what makes pre-existing records vanish rather than error.

The Schedule tab follows the Students tab pattern: `onSnapshot` on the `schedule` collection in App.jsx, local optimistic update plus `setDoc` on add/remove, and a `window.confirm` before removing. The seed runs once after the schedule snapshot loads, writing a weekday doc only when absent, so edits are never clobbered. The `schedule` collection is covered by the existing signed-in read/write Firestore rule; no rules change was needed.

The seed encodes the user's timetable and roster rules: Adult/Teen All Level and Adult Basic classes reference Basic + BBC, BBC-specific classes reference only BBC, Saturday's 11:15 all-ages class references both Junior BBC programs, TEEN All level adds Junior BBC on top of Basic + BBC, and Arlin Private Lesson carries the fixed name "Arlin T" with no programs.

<details>
<summary>Issues (4)</summary>

1. **Legacy records dropped** — the drafts/saved/extras readers `return` on any doc without `classId`, so attendance saved before this change is invisible in Attendance and Reports. If historical reports must survive the cutover, backfill a `classId`/`classLabel` on old docs or key legacy records on `date/programId/time` behind a fallback. If old data is expendable, document that.
2. **Free-typed time can't sort** — the Schedule add form takes the class time as free text, but Reports only sorts strings matching `H:MM AM/PM`; anything else (lowercase am/pm, "noon") drops to the end of the day. Validate or normalize the time input in the Schedule form.
3. **Combined SPARRING/In Person tag flattened** — Wednesday and Friday Adult BBC classes the user described as "SPARRING In Person" seed with tag "SPARRING" only. Confirm one tag is acceptable, or extend the tag to cover both.
4. **Unused `roster` prop on Schedule route** — App.jsx passes `roster` to `<Schedule>` but the component ignores it. Drop the prop or wire it in if class rosters should preview in the Schedule tab.

</details>

<details>
<summary>Details</summary>

### Record key migration and metadata threading

Class ids never contain `/`, `:`, or whitespace (seed ids like `mon-1`, new ids from `crypto.randomUUID()`), so `docIdFor`'s character replacement still produces a collision-free Firestore doc id under the new single-slash `date/classId` key.

`setDraft` resolves the metadata with precedence `meta ?? existingSaved ?? ''`, so marking a student present on an already-saved class keeps the saved report's label and time intact even when the caller passes no meta. `saveAttendance`, `addExtra`, and `removeExtra` all receive `classMeta` and write the same four fields, keeping draft, saved, and extras docs consistent.

The gap is at read time: all three readers skip docs without `classId`:

```js
snapshot.forEach((d) => {
    const data = d.data()
    if (!data.classId) return
    next[`${data.date}/${data.classId}`] = data.students || []
})
```

Pre-existing records (keyed the old way, no `classId` field) never enter state, so they disappear from the UI. The saved reader's `data.classLabel || data.programName` fallback is therefore dead code for legacy docs — it only helps a doc that already has `classId` but happens to be missing `classLabel`. The data itself is not deleted, which honors "without touching saved attendance," but anyone expecting old dates to still render in Reports will see them vanish.

### Schedule write path and seeding

Add and remove rewrite the full `classes` array and `setDoc` the whole weekday doc, so a stale optimistic state could overwrite a concurrent edit from another device. This matches the existing Students tab's write model and single-instructor usage, so it's consistent rather than a regression. Seeding is gated on `user && scheduleLoaded` and writes a weekday doc only when `!schedule[weekdayId]`, so it runs once on an empty collection and never overwrites later edits.

The `schedule` collection is governed by the existing catch-all `allow read, write: if request.auth != null` rule — the same posture as every other collection, so no new trust boundary and no rules change.

### Reports time sorting

The seed's time strings ("8:30 AM", "12:30 PM") match `timeToMinutes`'s `^(\d{1,2}):(\d{2})\s*(AM|PM)$` regex, so they sort chronologically rather than falling into the `MAX_SAFE_INTEGER` bucket that would push an unparseable time to the end. A class whose time is typed in the Schedule tab without this exact format (e.g. "9:30am" lowercase, or "noon") would sort last and display verbatim.

### Seed fidelity to the timetable and roster rules

The seed matches the stated rules: All Level and plain Adult Basic classes reference `[ATB, ATBBC]`; BBC Weapon/Karate/Green&UP/Black-Brown/Sparring reference only `[ATBBC]`; Saturday's 11:15 Junior BBC All Ages references both `junior-bbc-6-9` and `junior-bbc-10-plus`; TEEN All level adds both Junior BBC programs to Basic + BBC; OPEN MAT is Basic + BBC; Arlin Private Lesson is fixed-name only. The one modeling compromise is the combined "SPARRING In Person" tag on the Wednesday and Friday Adult BBC classes — the single `tag` field holds "SPARRING" and drops "In Person".

</details>

<details>
<summary>File map</summary>

- `src/data/schedule.js` (new) — weekday order/labels, tag options, noon-anchored `weekdayIdFromDate`, de-dup `classRoster`, and the one-time `seedSchedule` timetable.
- `src/App.jsx` — `schedule` onSnapshot + once-only seed, `date/classId` keys across drafts/saved/extras, `classMeta` threading, add/remove schedule writes, Schedule route + navbar link.
- `src/components/Attendance.jsx` — removed program + hour/minute/AM-PM dropdowns; date-driven class list with tag badges; class selection loads combined roster.
- `src/components/schedule.jsx` (new) — per-weekday card with add form (label/time/tag/programs/fixed name) and confirm-before-remove.
- `src/components/report.jsx` — display label now `classLabel || programName`; grouping/sorting unchanged.

Full diff: `git diff a8f4d9b cc2411f`

</details>
