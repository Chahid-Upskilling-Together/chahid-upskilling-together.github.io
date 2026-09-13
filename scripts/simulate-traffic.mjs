#!/usr/bin/env node
/**
 * ABC Tutoring — traffic simulator
 *
 * Sends realistic, synthetic visitor journeys to PostHog so the dashboard has
 * something to show before the site has real traffic. Every event it sends is
 * one the real site sends too, with the same property names.
 *
 * Usage:
 *   node scripts/simulate-traffic.mjs                     # 400 visitors over 60 days
 *   node scripts/simulate-traffic.mjs --visitors 200      # fewer visitors
 *   node scripts/simulate-traffic.mjs --days 30           # shorter history
 *   node scripts/simulate-traffic.mjs --dry-run           # print a summary, send nothing
 *
 * The project key is read from assets/config.js, so there is nothing to paste.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

/* ---------- Options ---------- */
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const VISITORS = parseInt(opt('visitors', '400'), 10);
const DAYS = parseInt(opt('days', '60'), 10);
const DRY_RUN = argv.includes('--dry-run');

/* ---------- Project key ---------- */
function readConfig() {
  const cfg = readFileSync(join(ROOT, 'assets', 'config.js'), 'utf8');
  const key = cfg.match(/posthogKey:\s*'([^']+)'/);
  const host = cfg.match(/posthogHost:\s*'([^']+)'/);
  if (!key) throw new Error('Could not find posthogKey in assets/config.js');
  return { key: key[1], host: host ? host[1] : 'https://us.i.posthog.com' };
}
const cfgRead = readConfig();
const API_KEY = process.env.POSTHOG_KEY || cfgRead.key;
// --host lets you point at the EU cloud (https://eu.i.posthog.com) without
// editing any files. PostHog's US and EU clouds are separate: sending to the
// wrong one returns HTTP 200 and then silently drops every event.
const HOST = opt('host', cfgRead.host);

/* ---------- The world ---------- */
const TUTORS = [
  { name: 'Maria Reyes',  subjects: ['Elementary Math', 'Pre-Algebra'],  rate: 45, weight: 22, bookRate: 0.34 },
  // Deliberately popular but expensive and online-only: this is the tutor who
  // shows up as "viewed a lot, booked rarely" on Dana's dashboard.
  { name: 'James Carter', subjects: ['Algebra I', 'Algebra II'],         rate: 55, weight: 28, bookRate: 0.12 },
  { name: 'Priya Anand',  subjects: ['Science', 'Algebra I'],            rate: 50, weight: 16, bookRate: 0.30 },
  { name: 'Sofia Nguyen', subjects: ['Elementary Reading'],              rate: 40, weight: 15, bookRate: 0.42 },
  { name: 'Marcus Bell',  subjects: ['Elementary Math', 'Science'],      rate: 42, weight: 11, bookRate: 0.38 },
  { name: 'Elena Rossi',  subjects: ['Pre-Algebra', 'Algebra I'],        rate: 48, weight:  8, bookRate: 0.31 }
];

const SOURCES = [
  { label: 'Facebook group',         utm: 'facebook',      weight: 42, referrer: 'https://www.facebook.com/' },
  { label: 'Word of mouth',          utm: 'word-of-mouth', weight: 27, referrer: '' },
  { label: 'Library / school flyer', utm: 'flyer',         weight: 19, referrer: '' },
  { label: 'Direct / word of mouth', utm: null,            weight: 12, referrer: '' }
];

const OFFERED = ['Elementary Math', 'Pre-Algebra', 'Algebra I', 'Algebra II', 'Science', 'Elementary Reading'];
// Subjects parents ask for that Dana cannot staff today. This is the hiring
// signal she said she wanted.
const UNMET = ['Spanish', 'AP Calculus', 'Essay writing', 'US History', 'SAT prep', 'French', 'Geometry'];

const GRADES = ['K', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const FORMATS = ['In person', 'Online'];

/* ---------- Random helpers ---------- */
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const chance = (p) => Math.random() < p;
function weighted(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of list) { r -= item.weight; if (r <= 0) return item; }
  return list[list.length - 1];
}

/* ---------- Build one visitor's journey ---------- */
const BASE = 'https://chahid-upskilling-together.github.io';
const events = [];

function makeVisitor(n) {
  const source = weighted(SOURCES);
  const isMobile = chance(0.74);            // Dana's hunch: parents are on phones
  const distinctId = `sim_parent_${n}`;

  // Spread visits across the window, with more traffic in recent weeks so the
  // month-over-month comparison shows growth.
  const skew = Math.pow(Math.random(), 0.65);
  const daysAgo = Math.round(skew * DAYS);
  const when = new Date();
  when.setDate(when.getDate() - daysAgo);
  when.setHours(8 + rand(14), rand(60), rand(60), 0);

  let clock = when.getTime();
  const step = () => new Date(clock += 8000 + rand(70000)).toISOString();

  const base = {
    distinct_id: distinctId,
    traffic_source: source.label,
    $device_type: isMobile ? 'Mobile' : 'Desktop',
    $os: isMobile ? pick(['iOS', 'Android']) : pick(['Mac OS X', 'Windows']),
    $browser: isMobile ? pick(['Mobile Safari', 'Chrome']) : pick(['Chrome', 'Safari']),
    $referrer: source.referrer || '$direct',
    $referring_domain: source.referrer ? new URL(source.referrer).hostname : '$direct'
  };
  if (source.utm) { base.utm_source = source.utm; base.utm_medium = 'referral'; base.utm_campaign = 'abc-tutoring'; }

  const push = (event, props, url) => events.push({
    event,
    properties: { ...base, ...props, $current_url: `${BASE}/${url || ''}`, $pathname: `/${url || ''}` },
    timestamp: step()
  });

  /* 1. Landing */
  push('$pageview', {}, 'index.html');

  /* 2. Tutor listings */
  if (!chance(0.78)) return;
  push('$pageview', {}, 'tutors.html');
  push('tutor_list_viewed', { tutor_count: 6 }, 'tutors.html');

  /* Some parents filter or search */
  if (chance(0.34)) {
    const subject = pick(OFFERED);
    push('subject_filter_applied', { subject, results_count: 1 + rand(3), subject_offered: true }, 'tutors.html');
  }
  if (chance(0.16)) {
    const wantsUnmet = chance(0.55);
    const query = wantsUnmet ? pick(UNMET) : pick(OFFERED);
    const results = wantsUnmet ? 0 : 1 + rand(3);
    push('subject_searched', { query, results_count: results, subject_offered: !wantsUnmet }, 'tutors.html');
    if (wantsUnmet) push('unmet_subject_searched', { query }, 'tutors.html');
  }

  /* 3. Looking at tutors */
  if (!chance(0.82)) return;
  const seen = [];
  const looks = 1 + rand(3);
  for (let i = 0; i < looks; i++) {
    const t = weighted(TUTORS);
    if (seen.includes(t.name)) continue;
    seen.push(t.name);
    push('tutor_viewed', {
      tutor_name: t.name, subjects: t.subjects, primary_subject: t.subjects[0],
      hourly_rate: t.rate, viewed_from: 'listing'
    }, 'tutors.html');
  }
  if (!seen.length) return;

  /* Some parents prefer to text Dana rather than book online */
  if (chance(0.11)) {
    push('text_instead_clicked', { from_page: pick(['tutors_banner', 'booking_sidebar', 'header']) }, 'tutors.html');
    return;
  }

  /* 4. Booking page */
  const chosen = TUTORS.find((t) => t.name === seen[seen.length - 1]);
  if (!chance(0.47)) return;
  push('$pageview', {}, 'book.html');
  push('booking_started', { tutor_name: chosen.name }, 'book.html');

  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][rand(5)] + ', Oct ' + (1 + rand(27));
  const time = pick(['3:30 PM', '4:30 PM', '5:30 PM', '6:30 PM']);

  /* 5. Picking a time */
  if (!chance(0.79)) {
    push('booking_abandoned', { furthest_step: 'opened booking page', tutor_name: chosen.name }, 'book.html');
    return;
  }
  push('slot_selected', { tutor_name: chosen.name, day, time }, 'book.html');

  /* 6. Filling the form, then confirming — or not */
  if (!chance(0.86)) {
    push('booking_abandoned', { furthest_step: 'picked a time', tutor_name: chosen.name }, 'book.html');
    return;
  }
  if (!chance(chosen.bookRate + 0.45)) {
    push('booking_abandoned', { furthest_step: 'filling in details', tutor_name: chosen.name }, 'book.html');
    return;
  }

  push('booking_completed', {
    tutor_name: chosen.name,
    subject: pick(chosen.subjects),
    student_grade: pick(GRADES),
    session_format: pick(FORMATS),
    day, time,
    hourly_rate: chosen.rate
  }, 'book.html');
}

for (let i = 0; i < VISITORS; i++) makeVisitor(i);
events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

/* ---------- Summary ---------- */
const tally = {};
for (const e of events) tally[e.event] = (tally[e.event] || 0) + 1;

console.log(`\nABC Tutoring — simulated traffic`);
console.log(`  ${VISITORS} visitors across the last ${DAYS} days`);
console.log(`  ${events.length} events\n`);
Object.entries(tally).sort((a, b) => b[1] - a[1])
  .forEach(([name, count]) => console.log(`  ${String(count).padStart(5)}  ${name}`));

const views = tally.tutor_viewed || 0;
const books = tally.booking_completed || 0;
console.log(`\n  Browse -> book conversion: ${((books / VISITORS) * 100).toFixed(1)}% of visitors`);
console.log(`  Tutor views per booking:   ${(views / Math.max(books, 1)).toFixed(1)}\n`);

console.log(`  Sending to: ${HOST}`);
console.log(`  Project key: ${API_KEY.slice(0, 12)}...${API_KEY.slice(-4)}\n`);

if (DRY_RUN) {
  console.log('Dry run — nothing sent.\n');
  process.exit(0);
}

/* ---------- Send ---------- */
const CHUNK = 200;
let sent = 0;

for (let i = 0; i < events.length; i += CHUNK) {
  const batch = events.slice(i, i + CHUNK);
  const res = await fetch(`${HOST}/batch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY, batch })
  });

  if (!res.ok) {
    console.error(`\nPostHog rejected a batch (HTTP ${res.status})`);
    console.error(await res.text());
    process.exit(1);
  }
  sent += batch.length;
  process.stdout.write(`\r  sending... ${sent}/${events.length}`);
}

console.log(`\n\nDone. ${sent} events sent to PostHog.`);
console.log('Events usually appear in the Activity tab within a minute.\n');
