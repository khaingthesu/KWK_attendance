const programs = [
  { id: 'tiny-tiger', name: 'Tiny Tiger' },
  { id: 'ninja-skill-karate', name: 'Ninja Skill Karate' },
]

export default function Reports({
  date,
  attendance,
  setAttendance,
  setDraftAttendance,
}) {
  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const submittedPrograms = programs.filter((program) =>
    Object.prototype.hasOwnProperty.call(attendance, `${date}/${program.id}`)
  )

  function undoPresent(programId, name) {
    const recordKey = `${date}/${programId}`
    const removeStudent = (records) => ({
      ...records,
      [recordKey]: (records[recordKey] || []).filter(
        (student) => student !== name
      ),
    })

    setAttendance(removeStudent)
    setDraftAttendance(removeStudent)
  }

  return (
    <section className="py-4 text-start">
      <h1 className="h3">Attendance Reports</h1>
      <p className="text-muted">
        {formattedDate || 'Choose a date on the Attendance page.'}
      </p>

      {date && submittedPrograms.length === 0 && (
        <p>No attendance submitted for this date.</p>
      )}

      <div className="row g-4">
      {date && submittedPrograms.map((program) => {
        const students = attendance[`${date}/${program.id}`] || []

        return (
          <div key={program.id} className="col-12 col-lg-6">
            <div className="border rounded overflow-hidden">
            <h2 className="h5 bg-dark text-white p-3 mb-0">
              {program.name} — {students.length} present
            </h2>

            <div className="table-responsive">
              <table className="table table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Student</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                {students.map((name, index) => (
                  <tr key={name}>
                    <td>{index + 1}</td>
                    <td>{name}</td>
                    <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      aria-label={`Undo present for ${name}`}
                      onClick={() => undoPresent(program.id, name)}
                    >
                      Undo Present
                    </button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted">
                      No students marked present.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        )
      })}
      </div>

      <p className="small text-muted mt-3">
        Attendance is kept while the app is open and resets on refresh.
      </p>
    </section>
  )
}
