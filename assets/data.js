/* ABC Tutoring — tutor roster and availability
 *
 * To add or edit a tutor, change this list. Nothing else needs to be touched.
 * `photo` is left blank so the site draws a coloured circle with the tutor's
 * initials; drop in a real photo URL and it will be used instead.
 */

window.ABC_SUBJECTS = [
  'Elementary Math',
  'Pre-Algebra',
  'Algebra I',
  'Algebra II',
  'Science',
  'Elementary Reading'
];

window.ABC_TUTORS = [
  {
    id: 'maria-r',
    name: 'Maria Reyes',
    photo: '',
    tint: 'tint-teal',
    subjects: ['Elementary Math', 'Pre-Algebra'],
    grades: 'Grades K–6',
    rate: 45,
    formats: ['In person', 'Online'],
    experience: 'Credentialed elementary teacher, 8 years in the classroom',
    blurb: 'Patient with students who have decided they “hate math.” Lots of manipulatives and drawing.',
    schedule: { days: [1, 2, 3, 4], times: ['3:30 PM', '4:30 PM', '5:30 PM'] }
  },
  {
    id: 'james-c',
    name: 'James Carter',
    photo: '',
    tint: 'tint-indigo',
    subjects: ['Algebra I', 'Algebra II'],
    grades: 'Grades 7–12',
    rate: 55,
    formats: ['Online'],
    experience: 'High school math teacher, 12 years; department lead',
    blurb: 'Specialises in students trying to pull a C up to an A before finals.',
    schedule: { days: [1, 3, 4], times: ['5:30 PM', '6:30 PM'] }
  },
  {
    id: 'priya-a',
    name: 'Priya Anand',
    photo: '',
    tint: 'tint-plum',
    subjects: ['Science', 'Algebra I'],
    grades: 'Grades 6–12',
    rate: 50,
    formats: ['In person', 'Online'],
    experience: 'B.S. Biology, 4 years tutoring middle and high school science',
    blurb: 'Great with lab reports, biology vocabulary, and chemistry that has stopped making sense.',
    schedule: { days: [2, 3, 5], times: ['4:30 PM', '5:30 PM'] }
  },
  {
    id: 'sofia-n',
    name: 'Sofia Nguyen',
    photo: '',
    tint: 'tint-amber',
    subjects: ['Elementary Reading'],
    grades: 'Grades K–5',
    rate: 40,
    formats: ['In person', 'Online'],
    experience: 'Reading specialist, 6 years; trained in structured literacy',
    blurb: 'Works with early readers and kids who read fluently but miss the meaning.',
    schedule: { days: [1, 2, 4, 5], times: ['3:30 PM', '4:30 PM'] }
  },
  {
    id: 'marcus-b',
    name: 'Marcus Bell',
    photo: '',
    tint: 'tint-forest',
    subjects: ['Elementary Math', 'Science'],
    grades: 'Grades 3–8',
    rate: 42,
    formats: ['In person', 'Online'],
    experience: 'Math education senior at the state university, 3 years tutoring',
    blurb: 'Close enough in age that students relax. Strong with fractions and word problems.',
    schedule: { days: [2, 4, 6], times: ['10:00 AM', '4:30 PM', '5:30 PM'] }
  },
  {
    id: 'elena-r',
    name: 'Elena Rossi',
    photo: '',
    tint: 'tint-rose',
    subjects: ['Pre-Algebra', 'Algebra I'],
    grades: 'Grades 6–9',
    rate: 48,
    formats: ['In person', 'Online'],
    experience: 'Credentialed teacher, 10 years; middle school math',
    blurb: 'Focuses on the jump from arithmetic to algebra, where a lot of students stall.',
    schedule: { days: [1, 3, 5], times: ['4:30 PM', '5:30 PM', '6:30 PM'] }
  }
];

/* ---- Availability -------------------------------------------------------
 * Each tutor's weekly pattern is expanded into real dates for the next two
 * weeks, so the calendar always looks current without anyone maintaining it.
 */
window.ABC_buildSlots = function (tutor) {
  var days = (window.ABC_CONFIG && window.ABC_CONFIG.bookingWindowDays) || 14;
  var slots = [];
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  for (var d = 1; d <= days; d++) {
    var date = new Date(today);
    date.setDate(today.getDate() + d);
    if (tutor.schedule.days.indexOf(date.getDay()) === -1) continue;

    for (var t = 0; t < tutor.schedule.times.length; t++) {
      var iso = date.toISOString().slice(0, 10);
      slots.push({
        id: tutor.id + '|' + iso + '|' + tutor.schedule.times[t],
        date: iso,
        time: tutor.schedule.times[t],
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
  }
  return slots;
};
