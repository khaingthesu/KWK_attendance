import { useState } from 'react'
import { programs, programOrder } from '../data/programs'

//in the students tab--> there is program, roaster, addStudent, removeStudent
function ProgramColumn({ programId, roster, addStudent, removeStudent }) {
const [newName, setNewName] = useState('')
const students = [...(roster[programId]?.students || [])].sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' })
)
const programName = programs[programId]?.name || programId

function handleAdd(event) {
    event.preventDefault()
    addStudent(programId, newName)
    setNewName('')
}

function handleRemove(name) {
    if (window.confirm(`Remove ${name} from ${programName}? Past saved attendance keeps this name.`)) {
        removeStudent(programId, name)
    }
}

return (
<div className="card students-column">
    <div className="card-header">
    <h2 className="h6 mb-0">{programName}</h2>
    <small className="text-muted">{students.length} students</small>
    </div>
    <ul className="list-group list-group-flush">
    {students.length === 0 && (
        <li className="list-group-item text-muted">No students yet.</li>
    )}
    {students.map((name) => (
        <li key={name} className="list-group-item d-flex justify-content-between align-items-center gap-2">
        <span>{name}</span>
        <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            style={{ minHeight: '36px' }}
            aria-label={`Remove ${name} from ${programName}`}
            onClick={() => handleRemove(name)}
        >
            Remove
        </button>
        </li>
    ))}
    </ul>
    <div className="card-body">
    <form className="d-flex flex-column gap-2" onSubmit={handleAdd}>
        <label htmlFor={`add-${programId}`} className="form-label mb-0">Add student</label>
        <input
        id={`add-${programId}`}
        type="text"
        className="form-control"
        placeholder="New student name"
        value={newName}
        onChange={(event) => setNewName(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ minHeight: '44px' }}>
        Add
        </button>
    </form>
    </div>
</div>
)
}

function Students({ roster, addStudent, removeStudent }) {
return (
<section className="container-fluid py-4 text-start">
    <h1 className="h3">Manage Students</h1>
    <p className="text-muted">
    Add or remove students per program. Changes apply to future classes. Past saved
    attendance keeps the names it was saved with.
    </p>
    <div className="students-columns d-flex flex-column flex-lg-row flex-lg-wrap gap-3 pb-3">
    {programOrder.map((programId) => (
        <ProgramColumn
        key={programId}
        programId={programId}
        roster={roster}
        addStudent={addStudent}
        removeStudent={removeStudent}
        />
    ))}
    </div>
</section>
)
}

export default Students
