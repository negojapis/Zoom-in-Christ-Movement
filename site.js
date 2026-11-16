// Use uma data ISO 8601 com o fuso do encontro (YYYY-MM-DDTHH:mm:ss-03:00).
const firstMeeting = '';

const officialDeadline = Date.parse(firstMeeting);
const hasMeetingDate = Number.isFinite(officialDeadline);
const clockStatus = document.getElementById('clock-status');
const clockNote = document.getElementById('clock-note');
const clockFields = Object.fromEntries(
  ['days', 'hours', 'minutes', 'seconds'].map(id => [id, document.getElementById(id)])
);

function updateCountdown() {
  const now = Date.now();
  const hour = 3_600_000;
  const remaining = hasMeetingDate ? Math.max(0, officialDeadline - now) : hour - now % hour;
  const totalSeconds = Math.floor(remaining / 1000);
  const format = value => String(value).padStart(2, '0');

  if (hasMeetingDate) {
    clockFields.days.textContent = format(Math.floor(totalSeconds / 86_400));
    clockFields.hours.textContent = format(Math.floor(totalSeconds / 3600) % 24);
  }
  clockFields.minutes.textContent = format(Math.floor(totalSeconds / 60) % 60);
  clockFields.seconds.textContent = format(totalSeconds % 60);

  if (hasMeetingDate && remaining === 0) {
    clockStatus.textContent = 'O PRIMEIRO ENCONTRO CHEGOU';
    return;
  }

  window.setTimeout(updateCountdown, (remaining % 1000 || 1000) + 1);
}

if (hasMeetingDate) clockNote.textContent = 'Para o primeiro encontro';
updateCountdown();

const lens = document.getElementById('lens');
lens.addEventListener('click', () => {
  const pressed = lens.getAttribute('aria-pressed') === 'true';
  lens.setAttribute('aria-pressed', String(!pressed));
});

const playlistScreen = document.querySelector('.playlist-device-screen');
new ResizeObserver(([{ contentRect: { width, height } }]) => {
  if (!width || !height) return;

  // Spotify switches between fixed-height layouts based on the iframe viewport.
  const playerHeight = height < 145 ? 152 : 352;
  const scale = height / playerHeight;
  playlistScreen.style.setProperty('--spotify-width', `${width / scale}px`);
  playlistScreen.style.setProperty('--spotify-height', `${playerHeight}px`);
  playlistScreen.style.setProperty('--spotify-scale', String(scale));
}).observe(playlistScreen);
