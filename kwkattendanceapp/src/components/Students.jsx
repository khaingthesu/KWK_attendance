const categories = [
  { id: 'tiny-tiger', name: 'Tiny Tiger' },
]

function Students({ date, attendance, setAttendance, setDraftAttendance }) {
  const formattedDate = date
    ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const presentGroups = categories
    .map((category) => ({
      ...category,
      students: attendance[`${date}/${category.id}`] || [],
    }))
    .filter((category) => category.students.length > 0)

  function undoPresent(categoryId, name) {
    const recordKey = `${date}/${categoryId}`

    setDraftAttendance((records) => ({
      ...records,
      [recordKey]: (records[recordKey] || []).filter(
        (student) => student !== name
      ),
    }))

    setAttendance((records) => ({
      ...records,
      [recordKey]: (records[recordKey] || []).filter(
        (student) => student !== name
      ),
    }))
  }

  return (
    <section className="mx-auto py-4" style={{ maxWidth: '480px' }}>
      <h1 className="h3">Present Students</h1>
      <p className="text-muted">
        {formattedDate || 'Choose a date on the Attendance page.'}
      </p>

      {date && presentGroups.length === 0 && (
        <p>No students marked present for this date.</p>
      )}

      {date && presentGroups.map((category) => (
        <div key={category.id} className="mb-4">
          <h2 className="h5">
            {category.name} — {category.students.length} present
          </h2>

          <ul className="list-group">
            {category.students.map((name) => (
              <li
                key={name}
                className="list-group-item d-flex justify-content-between align-items-center gap-3"
              >
                <span>{name}</span>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  aria-label={`Undo present for ${name}`}
                  onClick={() => undoPresent(category.id, name)}
                >
                  Undo Present
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

export default Students
