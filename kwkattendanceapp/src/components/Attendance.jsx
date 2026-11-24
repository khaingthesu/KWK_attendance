import { useEffect, useState } from 'react'
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
const [newName, setNewName] = useState('')
const [search, setSearch] = useState('')
const [noteText, setNoteText] = useState(note)
const [noteSaved, setNoteSaved] = useState(false)
useEffect(() => { setNoteText(note); setNoteSaved(false) }, [note, date])
// Changing the date clears the selected class and any saved message.
useEffect(() => { setSelectedClassId(''); setSavedMessage('') }, [date, setSelectedClassId])
// Clear the search box when switching classes so the new roster shows in full.
useEffect(() => { setSearch('') }, [selectedClassId])

const weekdayId = weekdayIdFromDate(date)
const dayClasses = schedule[weekdayId] || []
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

    {date && selectedClass ? (
    <>
        <h2 className="h5">
            {selectedClass.label} — {selectedClass.time}
            {selectedClass.tag && <span className={`${tagBadgeClass(selectedClass.tag)} ms-2`}>{selectedClass.tag}</span>}
        </h2>
        <p className="mb-3" aria-live="polite">
        {presentStudents.length} of {students.length} students present
        </p>

        <div className="input-group mb-3">
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

        <button
            type="button"
            className="btn btn-danger btn-lg w-100 mt-3"
            disabled={presentStudents.length === 0}
            onClick={() => {
                if (saveAttendance(classMeta)) {
                    setSavedMessage(`Saved ${selectedClass.label} at ${selectedClass.time} for ${date}. Choose this date in Reports to view it.`)
                }
            }}
        >
            Save Attendance
        </button>
        {savedMessage && <p role="status" className="mt-3">{savedMessage}</p>}
        <Link to="/reports" className="d-inline-block mt-3">View Reports</Link>
        <p className="text-muted mt-2">Attendance is saved and stays after refresh or sign out.</p>

    </>
    )
: (
    <p className="text-muted">Select a date and a class to mark attendance.</p>
    )}
</section>
)
}

export default Attendance
