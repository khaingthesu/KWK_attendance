# Ken Wa Kan Attendance App

A simple attendance app for Ken Wa Kan instructors, designed for people who prefer clear labels, large buttons, and few steps. Built by Senpai Khaing.

This README documents the project through the date picker, program selection, and Present/Undo stage. It separates working features from planned features and explains the code so each change can be understood before adding more.

## Current progress

| Feature | Current status |
| --- | --- |
| Logo, dojo name, and navbar | Implemented |
| Attendance and Reports routes | Implemented |
| Date picker | Defaults to the device's current local date |
| Program selection | Tiny Tiger only |
| Manually maintained roster | 20 Tiny Tiger students |
| Present and Undo buttons | Implemented using React state |
| Present count | Updates when a student is marked or undone |
| Firebase configuration | Module prepared with Auth and Firestore exports |
| Sign-in and protected pages | Not implemented in the current app |
| Sign Out | Visible but disabled |
| Submit and permanent attendance storage | Not implemented |
| Reports content | Placeholder component returning `null` |
| PDF export | Not implemented |
| Vercel deployment | Planned; not verified |

**Attendance is currently temporary.** Changing the selected date keeps each date's marks separate while the Attendance component stays mounted. Refreshing the browser or navigating to Reports clears the marks. Initializing Firebase does not automatically save React state.

## Build process so far

1. Started with React and Vite, using Bootstrap and React Bootstrap for layout and controls.
2. Added a navbar and React Router routes for Attendance and Reports.
3. Prepared Firebase configuration using variables in `.env.local`.
4. Simplified the app by removing the earlier page implementations and rebuilding small components step by step.
5. Considered importing a Google Sheets roster, then chose manual roster editing because the shared sheet has many editors. The prepared JSON import was deleted; no roster was uploaded to Firebase.
6. Added the 20 Tiny Tiger names directly to the Attendance component and displayed them as a list.
7. Added today's date, a program dropdown, and Present/Undo buttons with a live count.

The current approach is to understand and review one feature at a time before adding the next.

## Tools used

Versions below are the dependency ranges declared in `package.json`, not a claim about the latest releases.

| Tool | Declared version | Purpose |
| --- | --- | --- |
| React | `^19.3.1` | Components and UI state |
| Vite | `^8.3.6` | Development server and production build |
| React Router DOM | `^7.18.6` | Navigation and page routes |
| Bootstrap | `^5.3.9` | Styles and layout classes |
| React Bootstrap | `^2.10.10` | Navbar and other Bootstrap components |
| Firebase | `^13.4.0` | Planned authentication and database access |

The project currently uses **Vite 8 and React Router 7**.

## Project structure

```text
src/
├── main.jsx                  # Loads Bootstrap styles and renders App
├── App.jsx                   # Navbar, router, routes, and footer
├── App.css                   # App-specific styling
├── index.css                 # Global styling
├── assets/                   # Logo and other images
├── components/
│   ├── attendance.jsx        # Roster, date, program, Present/Undo state
│   └── report.jsx            # Empty Report component for now
└── firebase/
    └── firebase.js           # Exports app, auth, and db
.env.local                    # Local Firebase settings; ignored by Git
package.json                  # Dependencies and npm commands
```

Import paths must match the actual filename capitalization. `App.jsx` currently imports `./components/attendance.jsx` and `./components/report.jsx`.

## How routing works

`BrowserRouter` wraps the navbar and routes. `Link` changes the URL within the app. `Routes` selects the matching `Route`, and the route's `element` is the component to render.

```jsx
<Nav.Link as={Link} to="/attendance">Attendance</Nav.Link>

<Route path="/attendance" element={<Attendance />} />
```

`as={Link}` tells React Bootstrap to render its navigation item using React Router's `Link`.

| URL | Component |
| --- | --- |
| `/` | `Attendance` |
| `/attendance` | `Attendance` |
| `/reports` | `Report` |

Sign Out is a disabled button, not a route. No authentication check currently prevents access to these pages.

## How Attendance works

### 1. The roster is an array

`tinyTigerStudents` contains the manually entered names. An array is a list of values. Edit this array to add or correct a name, keeping each name quoted and entries separated by commas.

```jsx
const tinyTigerStudents = [
  'Aiden Z',
  'Alice U',
  // More names follow in the actual component.
]
```

The list is part of the app's source code, not a Firestore collection. Editing it changes the roster when the updated app is run or deployed. There is no student-management form yet.

The current implementation identifies students by their displayed names. Duplicate names in the same program would not work correctly, and changing a name changes that identity. Before permanent records or duplicate-name support are added, students need stable IDs.

### 2. React state holds three values

```jsx
const [date, setDate] = useState(() => {
  // Build today's local date as YYYY-MM-DD.
})
const [program, setProgram] = useState('')
const [attendance, setAttendance] = useState({})
```

This is an abbreviated explanation; the complete date initializer is in the component.

- `date` is the selected date. `setDate` changes it.
- `program` is the selected program ID. An empty string means nothing is selected.
- `attendance` is an object holding the selected names for each date/program combination.

The date initializer uses local year, month, and day. `padStart(2, '0')` changes values such as `3` into `03`, producing the format required by the date input. The default is calculated when the component mounts; it does not automatically advance at midnight.

### 3. Inputs update state

```jsx
value={date}
onChange={(event) => setDate(event.target.value)}
```

`value` displays the current state. `onChange` reads the user's new selection and updates that state. The program dropdown follows the same pattern with `program` and `setProgram`.

### 4. Each date and program has its own key

```jsx
const recordKey = `${date}/${program}`
const presentStudents = attendance[recordKey] || []
```

For example, the key might be `2026-11-24/tiny-tiger`. Conceptually, the state can contain:

```js
{
  '2026-11-24/tiny-tiger': ['Aiden Z', 'Alice U'],
  '2026-11-25/tiny-tiger': ['Daniel B'],
}
```

`|| []` supplies an empty list when nothing has been marked for that selection. This key is an in-memory object key; it is not a Firestore document path or a saved record.

### 5. The list appears conditionally

```jsx
date && program === 'tiny-tiger'
```

The student list appears only when there is a date and Tiny Tiger is selected. Otherwise, the page asks the instructor to select a date and program.

### 6. Present and Undo share one function

```jsx
function togglePresent(name) {
  setAttendance((records) => {
    const current = records[recordKey] || []
    const updated = current.includes(name)
      ? current.filter((student) => student !== name)
      : [...current, name]

    return { ...records, [recordKey]: updated }
  })
}
```

Read this from top to bottom:

1. React supplies the latest attendance object as `records`.
2. Get the present names for the selected date and program.
3. `includes(name)` checks whether the student is already present.
4. If present, `filter` creates a list without that name: Undo.
5. Otherwise, `[...current, name]` creates a list with the name added: Present.
6. `{ ...records, [recordKey]: updated }` preserves other dates and replaces only this selection's list.

The spread syntax (`...`) copies existing values. We return new arrays and a new object instead of directly modifying React's existing state.

### 7. State controls the display

`map()` renders one list item per student. `isPresent` determines whether the row shows `Present ✓` and whether the button says Present or Undo. The count comes from `presentStudents.length`, so it does not need separate state.

Unmarked students are not in the present list. There is currently no separate saved Absent status and no submitted record.

Buttons have a minimum height of 44 pixels, student-specific accessible labels, and a text status so the result is not communicated only through color. The count uses `aria-live="polite"` to announce changes to assistive technology.

## Firebase configuration

Create `.env.local` in the project root using your Firebase web app settings:

```dotenv
VITE_FIREBASE_API_KEY=your_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

`firebase.js` reads each value through `import.meta.env`, for example:

```js
apiKey: import.meta.env.VITE_FIREBASE_API_KEY
```

The module exports `app`, `auth`, and `db`. The current page components do not use them to sign in or save attendance. The module is ready for later integration.

`.gitignore` already excludes `*.local`. Restart the development server after changing environment variables. These `VITE_` values are browser configuration, not secret storage; do not put private service-account credentials here.

## Run the project

From the project folder:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Other commands already defined in `package.json`:

| Command | Purpose |
| --- | --- |
| `npm run lint` | Check code with ESLint |
| `npm run build` | Create the production build in `dist` |
| `npm run preview` | Serve the built output locally after building |

## Manual checks for this stage

1. Open Attendance. The date should show today's local date, with no program selected.
2. Select Tiny Tiger. Confirm the 20 names appear and the count starts at zero.
3. Click Present for one student. Confirm the row shows `Present ✓`, the button says Undo, and the count increases.
4. Click Undo. Confirm the mark disappears and the count decreases.
5. Mark a student, switch to another date, and confirm that date starts with its own empty selection.
6. Switch back to the first date. Confirm its marks remain while the page stays mounted.
7. Clear the date. Confirm the roster hides until a date is selected again.
8. Navigate to Reports and back, or refresh. Marks currently reset; this is a known limitation at this stage.

ESLint passed for the Attendance component after the Present/Undo implementation. This does not establish that Firebase saving, authentication, deployment, or all browser interactions have been tested.

## Planned next steps

These are goals, not completed features:

1. Add the remaining program rosters: Ninja Skill Karate, Junior Basic, Junior BBC, Basic Program, and BBC program.
2. Decide on stable student IDs before implementing persistent attendance.
3. Add instructor sign-in, protected pages, and working sign-out.
4. Define Firestore access rules for authorized instructors.
5. Add Submit Attendance, show saving/error/success feedback, and reload saved records after refresh.
6. Preserve the roster and statuses with each submitted class record so future roster edits do not rewrite history.
7. Build Reports with a date selector and collapsible program tables.
8. Add PDF export for all programs on the selected date.
9. Prepare Vercel configuration and verify direct page navigation and refreshes after deployment.

The intended completed flow is: **sign in → select date → select program → mark students → submit → view reports or save PDF**.
