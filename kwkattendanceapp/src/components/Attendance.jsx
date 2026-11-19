const tinyTigerStudents = [
'Aiden Z',
'Alice U',
'Daniel B',
'Frankie B',
'Harry B',
'Henry G',
'Jack D.T',
'Madison B',
'Maggie H',
'Milo A-N',
'Nina D',
'Owen F',
'Rory M',
'Rylan R',
'Senna H',
'Sloane H',
'Theo F',
'Theo Cz',
'Teddy M',
'Noor D',
]

const ninjaSkillStudents = [
  'Asa C',
  'Eli S',
  'Elise (Mei Mei)',
  'Emerson',
  'Freddie M',
  'Jayden S',
  'LuLu',
  'Oliver S',
  'Pari K',
  'Stella T',
  'Troy L',
]

const programs = {
  'tiny-tiger': {
    name: 'Tiny Tiger',
    students: tinyTigerStudents,
  },
  'ninja-skill-karate': {
    name: 'Ninja Skill Karate',
    students: ninjaSkillStudents,
  },
}

function Attendance({
date,
setDate,
category,
setCategory,
attendance,
setAttendance,
submitAttendance,
}) {

const weekday = date
? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
weekday: 'long',
})
: ''
const recordKey = `${date}/${category}`
const presentStudents = attendance[recordKey] || []
const selectedProgram = programs[category]
const students = selectedProgram?.students || []
const showStudents = Boolean(date && selectedProgram)

function toggleAttendance(name) {
setAttendance((records) => {
const current = records[recordKey] || []
const updated = current.includes(name)
? current.filter((student) => student !== name)
: [...current, name]

return { ...records, [recordKey]: updated }
});
}

return (
<section className="mx-auto py-4" style={{ maxWidth: '480px' }}>

<div className="mb-3">
<label htmlFor="attendance-date" className="form-label">
    Today's Date
</label>
<input
    id="attendance-date"
    type="date"
    className="form-control"
    value={date}
    onChange={(event) => setDate(event.target.value)}
/>
<p className="small text-muted mt-2" aria-live="polite">
    {weekday || 'Select a date to see the day.'}
</p>
</div>

<div className="mb-4">
<label htmlFor="attendance-category" className="form-label">
    Program Choice
</label>
<select
    id="attendance-category"
    className="form-select"
    value={category}
    onChange={(event) => setCategory(event.target.value)}
>
    <option value="">Choose a category</option>
    <option value="tiny-tiger">Tiny Tiger</option>
    <option value="ninja-skill-karate">Ninja Skill Karate</option>
</select>
</div>

{showStudents ? (
<>
<h2 className="h5">{selectedProgram.name}</h2>
<p aria-live="polite">{presentStudents.length} of {students.length} students present</p>

<ul className="list-group">
{students.map((name) => {
const isPresent = presentStudents.includes(name)

return (
<li
    key={name}
    className="list-group-item d-flex justify-content-between align-items-center gap-3"
>
    <span>{name}</span>

    <button
    type="button"
    className={`btn btn-sm ${
        isPresent ? 'btn-danger' : 'btn-outline-dark'
    }`}
    aria-pressed={isPresent}
    aria-label={`Mark ${name} ${isPresent ? 'absent' : 'present'}`}
    onClick={() => toggleAttendance(name)}
    >
    {isPresent ? 'Present ✓' : 'Mark Present'}
    </button>
</li>
)
})}
</ul>
<button
  type="button"
  className="btn btn-danger w-100 mt-3"
  onClick={() => {
    submitAttendance()
    window.alert('Attendance submitted to Reports!')
  }}
>
  Submit Attendance
</button>
<p className="small text-muted mt-2">
  Submit to update Reports for this date and program.
</p>
</>
) : (
<p className="text-muted">Select a date and category to show students.</p>
)}

<p className="small text-muted mt-3">
Attendance is not saved yet and will reset on refresh.
</p>
</section>
)
}

export default Attendance;
