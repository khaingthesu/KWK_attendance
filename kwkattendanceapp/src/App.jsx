// Firebase Auth helpers: subscribe to login state, and sign the user out.
import { onAuthStateChanged, signOut } from 'firebase/auth'
// Firestore helpers: reference a collection, delete/create docs, listen for live changes, write a doc.
import { collection, deleteDoc, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
// React hooks: run side effects (useEffect) and hold component state (useState).
import { useEffect, useState } from 'react'
// Bootstrap UI building blocks for the layout and top navigation bar.
import { Container, Nav, Navbar } from 'react-bootstrap'
// Client-side routing: the router shell, links, redirects, and route definitions.
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
// App-wide custom styles.
import './App.css'
// The logo image shown in the navbar.
import logo from './assets/Logo.jpg'
// Page components for each route.
import SignIn from './auth/signin.jsx'
import Attendance from './components/attendance.jsx'
import Report from './components/report.jsx'
import Schedule from './components/schedule.jsx'
import Students from './components/students.jsx'
// Bundled program/roster seed data and the order programs should appear in.
import { programOrder, programs } from './data/programs'
// Bundled weekly timetable seed data and the order weekdays should appear in.
import { seedSchedule, weekdayOrder, weekdayIdFromDate } from './data/schedule'
// The initialized Firebase Auth and Firestore instances for this app.
import { auth, db } from './firebase/firebase'

// Build today's date as a "YYYY-MM-DD" string in the browser's local time zone.
function getToday() {
    const today = new Date()                                   // Current date/time.
    const year = today.getFullYear()                           // Four-digit year.
    const month = String(today.getMonth() + 1).padStart(2, '0') // Month is 0-based, so +1; pad to two digits.
    const day = String(today.getDate()).padStart(2, '0')       // Day of month, padded to two digits.
    return `${year}-${month}-${day}`                           // Combine into "YYYY-MM-DD".
}

// Firestore doc IDs cannot contain "/", so turn a record key such as
// "2026-11-24/mon-1" into "2026-11-24_mon-1". Class ids never contain
// "/", ":", or spaces, so this stays reversible to a usable doc id.
function docIdFor(recordKey) {
    return recordKey.replace(/[/:\s]/g, '_')                   // Replace "/", ":", and whitespace with "_".
}

// A record key is "date/classId" split on the single "/".
function parseKey(recordKey) {
    const firstSlash = recordKey.indexOf('/')                  // Position of the first "/".
    return {
        date: recordKey.slice(0, firstSlash),                  // Everything before the "/" is the date.
        classId: recordKey.slice(firstSlash + 1),              // Everything after the "/" is the class id.
    }
}

function App() {
// The currently signed-in Firebase user, or null when signed out.
const [user, setUser] = useState(null)
// True while we're still checking the initial auth state (before showing routes).
const [authLoading, setAuthLoading] = useState(true)
// A user-facing error message for auth/connection problems ('' means none).
const [authError, setAuthError] = useState('')
// True while a sign-out request is in flight (disables the button).
const [signingOut, setSigningOut] = useState(false)
// The attendance date being viewed/edited, defaulting to today.
const [date, setDate] = useState(getToday)
// The class currently selected on the attendance page.
const [selectedClassId, setSelectedClassId] = useState('')
// Draft (unsaved) attendance marks, keyed by "date/classId".
const [attendance, setAttendance] = useState({})
// Saved attendance records that appear in Reports, keyed by "date/classId".
const [savedAttendance, setSavedAttendance] = useState({})
// Manually-added extra attendees, keyed by "date/classId".
const [extras, setExtras] = useState({})
// The student rosters per program, keyed by programId.
const [roster, setRoster] = useState({})
// True once the roster collection has loaded at least once from Firestore.
const [rosterLoaded, setRosterLoaded] = useState(false)
// The weekly class schedule, keyed by weekday id.
const [schedule, setSchedule] = useState({})
// True once the schedule collection has loaded at least once from Firestore.
const [scheduleLoaded, setScheduleLoaded] = useState(false)
// General notes per date, keyed by date string.
const [notes, setNotes] = useState({})

// Subscribe to Firebase auth state on mount; update user/loading/error accordingly.
useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)                                   // Store the logged-in user (or null).
        setAuthLoading(false)                                  // Initial auth check is done.
        setAuthError('')                                       // Clear any previous error.
    }, () => {
        // Error callback: auth listener failed.
        setUser(null)                                          // Treat as signed out.
        setAuthLoading(false)                                  // Stop showing the loading state.
        setAuthError('Unable to check sign-in. Please refresh and try again.')
    })
    return unsubscribe                                         // Clean up the auth listener on unmount.
}, [])                                                         // Empty deps: run once on mount.

// Subscribe to the shared Firestore data once signed in. Data persists across
// sign-out and refresh because it lives in Firestore, not in session state.
useEffect(() => {
    if (!user) return                                          // Only subscribe when a user is signed in.

    // Listen to draft attendance docs and rebuild the local "attendance" map.
    const unsubDrafts = onSnapshot(collection(db, 'drafts'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return                          // Skip malformed docs without a classId.
            next[`${data.date}/${data.classId}`] = data.students || [] // Key by "date/classId".
        })
        setAttendance(next)                                    // Replace local drafts with the live set.
    })

    // Listen to saved attendance docs (what Reports shows) and rebuild "savedAttendance".
    const unsubSaved = onSnapshot(collection(db, 'saved'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return                          // Skip malformed docs.
            next[`${data.date}/${data.classId}`] = {
                date: data.date,
                classId: data.classId,
                classLabel: data.classLabel || data.programName || '', // Fall back to older field name.
                time: data.time || '',
                tag: data.tag || '',
                students: data.students || [],
            }
        })
        setSavedAttendance(next)                               // Replace local saved records with the live set.
    })

    // Listen to manually-added extra attendees and rebuild "extras".
    const unsubExtras = onSnapshot(collection(db, 'extras'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return                          // Skip malformed docs.
            next[`${data.date}/${data.classId}`] = data.students || []
        })
        setExtras(next)
    })

    // Listen to the weekly schedule and rebuild "schedule"; mark it loaded.
    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            next[d.id] = d.data().classes || []                // Doc id is the weekday; value is its class list.
        })
        setSchedule(next)
        setScheduleLoaded(true)                                // Allow seeding to run now that data arrived.
    })

    // Listen to program rosters and rebuild "roster"; mark it loaded.
    const unsubRoster = onSnapshot(collection(db, 'roster'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[data.programId] = { name: data.name, students: data.students || [] }
        })
        setRoster(next)
        setRosterLoaded(true)                                  // Allow seeding to run now that data arrived.
    })

    // Listen to per-date notes and rebuild "notes".
    const unsubNotes = onSnapshot(collection(db, 'notes'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[data.date] = data.text || ''                  // Key by date; value is the note text.
        })
        setNotes(next)
    })

    // Clean up every listener when the user changes or the component unmounts.
    return () => {
        unsubDrafts()
        unsubSaved()
        unsubExtras()
        unsubSchedule()
        unsubRoster()
        unsubNotes()
    }
}, [user])                                                     // Re-run when the signed-in user changes.

// Seed Firestore rosters once from the bundled program lists. Only writes a
// program's doc if it does not exist yet, so later edits are never overwritten.
useEffect(() => {
    if (!user || !rosterLoaded) return                         // Wait until signed in and roster has loaded.
    programOrder.forEach((programId) => {
        if (!roster[programId]) {                              // Only seed programs missing from Firestore.
            setDoc(doc(db, 'roster', programId), {
                programId,
                name: programs[programId].name,
                students: programs[programId].students,
            }).catch(() => {})                                 // Ignore write errors during seeding.
        }
    })
}, [user, rosterLoaded, roster])                               // Re-check whenever these change.

// Seed the weekly schedule once from the bundled timetable. Only writes a
// weekday doc if it does not exist yet, so later edits are never overwritten.
useEffect(() => {
    if (!user || !scheduleLoaded) return                       // Wait until signed in and schedule has loaded.
    weekdayOrder.forEach((weekdayId) => {
        if (!schedule[weekdayId]) {                            // Only seed weekdays missing from Firestore.
            setDoc(doc(db, 'schedule', weekdayId), {
                weekday: weekdayId,
                classes: seedSchedule[weekdayId],
            }).catch(() => {})                                 // Ignore write errors during seeding.
        }
    })
}, [user, scheduleLoaded, schedule])                           // Re-check whenever these change.

// Sign the current user out, surfacing any failure as an auth error.
async function handleSignOut() {
    setSigningOut(true)                                        // Disable the button while signing out.
    setAuthError('')                                           // Clear prior error.
    try {
        await signOut(auth)                                    // Ask Firebase to end the session.
    } catch {
        setAuthError('Unable to sign out. Please try again.')  // Show failure to the user.
    } finally {
        setSigningOut(false)                                   // Re-enable the button either way.
    }
}

// Write one date+program draft to Firestore. Local state updates instantly (Option A);
// the snapshot keeps every device in sync afterward.
function setDraft(recordKey, students, meta) {
    setAttendance((records) => ({ ...records, [recordKey]: students })) // Optimistic local update.
    const { date: recDate, classId: recClassId } = parseKey(recordKey) // Split key into date + classId.
    const existingSaved = savedAttendance[recordKey]           // Any already-saved record for this key.
    // Prefer the metadata passed from the class, then the live saved record.
    const classLabel = meta?.label ?? existingSaved?.classLabel ?? ''
    const time = meta?.time ?? existingSaved?.time ?? ''
    const tag = meta?.tag ?? existingSaved?.tag ?? ''
    // Persist the draft doc.
    setDoc(doc(db, 'drafts', docIdFor(recordKey)), {
        date: recDate,
        classId: recClassId,
        classLabel,
        time,
        tag,
        students,
    }).catch(() => setAuthError('Unable to save the mark. Check your connection.'))

    // If this class was already saved, keep the report in sync with the marks.
    // Undoing a student here removes them from the report; emptying the class
    // removes the whole record from the report.
    if (existingSaved) {
        if (students.length === 0) {
            // No students left: delete the saved record so it drops out of Reports.
            deleteDoc(doc(db, 'saved', docIdFor(recordKey)))
                .catch(() => setAuthError('Unable to update the report. Check your connection.'))
        } else {
            // Otherwise overwrite the saved record with the current marks.
            setDoc(doc(db, 'saved', docIdFor(recordKey)), {
                date: recDate,
                classId: recClassId,
                classLabel,
                time,
                tag,
                students,
            }).catch(() => setAuthError('Unable to update the report. Check your connection.'))
        }
    }
}

// Save all marked classes for the selected date together at the end of the day.
async function saveAttendance() {
    const dayClasses = schedule[weekdayIdFromDate(date)] || []
    const markedClasses = dayClasses.filter((cls) => attendance[`${date}/${cls.id}`]?.length)
    if (markedClasses.length === 0) return false
    const batch = writeBatch(db)
    for (const cls of markedClasses) {
        const recordKey = `${date}/${cls.id}`
        batch.set(doc(db, 'saved', docIdFor(recordKey)), {
            date,
            classId: cls.id,
            classLabel: cls.label || '',
            time: cls.time || '',
            tag: cls.tag || '',
            students: [...attendance[recordKey]],
        })
    }
    try {
        await batch.commit()
        return true
    } catch {
        setAuthError('Unable to save attendance. Check your connection and try again.')
        return false
    }
}

// Remove one student's "present" mark from a saved record (and from the draft).
function undoPresent(recordKey, name) {
    const savedRecord = savedAttendance[recordKey]             // The saved record, if any.
    if (savedRecord) {
        const students = savedRecord.students.filter((student) => student !== name) // Drop the name.
        const { date: recDate, classId: recClassId } = parseKey(recordKey)
        setDoc(doc(db, 'saved', docIdFor(recordKey)), {        // Rewrite the saved record without them.
            date: savedRecord.date || recDate,
            classId: recClassId,
            classLabel: savedRecord.classLabel || '',
            time: savedRecord.time || '',
            tag: savedRecord.tag || '',
            students,
        }).catch(() => setAuthError('Unable to update the record. Check your connection.'))
    }
    // Update the draft too, so saving again does not restore the undone mark.
    const draftStudents = (attendance[recordKey] || []).filter((student) => student !== name)
    setDraft(recordKey, draftStudents, savedRecord
        ? { label: savedRecord.classLabel, time: savedRecord.time, tag: savedRecord.tag } // Carry metadata.
        : undefined)
}

// Manually-added names for a date+program (students attending a non-usual class).
// Adding marks them present immediately.
function addExtra(recordKey, name, meta) {
    const trimmed = name.trim()                                // Normalize whitespace.
    if (!trimmed) return                                       // Ignore empty names.
    const current = extras[recordKey] || []                    // Existing extras for this key.
    if (current.includes(trimmed)) return                      // Skip duplicates.
    const updated = [...current, trimmed]                      // Append the new name.
    const { date: recDate, classId: recClassId } = parseKey(recordKey)
    setExtras((records) => ({ ...records, [recordKey]: updated })) // Optimistic local update.
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {           // Persist the extras doc.
        date: recDate,
        classId: recClassId,
        classLabel: meta?.label || '',
        time: meta?.time || '',
        tag: meta?.tag || '',
        students: updated,
    }).catch(() => setAuthError('Unable to add the name. Check your connection.'))
    // Mark the extra present in the draft right away.
    const draft = attendance[recordKey] || []
    if (!draft.includes(trimmed)) setDraft(recordKey, [...draft, trimmed], meta)
}

// One general note per date, shared across programs for that day.
function saveNote(noteDate, text) {
    setNotes((records) => ({ ...records, [noteDate]: text }))   // Optimistic local update.
    setDoc(doc(db, 'notes', noteDate), {                       // Persist the note keyed by date.
        date: noteDate,
        text,
    }).catch(() => setAuthError('Unable to save the note. Check your connection.'))
}

// Permanent roster edits. These change future classes only; saved records keep
// the names they were saved with, so history is not rewritten.
function addStudent(programId, name) {
    const trimmed = name.trim()                                // Normalize whitespace.
    if (!trimmed) return                                       // Ignore empty names.
    const current = roster[programId]?.students || []          // Existing roster for the program.
    if (current.includes(trimmed)) return                      // Skip duplicates.
    const students = [...current, trimmed]                     // Append the new student.
    setRoster((records) => ({                                  // Optimistic local update.
        ...records,
        [programId]: { name: programs[programId].name, students },
    }))
    setDoc(doc(db, 'roster', programId), {                     // Persist the updated roster.
        programId,
        name: programs[programId].name,
        students,
    }).catch(() => setAuthError('Unable to add the student. Check your connection.'))
}

// Remove a student permanently from a program's roster.
function removeStudent(programId, name) {
    const current = roster[programId]?.students || []          // Existing roster.
    const students = current.filter((s) => s !== name)         // Drop the student.
    setRoster((records) => ({                                  // Optimistic local update.
        ...records,
        [programId]: { name: programs[programId].name, students },
    }))
    setDoc(doc(db, 'roster', programId), {                     // Persist the updated roster.
        programId,
        name: programs[programId].name,
        students,
    }).catch(() => setAuthError('Unable to remove the student. Check your connection.'))
}

// Schedule edits. These change the weekly class list only; saved attendance is
// never touched (records key on date/classId and stay as saved).
function addScheduleClass(weekdayId, cls) {
    const classes = [...(schedule[weekdayId] || []), cls]      // Append the new class to the weekday.
    setSchedule((records) => ({ ...records, [weekdayId]: classes })) // Optimistic local update.
    setDoc(doc(db, 'schedule', weekdayId), {                   // Persist the weekday's class list.
        weekday: weekdayId,
        classes,
    }).catch(() => setAuthError('Unable to add the class. Check your connection.'))
}

// Remove one class from a weekday's schedule.
function removeScheduleClass(weekdayId, classId) {
    const classes = (schedule[weekdayId] || []).filter((cls) => cls.id !== classId) // Drop by id.
    setSchedule((records) => ({ ...records, [weekdayId]: classes })) // Optimistic local update.
    setDoc(doc(db, 'schedule', weekdayId), {                   // Persist the updated class list.
        weekday: weekdayId,
        classes,
    }).catch(() => setAuthError('Unable to remove the class. Check your connection.'))
}

// Remove a manually-added extra attendee (and unmark them from the draft).
function removeExtra(recordKey, name, meta) {
    const updated = (extras[recordKey] || []).filter((s) => s !== name) // Drop from extras.
    const { date: recDate, classId: recClassId } = parseKey(recordKey)
    setExtras((records) => ({ ...records, [recordKey]: updated })) // Optimistic local update.
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {           // Persist the updated extras.
        date: recDate,
        classId: recClassId,
        classLabel: meta?.label || '',
        time: meta?.time || '',
        tag: meta?.tag || '',
        students: updated,
    }).catch(() => setAuthError('Unable to remove the name. Check your connection.'))
    // Also unmark from the draft.
    const draft = (attendance[recordKey] || []).filter((s) => s !== name)
    setDraft(recordKey, draft, meta)
}

// The attendance page element, wired with all the state and handlers it needs.
const attendancePage = (
    <Attendance
        date={date}                                            // Currently viewed date.
        setDate={setDate}                                      // Change the viewed date.
        attendance={attendance}                                // Draft marks map.
        setDraft={setDraft}                                    // Save/update a draft mark.
        saveAttendance={saveAttendance}                        // Commit draft to Reports.
        extras={extras}                                        // Extra attendees map.
        addExtra={addExtra}                                    // Add an extra attendee.
        removeExtra={removeExtra}                              // Remove an extra attendee.
        roster={roster}                                        // Program rosters.
        note={notes[date] || ''}                               // Note for the current date.
        saveNote={saveNote}                                    // Save the date's note.
        schedule={schedule}                                    // Weekly schedule.
        selectedClassId={selectedClassId}                      // Currently selected class.
        setSelectedClassId={setSelectedClassId}                // Change the selected class.
    />
)

return (
<BrowserRouter>                                                {/* Enables client-side routing. */}
    <Navbar expand="lg" collapseOnSelect className="border-bottom mb-3"> {/* Top nav; collapses on mobile. */}
    <Container>                                                {/* Centers and constrains navbar width. */}

        {/* Brand/logo on the left, links back to home. */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
        <img src={logo} alt="Ken Wa Kan logo" width="48" height="48" /> {/* Logo image. */}
        <span className="navbar-title">Ken Wa Kan Instructor Attendance App</span> {/* App title. */}
        </Navbar.Brand>

        {/* Only show nav links once a user is signed in and auth has finished loading. */}
        {user && !authLoading && <>
        <Navbar.Toggle aria-controls="main-nav" />             {/* Hamburger toggle on small screens. */}
        <Navbar.Collapse id="main-nav">                        {/* Collapsible nav content. */}
            <Nav className="ms-auto">                          {/* Push links to the right. */}
            <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link> {/* Navigate to attendance. */}
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>       {/* Navigate to reports. */}
            <Nav.Link as={Link} to="/students">Students</Nav.Link>     {/* Navigate to students. */}
            <Nav.Link as={Link} to="/schedule">Schedule</Nav.Link>     {/* Navigate to schedule. */}
            {/* Sign-out rendered as a button; disabled while signing out. */}
            <Nav.Link as="button" type="button" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign Out'}     {/* Button label reflects state. */}
            </Nav.Link>
            </Nav>
        </Navbar.Collapse>
        </>}
    </Container>
    </Navbar>

    {authError && <p className="text-danger" role="alert">{authError}</p>} {/* Show any auth/connection error. */}
    {/* While checking auth, show a loading note. */}
    {authLoading ? (
        <p className="py-4" role="status">Loading…</p>
    ) : (
        <Routes>                                               {/* Route table, rendered once auth is known. */}
            {/* Sign-in page; if already signed in, bounce to attendance. */}
            <Route path="/signin" element={user ? <Navigate to="/attendance" replace /> : <SignIn />} />
            {/* Root: go to attendance when signed in, otherwise to sign-in. */}
            <Route path="/" element={<Navigate to={user ? '/attendance' : '/signin'} replace />} />
            {/* Attendance page, guarded by auth. */}
            <Route path="/attendance" element={user ? attendancePage : <Navigate to="/signin" replace />} />
            {/* Reports page, guarded by auth, wired with saved data and undo. */}
            <Route path="/reports" element={user ? <Report today={getToday()} savedAttendance={savedAttendance} undoPresent={undoPresent} notes={notes} /> : <Navigate to="/signin" replace />} />
            {/* Students page, guarded by auth, wired with roster edit handlers. */}
            <Route path="/students" element={user ? <Students roster={roster} addStudent={addStudent} removeStudent={removeStudent} /> : <Navigate to="/signin" replace />} />
            {/* Schedule page, guarded by auth, wired with schedule edit handlers. */}
            <Route path="/schedule" element={user ? <Schedule schedule={schedule} roster={roster} addScheduleClass={addScheduleClass} removeScheduleClass={removeScheduleClass} /> : <Navigate to="/signin" replace />} />
            {/* Any unknown path: redirect to attendance or sign-in based on auth. */}
            <Route path="*" element={<Navigate to={user ? '/attendance' : '/signin'} replace />} />
        </Routes>
    )}
    

    <footer > copyright by Khaing The Su@2026 Karate-Do Ken Wa Kan</footer> {/* Page footer. */}
</BrowserRouter>
)
}

export default App                                             // Make App the module's default export.
