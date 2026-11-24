// Weekly class schedule data model. The schedule lives in Firestore (collection
// "schedule", one doc per weekday id below, shape { weekday, classes: [...] }).
// This file provides the weekday ordering/labels, the tag options, the seed
// schedule used on first run, and the helpers that turn a date into a weekday
// and a class into its combined roster.

export const weekdayOrder = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
]

export const weekdayLabels = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
}

// Tag options for the Schedule add form and badges. '' means no tag.
export const TAG_OPTIONS = ['', 'ZOOM', 'In Person', 'SPARRING']

// getDay() returns 0=Sunday..6=Saturday. Anchor at noon to avoid timezone
// rollover (same pattern report.jsx uses for formatting).
const GETDAY_TO_WEEKDAY = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export function weekdayIdFromDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(`${dateStr}T12:00:00`)
    if (Number.isNaN(d.getTime())) return ''
    return GETDAY_TO_WEEKDAY[d.getDay()]
}

// A class's roster is the de-duplicated (by display name) union of the live
// Firestore rosters of its referenced programs, followed by any fixed students
// (private-lesson style classes). First-seen order is preserved.
export function classRoster(cls, roster) {
    if (!cls) return []
    const seen = new Set()
    const result = []
    const add = (name) => {
        if (!name || seen.has(name)) return
        seen.add(name)
        result.push(name)
    }
    for (const programId of cls.programs || []) {
        const students = roster?.[programId]?.students || []
        for (const name of students) add(name)
    }
    for (const name of cls.fixedStudents || []) add(name)
    return result
}

// Program id shorthands used only to keep the seed table readable.
const ATB = 'adult-teen-basic'
const ATBBC = 'adult-teen-bbc'

function cls(id, label, time, tag, programs, fixedStudents = []) {
    return { id, label, time, tag, programs, fixedStudents }
}

// One-time seed of the weekly timetable. On first run App.jsx writes a weekday
// doc only if it does not already exist, so later edits are never overwritten.
// Each class id is `<3-letter-weekday>-<n>` (1-based) for idempotent re-seeding.
export const seedSchedule = {
    monday: [
        cls('mon-1', 'Adult/Teen All Level', '12:30 PM', 'ZOOM', [ATB, ATBBC]),
        cls('mon-2', 'Ninja Skills Karate', '3:30 PM', '', ['ninja-skills']),
        cls('mon-3', 'Junior Basic', '4:00 PM', '', ['junior-basic']),
        cls('mon-4', 'Junior BBC Ages 6-9', '4:45 PM', '', ['junior-bbc-6-9']),
        cls('mon-5', 'Junior BBC 10+', '5:30 PM', '', ['junior-bbc-10-plus']),
        cls('mon-6', 'Adult/Teen Basic', '7:30 PM', 'ZOOM', [ATB, ATBBC]),
    ],
    tuesday: [
        cls('tue-1', 'Adult/Teen All Level', '8:30 AM', 'ZOOM', [ATB, ATBBC]),
        cls('tue-2', 'Tiny Tiger', '3:30 PM', '', ['tiny-tiger']),
        cls('tue-3', 'Arlin Private Lesson', '3:30 PM', '', [], ['Arlin T']),
        cls('tue-4', 'Junior Basic', '4:00 PM', '', ['junior-basic']),
        cls('tue-5', 'Junior BBC Ages 6-9', '4:45 PM', '', ['junior-bbc-6-9']),
        cls('tue-6', 'Junior BBC 10+', '5:30 PM', '', ['junior-bbc-10-plus']),
        cls('tue-7', 'Adult/Teen Basic', '6:30 PM', 'ZOOM', [ATB, ATBBC]),
        cls('tue-8', 'Adult/Teen BBC Weapon', '7:15 PM', 'ZOOM', [ATBBC]),
    ],
    wednesday: [
        cls('wed-1', 'Adult/Teen All Level', '8:30 AM', 'ZOOM', [ATB, ATBBC]),
        cls('wed-2', 'Ninja Skills Karate', '3:30 PM', '', ['ninja-skills']),
        cls('wed-3', 'Junior Basic', '4:00 PM', '', ['junior-basic']),
        cls('wed-4', 'Junior BBC Ages 6-9', '4:45 PM', '', ['junior-bbc-6-9']),
        cls('wed-5', 'Junior BBC 10+', '5:30 PM', '', ['junior-bbc-10-plus']),
        cls('wed-6', 'Adult/Teen BBC', '6:30 PM', 'SPARRING', [ATBBC]),
    ],
    thursday: [
        cls('thu-1', 'Adult/Teen All Level', '8:30 AM', 'ZOOM', [ATB, ATBBC]),
        cls('thu-2', 'Tiny Tiger', '3:30 PM', '', ['tiny-tiger']),
        cls('thu-3', 'Junior Basic', '4:00 PM', '', ['junior-basic']),
        cls('thu-4', 'Junior BBC Ages 6-9', '4:45 PM', '', ['junior-bbc-6-9']),
        cls('thu-5', 'Junior BBC 10+', '5:30 PM', '', ['junior-bbc-10-plus']),
        cls('thu-6', 'Adult/Teen Basic', '6:30 PM', 'ZOOM', [ATB, ATBBC]),
        cls('thu-7', 'Adult/Teen BBC Karate', '7:15 PM', 'ZOOM', [ATBBC]),
    ],
    friday: [
        cls('fri-1', 'Adult/Teen All Level', '8:30 AM', '', [ATB, ATBBC]),
        cls('fri-2', 'Tiny Tiger', '3:00 PM', '', ['tiny-tiger']),
        cls('fri-3', 'Ninja Skills Karate', '3:30 PM', '', ['ninja-skills']),
        cls('fri-4', 'Junior Basic', '4:00 PM', '', ['junior-basic']),
        cls('fri-5', 'Junior BBC Ages 6-9', '4:45 PM', '', ['junior-bbc-6-9']),
        cls('fri-6', 'Junior BBC 10+', '5:30 PM', '', ['junior-bbc-10-plus']),
        cls('fri-7', 'Adult/Teen All Level', '12:30 PM', 'ZOOM', [ATB, ATBBC]),
        cls('fri-8', 'Adult/Teen BBC Green & UP', '6:30 PM', 'SPARRING', [ATBBC]),
    ],
    saturday: [
        cls('sat-1', 'Ninja Skills Karate', '10:00 AM', '', ['ninja-skills']),
        cls('sat-2', 'Junior Basic', '10:30 AM', '', ['junior-basic']),
        cls('sat-3', 'Junior BBC All Ages', '11:15 AM', '', ['junior-bbc-6-9', 'junior-bbc-10-plus']),
        cls('sat-4', 'Adult/Teen Basic', '12:30 PM', 'In Person', [ATB, ATBBC]),
        cls('sat-5', 'Adult/Teen BBC', '1:15 PM', 'In Person', [ATBBC]),
        cls('sat-6', 'Adult/Teen BBC Black/Brown Belt', '2:15 PM', 'ZOOM', [ATBBC]),
    ],
    sunday: [
        cls('sun-1', 'Adult/Teen All Level', '11:00 AM', 'ZOOM', [ATB, ATBBC]),
        cls('sun-2', 'OPEN MAT', '12:00 PM', '', [ATB, ATBBC]),
        cls('sun-3', 'TEEN All level', '1:00 PM', 'ZOOM', [ATB, ATBBC, 'junior-bbc-6-9', 'junior-bbc-10-plus']),
    ],
}
