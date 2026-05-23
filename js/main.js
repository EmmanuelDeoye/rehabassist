// js/main.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('rehablix main.js loaded');

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
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterTools(e.target.value);
    });
  }

  // Focus search when magnifying glass is clicked
  const searchToggle = document.getElementById('searchToggle');
  if (searchToggle && searchInput) {
    searchToggle.addEventListener('click', () => {
      searchInput.focus();
    });
  }

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

  if (themeToggle) {
    themeToggle.addEventListener('click', cycleTheme);
  }

  // System theme change listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('rehab-theme') === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      htmlElement.setAttribute('data-theme', systemDark ? 'dark' : 'light');
    }
  });

  // Initialize theme
  initTheme();
  
  // Add click tracking (optional)
  toolCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const toolName = card.querySelector('.tool-title').textContent;
      console.log(`Tool clicked: ${toolName}`);
      // You can add analytics tracking here if needed
    });
  });

  // ----- FAQ Accordion: Keep only one item open at a time -----
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', function() {
      if (this.open) {
        document.querySelectorAll('.faq-item').forEach(other => {
          if (other !== this) other.open = false;
        });
      }
    });
  });
  
  // ----- Floating AI button scroll behavior -----
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

    // Optional: Add click tracking
    floatingBtn.addEventListener('click', () => {
      console.log('AI Assistant button clicked');
      // You can add analytics tracking here
    });
  }

  // ----- PWA Install Button (Enhanced) -----
  let deferredPrompt;
  let installBtnDismissed = false;

  // Create the install button (hidden by default)
  const installBtn = document.createElement('button');
  installBtn.id = 'installAppBtn';
  installBtn.className = 'floating-install-btn';
  installBtn.innerHTML = `
    <span class="install-icon">📲</span>
    <span>Install App</span>
    <span class="install-close" title="Dismiss">&times;</span>
  `;
  document.body.appendChild(installBtn);

  // Check if app is already installed (standalone mode)
  function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           navigator.standalone ||   // iOS Safari
           false;
  }

  // Check if installation was previously completed (persisted)
  function wasPreviouslyInstalled() {
    return localStorage.getItem('pwa-installed') === 'true';
  }

  // Remove button if already installed or previously dismissed
  if (isAppInstalled() || wasPreviouslyInstalled()) {
    installBtn.remove();
    console.log('App installed or previously installed, hiding install button');
  } else {
    // Listen for the install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Show button with a small delay for a smooth entrance
      setTimeout(() => {
        if (!installBtnDismissed) {
          installBtn.classList.add('visible');
        }
      }, 1200);
      console.log('beforeinstallprompt fired - install button shown');
    });

    // Click handler for the install button
    const handleInstall = async () => {
      if (!deferredPrompt) {
        console.log('No install prompt available – showing manual instructions');
        showInstallInstructions();
        return;
      }

      try {
        // Show the native install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);
        
        if (outcome === 'accepted') {
          // Persist that installation happened
          localStorage.setItem('pwa-installed', 'true');
          installBtn.classList.remove('visible');
          // Clean up after animation
          setTimeout(() => installBtn.remove(), 300);
        } else {
          // User dismissed the native prompt; keep button visible but mark deferredPrompt as null
          deferredPrompt = null;
          // Optionally show the button again after a delay if you want to retry
        }
      } catch (error) {
        console.error('Install prompt error:', error);
        deferredPrompt = null;
        // Button stays visible for retry
      }
    };

    // Attach click event to the main button area (not the close button)
    installBtn.addEventListener('click', (e) => {
      if (e.target.classList.contains('install-close')) return; // handled separately
      handleInstall();
    });

    // Dismiss button (close)
    const closeBtn = installBtn.querySelector('.install-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        installBtnDismissed = true;
        installBtn.classList.remove('visible');
        // Remove after transition
        setTimeout(() => installBtn.remove(), 300);
        console.log('Install button dismissed by user');
      });
    }

    // If PWA is installed via other means (e.g., browser menu), clean up
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed');
      localStorage.setItem('pwa-installed', 'true');
      installBtn.classList.remove('visible');
      setTimeout(() => installBtn.remove(), 300);
      
      // Optional: Show a success toast
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '✅ App installed successfully!';
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
      }
    });

    // Fallback: If beforeinstallprompt never fires but app isn't installed, show button after 3s
    setTimeout(() => {
      if (!deferredPrompt && !isAppInstalled() && !installBtnDismissed) {
        installBtn.classList.add('visible');
        // Attach a one‑time instruction fallback
        installBtn.addEventListener('click', () => {
          if (!deferredPrompt) showInstallInstructions();
        }, { once: true });
      }
    }, 3000);
  }

  // Show platform‑specific install instructions (used as fallback)
  function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    let message = '';
    
    if (isIOS) {
      message = '📱 Tap the Share button and then "Add to Home Screen"';
    } else if (isAndroid) {
      message = '📱 Tap the menu (⋮) and then "Install app" or "Add to Home Screen"';
    } else {
      message = '💻 Look for the install icon in your browser\'s address bar';
    }
    
    // Use the toast element if it exists, otherwise fallback to alert
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 5000);
    } else {
      alert(message);
    }
  }

  console.log('rehablix ready');
});
