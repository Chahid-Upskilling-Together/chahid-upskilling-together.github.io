import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const img = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const HOME = img('deck-home.png');
const TUTORS = img('deck-tutors.png');
const SLOTS = img('deck-slots.png');
const CONFIRMED = img('deck-confirm-card.png');

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
  @page { size: 13.333in 7.5in; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', system-ui, sans-serif; color: #24312e; }

  .slide {
    width: 13.333in; height: 7.5in; padding: 0.62in 0.75in;
    background: #fdfbf7; page-break-after: always;
    position: relative; overflow: hidden; display: flex; flex-direction: column;
  }
  .slide:last-child { page-break-after: auto; }

  .kicker { font-size: 13pt; font-weight: 800; color: #17876f; letter-spacing: .04em;
            text-transform: uppercase; margin-bottom: 10px; }
  h1 { font-size: 34pt; font-weight: 900; line-height: 1.1; letter-spacing: -.02em; }
  h2 { font-size: 27pt; font-weight: 900; line-height: 1.15; letter-spacing: -.02em; }
  .sub { font-size: 14pt; color: #6c7a76; margin-top: 12px; max-width: 46ch; }
  .num { font-size: 15pt; }

  .quote {
    background: #fff; border-left: 6px solid #f0a05a; border-radius: 12px;
    padding: 20px 24px; font-size: 17pt; font-weight: 700; line-height: 1.4;
    box-shadow: 0 2px 14px rgba(36,49,46,.07);
  }
  .quote small { display: block; font-size: 11pt; font-weight: 700; color: #6c7a76; margin-top: 9px; }

  .cols { display: flex; gap: 30px; flex: 1; margin-top: 26px; }
  .col { flex: 1; }

  .card { background: #fff; border: 1px solid #e9e4db; border-radius: 14px;
          padding: 18px 20px; box-shadow: 0 1px 10px rgba(36,49,46,.05); }
  .card + .card { margin-top: 12px; }
  .card h3 { font-size: 13.5pt; font-weight: 900; margin-bottom: 5px; }
  .card p  { font-size: 11.5pt; color: #6c7a76; line-height: 1.45; }

  ul.ticks { list-style: none; }
  ul.ticks li { font-size: 13pt; line-height: 1.5; margin-bottom: 11px; padding-left: 30px;
                position: relative; }
  ul.ticks li::before { content: '✓'; position: absolute; left: 0; top: -1px;
                        color: #17876f; font-weight: 900; font-size: 15pt; }
  ul.ticks strong { font-weight: 900; }

  .phones { display: flex; gap: 16px; align-items: flex-start; }
  .phone { border: 5px solid #24312e; border-radius: 20px; overflow: hidden;
           box-shadow: 0 8px 26px rgba(36,49,46,.16); background: #fff; }
  .phone img { display: block; width: 100%; }
  .caption { font-size: 10pt; color: #6c7a76; text-align: center; margin-top: 7px; font-weight: 700; }
  .shot { position: relative; border: 1px solid #e9e4db; border-radius: 14px;
          overflow: hidden; box-shadow: 0 6px 20px rgba(36,49,46,.12);
          background: #fff; width: 3.05in; max-height: 2.72in; }
  .shot img { display: block; width: 100%; }
  /* The screenshot is taller than the space, so fade the cut rather than
     letting it end on a hard edge mid-row. */
  .shot::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0;
                 height: 0.75in;
                 background: linear-gradient(to bottom, rgba(255,255,255,0), #fff); }

  .flow { display: flex; align-items: stretch; gap: 14px; margin-top: 8px; }
  .flow .step { flex: 1; background: #fff; border: 1px solid #e9e4db; border-radius: 14px;
                padding: 16px 17px; }
  .flow .step .n { display: inline-flex; width: 26px; height: 26px; border-radius: 50%;
                   background: #e6f3ef; color: #116b58; font-weight: 900; font-size: 11pt;
                   align-items: center; justify-content: center; margin-bottom: 8px; }
  .flow .step h4 { font-size: 12.5pt; font-weight: 900; margin-bottom: 4px; }
  .flow .step p { font-size: 10.5pt; color: #6c7a76; line-height: 1.4; }
  .arrow { display: flex; align-items: center; color: #17876f; font-size: 20pt; font-weight: 900; }

  .banner { background: #17876f; color: #fff; border-radius: 14px; padding: 20px 26px;
            display: flex; align-items: center; gap: 18px; }
  .banner .big { font-size: 25pt; font-weight: 900; line-height: 1; white-space: nowrap; }
  .banner p { font-size: 12.5pt; line-height: 1.4; opacity: .95; }

  .warm { background: #fff7ec; border: 1px solid #f3dfc4; border-radius: 14px; padding: 18px 22px; }
  .warm h3 { font-size: 13pt; font-weight: 900; margin-bottom: 5px; }
  .warm p { font-size: 11.5pt; color: #6c7a76; line-height: 1.45; }

  table { width: 100%; border-collapse: collapse; }
  td { padding: 11px 12px; font-size: 12pt; vertical-align: top; border-bottom: 1px solid #e9e4db; }
  td.q { font-weight: 800; width: 47%; }
  td.a { color: #116b58; font-weight: 800; }

  .foot { position: absolute; bottom: 0.34in; left: 0.75in; right: 0.75in;
          display: flex; justify-content: space-between; font-size: 9.5pt; color: #9aa5a1;
          font-weight: 700; }
  .brand-dot { color: #17876f; }
</style></head><body>

<!-- ============ 1 ============ -->
<div class="slide">
  <div class="kicker">ABC Tutoring · Website proposal</div>
  <h1>You don't have a website problem.<br>You have a double-booking problem.</h1>
  <p class="sub">Here's what I heard when we spoke, and what I built to fix it.</p>

  <div class="cols">
    <div class="col">
      <div class="quote">
        “Parents currently find us through Facebook, word of mouth, and flyers, then
        text me to book; the manual texting can cause double-bookings.”
        <small>— Dana, ABC Tutoring</small>
      </div>
      <div class="card" style="margin-top:18px;">
        <h3>What that costs you today</h3>
        <p>Every booking is a back-and-forth conversation. The schedule lives in a Google
        Sheet you update by hand from tutors' texts. When two parents get offered the same
        time, you're the one apologising and rearranging.</p>
      </div>
    </div>
    <div class="col">
      <h2 style="font-size:19pt;margin-bottom:14px;">What you asked for</h2>
      <ul class="ticks">
        <li>A <strong>home page, tutor listings, and a booking page</strong></li>
        <li>Tutor <strong>photo, subjects, grade levels, rate, availability</strong></li>
        <li>Collect the <strong>parent's details and the student's grade and subject</strong></li>
        <li>A booked time <strong>should stop showing as available</strong></li>
        <li><strong>Clean and friendly</strong> — and simple on a phone</li>
        <li><strong>No online payment</strong> — you invoice families yourself</li>
        <li>Parents who prefer it <strong>can still text you</strong></li>
      </ul>
    </div>
  </div>
  <div class="foot"><span><span class="brand-dot">●</span> ABC Tutoring</span><span>1 / 5</span></div>
</div>

<!-- ============ 2 ============ -->
<div class="slide">
  <div class="kicker">What I built</div>
  <h2>Three pages. Booked in about a minute.</h2>
  <p class="sub">Built phone-first, because that's where your parents actually are.</p>

  <div class="cols" style="margin-top:20px;">
    <div class="col" style="flex:1.15;">
      <div class="phones">
        <div>
          <div class="phone" style="width:2.05in;"><img src="${HOME}"></div>
          <div class="caption">Home</div>
        </div>
        <div>
          <div class="phone" style="width:2.05in;"><img src="${TUTORS}"></div>
          <div class="caption">Find a tutor</div>
        </div>
        <div>
          <div class="phone" style="width:2.05in;"><img src="${SLOTS}"></div>
          <div class="caption">Pick a time</div>
        </div>
      </div>
    </div>
    <div class="col" style="flex:.85;">
      <div class="card">
        <h3>All six tutors, side by side</h3>
        <p>Photo, subjects, grade levels, hourly rate, experience, and how many times
        they have open. Parents can filter by subject or search.</p>
      </div>
      <div class="card">
        <h3>Experience shown up front</h3>
        <p>You mentioned parents always ask about it — so it's on every tutor card,
        not buried a click away.</p>
      </div>
      <div class="card">
        <h3>No payment, no accounts</h3>
        <p>Parents don't sign up for anything, and nobody is asked for a card.
        You keep invoicing families the way you do now.</p>
      </div>
    </div>
  </div>
  <div class="foot"><span><span class="brand-dot">●</span> ABC Tutoring</span><span>2 / 5</span></div>
</div>

<!-- ============ 3 ============ -->
<div class="slide">
  <div class="kicker">The fix</div>
  <h2>A booked time disappears. Immediately.</h2>
  <p class="sub">This is the part that ends the double-bookings.</p>

  <div class="flow" style="margin-top:26px;">
    <div class="step">
      <span class="n">1</span>
      <h4>Parent picks a time</h4>
      <p>They only ever see times that are genuinely free.</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <span class="n">2</span>
      <h4>They confirm</h4>
      <p>Their name and email, the student's first name, grade, and subject.</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <span class="n">3</span>
      <h4>That slot closes</h4>
      <p>It vanishes from the tutor's calendar. Nobody else can take it.</p>
    </div>
    <div class="arrow">→</div>
    <div class="step">
      <span class="n">4</span>
      <h4>You get the booking</h4>
      <p>No texts to trade. Nothing to copy into a spreadsheet.</p>
    </div>
  </div>

  <div class="cols" style="margin-top:22px;">
    <div class="col" style="flex:.66;">
      <div class="shot"><img src="${CONFIRMED}"></div>
      <div class="caption">What the parent sees</div>
    </div>
    <div class="col" style="flex:1.34;">
      <div class="warm">
        <h3>You keep the personal touch</h3>
        <p>You told me you didn't want to lose parents who'd rather just text you — so
        “Text us” sits on every page, right next to the booking button. Nobody is forced
        online. And I'm counting how many people choose it, so in a month you'll know
        whether parents actually want the website or still prefer you.</p>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3>Changes and cancellations still come to you</h3>
        <p>Exactly as they do today. The website only handles the part that was causing
        the collisions — claiming a time.</p>
      </div>
    </div>
  </div>
  <div class="foot"><span><span class="brand-dot">●</span> ABC Tutoring</span><span>3 / 5</span></div>
</div>

<!-- ============ 4 ============ -->
<div class="slide">
  <div class="kicker">What you'll know</div>
  <h2>Every question you asked me, answered on one screen.</h2>

  <div class="cols" style="margin-top:18px;">
    <div class="col" style="flex:1.25;">
      <table>
        <tr><td class="q">“Which tutors do people look at?”</td><td class="a">Views for every tutor</td></tr>
        <tr><td class="q">“Do they book, or do they leave?”</td><td class="a">Booking rate, step by step</td></tr>
        <tr><td class="q">“Where do people leave before booking?”</td><td class="a">The exact step they quit</td></tr>
        <tr><td class="q">“Where did they come from?”</td><td class="a">Facebook · flyers · word of mouth</td></tr>
        <tr><td class="q">“Which subjects are they looking for?”</td><td class="a">Ranked by demand</td></tr>
        <tr><td class="q">“Which tutors get viewed but rarely booked?”</td><td class="a">Views compared to bookings</td></tr>
        <tr style="border:0;"><td class="q">“How many still prefer to text me?”</td><td class="a">Counted, not guessed</td></tr>
      </table>
    </div>
    <div class="col" style="flex:.75;">
      <div class="banner">
        <div class="big">⭐</div>
        <p><strong>The one I'd watch.</strong> When a parent searches for a subject you
        don't teach, that search is recorded. In a month you'll have a ranked list of
        exactly what families are asking for that you can't staff yet — which tells you
        who to hire next.</p>
      </div>
      <div class="card" style="margin-top:14px;">
        <h3>Your three channels, counted separately</h3>
        <p>You get one link for your Facebook group, one for flyers, and one for word of
        mouth. Put the flyer link on a QR code and you'll finally know whether flyers
        are worth printing.</p>
      </div>
    </div>
  </div>
  <div class="foot"><span><span class="brand-dot">●</span> ABC Tutoring</span><span>4 / 5</span></div>
</div>

<!-- ============ 5 ============ -->
<div class="slide">
  <div class="kicker">Where we go from here</div>
  <h2>A few calls I made for you — all easy to change.</h2>
  <p class="sub">You hadn't settled these yet, so I picked sensible defaults rather than stall.</p>

  <div class="cols" style="margin-top:20px;">
    <div class="col">
      <div class="card">
        <h3>60-minute sessions, booked one at a time</h3>
        <p>One simple slot length keeps the calendar readable. Recurring weekly slots
        would be a natural next step.</p>
      </div>
      <div class="card">
        <h3>Two weeks of availability, confirmed instantly</h3>
        <p>I deliberately left out an approval step — approving each booking by hand
        would bring back the very texting you want rid of.</p>
      </div>
      <div class="card">
        <h3>Placeholder tutor photos</h3>
        <p>Send me your real ones and they drop straight in. Nothing else changes.</p>
      </div>
    </div>
    <div class="col">
      <h2 style="font-size:17pt;margin-bottom:13px;">Before a real launch</h2>
      <ul class="ticks">
        <li><strong>A shared calendar.</strong> Right now availability is remembered per
        device — fine for trying it out, but two different families need to see the same
        one for real.</li>
        <li><strong>Real confirmation emails and texts.</strong> The site shows the
        confirmation; sending it needs a small service behind it.</li>
        <li><strong>Letting you edit tutors yourself</strong> — you mentioned wanting
        this, and it's the right thing to build second.</li>
      </ul>
      <div class="warm" style="margin-top:6px;">
        <h3>What success looks like in three months</h3>
        <p>Parents booking without the back-and-forth, and you knowing which subjects
        families keep asking for — in your words.</p>
      </div>
    </div>
  </div>
  <div class="foot"><span><span class="brand-dot">●</span> ABC Tutoring</span><span>5 / 5</span></div>
</div>

</body></html>`;

writeFileSync('deck.html', html);

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await br.newPage();
await page.goto('file://' + process.cwd() + '/deck.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.pdf({
  path: process.argv[2] || 'presentation.pdf',
  width: '13.333in', height: '7.5in',
  printBackground: true, pageRanges: '1-5'
});
await br.close();
console.log('PDF written');
