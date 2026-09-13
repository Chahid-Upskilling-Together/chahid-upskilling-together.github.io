# ABC Tutoring — website prototype

A working prototype of a booking website for ABC Tutoring, with PostHog
analytics wired in. Built for the Upskilling Together pre-assessment.

**Live site:** https://chahid-upskilling-together.github.io/

---

## What Dana asked for, and where it lives

| What Dana said | Where it is |
|---|---|
| "A home page, tutor listings, and a booking page" | `index.html`, `tutors.html`, `book.html` |
| Tutor name, photo, subjects, grade levels, hourly rate, availability | Tutor cards on every page (`assets/data.js`) |
| Collect parent name + email, student first name, grade, subject | Booking form, `book.html` |
| "That time should no longer show as available" | Booked slots are removed everywhere — see below |
| "Clean and friendly, not dark or corporate" | Warm off-white, soft teal, rounded cards |
| "Parents are mostly on their phones" | Mobile-first CSS; 48px minimum tap targets |
| "I don't want online payment, I invoice families myself" | No payment step anywhere |
| "Parents should still be able to text me if they prefer" | "Text us" on every page — **and tracked** |
| "Parents do ask about their experience" | Experience line on each tutor card |
| "I'd rather keep the site simple" | Three pages, no accounts, no reviews, no FAQ |

### The double-booking fix

Dana's actual problem was not the lack of a website — it was that booking
happens over text, so two parents can be offered the same slot.

When a parent confirms a booking, that time slot is written to the browser's
`localStorage` and filtered out of the tutor's availability everywhere on the
site. It cannot be selected again. On a real deployment this same logic moves
to a shared database so it holds across all visitors, not just one device.

---

## The analytics

Every event exists to answer a question Dana asked out loud.

| Her question | Event |
|---|---|
| "Which tutors do people view?" | `tutor_viewed` |
| "Do they book, or do they leave?" | `booking_started` → `slot_selected` → `booking_completed` |
| "Where do people leave before booking?" | `booking_abandoned` (with `furthest_step`) |
| "Where did they come from?" | `traffic_source` on every event |
| "Which subjects are they looking for?" | `subject_filter_applied`, `subject_searched` |
| "...especially ones we don't offer?" | `unmet_subject_searched` |
| "Will parents still want to text me?" | `text_instead_clicked` |

### Tagged links for Dana's three channels

Dana wants Facebook, word of mouth, and flyers counted separately. Plain links
can't do that — these can. She uses one link per channel:

| Channel | Link to share |
|---|---|
| Facebook group | `https://chahid-upskilling-together.github.io/?utm_source=facebook` |
| Library / school flyer | `https://chahid-upskilling-together.github.io/?utm_source=flyer` |
| Word of mouth | `https://chahid-upskilling-together.github.io/?utm_source=word-of-mouth` |

For the flyer, turn that link into a QR code so parents can scan it from the
page. Anything scanned from the flyer then shows up as "Library / school
flyer" in the dashboard.

---

## Simulating traffic

The site is new, so the dashboard would otherwise be empty. This script sends
realistic synthetic visitors — same events, same property names as the real
site — so the reporting can be demonstrated in practice.

```bash
node scripts/simulate-traffic.mjs                 # 400 visitors over 60 days
node scripts/simulate-traffic.mjs --dry-run       # preview, sends nothing
node scripts/simulate-traffic.mjs --visitors 150 --days 30
```

No dependencies and no key to paste — it reads the project key from
`assets/config.js`. The traffic it generates is deliberately uneven: more
visitors in recent weeks (so month-over-month shows growth), roughly three
quarters on mobile, and one tutor who gets viewed often but booked rarely.

---

## Building Dana's dashboard in PostHog

In PostHog: **Dashboards → New dashboard**, then add these tiles.

1. **Bookings this month vs last** — Trends, `booking_completed`, monthly, compare to previous period
2. **Booking funnel** — Funnel: `$pageview` → `tutor_list_viewed` → `tutor_viewed` → `booking_started` → `booking_completed`
3. **Where people give up** — Trends, `booking_abandoned`, break down by `furthest_step`
4. **Where visitors come from** — Trends, `$pageview`, break down by `traffic_source`
5. **Subjects parents want** — Trends, `subject_filter_applied`, break down by `subject`
6. **Subjects we don't offer yet** — Trends, `unmet_subject_searched`, break down by `query`
7. **Tutor interest** — Trends, `tutor_viewed`, break down by `tutor_name`
8. **Booked online vs texted** — Trends, `booking_completed` and `text_instead_clicked` together

Then **Share → enable public access** to get a link Dana can open without an account.

---

## The customer presentation

`presentation.pdf` — five slides written for Dana rather than for an engineer.
`presentation/deck.html` is the source it was rendered from; open it in a
browser to read it as a web page, or re-render with:

```bash
node presentation/build-deck.mjs presentation.pdf
```

---

## Files

```
presentation.pdf        The five-slide customer presentation
presentation/           Source for the slides
index.html              Home
tutors.html             Tutor listings, subject filter and search
book.html               Booking form, confirmation, and existing bookings
assets/config.js        PostHog key, phone number, booking window
assets/data.js          The six tutors and their weekly availability
assets/analytics.js     PostHog setup and every tracked event
assets/app.js           Site behaviour and booking storage
assets/styles.css       Styling, mobile first
scripts/simulate-traffic.mjs   Synthetic traffic generator
```

To edit the tutor roster, change `assets/data.js` — nothing else needs to be
touched. Each tutor's `photo` field is blank, which draws a coloured circle
with their initials; add a real photo URL and it is used instead.

---

## Assumptions made

Dana hadn't decided some booking policies yet, so the prototype uses these and
they're easy to change:

- **60-minute sessions** — one slot length keeps the calendar simple
- **One-off bookings** — recurring weekly slots would be a good next step
- **Two weeks of availability** shown at a time
- **Instant confirmation, no approval step** — an approval step would recreate
  the back-and-forth Dana wants to get rid of
- **Cancellations and changes go through Dana by text**, as she does today

Two things a real launch would need beyond this prototype: a shared database
so availability holds across all visitors rather than one browser, and a small
email/SMS service to send the confirmation for real.
