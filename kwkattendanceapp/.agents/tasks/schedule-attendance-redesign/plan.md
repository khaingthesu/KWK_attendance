# Implementation Plan — Weekly-schedule / class-based attendance redesign

Scope: replace manual program+time selection on the Attendance page with a date-driven weekly
class schedule, add a Schedule management tab, store the schedule in a new Firestore `schedule`
collection (one doc per weekday), and re-key attendance records from `date/program/time` to
`date/classId`. Reports keeps grouping by class time. Students tab, roster seeding, and per-date
notes are preserved unchanged.

## Environment / verification notes (discovered during exploration)

- `npm run lint`, `npm run build`, and `vite build` HANG in this sandbox — do NOT run them.
- There is **no esbuild binary** in `node_modules` (`node_modules/.bin/esbuild` does not exist).
  `@babel/parser` **is** present and parses JSX. Use it as the syntax check. Proven command,
  run from the repo root `/Users/khaingthesu/Desktop/KWK_attendance/kwkattendanceapp`:

  ```
  node -e "const {parse}=require('@babel/parser');const fs=require('fs');for(const f of process.argv.slice(1)){parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK',f);}" <file1> <file2> ...
  ```

  Expected output: one `OK <path>` line per file and exit code 0. A `SyntaxError` means the file
  does not parse.
- Save/format hook warning: after editing ANY file, **re-read it** and confirm every `import` line
  is still present and every referenced identifier is imported (the hook can reorder and DROP named
  imports on write). Re-add anything stripped. The parse check does NOT catch a dropped import of a
  used name at module scope reliably, so the re-read is mandatory.
- Do NOT modify `README.md`. No `firestore.rules` change is needed (`schedule` is covered by the
  existing signed-in read/write rule).

## Design decisions (documented, consistent with existing components)

- **Weekday from date**: `new Date(`${date}T12:00:00`).getDay()` (noon anchor matches
  `report.jsx`'s existing timezone-safe pattern; `getDay()` returns 0=Sunday..6=Saturday). Map to
  weekday doc ids `monday..sunday`.
- **Schedule storage**: collection `schedule`, one doc per weekday, doc id = `monday`..`sunday`.
  Each doc: `{ weekday: 'monday', classes: [ classObj, ... ] }`.
  `classObj = { id, label, time, tag, programs, fixedStudents }` where:
  - `id`: stable string. Seed uses deterministic ids (`mon-1`, `tue-2`, …) so re-seeding a weekday
    doc is idempotent; UI "Add class" generates `crypto.randomUUID()`.
  - `label`: free text (e.g. "Adult/Teen All Level").
  - `time`: display string like `"3:30 PM"` (same format Reports already sorts with).
  - `tag`: one of `"ZOOM"`, `"In Person"`, `"SPARRING"`, or `""` (none).
  - `programs`: array of program ids whose live rosters combine.
  - `fixedStudents`: array of literal names (used for Arlin Private Lesson); usually `[]`.
- **Combined class roster**: de-duplicated (by display name) union of `roster[pid].students` for
  each id in `programs`, followed by `fixedStudents`. Read from the live Firestore `roster` map, not
  the seed file. Dedup preserves first-seen order.
- **Record key**: `date/classId`. `classId` never contains `/`, `:`, or spaces (uuid or `mon-1`),
  so `docIdFor` keeps working unchanged. Saved/draft/extras docs store `classId`, `classLabel`,
  `time`, `tag` instead of `programId`/`programName`. Reports reads `classLabel` + `time`.
- **Old records**: existing `date/program/time` docs stay in Firestore. The new Report view groups
  by `time` and displays `classLabel`; old docs that lack `classLabel` fall back to `programName`
  so they do not crash, but they are not required to appear and will simply show under their time if
  present. Do not delete them.
- **Schedule tab UI**: mirrors the Students tab — one card per weekday (seven cards, Monday first),
  each listing its classes with a Remove button (window.confirm before remove), and an add form at
  the bottom of each card with inputs for label, time, tag (select), and program checkboxes. "To
  edit, remove and re-add" — no inline edit. Buttons keep `min-height: 44px`, aria-labels, and the
  existing responsive card pattern (reuse `students-column` / `students-columns` classes).
- **Attendance tag display**: show the tag as a Bootstrap badge next to the class label
  (`badge text-bg-info` for ZOOM, `text-bg-warning` for SPARRING, `text-bg-secondary` for In Person;
  none → no badge). This is a documented choice consistent with the existing "Added" badge styling.

## Plan

- [ ] 1. Create the schedule data module.
      Export `weekdayOrder` (`['monday','tuesday','wednesday','thursday','friday','saturday','sunday']`),
      `weekdayLabels` (map id→`'Monday'`…), `TAG_OPTIONS` (`['', 'ZOOM', 'In Person', 'SPARRING']`),
      `weekdayIdFromDate(dateStr)` (uses `new Date(`${dateStr}T12:00:00`).getDay()` → weekday id),
      `classRoster(cls, roster)` (dedup-by-name union of referenced program rosters + `fixedStudents`),
      and `seedSchedule` — a map weekdayId → array of class objects encoding the timetable below with
      deterministic ids. Do NOT import from `programs.js` except program ids as plain strings.
      Timetable to encode (label — time — tag — programs/fixed):
      - monday: Adult/Teen All Level 12:30 PM ZOOM [adult-teen-basic, adult-teen-bbc]; Ninja Skills Karate 3:30 PM "" [ninja-skills]; Junior Basic 4:00 PM "" [junior-basic]; Junior BBC Ages 6-9 4:45 PM "" [junior-bbc-6-9]; Junior BBC 10+ 5:30 PM "" [junior-bbc-10-plus]; Adult/Teen Basic 7:30 PM ZOOM [adult-teen-basic, adult-teen-bbc].
      - tuesday: Adult/Teen All Level 8:30 AM ZOOM [atb,atbbc]; Tiny Tiger 3:30 PM "" [tiny-tiger]; Arlin Private Lesson 3:30 PM "" programs:[] fixedStudents:['Arlin T']; Junior Basic 4:00 PM "" [junior-basic]; Junior BBC Ages 6-9 4:45 PM "" [junior-bbc-6-9]; Junior BBC 10+ 5:30 PM "" [junior-bbc-10-plus]; Adult/Teen Basic 6:30 PM ZOOM [atb,atbbc]; Adult/Teen BBC Weapon 7:15 PM ZOOM [adult-teen-bbc].
      - wednesday: Adult/Teen All Level 8:30 AM ZOOM [atb,atbbc]; Ninja Skills Karate 3:30 PM "" [ninja-skills]; Junior Basic 4:00 PM "" [junior-basic]; Junior BBC Ages 6-9 4:45 PM "" [junior-bbc-6-9]; Junior BBC 10+ 5:30 PM "" [junior-bbc-10-plus]; Adult/Teen BBC 6:30 PM SPARRING [adult-teen-bbc].
      - thursday: Adult/Teen All Level 8:30 AM ZOOM [atb,atbbc]; Tiny Tiger 3:30 PM "" [tiny-tiger]; Junior Basic 4:00 PM "" [junior-basic]; Junior BBC Ages 6-9 4:45 PM "" [junior-bbc-6-9]; Junior BBC 10+ 5:30 PM "" [junior-bbc-10-plus]; Adult/Teen Basic 6:30 PM ZOOM [atb,atbbc]; Adult/Teen BBC Karate 7:15 PM ZOOM [adult-teen-bbc].
      - friday: Adult/Teen All Level 8:30 AM "" [atb,atbbc]; Tiny Tiger 3:00 PM "" [tiny-tiger]; Ninja Skills Karate 3:30 PM "" [ninja-skills]; Junior Basic 4:00 PM "" [junior-basic]; Junior BBC Ages 6-9 4:45 PM "" [junior-bbc-6-9]; Junior BBC 10+ 5:30 PM "" [junior-bbc-10-plus]; Adult/Teen All Level 12:30 PM ZOOM [atb,atbbc]; Adult/Teen BBC Green & UP 6:30 PM SPARRING [adult-teen-bbc].
      - saturday: Ninja Skills Karate 10:00 AM "" [ninja-skills]; Junior Basic 10:30 AM "" [junior-basic]; Junior BBC All Ages 11:15 AM "" [junior-bbc-6-9, junior-bbc-10-plus]; Adult/Teen Basic 12:30 PM "In Person" [atb,atbbc]; Adult/Teen BBC 1:15 PM "In Person" [adult-teen-bbc]; Adult/Teen BBC Black/Brown Belt 2:15 PM ZOOM [adult-teen-bbc].
      - sunday: Adult/Teen All Level 11:00 AM ZOOM [atb,atbbc]; OPEN MAT 12:00 PM "" [atb,atbbc]; TEEN All level 1:00 PM ZOOM [adult-teen-basic, adult-teen-bbc, junior-bbc-6-9, junior-bbc-10-plus].
      (atb = adult-teen-basic, atbbc = adult-teen-bbc.) Each class id = `<3-letter-weekday>-<n>` (1-based), e.g. `mon-1`.
      Files: create `src/data/schedule.js`
      Verify: `node -e "const {parse}=require('@babel/parser');const fs=require('fs');parse(fs.readFileSync('src/data/schedule.js','utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK')"` prints `OK`. Also run `node --input-type=module -e "const m=await import('./src/data/schedule.js');console.log(Object.keys(m.seedSchedule).length, m.seedSchedule.monday.length, m.classRoster({programs:['tiny-tiger'],fixedStudents:[]},{'tiny-tiger':{students:['A','B']}}))"` prints `7 6 [ 'A', 'B' ]`.

- [ ] 2. Add schedule state, subscription, seeding, and class-key writers in App.jsx.
      Add `useState` for `schedule` (`{}`, weekdayId→classes array), `scheduleLoaded` (false), and
      `selectedClassId` (`''`). Add an `onSnapshot(collection(db,'schedule'), ...)` inside the existing
      signed-in effect (build `next[d.id] = d.data().classes || []`, set schedule + scheduleLoaded,
      and unsubscribe in the cleanup). Add a one-time seeding effect modeled on the roster seeding:
      guarded by `user && scheduleLoaded`, for each `weekdayOrder` id, `if (!schedule[id]) setDoc(doc(db,'schedule',id), { weekday: id, classes: seedSchedule[id] })`.
      Rewrite `parseKey` to return `{ date, classId }` (split on the single `/`). Update `setDraft`,
      `saveAttendance`, `undoPresent`, `addExtra`, `removeExtra` so the Firestore payloads use
      `classId`, `classLabel`, `time`, `tag` fields (drop `programId`/`programName`); `setDraft`/`addExtra`/
      `removeExtra` take the extra metadata they need via their existing signatures plus new args
      (`setDraft(recordKey, students, meta)` where `meta={classLabel,time,tag}` optional; when omitted
      derive from the live saved record for sync writes). Change `saveAttendance` to
      `saveAttendance(meta)` building `recordKey = `${date}/${selectedClassId}`` and writing
      `{date, classId: selectedClassId, classLabel: meta.label, time: meta.time, tag: meta.tag, students}`.
      Update the three `onSnapshot` key builders (drafts/saved/extras) to key by
      `${data.date}/${data.classId}` and store `classLabel`/`time`/`tag` (keep reading `data.programName`
      as a fallback for `classLabel` so legacy docs don't break). Add `addScheduleClass(weekdayId, cls)`
      and `removeScheduleClass(weekdayId, classId)` writers (read current `schedule[weekdayId]`, write the
      modified `classes` array back with `setDoc(doc(db,'schedule',weekdayId), {weekday: weekdayId, classes})`).
      Update the `<Attendance ... />` props: drop `program/setProgram/time/setTime`; add
      `schedule`, `selectedClassId`, `setSelectedClassId`. Add the `/schedule` route and a navbar link
      (between Students and Sign Out), rendering `<Schedule schedule={schedule} roster={roster} addScheduleClass={addScheduleClass} removeScheduleClass={removeScheduleClass} />` guarded by `user`.
      Add imports: `seedSchedule, weekdayOrder` from `../data/schedule` (path `./data/schedule`) and
      `Schedule` from `./components/schedule.jsx`. Remove now-unused `program/setProgram/time/setTime` state only if nothing else uses them.
      Files: modify `src/App.jsx`
      Verify: parse-check `src/App.jsx` with the babel one-liner prints `OK`; re-read the file and confirm all imports (`seedSchedule`, `weekdayOrder`, `Schedule`, plus existing firestore/react-bootstrap/router imports) are present and no used name lost its import.

- [ ] 3. Rewrite the Attendance page to be date→class driven.
      Remove the program dropdown and the hour/minute/AM-PM dropdowns and the `HOURS/MINUTES/MERIDIEMS`
      constants and the time-building effect. Keep the date input. After the date input, compute
      `weekdayId = weekdayIdFromDate(date)` and render the list of `schedule[weekdayId] || []` classes as
      selectable rows (radio-style buttons or a `list-group` of buttons) showing `label`, `time`, and the
      tag badge; clicking one calls `setSelectedClassId(cls.id)`. When a class is selected, resolve it from
      `schedule[weekdayId]`, compute `students = classRoster(cls, roster)`, set `recordKey = `${date}/${cls.id}``,
      and render the existing Present/Undo list, extras add/remove, per-date Notes textarea, and Save
      Attendance button exactly as today but using the combined `students`. Save button calls
      `saveAttendance({ label: cls.label, time: cls.time, tag: cls.tag })` and the saved message uses
      `cls.label` and `cls.time`. When the date changes, reset `selectedClassId` to `''` (effect on `date`).
      Pass the class metadata into `setDraft`/`addExtra`/`removeExtra` calls so their sync writes carry
      `classLabel/time/tag`. Imports: `useEffect, useState` from react, `Link` from react-router-dom,
      `weekdayIdFromDate, classRoster` from `../data/schedule`; remove the `programs/programOrder` import.
      Keep min-height 44px buttons and aria-labels.
      Files: modify `src/components/attendance.jsx`
      Verify: parse-check `src/components/attendance.jsx` prints `OK`; re-read and confirm imports intact
      (`weekdayIdFromDate`, `classRoster`, `useEffect`, `useState`, `Link`) and `programs`/`programOrder`
      no longer referenced.

- [ ] 4. Create the Schedule management tab.
      New component mirroring `students.jsx`: a `WeekdayColumn({ weekday, classes, roster, addScheduleClass, removeScheduleClass })`
      card per weekday (iterate `weekdayOrder`, header shows `weekdayLabels[weekday]` and class count),
      listing each class as `label — time` + tag badge with a Remove button that `window.confirm`s
      (`Remove "<label>" (<time>) from <weekday>? Saved attendance is not affected.`) then calls
      `removeScheduleClass(weekday, cls.id)`. Card body has an add form: text input for label, text input
      for time (placeholder `3:30 PM`), a `TAG_OPTIONS` select (empty option labelled "No tag"), and a
      checkbox per program (`programOrder` + labels from `programs`) plus an optional "Fixed student name"
      text input for private lessons. On submit, build `{ id: crypto.randomUUID(), label, time, tag,
      programs: checkedIds, fixedStudents: fixedName ? [fixedName.trim()] : [] }` and call
      `addScheduleClass(weekday, cls)` (skip if label or time empty, and require either ≥1 program or a
      fixed name). Reuse `students-columns`/`students-column` classes and min-height 44px buttons with
      aria-labels. Imports: `useState` from react; `programs, programOrder` from `../data/programs`;
      `weekdayOrder, weekdayLabels, TAG_OPTIONS` from `../data/schedule`.
      Files: create `src/components/schedule.jsx`
      Verify: parse-check `src/components/schedule.jsx` prints `OK`; re-read and confirm all imports present.

- [ ] 5. Update Reports to display class label grouped by time.
      In `report.jsx`, change the per-record heading and aria-labels to use `record.classLabel`
      (fallback `record.programName` for legacy docs). Grouping already keys on `record.time`; keep it.
      Keep the 0-student filter, the per-date note block, Save PDF via `window.print`, and Undo wiring
      unchanged. This depends on App.jsx (item 2) now putting `classLabel`/`time` on saved records.
      Files: modify `src/components/report.jsx`
      Verify: parse-check `src/components/report.jsx` prints `OK`; re-read and confirm the `useState`
      import is still present.

- [ ] 6. Final cross-file parse check and import audit.
      Run the babel parse one-liner over all changed/created files together and confirm every line is
      `OK`. Re-read each of the five files once more to confirm the save hook did not drop any import.
      Files: none (verification only)
      Verify:
      ```
      node -e "const {parse}=require('@babel/parser');const fs=require('fs');for(const f of process.argv.slice(1)){parse(fs.readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']});console.log('OK',f);}" src/data/schedule.js src/App.jsx src/components/attendance.jsx src/components/schedule.jsx src/components/report.jsx
      ```
      Expected: five `OK <path>` lines, exit code 0.

## Digest

Build/test commands discovered (and their state):
- `npm run build` / `vite build` / `npm run lint` — **HANG in this sandbox; do not run.**
- Syntax verification (proven working this session): `@babel/parser` via the node one-liner above.
  There is no esbuild binary in `node_modules`. `node --version` = v22.23.1.
- No automated test suite exists in the repo (no test script in `package.json`, no test files).
  Verification is parse-check + import re-read per file, as the task specifies.

Files touched:

- **`src/data/schedule.js`** (CREATE). Exports: `weekdayOrder: string[7]`, `weekdayLabels: Record<id,string>`,
  `TAG_OPTIONS: ['', 'ZOOM', 'In Person', 'SPARRING']`, `weekdayIdFromDate(dateStr): weekdayId`
  (`new Date(`${dateStr}T12:00:00`).getDay()` → id), `classRoster(cls, roster): string[]`
  (dedup-by-name union of `roster[pid].students` for `cls.programs` then `cls.fixedStudents`),
  `seedSchedule: Record<weekdayId, ClassObj[]>` encoding the timetable in item 1.
  `ClassObj = { id, label, time, tag, programs: string[], fixedStudents: string[] }`.
  No test covers it today (none exist); verified by parse-check + the `node --input-type=module` smoke
  check in item 1.

- **`src/App.jsx`** (MODIFY). Blocks to change:
  - `parseKey(recordKey)` — currently returns `{date, programId, time}` from two slashes; change to
    return `{date, classId}` splitting on the single `/`.
  - signed-in `useEffect` — add `schedule` snapshot (keys by doc id → `classes`); drafts/saved/extras
    snapshots re-key to `${data.date}/${data.classId}` and store `classLabel`(fallback `programName`)/`time`/`tag`.
  - add schedule one-time seeding `useEffect` (guard `user && scheduleLoaded`, `setDoc` per weekday only
    if `!schedule[id]`) — mirrors the existing roster seeding effect right below it.
  - writers `setDraft`, `saveAttendance`, `undoPresent`, `addExtra`, `removeExtra` — payloads use
    `classId/classLabel/time/tag`; `saveAttendance(meta)` builds `recordKey = `${date}/${selectedClassId}``.
  - new writers `addScheduleClass`, `removeScheduleClass`.
  - new state: `schedule`, `scheduleLoaded`, `selectedClassId`; drop `program/time` (+ setters) state.
  - `attendancePage` props updated; new `/schedule` route + navbar link; imports add
    `seedSchedule, weekdayOrder` (`./data/schedule`) and `Schedule` (`./components/schedule.jsx`).
  - Existing imports to KEEP: `onAuthStateChanged, signOut`; `collection, deleteDoc, doc, onSnapshot, setDoc`;
    `useEffect, useState`; `Container, Nav, Navbar`; `BrowserRouter, Link, Navigate, Route, Routes`;
    `logo`; `SignIn`; `Attendance`; `Report`; `Students`; `programOrder, programs`; `auth, db`.
    `docIdFor` is UNCHANGED (classIds have no `/`/`:`/space). No test covers it; parse-check + re-read.

- **`src/components/attendance.jsx`** (MODIFY, substantial). Props change
  `{date,setDate,attendance,setDraft,saveAttendance,extras,addExtra,removeExtra,roster,note,saveNote,schedule,selectedClassId,setSelectedClassId}`
  (program/time props removed). Remove `HOURS/MINUTES/MERIDIEMS` + time-building effect; add class list
  derived from `weekdayIdFromDate(date)`; `students = classRoster(cls, roster)`; `recordKey = `${date}/${cls.id}``.
  Imports end state: `useEffect, useState` (react), `Link` (react-router-dom), `weekdayIdFromDate, classRoster`
  (`../data/schedule`); `programs/programOrder` import removed. No test today; parse-check + re-read.

- **`src/components/schedule.jsx`** (CREATE). `Schedule({schedule, roster, addScheduleClass, removeScheduleClass})`
  rendering one `WeekdayColumn` per `weekdayOrder`. Imports: `useState` (react), `programs, programOrder`
  (`../data/programs`), `weekdayOrder, weekdayLabels, TAG_OPTIONS` (`../data/schedule`). Reuses CSS classes
  `students-columns`, `students-column` (defined in `src/App.css`). No test today; parse-check + re-read.

- **`src/components/report.jsx`** (MODIFY, small). Change per-record heading/aria from `record.programName`
  to `record.classLabel` with `|| record.programName` fallback; grouping by `record.time` and all other
  behavior unchanged. Keep `useState` import. No test today; parse-check + re-read.

Firestore shape added:
- Collection `schedule`, doc id ∈ `{monday,…,sunday}`, doc = `{ weekday: '<id>', classes: ClassObj[] }`,
  `ClassObj = { id, label, time, tag, programs: string[], fixedStudents: string[] }`.
- `drafts`/`saved`/`extras` docs now carry `{ date, classId, classLabel, time, tag, students }`
  (was `{ date, programId, programName?, time, students }`). Doc ids via unchanged `docIdFor`.
- `roster` and `notes` collections unchanged. `firestore.rules` unchanged (signed-in read/write covers `schedule`).

Assumptions made (documented): tag badge colors (ZOOM=info, SPARRING=warning, In Person=secondary, none=no badge);
class selection UI is a `list-group` of buttons; weekday computed with the noon-anchor Date trick already used in
report.jsx; schedule add form validates non-empty label+time and ≥1 program OR a fixed name; legacy
`date/program/time` records are left intact and only render in Reports if their time group is shown (they show
`programName` via the fallback). Nothing new errors on legacy docs because every new reader falls back to the old
field names.
