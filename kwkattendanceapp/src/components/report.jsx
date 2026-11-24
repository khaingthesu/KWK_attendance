import { useState } from 'react'

// Convert a "09:30 AM" time string into minutes since midnight, for sorting.
function timeToMinutes(time) {
const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time || '')
if (!match) return Number.MAX_SAFE_INTEGER
let hour = parseInt(match[1], 10) % 12
if (/PM/i.test(match[3])) hour += 12
return hour * 60 + parseInt(match[2], 10)
}

function Report({ today, savedAttendance, undoPresent, notes }) {
const [selectedDate, setSelectedDate] = useState(today)
const selectedRecords = Object.entries(savedAttendance)
.filter(([, record]) => record.date === selectedDate && record.students.length > 0)
const dayNote = notes?.[selectedDate] || ''

// Group the day's records by class time, then order the times chronologically.
const timeGroups = {}
selectedRecords.forEach(([recordKey, record]) => {
const label = record.time || 'No time'
if (!timeGroups[label]) timeGroups[label] = []
timeGroups[label].push([recordKey, record])
})
const orderedTimes = Object.keys(timeGroups).sort((a, b) => timeToMinutes(a) - timeToMinutes(b))

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

{orderedTimes.map((timeLabel) => (
<div key={timeLabel} className="mb-5">
    <h2 className="h4 border-bottom pb-2">{timeLabel}</h2>
    {timeGroups[timeLabel].map(([recordKey, record]) => {
    const recordLabel = record.classLabel || record.programName
    return (
    <div key={recordKey} className="mb-4">
        <h3 className="h5">{recordLabel} <span aria-live="polite">({record.students.length} students present)</span></h3>
        <div className="table-responsive">
        <table className="table align-middle" aria-label={`${recordLabel} at ${timeLabel}`}>
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
                    aria-label={`Undo present for ${name} in ${recordLabel} at ${timeLabel}`}
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
    )
    })}
</div>
))}
</section>
)
}

export default Report
