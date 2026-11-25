import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, onSnapshot, runTransaction, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Container, Nav, Navbar } from 'react-bootstrap'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import logo from './assets/Logo.jpg'
import SignIn from './auth/signin.jsx'
import Attendance from './components/attendance.jsx'
import Report from './components/report.jsx'
import Schedule from './components/schedule.jsx'
import Students from './components/students.jsx'
import { programOrder, programs } from './data/programs'
import { seedSchedule, weekdayIdFromDate, weekdayOrder } from './data/schedule'
import { auth, db } from './firebase/firebase'

function getToday() {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

function docIdFor(recordKey) {
    return recordKey.replace(/[/:\s]/g, '_')
}

function parseKey(recordKey) {
    const firstSlash = recordKey.indexOf('/')
    return {
        date: recordKey.slice(0, firstSlash),
        classId: recordKey.slice(firstSlash + 1),
    }
}

function App() {
const [user, setUser] = useState(null)
const [authLoading, setAuthLoading] = useState(true)
const [authError, setAuthError] = useState('')
const [signingOut, setSigningOut] = useState(false)
const [date, setDate] = useState(getToday)
const [selectedClassId, setSelectedClassId] = useState('')
const [attendance, setAttendance] = useState({})
const [draftMeta, setDraftMeta] = useState({})
const [savedAttendance, setSavedAttendance] = useState({})
const [extras, setExtras] = useState({})
const [roster, setRoster] = useState({})
const [rosterLoaded, setRosterLoaded] = useState(false)
const [schedule, setSchedule] = useState({})
const [scheduleLoaded, setScheduleLoaded] = useState(false)
const [notes, setNotes] = useState({})

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

useEffect(() => {
    if (!user) return

    let draftDocuments = []
    let savedKeys = null
    let stopped = false
    let autoSaving = false

    async function savePastAttendance() {
        if (stopped || autoSaving || !savedKeys) return
        autoSaving = true
        try {
            const today = getToday()
            for (const draftDocument of draftDocuments) {
                if (stopped) break
                const draft = draftDocument.data()
                const key = `${draft.date}/${draft.classId}`
                if (!draft.classId || !/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || draft.date >= today || !draft.students?.length || savedKeys.has(key)) continue
                const savedRef = doc(db, 'saved', docIdFor(key))
                await runTransaction(db, async (transaction) => {
                    const currentDraft = await transaction.get(draftDocument.ref)
                    const currentSaved = await transaction.get(savedRef)
                    if (!currentDraft.exists() || currentSaved.exists()) return
                    const data = currentDraft.data()
                    if (data.date !== draft.date || data.classId !== draft.classId || !Array.isArray(data.students) || !data.students.length) return
                    transaction.set(savedRef, {
                        date: data.date,
                        classId: data.classId,
                        classLabel: data.classLabel || data.programName || '',
                        time: data.time || '',
                        tag: data.tag || '',
                        instructor: data.instructor || '',
                        assistant: data.assistant || '',
                        students: data.students,
                    })
                })
            }
        } catch {
            if (!stopped) setAuthError('Automatic attendance saving failed. Please check your connection; the app will retry.')
        } finally {
            autoSaving = false
        }
    }

    const autoSaveInterval = window.setInterval(savePastAttendance, 60_000)
    window.addEventListener('focus', savePastAttendance)
    window.addEventListener('online', savePastAttendance)

    const unsubDrafts = onSnapshot(collection(db, 'drafts'), (snapshot) => {
        draftDocuments = snapshot.docs
        const next = {}
        const nextMeta = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return
            const key = `${data.date}/${data.classId}`
            next[key] = data.students || []
            nextMeta[key] = {
                instructor: data.instructor || '',
                assistant: data.assistant || '',
            }
        })
        setAttendance(next)
        setDraftMeta(nextMeta)
        void savePastAttendance()
    })

    const unsubSaved = onSnapshot(collection(db, 'saved'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return
            next[`${data.date}/${data.classId}`] = {
                date: data.date,
                classId: data.classId,
                classLabel: data.classLabel || data.programName || '',
                time: data.time || '',
                tag: data.tag || '',
                instructor: data.instructor || '',
                assistant: data.assistant || '',
                students: data.students || [],
            }
        })
        setSavedAttendance(next)
        savedKeys = new Set(Object.keys(next))
        void savePastAttendance()
    })

    const unsubExtras = onSnapshot(collection(db, 'extras'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            if (!data.classId) return
            next[`${data.date}/${data.classId}`] = data.students || []
        })
        setExtras(next)
    })

    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            next[d.id] = d.data().classes || []
        })
        setSchedule(next)
        setScheduleLoaded(true)
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

    const unsubNotes = onSnapshot(collection(db, 'notes'), (snapshot) => {
        const next = {}
        snapshot.forEach((d) => {
            const data = d.data()
            next[data.date] = data.text || ''
        })
        setNotes(next)
    })

    return () => {
        stopped = true
        window.clearInterval(autoSaveInterval)
        window.removeEventListener('focus', savePastAttendance)
        window.removeEventListener('online', savePastAttendance)
        unsubDrafts()
        unsubSaved()
        unsubExtras()
        unsubSchedule()
        unsubRoster()
        unsubNotes()
    }
}, [user])

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

useEffect(() => {
    if (!user || !scheduleLoaded) return
    weekdayOrder.forEach((weekdayId) => {
        if (!schedule[weekdayId]) {
            setDoc(doc(db, 'schedule', weekdayId), {
                weekday: weekdayId,
                classes: seedSchedule[weekdayId],
            }).catch(() => {})
        }
    })
}, [user, scheduleLoaded, schedule])

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

function setDraft(recordKey, students, meta) {
    setAttendance((records) => ({ ...records, [recordKey]: students }))
    const { date: recDate, classId: recClassId } = parseKey(recordKey)
    const existingSaved = savedAttendance[recordKey]
    const existingDraftMeta = draftMeta[recordKey]
    const classLabel = meta?.label ?? existingSaved?.classLabel ?? ''
    const time = meta?.time ?? existingSaved?.time ?? ''
    const tag = meta?.tag ?? existingSaved?.tag ?? ''
    const instructor = meta?.instructor ?? existingDraftMeta?.instructor ?? existingSaved?.instructor ?? ''
    const assistant = meta?.assistant ?? existingDraftMeta?.assistant ?? existingSaved?.assistant ?? ''
    setDraftMeta((records) => ({ ...records, [recordKey]: { instructor, assistant } }))
    setDoc(doc(db, 'drafts', docIdFor(recordKey)), {
        date: recDate,
        classId: recClassId,
        classLabel,
        time,
        tag,
        instructor,
        assistant,
        students,
    }).catch(() => setAuthError('Unable to save the mark. Check your connection.'))

    if (existingSaved) {
        if (students.length === 0) {
            deleteDoc(doc(db, 'saved', docIdFor(recordKey)))
                .catch(() => setAuthError('Unable to update the report. Check your connection.'))
        } else {
            setDoc(doc(db, 'saved', docIdFor(recordKey)), {
                date: recDate,
                classId: recClassId,
                classLabel,
                time,
                tag,
                instructor,
                assistant,
                students,
            }).catch(() => setAuthError('Unable to update the report. Check your connection.'))
        }
    }
}

async function saveAttendance() {
    const dayClasses = schedule[weekdayIdFromDate(date)] || []
    const markedClasses = dayClasses.filter((cls) => attendance[`${date}/${cls.id}`]?.length)
    if (markedClasses.length === 0) return false
    const batch = writeBatch(db)
    for (const cls of markedClasses) {
        const recordKey = `${date}/${cls.id}`
        const existingSaved = savedAttendance[recordKey]
        const meta = draftMeta[recordKey]
        batch.set(doc(db, 'saved', docIdFor(recordKey)), {
            date,
            classId: cls.id,
            classLabel: cls.label || '',
            time: cls.time || '',
            tag: cls.tag || '',
            instructor: meta?.instructor || existingSaved?.instructor || '',
            assistant: meta?.assistant || existingSaved?.assistant || '',
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

function undoPresent(recordKey, name) {
    const savedRecord = savedAttendance[recordKey]
    if (savedRecord) {
        const students = savedRecord.students.filter((student) => student !== name)
        const { date: recDate, classId: recClassId } = parseKey(recordKey)
        setDoc(doc(db, 'saved', docIdFor(recordKey)), {
            date: savedRecord.date || recDate,
            classId: recClassId,
            classLabel: savedRecord.classLabel || '',
            time: savedRecord.time || '',
            tag: savedRecord.tag || '',
            instructor: savedRecord.instructor || '',
            assistant: savedRecord.assistant || '',
            students,
        }).catch(() => setAuthError('Unable to update the record. Check your connection.'))
    }
    const draftStudents = (attendance[recordKey] || []).filter((student) => student !== name)
    setDraft(recordKey, draftStudents, savedRecord
        ? { label: savedRecord.classLabel, time: savedRecord.time, tag: savedRecord.tag, instructor: savedRecord.instructor, assistant: savedRecord.assistant }
        : undefined)
}

function addExtra(recordKey, name, meta) {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = extras[recordKey] || []
    if (current.includes(trimmed)) return
    const updated = [...current, trimmed]
    const { date: recDate, classId: recClassId } = parseKey(recordKey)
    setExtras((records) => ({ ...records, [recordKey]: updated }))
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {
        date: recDate,
        classId: recClassId,
        classLabel: meta?.label || '',
        time: meta?.time || '',
        tag: meta?.tag || '',
        students: updated,
    }).catch(() => setAuthError('Unable to add the name. Check your connection.'))
    const draft = attendance[recordKey] || []
    if (!draft.includes(trimmed)) setDraft(recordKey, [...draft, trimmed], meta)
}

function saveNote(noteDate, text) {
    setNotes((records) => ({ ...records, [noteDate]: text }))
    setDoc(doc(db, 'notes', noteDate), {
        date: noteDate,
        text,
    }).catch(() => setAuthError('Unable to save the note. Check your connection.'))
}

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

function addScheduleClass(weekdayId, cls) {
    const classes = [...(schedule[weekdayId] || []), cls]
    setSchedule((records) => ({ ...records, [weekdayId]: classes }))
    setDoc(doc(db, 'schedule', weekdayId), {
        weekday: weekdayId,
        classes,
    }).catch(() => setAuthError('Unable to add the class. Check your connection.'))
}

function removeScheduleClass(weekdayId, classId) {
    const classes = (schedule[weekdayId] || []).filter((cls) => cls.id !== classId)
    setSchedule((records) => ({ ...records, [weekdayId]: classes }))
    setDoc(doc(db, 'schedule', weekdayId), {
        weekday: weekdayId,
        classes,
    }).catch(() => setAuthError('Unable to remove the class. Check your connection.'))
}

function removeExtra(recordKey, name, meta) {
    const updated = (extras[recordKey] || []).filter((s) => s !== name)
    const { date: recDate, classId: recClassId } = parseKey(recordKey)
    setExtras((records) => ({ ...records, [recordKey]: updated }))
    setDoc(doc(db, 'extras', docIdFor(recordKey)), {
        date: recDate,
        classId: recClassId,
        classLabel: meta?.label || '',
        time: meta?.time || '',
        tag: meta?.tag || '',
        students: updated,
    }).catch(() => setAuthError('Unable to remove the name. Check your connection.'))
    const draft = (attendance[recordKey] || []).filter((s) => s !== name)
    setDraft(recordKey, draft, meta)
}

const attendancePage = (
    <Attendance
        date={date}
        setDate={setDate}
        attendance={attendance}
        savedAttendance={savedAttendance}
        draftMeta={draftMeta}
        setDraft={setDraft}
        saveAttendance={saveAttendance}
        extras={extras}
        addExtra={addExtra}
        removeExtra={removeExtra}
        roster={roster}
        note={notes[date] || ''}
        saveNote={saveNote}
        schedule={schedule}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
    />
)

return (
<BrowserRouter>
    <Navbar expand="lg" collapseOnSelect className="border-bottom mb-3">
    <Container>

        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
        <img src={logo} alt="Ken Wa Kan logo" width="48" height="48" />
        <span className="navbar-title">Ken Wa Kan Instructor Attendance App</span>
        </Navbar.Brand>

        {user && !authLoading && <>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
            <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
            <Nav.Link as={Link} to="/students">Students</Nav.Link>
            <Nav.Link as={Link} to="/schedule">Schedule</Nav.Link>
            <Nav.Link as="button" type="button" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? 'Signing out…' : 'Sign Out'}
            </Nav.Link>
            </Nav>
        </Navbar.Collapse>
        </>}
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
            <Route path="/reports" element={user ? <Report today={getToday()} savedAttendance={savedAttendance} undoPresent={undoPresent} notes={notes} /> : <Navigate to="/signin" replace />} />
            <Route path="/students" element={user ? <Students roster={roster} addStudent={addStudent} removeStudent={removeStudent} /> : <Navigate to="/signin" replace />} />
            <Route path="/schedule" element={user ? <Schedule schedule={schedule} roster={roster} addScheduleClass={addScheduleClass} removeScheduleClass={removeScheduleClass} /> : <Navigate to="/signin" replace />} />
            <Route path="*" element={<Navigate to={user ? '/attendance' : '/signin'} replace />} />
        </Routes>
    )}


    <footer > copyright by Khaing The Su@2026 Karate-Do Ken Wa Kan</footer>
</BrowserRouter>
)
}

export default App
