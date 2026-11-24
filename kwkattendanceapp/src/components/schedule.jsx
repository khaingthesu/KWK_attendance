import { useState } from 'react'
import { programs, programOrder } from '../data/programs'
import { TAG_OPTIONS, weekdayLabels, weekdayOrder } from '../data/schedule'

// Badge color for a class tag, consistent with the attendance page badges.
function tagBadgeClass(tag) {
    if (tag === 'ZOOM') return 'badge text-bg-info'
    if (tag === 'SPARRING') return 'badge text-bg-warning'
    if (tag === 'In Person') return 'badge text-bg-secondary'
    return ''
}

// One card per weekday. Lists that day's classes (remove with confirm) and an
// add form at the bottom. To change a class, remove and re-add it.
function WeekdayColumn({ weekday, classes, addScheduleClass, removeScheduleClass }) {
    const [label, setLabel] = useState('')
    const [time, setTime] = useState('')
    const [tag, setTag] = useState('')
    const [checkedPrograms, setCheckedPrograms] = useState([])
    const [fixedName, setFixedName] = useState('')
    const weekdayName = weekdayLabels[weekday]

    function toggleProgram(programId) {
        setCheckedPrograms((current) =>
            current.includes(programId)
                ? current.filter((id) => id !== programId)
                : [...current, programId]
        )
    }

    function handleAdd(event) {
        event.preventDefault()
        const trimmedLabel = label.trim()
        const trimmedTime = time.trim()
        const trimmedFixed = fixedName.trim()
        if (!trimmedLabel || !trimmedTime) return
        if (checkedPrograms.length === 0 && !trimmedFixed) return
        addScheduleClass(weekday, {
            id: crypto.randomUUID(),
            label: trimmedLabel,
            time: trimmedTime,
            tag,
            programs: [...checkedPrograms],
            fixedStudents: trimmedFixed ? [trimmedFixed] : [],
        })
        setLabel('')
        setTime('')
        setTag('')
        setCheckedPrograms([])
        setFixedName('')
    }

    function handleRemove(cls) {
        if (window.confirm(`Remove "${cls.label}" (${cls.time}) from ${weekdayName}? Saved attendance is not affected.`)) {
            removeScheduleClass(weekday, cls.id)
        }
    }

    return (
        <div className="card students-column">
            <div className="card-header">
                <h2 className="h6 mb-0">{weekdayName}</h2>
                <small className="text-muted">{classes.length} classes</small>
            </div>
            <ul className="list-group list-group-flush">
                {classes.length === 0 && (
                    <li className="list-group-item text-muted">No classes yet.</li>
                )}
                {classes.map((cls) => (
                    <li key={cls.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                        <span>
                            {cls.label} — {cls.time}
                            {cls.tag && <span className={`${tagBadgeClass(cls.tag)} ms-2`}>{cls.tag}</span>}
                        </span>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            style={{ minHeight: '36px' }}
                            aria-label={`Remove ${cls.label} at ${cls.time} from ${weekdayName}`}
                            onClick={() => handleRemove(cls)}
                        >
                            Remove
                        </button>
                    </li>
                ))}
            </ul>
            <div className="card-body">
                <form className="d-flex flex-column gap-2" onSubmit={handleAdd}>
                    <label htmlFor={`label-${weekday}`} className="form-label mb-0">Add class</label>
                    <input
                        id={`label-${weekday}`}
                        type="text"
                        className="form-control"
                        placeholder="Class label (e.g. Adult/Teen All Level)"
                        aria-label={`Class label for ${weekdayName}`}
                        value={label}
                        onChange={(event) => setLabel(event.target.value)}
                    />
                    <input
                        id={`time-${weekday}`}
                        type="text"
                        className="form-control"
                        placeholder="3:30 PM"
                        aria-label={`Class time for ${weekdayName}`}
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                    />
                    <select
                        id={`tag-${weekday}`}
                        className="form-select"
                        aria-label={`Tag for ${weekdayName}`}
                        value={tag}
                        onChange={(event) => setTag(event.target.value)}
                    >
                        {TAG_OPTIONS.map((option) => (
                            <option key={option || 'none'} value={option}>{option || 'No tag'}</option>
                        ))}
                    </select>
                    <fieldset className="border rounded p-2">
                        <legend className="form-label mb-1 fs-6">Programs</legend>
                        {programOrder.map((programId) => (
                            <div key={programId} className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`prog-${weekday}-${programId}`}
                                    checked={checkedPrograms.includes(programId)}
                                    onChange={() => toggleProgram(programId)}
                                />
                                <label className="form-check-label" htmlFor={`prog-${weekday}-${programId}`}>
                                    {programs[programId].name}
                                </label>
                            </div>
                        ))}
                    </fieldset>
                    <label htmlFor={`fixed-${weekday}`} className="form-label mb-0">Fixed student name (private lesson)</label>
                    <input
                        id={`fixed-${weekday}`}
                        type="text"
                        className="form-control"
                        placeholder="e.g. Arlin T (optional)"
                        value={fixedName}
                        onChange={(event) => setFixedName(event.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
                        Add Class
                    </button>
                </form>
            </div>
        </div>
    )
}

function Schedule({ schedule, addScheduleClass, removeScheduleClass }) {
    return (
        <section className="container-fluid py-4 text-start">
            <h1 className="h3">Weekly Schedule</h1>
            <p className="text-muted">
                Add or remove classes per weekday. To change a class, remove it and add it again.
                Editing the schedule never changes saved attendance.
            </p>
            <div className="students-columns d-flex flex-column flex-lg-row flex-lg-wrap gap-3 pb-3">
                {weekdayOrder.map((weekday) => (
                    <WeekdayColumn
                        key={weekday}
                        weekday={weekday}
                        classes={schedule[weekday] || []}
                        addScheduleClass={addScheduleClass}
                        removeScheduleClass={removeScheduleClass}
                    />
                ))}
            </div>
        </section>
    )
}

export default Schedule
