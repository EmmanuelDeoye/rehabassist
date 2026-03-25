// js/main.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('rehab.ai main.js loaded');

  // ----- DOM elements -----
  const toolCards = document.querySelectorAll('.tool-card-link');
  const toolGrid = document.getElementById('toolGrid');
  const emptyMessage = document.getElementById('emptyMessage');
  const searchInput = document.getElementById('searchInput');
  const themeToggle = document.getElementById('themeToggle');
  const htmlElement = document.documentElement;

  // ----- Search functionality -----
  function filterTools(searchText) {
    const searchTerm = searchText.trim().toLowerCase();
    let visibleCount = 0;
    
    toolCards.forEach(card => {
      const title = card.querySelector('.tool-title').textContent.toLowerCase();
      const description = card.querySelector('.tool-description').textContent.toLowerCase();
      const meta = card.querySelector('.tool-meta').textContent.toLowerCase();
      
      const matches = searchTerm === '' || 
                      title.includes(searchTerm) || 
                      description.includes(searchTerm) ||
                      meta.includes(searchTerm);
      
      if (matches) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
    
    // Show/hide empty message
    if (visibleCount === 0) {
      emptyMessage.classList.remove('hidden');
    } else {
      emptyMessage.classList.add('hidden');
    }
  }

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    filterTools(e.target.value);
  });

  // Focus search when magnifying glass is clicked
  document.getElementById('searchToggle').addEventListener('click', () => {
    searchInput.focus();
  });

  // ----- Theme logic -----
  function initTheme() {
    const stored = localStorage.getItem('rehab-theme');
    if (stored === 'dark' || stored === 'light') {
      htmlElement.setAttribute('data-theme', stored);
    } else {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      localStorage.setItem('rehab-theme', 'system');
    }
  }

  function cycleTheme() {
    const current = htmlElement.getAttribute('data-theme');
    let newTheme = 'light';
    if (current === 'light') newTheme = 'dark';
    else if (current === 'dark') newTheme = 'system';
    else newTheme = 'light';

    if (newTheme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      localStorage.setItem('rehab-theme', 'system');
    } else {
      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('rehab-theme', newTheme);
    }
  }

  themeToggle.addEventListener('click', cycleTheme);

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('rehab-theme') === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    }
  });

  // Initialize
  initTheme();
  
  // Add click tracking (optional)
  toolCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const toolName = card.querySelector('.tool-title').textContent;
      console.log(`Tool clicked: ${toolName}`);
      // You can add analytics tracking here if needed
    });
  });
  
  
  // Add scroll behavior to hide/show floating button
let lastScrollTop = 0;
const floatingBtn = document.getElementById('floatingAiBtn');

if (floatingBtn) {
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down - hide button
      floatingBtn.style.transform = 'translateY(100px)';
      floatingBtn.style.opacity = '0';
    } else {
      // Scrolling up - show button
      floatingBtn.style.transform = 'translateY(0)';
      floatingBtn.style.opacity = '1';
    }
    
    lastScrollTop = scrollTop;
  });
}

// Optional: Add click tracking
if (floatingBtn) {
  floatingBtn.addEventListener('click', () => {
    console.log('AI Assistant button clicked');
    // You can add analytics tracking here
  });
}

  console.log('rehab.ai ready');
});
