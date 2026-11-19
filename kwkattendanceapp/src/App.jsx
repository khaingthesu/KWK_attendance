import { useState } from 'react'
import { Container, Nav, Navbar } from 'react-bootstrap'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'
import logo from './assets/logo.jpg'
import Attendance from './components/Attendance'
import Reports from './components/Reports'
import SignIn from './components/SignIn'

function App() {
const [date, setDate] = useState(() => {
const today = new Date()
const year = today.getFullYear()
const month = String(today.getMonth() + 1).padStart(2, '0')
const day = String(today.getDate()).padStart(2, '0')
return `${year}-${month}-${day}`
})
const [category, setCategory] = useState('')
const [attendance, setAttendance] = useState({})
const [draftAttendance, setDraftAttendance] = useState({})
const attendancePage = (
    <Attendance
        date={date}
        setDate={setDate}
        category={category}
        setCategory={setCategory}
        attendance={draftAttendance}
        setAttendance={setDraftAttendance}
        submitAttendance={submitAttendance}
    />
)
function submitAttendance() {
if (!date || !category) return
const recordKey = `${date}/${category}`
setAttendance((records) => ({
    ...records,
    [recordKey]: [...(draftAttendance[recordKey] || [])],
}))
}



return (
<BrowserRouter>
<Navbar>
<Container>
    <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
    <img
        src={logo}
        alt="Ken Wa Kan logo"
        width="70"
        height="70"
        padding='10px'
        style={{ objectFit: 'contain' }}
    />
    <span>Ken Wa Kan Attendance App</span>
    </Navbar.Brand>

    <Nav className="ms-auto">
    <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>
    <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
        <Nav.Link as={Link} to="/signin">Sign In</Nav.Link>
    </Nav>
</Container>
</Navbar>

<Container>
<Routes>
        <Route path="/signin" element={<SignIn />} />
    <Route path="/" element={attendancePage} />
    <Route path="/attendance" element={attendancePage} />
    <Route
        path="/reports"
        element={
        <Reports
            date={date}
            attendance={attendance}
            setAttendance={setAttendance}
            setDraftAttendance={setDraftAttendance}
        />
        }
    />
</Routes>
</Container>
</BrowserRouter>
)
}

export default App

