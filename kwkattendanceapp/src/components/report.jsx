import { useState } from 'react'

function Report({ today, savedAttendance, undoPresent, notes }) {
const [selectedDate, setSelectedDate] = useState(today)
const selectedRecords = Object.entries(savedAttendance)
.filter(([, record]) => record.date === selectedDate)
const dayNote = notes?.[selectedDate] || ''

const formattedDate = selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
month: 'short',
day: 'numeric',
year: 'numeric',
}) : ''

return (
<section className="attendance-report container py-4 text-start">
<h1 className="h3 d-flex flex-wrap align-items-baseline gap-3">
{selectedDate === today ? "Today's Attendance" : 'Attendance'}
{selectedDate && <time dateTime={selectedDate} className="fs-5 text-muted">{formattedDate}</time>}
</h1>

<div className="report-controls d-flex flex-wrap align-items-end gap-3 mb-4">
    <div style={{ maxWidth: '280px' }}>
    <label htmlFor="report-date" className="form-label">Date</label>
    <input
        id="report-date"
        type="date"
        className="form-control form-control-lg"
        value={selectedDate}
        onChange={(event) => setSelectedDate(event.target.value)}
    />
    </div>
    <button
    type="button"
    className="btn btn-danger btn-lg"
    disabled={!selectedDate || selectedRecords.length === 0}
    onClick={() => window.print()}
    >
    Save PDF
    </button>
</div>

{!selectedDate && <p role="status">Select a date.</p>}
{selectedDate && selectedRecords.length === 0 && <p role="status">No attendance saved for this date.</p>}

{selectedDate && dayNote && (
<div className="mb-4">
    <h2 className="h5">Notes</h2>
    <p style={{ whiteSpace: 'pre-wrap' }}>{dayNote}</p>
</div>
)}

{selectedRecords.map(([recordKey, record]) => (
<div key={recordKey} className="mb-4">
    <h2 className="h5">{record.programName} <span aria-live="polite">({record.students.length} students present)</span></h2>
    <div className="table-responsive">
    <table className="table align-middle" aria-label={record.programName}>
        <thead className="visually-hidden">
        <tr>
            <th scope="col">Student</th>
            <th scope="col" className="report-action">Action</th>
        </tr>
        </thead>
        <tbody>
        {record.students.map((name) => (
            <tr key={name}>
            <td>{name}</td>
            <td className="report-action text-end">
                <button
                type="button"
                className="btn btn-outline-danger"
                style={{ minHeight: '44px' }}
                aria-label={`Undo present for ${name} in ${record.programName}`}
                onClick={() => undoPresent(recordKey, name)}
                >
                Undo
                </button>
            </td>
            </tr>
        ))}
        </tbody>
    </table>
    </div>
</div>
))}
</section>
)
}

export default Report
