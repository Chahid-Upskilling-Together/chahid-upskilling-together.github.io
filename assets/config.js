/* ABC Tutoring — site configuration
 * Everything Dana might want to change lives here, so she never has to dig
 * through the rest of the code.
 */
window.ABC_CONFIG = {
  // PostHog analytics. This is a public "project" key — it is meant to ship
  // in the browser and cannot be used to read your data.
  posthogKey: 'phc_vNSnsjP2q6KpGnH5EPXDkCkB3sL9iWvx9NqyGR8KC9uL',
  posthogHost: 'https://us.i.posthog.com',

  // Dana's contact details. Parents who prefer texting use these.
  phoneDisplay: '(555) 012-3456',
  phoneRaw: '+15550123456',
  email: 'hello@abctutoring.example',

  // How many days of availability to show on the booking calendar.
  bookingWindowDays: 14
};
