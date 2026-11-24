import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Container, Nav, Navbar } from 'react-bootstrap'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import logo from './assets/Logo.jpg'
import SignIn from './auth/signin.jsx'
import Attendance from './components/attendance.jsx'
import Report from './components/report.jsx'
import Students from './components/students.jsx'
import { programOrder, programs } from './data/programs'
import { auth, db } from './firebase/firebase'

function getToday() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Firestore doc IDs cannot contain "/", so convert "date/program" to "date_program".
function docIdFor(recordKey) {
    return recordKey.replace('/', '_')
}

function App() {
const [user, setUser] = useState(null)
const [authLoading, setAuthLoading] = useState(true)
const [authError, setAuthError] = useState('')
const [signingOut, setSigningOut] = useState(false)
const [date, setDate] = useState(getToday)
const [program, setProgram] = useState('')
const [attendance, setAttendance] = useState({})
const [savedAttendance, setSavedAttendance] = useState({})
const [extras, setExtras] = useState({})
const [roster, setRoster] = useState({})
const [rosterLoaded, setRosterLoaded] = useState(false)

useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser)
        setAuthLoading(false)
        setAuthError('')
    }, () => {
        setUser(null)
        setAuthLoading(false)
        setAuthError('Unable to check sign-in. Please refresh and try again.')
    })
    return unsubscribe
}, [])

// Subscribe to the shared Firestore data once signed in. Data persists across
// sign-out and refresh because it lives in Firestore, not in session state.
useEffect(() => {
    if (!user) return

    const unsubDrafts = onSnapshot(collection(db, 'drafts'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[`${data.date}/${data.programId}`] = data.students || []
        })
        setAttendance(next)
    })

    const unsubSaved = onSnapshot(collection(db, 'saved'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[`${data.date}/${data.programId}`] = {
                date: data.date,
                programName: data.programName,
                students: data.students || [],
            }
        })
        setSavedAttendance(next)
    })

    const unsubExtras = onSnapshot(collection(db, 'extras'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[`${data.date}/${data.programId}`] = data.students || []
        })
        setExtras(next)
    })

    const unsubRoster = onSnapshot(collection(db, 'roster'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[data.programId] = { name: data.name, students: data.students || [] }
        })
        setRoster(next)
        setRosterLoaded(true)
    })

    return () => {
        unsubDrafts()
        unsubSaved()
        unsubExtras()
        unsubRoster()
    }
}, [user])

// Seed Firestore rosters once from the bundled program lists. Only writes a
// program's doc if it does not exist yet, so later edits are never overwritten.
useEffect(() => {
    if (!user || !rosterLoaded) return
    programOrder.forEach((programId) => {
        if (!roster[programId]) {
            setDoc(doc(db, 'roster', programId), {
                programId,
                name: programs[programId].name,
                students: programs[programId].students,
            }).catch(() => {})
        }
    })
}, [user, rosterLoaded, roster])

async function handleSignOut() {
    setSigningOut(true)
    setAuthError('')
    try {
        await signOut(auth)
    } catch {
        setAuthError('Unable to sign out. Please try again.')
    } finally {
        setSigningOut(false)
    }
}

// Write one date+program draft to Firestore. Local state updates instantly (Option A);
// the snapshot keeps every device in sync afterward.
function setDraft(recordKey, students) {
    setAttendance((records) => ({ ...records, [recordKey]: students }))
    const [recDate, recProgram] = recordKey.split('/')
    setDoc(doc(db, 'drafts', docIdFor(recordKey)), {
        date: recDate,
        programId: recProgram,
        students,
    }).catch(() => setAuthError('Unable to save the mark. Check your connection.'))
}

function saveAttendance(programName) {
    const recordKey = `${date}/${program}`
    const students = [...(attendance[recordKey] || [])]
    setDoc(doc(db, 'saved', docIdFor(recordKey)), {
        date,
        programId: program,
        programName,
        students,
    }).catch(() => setAuthError('Unable to save attendance. Check your connection.'))
}

function undoPresent(recordKey, name) {
    const savedRecord = savedAttendance[recordKey]
    if (savedRecord) {
        const students = savedRecord.students.filter((student) => student !== name)
        setDoc(doc(db, 'saved', docIdFor(recordKey)), {
            date: savedRecord.date,
            programId: recordKey.split('/')[1],
            programName: savedRecord.programName,
            students,
        }).catch(() => setAuthError('Unable to update the record. Check your connection.'))
    }
    // Update the draft too, so saving again does not restore the undone mark.
    const draftStudents = (attendance[recordKey] || []).filter((student) => student !== name)
    setDraft(recordKey, draftStudents)
}

// Manually-added names for a date+program (students attending a non-usual class).
// Adding marks them present immediately.
function addExtra(recordKey, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = extras[recordKey] || []
    if (current.includes(trimmed)) return
    const updated = [...current, trimmed]
    const [recDate, recProgram] = recordKey.split('/')
    setExtras((records) => ({ ...records, [recordKey]: updated }))
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {
        date: recDate,
        programId: recProgram,
        students: updated,
    }).catch(() => setAuthError('Unable to add the name. Check your connection.'))
    // Mark the extra present in the draft right away.
    const draft = attendance[recordKey] || []
    if (!draft.includes(trimmed)) setDraft(recordKey, [...draft, trimmed])
}

// Permanent roster edits. These change future classes only; saved records keep
// the names they were saved with, so history is not rewritten.
function addStudent(programId, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = roster[programId]?.students || []
    if (current.includes(trimmed)) return
    const students = [...current, trimmed]
    setRoster((records) => ({
        ...records,
        [programId]: { name: programs[programId].name, students },
    }))
    setDoc(doc(db, 'roster', programId), {
        programId,
        name: programs[programId].name,
        students,
    }).catch(() => setAuthError('Unable to add the student. Check your connection.'))
}

function removeStudent(programId, name) {
    const current = roster[programId]?.students || []
    const students = current.filter((s) => s !== name)
    setRoster((records) => ({
        ...records,
        [programId]: { name: programs[programId].name, students },
    }))
    setDoc(doc(db, 'roster', programId), {
        programId,
        name: programs[programId].name,
        students,
    }).catch(() => setAuthError('Unable to remove the student. Check your connection.'))
}

function removeExtra(recordKey, name) {
    const updated = (extras[recordKey] || []).filter((s) => s !== name)
    const [recDate, recProgram] = recordKey.split('/')
    setExtras((records) => ({ ...records, [recordKey]: updated }))
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {
        date: recDate,
        programId: recProgram,
        students: updated,
    }).catch(() => setAuthError('Unable to remove the name. Check your connection.'))
    // Also unmark from the draft.
    const draft = (attendance[recordKey] || []).filter((s) => s !== name)
    setDraft(recordKey, draft)
}

const attendancePage = (
    <Attendance
        date={date}
        setDate={setDate}
        program={program}
        setProgram={setProgram}
        attendance={attendance}
        setDraft={setDraft}
        saveAttendance={saveAttendance}
        extras={extras}
        addExtra={addExtra}
        removeExtra={removeExtra}
        roster={roster}
    />
)

return (
<BrowserRouter>
    <Navbar>
    <Container>

        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
        <img src={logo} alt="Ken Wa Kan logo" width="60" height="60" />
        <span>Ken Wa Kan Instructor Attendance App</span>
        </Navbar.Brand>

        {user && !authLoading && <Nav>
        <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>
        <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
        <Nav.Link as={Link} to="/students">Students</Nav.Link>
        <Nav.Link as="button" type="button" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign Out'}
        </Nav.Link>
        </Nav>}
    </Container>
    </Navbar>

    {authError && <p className="text-danger" role="alert">{authError}</p>}
    {authLoading ? (
        <p className="py-4" role="status">Loading…</p>
    ) : (
        <Routes>
            <Route path="/signin" element={user ? <Navigate to="/attendance" replace /> : <SignIn />} />
            <Route path="/" element={<Navigate to={user ? '/attendance' : '/signin'} replace />} />
            <Route path="/attendance" element={user ? attendancePage : <Navigate to="/signin" replace />} />
            <Route path="/reports" element={user ? <Report today={getToday()} savedAttendance={savedAttendance} undoPresent={undoPresent} /> : <Navigate to="/signin" replace />} />
            <Route path="/students" element={user ? <Students roster={roster} addStudent={addStudent} removeStudent={removeStudent} /> : <Navigate to="/signin" replace />} />
            <Route path="*" element={<Navigate to={user ? '/attendance' : '/signin'} replace />} />
        </Routes>
    )}

    <footer > Application built by Senpai Khaing @2026 for Ken Wa Kan</footer>
</BrowserRouter>
)
}

export default App
