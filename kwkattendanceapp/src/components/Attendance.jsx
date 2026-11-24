import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { classRoster, weekdayIdFromDate, weekdayLabels } from '../data/schedule'

// Badge color for a class tag.
function tagBadgeClass(tag) {
    if (tag === 'ZOOM') return 'badge text-bg-info'
    if (tag === 'SPARRING') return 'badge text-bg-warning'
    if (tag === 'In Person') return 'badge text-bg-secondary'
    return ''
}

function Attendance({ date, setDate, attendance, setDraft, saveAttendance, extras, addExtra, removeExtra, roster, note, saveNote, schedule, selectedClassId, setSelectedClassId }) {
const [savedMessage, setSavedMessage] = useState('')
const [saving, setSaving] = useState(false)
const [newName, setNewName] = useState('')
const [search, setSearch] = useState('')
// Standalone UI selections — these do not filter the attendance list.
const [selectedInstructor, setSelectedInstructor] = useState('')
const [classChoice, setClassChoice] = useState('')
const [noteText, setNoteText] = useState(note)
const [noteSaved, setNoteSaved] = useState(false)
useEffect(() => { setNoteText(note); setNoteSaved(false) }, [note, date])
// Changing the date clears the selected class and any saved message.
useEffect(() => { setSelectedClassId(''); setSavedMessage('') }, [date, setSelectedClassId])
// Clear the search box when switching classes so the new roster shows in full.
useEffect(() => { setSearch('') }, [selectedClassId])

const weekdayId = weekdayIdFromDate(date)
const dayClasses = schedule[weekdayId] || []
const markedClassCount = dayClasses.filter((cls) => attendance[`${date}/${cls.id}`]?.length).length
const selectedClass = dayClasses.find((cls) => cls.id === selectedClassId) || null
// Live combined roster for the selected class (from Firestore).
const students = selectedClass ? classRoster(selectedClass, roster) : []
const classMeta = selectedClass
    ? { label: selectedClass.label, time: selectedClass.time, tag: selectedClass.tag }
    : null

// Each date + class keeps its own marks.
const recordKey = selectedClass ? `${date}/${selectedClass.id}` : ''
const presentStudents = (recordKey && attendance[recordKey]) || []
const extraStudents = (recordKey && extras[recordKey]) || []

function togglePresent(name) {
setSavedMessage('')
const current = attendance[recordKey] || []
const updated = current.includes(name)
    ? current.filter((student) => student !== name)
    : [...current, name]
setDraft(recordKey, updated, classMeta)
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

    {date && (
    <div className="mb-4">
    <label className="form-label">{weekdayId ? `${weekdayLabels[weekdayId]} classes` : 'Classes'}</label>
    {dayClasses.length === 0 ? (
        <p className="text-muted">No classes scheduled for this day. Add classes in the Schedule tab.</p>
    ) : (
        <div className="list-group">
        {dayClasses.map((cls) => (
            <button
                key={cls.id}
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2 ${cls.id === selectedClassId ? 'active' : ''}`}
                style={{ minHeight: '44px' }}
                aria-pressed={cls.id === selectedClassId}
                onClick={() => { setSelectedClassId(cls.id); setSavedMessage('') }}
            >
                <span>{cls.label} — {cls.time}</span>
                {cls.tag && <span className={tagBadgeClass(cls.tag)}>{cls.tag}</span>}
            </button>
        ))}
        </div>
    )}
    </div>
    )}

    {date && selectedClass && (
    <>
        <h2 className="h5">
            {selectedClass.label} — {selectedClass.time}
            {selectedClass.tag && <span className={`${tagBadgeClass(selectedClass.tag)} ms-2`}>{selectedClass.tag}</span>}
        </h2>
        <p className="mb-3" aria-live="polite">
        {presentStudents.length} of {students.length} students present
        </p>

        {/* Instructor dropdown — standalone, does not filter the list.
            Placeholder options; wire to real instructor data later. */}
        <div className="mb-3">
        <label htmlFor="instructor-select" className="form-label">Instructor name</label>
        <select
            id="instructor-select"
            className="form-select"
            value={selectedInstructor}
            onChange={(event) => setSelectedInstructor(event.target.value)}
        >
            <option value="">Select instructor</option>
            <option value="Instructor 1">Instructor 1</option>
            <option value="Instructor 2">Instructor 2</option>
            <option value="Instructor 3">Instructor 3</option>
        </select>
        </div>

        {/* Classes dropdown — standalone, does not filter the list.
            Populated from the scheduled classes for the selected day. */}
        <div className="mb-3">
        <label htmlFor="class-select" className="form-label">Classes</label>
        <select
            id="class-select"
            className="form-select"
            value={classChoice}
            onChange={(event) => setClassChoice(event.target.value)}
        >
            <option value="">Select class</option>
            {dayClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.label} — {cls.time}</option>
            ))}
        </select>
        </div>

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
        <p className="text-muted">Mark attendance throughout the day, then save all classes together when the day is finished.</p>
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
