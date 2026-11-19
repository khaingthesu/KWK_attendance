# Navbar and Router Structure

`BrowserRouter` wraps everything. The navbar comes first, followed by the page routes.

```text
BrowserRouter
├── Navbar
│   └── Container
│       ├── Navbar.Brand
│       └── Nav
│           └── Nav.Link
└── Container
    └── Routes
        └── Route
```

```jsx
<BrowserRouter>
  <Navbar>
    <Container>
      <Navbar.Brand as={Link} to="/">
        App Name
      </Navbar.Brand>

      <Nav>
        <Nav.Link as={Link} to="/">Home</Nav.Link>
        <Nav.Link as={Link} to="/about">About</Nav.Link>
      </Nav>
    </Container>
  </Navbar>

  <Container>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  </Container>
</BrowserRouter>
```

`Home` and `About` are example page components. Each link's `to` matches a route's `path`.
