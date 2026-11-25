import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { classRoster, weekdayIdFromDate } from '../data/schedule'

// Badge color for a class tag.
function tagBadgeClass(tag) {
    if (tag === 'ZOOM') return 'badge text-bg-info'
    if (tag === 'SPARRING') return 'badge text-bg-warning'
    if (tag === 'In Person') return 'badge text-bg-secondary'
    return ''
}

function Attendance({ date, setDate, attendance, savedAttendance, draftMeta, setDraft, saveAttendance, extras, addExtra, removeExtra, roster, note, saveNote, schedule, selectedClassId, setSelectedClassId }) {
const [savedMessage, setSavedMessage] = useState('')
const [saving, setSaving] = useState(false)
const [newName, setNewName] = useState('')
const [search, setSearch] = useState('')
// Pre-class instructor entry point. Before a class is selected there is no
// class record to store against, so this holds the instructor chosen in Stage 1.
// It enforces the "pick an instructor before the class dropdown unlocks" rule.
// Once a class is selected, the instructor/assistant fields reflect and edit
// THAT class's own stored value (draft first, then saved record); each class
// keeps its own instructor, and this pre-class value only seeds a class that
// has none yet.
const [pendingInstructor, setPendingInstructor] = useState('')
const [noteText, setNoteText] = useState(note)
const [noteSaved, setNoteSaved] = useState(false)
useEffect(() => { setNoteText(note); setNoteSaved(false) }, [note, date])
// Changing the date clears the selected class, the pre-class instructor, and any saved message.
useEffect(() => { setSelectedClassId(''); setPendingInstructor(''); setSavedMessage('') }, [date, setSelectedClassId])
// Clear the search box when switching classes so the new roster shows in full.
useEffect(() => { setSearch('') }, [selectedClassId])

const weekdayId = weekdayIdFromDate(date)
const dayClasses = schedule[weekdayId] || []
const markedClassCount = dayClasses.filter((cls) => attendance[`${date}/${cls.id}`]?.length).length
const selectedClass = dayClasses.find((cls) => cls.id === selectedClassId) || null
// Live combined roster for the selected class (from Firestore).
const students = selectedClass ? classRoster(selectedClass, roster) : []

// Each date + class keeps its own marks.
const recordKey = selectedClass ? `${date}/${selectedClass.id}` : ''
const presentStudents = (recordKey && attendance[recordKey]) || []
const extraStudents = (recordKey && extras[recordKey]) || []

// This class's own stored instructor/assistant: draft value first (per-class,
// survives reload), then the saved record. Legacy records without these fields
// fall back to '' and render blank. When no class is selected we show the
// pre-class instructor from Stage 1 so the gating rule still works.
const storedInstructor = recordKey
    ? (draftMeta?.[recordKey]?.instructor || savedAttendance?.[recordKey]?.instructor || '')
    : ''
const storedAssistant = recordKey
    ? (draftMeta?.[recordKey]?.assistant || savedAttendance?.[recordKey]?.assistant || '')
    : ''
const displayedInstructor = selectedClass ? storedInstructor : pendingInstructor
const displayedAssistant = selectedClass ? storedAssistant : ''

// Build the metadata written alongside a draft/save for the selected class,
// using the given instructor/assistant (defaults keep the class's current values).
function metaFor(instructor = storedInstructor, assistant = storedAssistant) {
    if (!selectedClass) return null
    return { label: selectedClass.label, time: selectedClass.time, tag: selectedClass.tag, instructor, assistant }
}
const classMeta = metaFor()

function togglePresent(name) {
setSavedMessage('')
const current = attendance[recordKey] || []
const updated = current.includes(name)
    ? current.filter((student) => student !== name)
    : [...current, name]
setDraft(recordKey, updated, classMeta)
}

// Persist a change to the selected class's instructor or assistant into THAT
// class's record (draft doc, and the saved record too when it exists), so the
// change propagates to Reports. The instructor remains editable at any time.
function changeInstructor(instructor) {
    setDraft(recordKey, attendance[recordKey] || [], metaFor(instructor, storedAssistant))
}
function changeAssistant(assistant) {
    setDraft(recordKey, attendance[recordKey] || [], metaFor(storedInstructor, assistant))
}

return (
<section className="container py-4 text-start" style={{ maxWidth: '480px' }}>
    <h1 className="h3">Attendance</h1>

    <div className="mb-3">
    <label htmlFor="attendance-date" className="form-label">Today's Date</label>
    <input
        id="attendance-date"
        type="date"
        className="form-control form-control-lg"
        value={date}
        onChange={(event) => { setDate(event.target.value); setSavedMessage('') }}
    />
    </div>


    {/* STAGE 1 — shown once a date is chosen, before any class is selected. */}
    {date && (
    <>
        {/* Instructor dropdown — per class. Before a class is selected this is the
            entry point (pre-class instructor) that unlocks the class dropdown.
            Once a class is selected it shows and edits THAT class's own stored
            instructor; changing it persists to that class's record. Does not
            filter the list. Placeholder options; wire to real instructor data later. */}
        <div className="mb-3">
        <label htmlFor="instructor-select" className="form-label">Instructor name</label>
        <select
            id="instructor-select"
            className="form-select"
            value={displayedInstructor}
            onChange={(event) => {
                const value = event.target.value
                if (selectedClass) {
                    // Editing the selected class's own instructor.
                    changeInstructor(value)
                    // Clearing it also clears the selected class so the roster
                    // can't stay visible without an instructor (gating rule).
                    if (!value) setSelectedClassId('')
                } else {
                    // Pre-class entry point: set the instructor that unlocks the
                    // class dropdown and seeds the class once one is selected.
                    setPendingInstructor(value)
                    if (!value) setSelectedClassId('')
                }
            }}
        >
            <option value="">Select instructor</option>
            <option value="Shihan Michelle">Shihan Michelle</option>
            <option value="Sensei Zelda">Sensei Zelda</option>
            <option value="Sensei Diane">Sensei Diane</option>
            <option value="Sensei David">Sensei David</option>
            <option value="Senpai Maria">Senpai Maria</option>
            <option value="Senpai Tak">Senpai Tak</option>
            <option value="Senpai Khaing">Senpai Khaing</option>
            <option value="Rachel">Rachel</option>
        </select>
        </div>

        {/* Class dropdown — selects the active class for the day.
            Populated from the scheduled classes for the selected day.
            No class is pre-selected: starts on a disabled placeholder. */}
        <div className="mb-3">
        <label htmlFor="class-select" className="form-label">Class</label>
        <select
            id="class-select"
            className="form-select"
            value={selectedClassId}
            onChange={(event) => {
                const newClassId = event.target.value
                setSelectedClassId(newClassId)
                // Seed a class that has no instructor yet with the pre-class
                // instructor, so each class starts with the chosen instructor but
                // keeps its own value independently afterward. A class that
                // already has a stored instructor is left untouched.
                const newClass = dayClasses.find((cls) => cls.id === newClassId)
                if (newClass && pendingInstructor) {
                    const newKey = `${date}/${newClass.id}`
                    const existing = draftMeta?.[newKey]?.instructor || savedAttendance?.[newKey]?.instructor || ''
                    if (!existing) {
                        setDraft(newKey, attendance[newKey] || [], {
                            label: newClass.label, time: newClass.time, tag: newClass.tag,
                            instructor: pendingInstructor,
                            assistant: draftMeta?.[newKey]?.assistant || savedAttendance?.[newKey]?.assistant || '',
                        })
                    }
                }
            }}
            disabled={!displayedInstructor}
        >
            <option value="" disabled>Select class</option>
            {dayClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.label} — {cls.time}</option>
            ))}
        </select>
        {!displayedInstructor && (
            <div className="form-text text-danger">Please select an instructor first.</div>
        )}
        </div>

        {/* Assistant instructor — per class, optional free-text input. Shows the
            selected class's own assistant and writes changes to that class's
            record. Empty is allowed: the instructor still saves without it.
            Editable only once a class is selected. Does not filter the list. */}
        <div className="mb-3">
        <label htmlFor="assistant-instructor" className="form-label">Assistant instructor</label>
        <input
            id="assistant-instructor"
            type="text"
            className="form-control"
            placeholder="optional"
            value={displayedAssistant}
            disabled={!selectedClass}
            onChange={(event) => changeAssistant(event.target.value)}
        />
        </div>
    </>
    )}

    {/* STAGE 2 — shown once a class is selected: the roster and class-specific content. */}
    {date && selectedClass && (
    <>
        <h2 className="h5">
            {selectedClass.label} — {selectedClass.time}
            {selectedClass.tag && <span className={`${tagBadgeClass(selectedClass.tag)} ms-2`}>{selectedClass.tag}</span>}
        </h2>
        <p className="mb-3" aria-live="polite">
        {presentStudents.length} of {students.length} students present
        </p>

        <div className="input-group mb-3" style={{ maxWidth: '260px' }}>
        
        <input
            type="text"
            className="form-control form-control-lg"
            placeholder="Search students"
            aria-label="Search students"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
            <button
                type="button"
                className="btn btn-outline-secondary"
                aria-label="Clear search"
                onClick={() => setSearch('')}
            >
                Clear
            </button>
        )}
        </div>

        <ul className="list-group">
        {students
        .filter((name) => name.toLowerCase().includes(search.trim().toLowerCase()))
        .map((name) => {
            const isPresent = presentStudents.includes(name)

            return (
            <li key={name} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                <span>
                {name}
                {isPresent && <span className="d-block text-success">Present ✓</span>}
                </span>
                <button
                type="button"
                className={`btn ${isPresent ? 'btn-outline-secondary' : 'btn-success'}`}
                style={{ minHeight: '44px', minWidth: '90px' }}
                aria-label={`${isPresent ? 'Undo present for' : 'Mark present for'} ${name}`}
                onClick={() => togglePresent(name)}
                >
                {isPresent ? 'Undo' : 'Present'}
                </button>
            </li>
            )
        })}
        </ul>

        {extraStudents.length > 0 && (
        <ul className="list-group mt-2">
            {extraStudents.map((name) => {
                const isPresent = presentStudents.includes(name)
                return (
                <li key={name} className="list-group-item d-flex justify-content-between align-items-center gap-3">
                    <span>
                    {name} <span className="badge text-bg-secondary">Added</span>
                    {isPresent && <span className="d-block text-success">Present ✓</span>}
                    </span>
                    <span className="d-flex gap-2">
                    <button
                        type="button"
                        className={`btn ${isPresent ? 'btn-outline-secondary' : 'btn-success'}`}
                        style={{ minHeight: '44px', minWidth: '90px' }}
                        aria-label={`${isPresent ? 'Undo present for' : 'Mark present for'} ${name}`}
                        onClick={() => {
                            setSavedMessage('')
                            const updated = isPresent
                                ? presentStudents.filter((s) => s !== name)
                                : [...presentStudents, name]
                            setDraft(recordKey, updated, classMeta)
                        }}
                    >
                        {isPresent ? 'Undo' : 'Present'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        style={{ minHeight: '44px' }}
                        aria-label={`Remove ${name}`}
                        onClick={() => { setSavedMessage(''); removeExtra(recordKey, name, classMeta) }}
                    >
                        Remove
                    </button>
                    </span>
                </li>
                )
            })}
        </ul>
        )}

        <form
            className="d-flex gap-2 mt-3"
            onSubmit={(event) => {
                event.preventDefault()
                addExtra(recordKey, newName, classMeta)
                setNewName('')
                setSavedMessage('')
            }}
        >
            <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Add Students Manually"
                aria-label="Add a student from another class"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-lg" style={{ minWidth: '90px' }}>
                Add
            </button>
        </form>

        <div className="mt-4">
            <label htmlFor="day-note" className="form-label">Notes for {date}</label>
            <textarea
                id="day-note"
                className="form-control"
                rows={4}
                placeholder="Write anything about today (applies to the whole day)."
                value={noteText}
                onChange={(event) => { setNoteText(event.target.value); setNoteSaved(false) }}
            />
            <button
                type="button"
                className="btn btn-outline-primary mt-2"
                style={{ minHeight: '44px' }}
                onClick={() => { saveNote(date, noteText); setNoteSaved(true) }}
            >
                Save Note
            </button>
            {noteSaved && <span role="status" className="ms-2 text-success">Saved</span>}
        </div>

    </>
    )}
    {date && (
    <div className="mt-4">
        <p className="text-muted">Save the attendance or The App will save attendance automattically after midnight local time.</p>
        <p>{markedClassCount} {markedClassCount === 1 ? 'class' : 'classes'} with attendance for {date}.</p>
        <button
            type="button"
            className="btn btn-danger btn-lg w-100 mt-3"
            disabled={markedClassCount === 0 || saving}
            onClick={async () => {
                setSavedMessage('')
                setSaving(true)
                try {
                    if (await saveAttendance()) {
                        setSavedMessage(`Saved attendance for ${date}. Choose this date in Reports to view all classes.`)
                    } else {
                        setSavedMessage('Attendance was not saved. Please try again.')
                    }
                } finally {
                    setSaving(false)
                }
            }}
        >
            {saving ? 'Saving…' : "Save Today’s Attendance"}
        </button>
        {savedMessage && <p role="status" className="mt-3">{savedMessage}</p>}
        <Button variant="outline-primary" as={Link} to="/reports" className="d-inline-block mt-3">View Attendance Reports</Button>
    </div>
    )}
</section>

)
}

export default Attendance
