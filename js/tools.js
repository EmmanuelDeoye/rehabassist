// js/tools.js
// Creates a slide-out drawer from the home icon with dropdown-menu styling

(function() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToolsDrawer);
  } else {
    initToolsDrawer();
  }

  function initToolsDrawer() {
    // Find the home icon element (anchor or button with class home-icon)
    const homeIcon = document.querySelector('.home-icon');
    if (!homeIcon) {
      console.warn('No .home-icon element found – tools drawer not created');
      return;
    }

    // Define all available tools (same as on index.html)
    const tools = [
      { name: 'Home', url: 'index.html', icon: '🏠' },
      { name: 'Format Generator', url: 'format.html', icon: '📋' },
      { name: 'Standardized Tools', url: 'standardized.html', icon: '⚖️' },
      { name: 'Documentation Assistant', url: 'doc.html', icon: '📃' },
      { name: 'ROM Analyzer', url: 'rom.html', icon: '🦵' },
      { name: 'Gait Monitor', url: 'gait.html', icon: '🎥' },
      { name: 'Presentation Maker', url: 'presentation.html', icon: '📊' },
      { name: 'AI Assistant', url: 'ai.html', icon: '🤖' }
    ];

    // Get the current page path to highlight active tool
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // Store the original SVG content
    const originalSvg = homeIcon.innerHTML;

    // Create a button with home icon AND dropdown chevron
    const toolsBtn = document.createElement('button');
    toolsBtn.className = 'icon-btn tools-drawer-btn';
    toolsBtn.setAttribute('aria-label', 'Tools menu');
    toolsBtn.style.display = 'inline-flex';
    toolsBtn.style.alignItems = 'center';
    toolsBtn.style.gap = '4px';
    toolsBtn.innerHTML = `
      ${originalSvg}
      <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: 2px;">
        <polyline points="6 9 12 15 18 9" stroke="currentColor" fill="none" stroke-width="2"/>
      </svg>
    `;
    
    // Replace the home icon with our button
    homeIcon.parentNode.replaceChild(toolsBtn, homeIcon);

    // Create the tools drawer with dropdown-menu styling
    const toolsDrawer = document.createElement('aside');
    toolsDrawer.className = 'tools-drawer';
    toolsDrawer.id = 'toolsDrawer';
    toolsDrawer.innerHTML = `
      <div class="tools-drawer-header">
        <div class="tools-drawer-title">
          <span class="tools-drawer-icon">🛠️</span>
          <span>All Tools</span>
        </div>
        <button id="closeToolsDrawerBtn" class="tools-drawer-close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="tools-drawer-content">
        ${tools.map(tool => {
          const isActive = (tool.url === currentPath) || 
                         (currentPath === '' && tool.url === 'index.html');
          return `
            <a href="${tool.url}" class="tools-drawer-item ${isActive ? 'active' : ''}">
              <span class="tools-item-icon">${tool.icon}</span>
              <span class="tools-item-name">${tool.name}</span>
              ${isActive ? '<span class="tools-item-active">●</span>' : ''}
            </a>
          `;
        }).join('')}
      </div>
    `;

    // Append drawer to body
    document.body.appendChild(toolsDrawer);

    // Add overlay for backdrop
    const overlay = document.createElement('div');
    overlay.className = 'tools-drawer-overlay';
    overlay.id = 'toolsDrawerOverlay';
    document.body.appendChild(overlay);

    // Function to open drawer
    function openDrawer() {
      toolsDrawer.classList.add('open');
      overlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
      // Optional: rotate the chevron when open
      const chevron = toolsBtn.querySelector('.chevron-icon');
      if (chevron) {
        chevron.style.transform = 'rotate(180deg)';
        chevron.style.transition = 'transform 0.3s ease';
      }
    }

    // Function to close drawer
    function closeDrawer() {
      toolsDrawer.classList.remove('open');
      overlay.classList.remove('visible');
      document.body.style.overflow = '';
      // Rotate chevron back
      const chevron = toolsBtn.querySelector('.chevron-icon');
      if (chevron) {
        chevron.style.transform = 'rotate(0deg)';
      }
    }

    // Toggle drawer on button click
    toolsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (toolsDrawer.classList.contains('open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    // Close drawer when clicking overlay
    overlay.addEventListener('click', closeDrawer);

    // Close drawer when clicking close button
    const closeBtn = document.getElementById('closeToolsDrawerBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toolsDrawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // Prevent drawer from closing when clicking inside content
    toolsDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    console.log('Tools drawer initialized with chevron icon');
  }
})();