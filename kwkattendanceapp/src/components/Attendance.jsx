import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { programOrder, programs } from '../data/programs'

const HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const MINUTES = ['00', '15', '30', '45']
const MERIDIEMS = ['AM', 'PM']

function Attendance({ date, setDate, program, setProgram, time, setTime, attendance, setDraft, saveAttendance, extras, addExtra, removeExtra, roster, note, saveNote }) {
const [savedMessage, setSavedMessage] = useState('')
const [newName, setNewName] = useState('')
const [noteText, setNoteText] = useState(note)
const [noteSaved, setNoteSaved] = useState(false)
// Separate dropdown pieces that combine into the "09:30 AM" time string.
const [hour, setHour] = useState('')
const [minute, setMinute] = useState('')
const [meridiem, setMeridiem] = useState('')
useEffect(() => { setNoteText(note); setNoteSaved(false) }, [note, date])
// Build the class time once all three parts are chosen, e.g. "09:30 AM".
useEffect(() => {
    if (hour && minute && meridiem) {
        setTime(`${hour.padStart(2, '0')}:${minute} ${meridiem}`)
    } else {
        setTime('')
    }
    setSavedMessage('')
}, [hour, minute, meridiem, setTime])
const selectedProgram = programs[program]
// Live roster from Firestore (falls back to empty until it loads).
const students = roster[program]?.students || []

// Each date, program, and class time keeps its own marks.
const recordKey = `${date}/${program}/${time}`
const presentStudents = attendance[recordKey] || []
const extraStudents = extras[recordKey] || []

function togglePresent(name) {
setSavedMessage('')
const current = attendance[recordKey] || []
const updated = current.includes(name)
    ? current.filter((student) => student !== name)
    : [...current, name]
setDraft(recordKey, updated)
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

    <div className="mb-4">
    <label htmlFor="attendance-program" className="form-label">Program</label>
    <select
        id="attendance-program"
        className="form-select form-select-lg"
        value={program}
        onChange={(event) => { setProgram(event.target.value); setSavedMessage('') }}
    >
        <option value="">Choose a program</option>
        {programOrder.map((id) => (
            <option key={id} value={id}>{programs[id].name}</option>
        ))}
    </select>
    </div>

    <div className="mb-4">
    <label className="form-label">Class Time</label>
    <div className="d-flex gap-2">
        <select
            className="form-select form-select-lg"
            aria-label="Hour"
            value={hour}
            onChange={(event) => setHour(event.target.value)}
        >
            <option value="">Hour</option>
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <select
            className="form-select form-select-lg"
            aria-label="Minute"
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
        >
            <option value="">Min</option>
            {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
            className="form-select form-select-lg"
            aria-label="AM or PM"
            value={meridiem}
            onChange={(event) => setMeridiem(event.target.value)}
        >
            <option value="">AM/PM</option>
            {MERIDIEMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
    </div>
    </div>

    {date && selectedProgram && time ? (
    <>
        <h2 className="h5">{selectedProgram.name} — {time}</h2>
        <p className="mb-3" aria-live="polite">
        {presentStudents.length} of {students.length} students present
        </p>

        <ul className="list-group">
        {students.map((name) => {
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
                            setDraft(recordKey, updated)
                        }}
                    >
                        {isPresent ? 'Undo' : 'Present'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline-danger"
                        style={{ minHeight: '44px' }}
                        aria-label={`Remove ${name}`}
                        onClick={() => { setSavedMessage(''); removeExtra(recordKey, name) }}
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
                addExtra(recordKey, newName)
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
            onClick={() => {
                saveAttendance(selectedProgram.name)
                setSavedMessage(`Saved ${selectedProgram.name} at ${time} for ${date}. Choose this date in Reports to view it.`)
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
    <p className="text-muted">Select a date, program, and class time to mark attendance.</p>
    )}
</section>
)
}

export default Attendance
