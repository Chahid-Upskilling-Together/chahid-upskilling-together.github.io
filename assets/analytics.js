/* ABC Tutoring — analytics
 *
 * Every event below exists to answer a question Dana actually asked:
 *
 *   "Which tutors do people view?"            -> tutor_viewed
 *   "Do they book, or leave?"                 -> booking funnel + booking_abandoned
 *   "Where did they come from?"               -> traffic_source (set once per visitor)
 *   "Which subjects are they looking for?"    -> subject_filter_applied / subject_searched
 *   "...especially ones we don't offer?"      -> unmet_subject_searched
 *   "Will parents still want to text me?"     -> text_instead_clicked
 */
(function () {
  var cfg = window.ABC_CONFIG || {};
  var ready = false;

  /* --- Where did this visitor come from? ---------------------------------
   * Dana names three channels: her Facebook group, word of mouth, and
   * flyers at libraries and schools. Links handed out on each channel carry
   * a ?utm_source= tag (see README), which we translate into a plain-English
   * label so the dashboard reads the way she talks.
   */
  function trafficSource() {
    var params = new URLSearchParams(window.location.search);
    var utm = (params.get('utm_source') || '').toLowerCase();

    if (utm.indexOf('facebook') > -1 || utm === 'fb') return 'Facebook group';
    if (utm.indexOf('flyer') > -1) return 'Library / school flyer';
    if (utm.indexOf('word') > -1 || utm.indexOf('referral') > -1) return 'Word of mouth';
    if (utm) return utm;

    var ref = document.referrer || '';
    if (!ref) return 'Direct / word of mouth';
    if (ref.indexOf('facebook') > -1) return 'Facebook group';
    if (ref.indexOf('google') > -1 || ref.indexOf('bing') > -1) return 'Search';
    return 'Other website';
  }

  if (cfg.posthogKey && window.posthog && window.posthog.init) {
    posthog.init(cfg.posthogKey, {
      api_host: cfg.posthogHost,
      person_profiles: 'always',
      capture_pageview: true,
      capture_pageleave: true
    });

    // Stamped onto every event from this visitor, so any chart can be
    // broken down by channel without extra work.
    posthog.register({ traffic_source: trafficSource() });
    ready = true;
  }

  /* --- Tracking helpers -------------------------------------------------- */
  var ABC = window.ABC_ANALYTICS = {
    track: function (event, props) {
      if (ready) posthog.capture(event, props || {});
      // Visible in the browser console during a demo, so the telemetry is
      // not a black box when showing this to Dana.
      if (window.console && console.debug) console.debug('[analytics]', event, props || {});
    },

    tutorViewed: function (tutor, where) {
      ABC.track('tutor_viewed', {
        tutor_id: tutor.id,
        tutor_name: tutor.name,
        subjects: tutor.subjects,
        primary_subject: tutor.subjects[0],
        hourly_rate: tutor.rate,
        grade_levels: tutor.grades,
        viewed_from: where
      });
    },

    subjectFilter: function (subject, resultsCount) {
      ABC.track('subject_filter_applied', {
        subject: subject,
        results_count: resultsCount,
        subject_offered: true
      });
    },

    /* Dana's highest-value question: what are parents asking for that she
     * cannot currently staff? A search with no matches is a hiring signal. */
    subjectSearched: function (query, resultsCount) {
      var offered = resultsCount > 0;
      ABC.track('subject_searched', {
        query: query,
        results_count: resultsCount,
        subject_offered: offered
      });
      if (!offered) {
        ABC.track('unmet_subject_searched', { query: query });
      }
    },

    bookingStarted: function (tutor) {
      ABC.track('booking_started', { tutor_id: tutor.id, tutor_name: tutor.name });
    },

    bookingCompleted: function (booking) {
      ABC.track('booking_completed', {
        tutor_id: booking.tutorId,
        tutor_name: booking.tutorName,
        subject: booking.subject,
        student_grade: booking.studentGrade,
        session_format: booking.format,
        day: booking.dayLabel,
        time: booking.time,
        hourly_rate: booking.rate
      });
    },

    /* Answers "will parents still want to text me?" with a number instead
     * of a guess. */
    textInstead: function (where, tutorName) {
      ABC.track('text_instead_clicked', { from_page: where, tutor_name: tutorName || null });
    }
  };

  /* --- Where do people give up? ------------------------------------------
   * If a visitor opens the booking form but leaves without confirming, record
   * how far they got. This is what fills the "started but didn't finish" tile.
   */
  var progress = { started: false, slotPicked: false, typedDetails: false, completed: false };
  window.ABC_PROGRESS = progress;

  function reportAbandonment() {
    if (!progress.started || progress.completed) return;
    var step = 'opened booking page';
    if (progress.typedDetails) step = 'filling in details';
    else if (progress.slotPicked) step = 'picked a time';

    ABC.track('booking_abandoned', {
      furthest_step: step,
      tutor_name: progress.tutorName || null
    });
    progress.started = false; // only report once
  }

  window.addEventListener('pagehide', reportAbandonment);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') reportAbandonment();
  });
})();
