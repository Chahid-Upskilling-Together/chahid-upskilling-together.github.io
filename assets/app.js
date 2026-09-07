/* ABC Tutoring — site behaviour
 *
 * Deliberately plain JavaScript with no build step or framework, so the whole
 * site is three HTML files that GitHub Pages can serve as-is.
 *
 * Bookings live in the browser's localStorage. That is what makes a booked
 * time disappear for good — the double-booking problem Dana described.
 */
(function () {
  var CFG = window.ABC_CONFIG || {};
  var TUTORS = window.ABC_TUTORS || [];
  var A = window.ABC_ANALYTICS;
  var STORE_KEY = 'abc_bookings_v1';

  /* ---------- Booking storage ---------- */
  function loadBookings() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveBooking(b) {
    var all = loadBookings();
    all.push(b);
    try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch (e) {}
  }
  function bookedSlotIds() {
    return loadBookings().map(function (b) { return b.slotId; });
  }
  function openSlots(tutor) {
    var taken = bookedSlotIds();
    return window.ABC_buildSlots(tutor).filter(function (s) {
      return taken.indexOf(s.id) === -1;
    });
  }

  /* ---------- Small helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function tutorById(id) {
    for (var i = 0; i < TUTORS.length; i++) if (TUTORS[i].id === id) return TUTORS[i];
    return null;
  }
  function initials(name) {
    return name.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2).toUpperCase();
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- "Text us instead" -------------------------------------------
   * Dana was clear she does not want to lose the option of parents texting
   * her. Every one of these is tracked, so she can see how many people still
   * choose it rather than guessing.
   */
  function wireTextLinks() {
    $$('.js-text-link').forEach(function (el) {
      if (!el.dataset.labelled) {
        if (el.id === 'footerPhone') el.textContent = CFG.phoneDisplay;
        el.dataset.labelled = '1';
      }
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (A) A.textInstead(el.dataset.where || 'unknown', window.__ABC_TUTOR_NAME || null);
        window.location.href = 'sms:' + CFG.phoneRaw;
      });
    });
    var mail = $('#footerEmail');
    if (mail) { mail.textContent = CFG.email; mail.href = 'mailto:' + CFG.email; }
  }

  /* ---------- Tutor card ---------- */
  function tutorCard(tutor, opts) {
    opts = opts || {};
    var open = openSlots(tutor);
    var next = open.length ? open[0] : null;
    var avatarStyle = tutor.photo ? ' style="background-image:url(' + esc(tutor.photo) + ')"' : '';
    var avatarText = tutor.photo ? '' : initials(tutor.name);

    var el = document.createElement('article');
    el.className = 'tutor-card';
    el.innerHTML =
      '<div class="tutor-top">' +
        '<div class="avatar ' + tutor.tint + '"' + avatarStyle + '>' + avatarText + '</div>' +
        '<div>' +
          '<div class="tutor-name">' + esc(tutor.name) + '</div>' +
          '<div class="tutor-grades">' + esc(tutor.grades) + ' · ' + esc(tutor.formats.join(' or ')) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="tag-row">' +
        tutor.subjects.map(function (s) { return '<span class="tag">' + esc(s) + '</span>'; }).join('') +
      '</div>' +
      '<p class="tutor-exp">' + esc(tutor.experience) + '</p>' +
      '<div class="tutor-meta">' +
        '<div class="rate">$' + tutor.rate + '<span>/hr</span></div>' +
        '<div class="slots-left' + (next ? '' : ' slots-none') + '">' +
          (next ? open.length + ' times open · next ' + esc(next.dayLabel) : 'Fully booked') +
        '</div>' +
      '</div>' +
      '<div class="card-actions">' +
        (next
          ? '<a class="btn btn-primary btn-sm" href="book.html?tutor=' + tutor.id + '">Book a time</a>'
          : '<a class="btn btn-outline btn-sm js-text-link" data-where="fully_booked" href="#">Ask about a time</a>') +
      '</div>';

    // Viewing a tutor card is the interest signal Dana asked for.
    el.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) return;   // the button reports itself
      if (A) A.tutorViewed(tutor, opts.where || 'listing');
    });
    var bookBtn = el.querySelector('.btn-primary');
    if (bookBtn) {
      bookBtn.addEventListener('click', function () {
        if (A) A.tutorViewed(tutor, opts.where || 'listing');
      });
    }
    return el;
  }

  /* ================= HOME ================= */
  function initHome() {
    var grid = $('#featuredGrid');
    if (!grid) return;
    TUTORS.slice(0, 3).forEach(function (t) {
      grid.appendChild(tutorCard(t, { where: 'home' }));
    });
    wireTextLinks();
  }

  /* ================= TUTOR LISTINGS ================= */
  function initTutors() {
    var grid = $('#tutorGrid');
    if (!grid || !$('#filterRow')) return;

    var filterRow = $('#filterRow');
    var countEl = $('#resultCount');
    var noMatch = $('#noMatch');
    var searchInput = $('#subjectSearch');
    var activeSubject = 'All';

    var subjects = ['All'].concat(window.ABC_SUBJECTS || []);
    subjects.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'chip' + (s === 'All' ? ' chip-active' : '');
      b.textContent = s === 'All' ? 'All subjects' : s;
      b.addEventListener('click', function () {
        activeSubject = s;
        searchInput.value = '';
        $$('.chip', filterRow).forEach(function (c) { c.classList.remove('chip-active'); });
        b.classList.add('chip-active');
        var shown = render();
        if (A && s !== 'All') A.subjectFilter(s, shown);
      });
      filterRow.appendChild(b);
    });

    function matches(tutor, query) {
      if (query) {
        var hay = (tutor.subjects.join(' ') + ' ' + tutor.name + ' ' + tutor.grades + ' ' + tutor.blurb).toLowerCase();
        return hay.indexOf(query.toLowerCase()) > -1;
      }
      return activeSubject === 'All' || tutor.subjects.indexOf(activeSubject) > -1;
    }

    function render(query) {
      var list = TUTORS.filter(function (t) { return matches(t, query); });
      grid.innerHTML = '';
      list.forEach(function (t) { grid.appendChild(tutorCard(t, { where: 'listing' })); });

      var none = list.length === 0;
      noMatch.hidden = !none;
      if (none && query) {
        $('#noMatchText').textContent = 'Nothing matched “' + query + '”. We\'re a small team and still growing.';
      }
      countEl.textContent = none
        ? ''
        : 'Showing ' + list.length + ' tutor' + (list.length === 1 ? '' : 's') +
          (query ? ' for “' + query + '”' : (activeSubject === 'All' ? '' : ' in ' + activeSubject));

      wireTextLinks();
      return list.length;
    }

    function runSearch() {
      var q = searchInput.value.trim();
      if (!q) { render(); return; }
      var shown = render(q);
      // A search with no results is the "subject we don't offer" signal.
      if (A) A.subjectSearched(q, shown);
    }

    $('#searchBtn').addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
    });

    render();
    if (A) A.track('tutor_list_viewed', { tutor_count: TUTORS.length });
    wireTextLinks();
  }

  /* ================= BOOKING ================= */
  function initBooking() {
    var wrap = $('#bookingWrap');
    if (!wrap) return;

    var params = new URLSearchParams(window.location.search);
    var tutor = tutorById(params.get('tutor'));
    var picked = null;
    var format = null;
    var expanded = false;

    renderMyBookings();

    if (!tutor) {
      $('#chooseTutor').hidden = false;
      var cg = $('#chooseGrid');
      TUTORS.forEach(function (t) { cg.appendChild(tutorCard(t, { where: 'booking_picker' })); });
      wireTextLinks();
      return;
    }

    window.__ABC_TUTOR_NAME = tutor.name;
    wrap.hidden = false;

    // Tutor header
    $('#bkName').textContent = tutor.name;
    $('#bkGrades').textContent = tutor.grades + ' · $' + tutor.rate + '/hr';
    $('#bkExp').textContent = tutor.experience;
    var av = $('#bkAvatar');
    av.className = 'avatar avatar-lg ' + tutor.tint;
    if (tutor.photo) { av.style.backgroundImage = 'url(' + tutor.photo + ')'; }
    else { av.textContent = initials(tutor.name); }
    $('#bkSubjects').innerHTML = tutor.subjects.map(function (s) {
      return '<span class="tag">' + esc(s) + '</span>';
    }).join('');

    $('#sumTutor').textContent = tutor.name;
    $('#sumRate').textContent = '$' + tutor.rate + '/hr';

    if (A) {
      A.tutorViewed(tutor, 'booking_page');
      A.bookingStarted(tutor);
    }
    window.ABC_PROGRESS.started = true;
    window.ABC_PROGRESS.tutorName = tutor.name;

    /* --- Time slots, grouped by day --- */
    function renderSlots() {
      var area = $('#slotArea');
      var slots = openSlots(tutor);
      area.innerHTML = '';

      if (!slots.length) {
        area.innerHTML = '<p class="muted">' + esc(tutor.name) +
          ' has no open times in the next two weeks. Text Dana and she\'ll find you something.</p>';
        return;
      }
      var byDay = {};
      slots.forEach(function (s) { (byDay[s.dayLabel] = byDay[s.dayLabel] || []).push(s); });

      // Dana asked for this to stay simple on a phone, so show the next few
      // days and keep the rest behind one tap.
      var allDays = Object.keys(byDay);
      var VISIBLE_DAYS = 3;
      var days = expanded ? allDays : allDays.slice(0, VISIBLE_DAYS);

      days.forEach(function (day) {
        var block = document.createElement('div');
        block.className = 'slot-day';
        block.innerHTML = '<h4>' + esc(day) + '</h4>';
        var row = document.createElement('div');
        row.className = 'slot-row';

        byDay[day].forEach(function (s) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'slot' + (picked && picked.id === s.id ? ' slot-selected' : '');
          b.textContent = s.time;
          b.addEventListener('click', function () {
            picked = s;
            $$('.slot', area).forEach(function (x) { x.classList.remove('slot-selected'); });
            b.classList.add('slot-selected');
            $('#slotError').hidden = true;
            $('#sumWhen').textContent = s.dayLabel + ' at ' + s.time;
            window.ABC_PROGRESS.slotPicked = true;
            if (A) A.track('slot_selected', {
              tutor_name: tutor.name, day: s.dayLabel, time: s.time
            });
          });
          row.appendChild(b);
        });
        block.appendChild(row);
        area.appendChild(block);
      });

      if (!expanded && allDays.length > VISIBLE_DAYS) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'btn btn-text';
        more.textContent = 'Show ' + (allDays.length - VISIBLE_DAYS) + ' more days';
        more.addEventListener('click', function () {
          expanded = true;
          renderSlots();
          if (A) A.track('more_times_shown', { tutor_name: tutor.name });
        });
        area.appendChild(more);
      }
    }
    renderSlots();

    /* --- Online / in person --- */
    var formatRow = $('#formatRow');
    tutor.formats.forEach(function (f, i) {
      var label = document.createElement('label');
      label.className = 'radio-card';
      label.innerHTML = '<input type="radio" name="format" value="' + esc(f) + '"' +
        (i === 0 ? ' checked' : '') + '> ' + esc(f);
      label.querySelector('input').addEventListener('change', function () {
        format = f;
        $('#sumFormat').textContent = f;
      });
      formatRow.appendChild(label);
    });
    format = tutor.formats[0];
    $('#sumFormat').textContent = format;

    /* --- Grade + subject dropdowns --- */
    var gradeSel = $('#studentGrade');
    ['K'].concat('1,2,3,4,5,6,7,8,9,10,11,12'.split(',')).forEach(function (g) {
      var o = document.createElement('option');
      o.value = g;
      o.textContent = g === 'K' ? 'Kindergarten' : 'Grade ' + g;
      gradeSel.appendChild(o);
    });

    var subjSel = $('#subjectWanted');
    tutor.subjects.forEach(function (s) {
      var o = document.createElement('option');
      o.value = s; o.textContent = s;
      subjSel.appendChild(o);
    });

    // Typing in the form is the last funnel step before confirming.
    $$('#bookingForm input, #bookingForm select').forEach(function (el) {
      el.addEventListener('input', function () {
        window.ABC_PROGRESS.typedDetails = true;
      }, { once: true });
    });

    /* --- Confirm --- */
    $('#bookingForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = $('#formError');
      err.hidden = true;

      if (!picked) {
        $('#slotError').hidden = false;
        $('#slotArea').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var parentName = $('#parentName').value.trim();
      var parentEmail = $('#parentEmail').value.trim();
      var studentName = $('#studentName').value.trim();
      var grade = gradeSel.value;
      var subject = subjSel.value;

      if (!parentName || !parentEmail || !studentName || !grade) {
        err.textContent = 'Please fill in your name, email, your student\'s first name, and their grade.';
        err.hidden = false;
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(parentEmail)) {
        err.textContent = 'That email address doesn\'t look right.';
        err.hidden = false;
        return;
      }

      var booking = {
        id: 'bk_' + Date.now(),
        slotId: picked.id,
        tutorId: tutor.id,
        tutorName: tutor.name,
        rate: tutor.rate,
        dayLabel: picked.dayLabel,
        time: picked.time,
        format: format,
        parentName: parentName,
        parentEmail: parentEmail,
        studentName: studentName,
        studentGrade: grade,
        subject: subject,
        createdAt: new Date().toISOString()
      };

      saveBooking(booking);
      window.ABC_PROGRESS.completed = true;
      if (A) A.bookingCompleted(booking);

      // Swap to the confirmation view
      wrap.hidden = true;
      $('#confirmWrap').hidden = false;
      $('#confirmLead').textContent =
        'We\'ve sent the details to ' + parentEmail + '. Dana will confirm by text before the session.';
      $('#cfTutor').textContent = tutor.name;
      $('#cfWhen').textContent = picked.dayLabel + ' at ' + picked.time;
      $('#cfFormat').textContent = format;
      $('#cfStudent').textContent = studentName + ' (' + (grade === 'K' ? 'Kindergarten' : 'Grade ' + grade) + ')';
      $('#cfSubject').textContent = subject;

      renderMyBookings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    wireTextLinks();
  }

  /* ---------- My bookings list ---------- */
  function renderMyBookings() {
    var list = $('#bookingList');
    if (!list) return;
    var bookings = loadBookings();
    list.innerHTML = '';
    $('#noBookings').hidden = bookings.length > 0;

    bookings.forEach(function (b) {
      var row = document.createElement('div');
      row.className = 'booking-item';
      row.innerHTML =
        '<div>' +
          '<div class="booking-when">' + esc(b.dayLabel) + ' at ' + esc(b.time) + '</div>' +
          '<div class="booking-who">' + esc(b.tutorName) + ' · ' + esc(b.subject) +
            ' · ' + esc(b.format) + ' · for ' + esc(b.studentName) + '</div>' +
        '</div>' +
        '<div class="tag tag-plain">Confirmed</div>';
      list.appendChild(row);
    });
  }

  /* ---------- Go ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    wireTextLinks();
    initHome();
    initTutors();
    initBooking();
    renderMyBookings();
  });
})();
