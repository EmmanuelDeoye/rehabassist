// gait.js - Under Construction Page with Fancy Animation

document.addEventListener('DOMContentLoaded', function() {
  console.log('Gait Monitor page loaded – under construction');

  // Create orbiting icons
  const orbitRing = document.getElementById('orbitRing');
  if (orbitRing) {
    // Icons related to gait analysis, motion, video, etc.
    const icons = [
      '🎥', '🏃', '📊', '⚙️', '📏', '🦵', '📈', '🔄'
    ];
    const radius = 110; // adjust based on container size
    const count = icons.length;
    const angleStep = (2 * Math.PI) / count;

    icons.forEach((icon, index) => {
      const angle = index * angleStep;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'orbit-icon';
      iconDiv.textContent = icon;
      iconDiv.style.transform = `translate(${x}px, ${y}px)`;
      orbitRing.appendChild(iconDiv);
    });
  }

  // Theme toggle (reuse from main.js)
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  function setTheme(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }

  function initTheme() {
    const stored = localStorage.getItem('rehab-theme');
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
      setTheme(stored);
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      localStorage.setItem('rehab-theme', 'system');
    }
  }

  function cycleTheme() {
    const current = html.getAttribute('data-theme');
    let newTheme = 'light';
    if (current === 'light') newTheme = 'dark';
    else if (current === 'dark') newTheme = 'system';
    else newTheme = 'light';

    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      localStorage.setItem('rehab-theme', 'system');
    } else {
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('rehab-theme', newTheme);
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', cycleTheme);
  }
  initTheme();

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('rehab-theme') === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    }
  });
});