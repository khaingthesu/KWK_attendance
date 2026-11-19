
import { BrowserRouter, Routes, Route, Link} from 'react-router-dom'
import { Navbar, Container, Nav } from 'react-bootstrap'
import Attendance from './components/Attendance'
import Students from './components/Students'
import Reports from './components/Reports'

function App() {
return(
<BrowserRouter>
    <Navbar>
        <Container>
        <Navbar.Brand as Link to="/"> Ken Wa Kan Attendance App</Navbar.Brand>
        <Nav className="ms-auto">
            <Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>
            <Nav.Link as={Link} to="/students">Students</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
        </Nav>
    </Container>
    </Navbar>

    <Container>
    <Routes>
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/students" element={<Students />} />
        <Route path="/reports" element={<Reports />} />
    </Routes>
    </Container>
</BrowserRouter>
)
}

export default App;
