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

  // ----- PWA Install Button -----
  let deferredPrompt;
  
  // Create the install button
  const installBtn = document.createElement('button');
  installBtn.id = 'installAppBtn';
  installBtn.className = 'floating-install-btn';
  installBtn.innerHTML = `
    <span class="install-icon">📲</span>
    <span>Install App</span>
  `;
  document.body.appendChild(installBtn);

  // Check if app is already installed (running in standalone mode)
  function isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.matchMedia('(display-mode: fullscreen)').matches ||
           window.matchMedia('(display-mode: minimal-ui)').matches ||
           navigator.standalone || // iOS Safari
           false;
  }

  // Remove button if already installed
  if (isAppInstalled()) {
    installBtn.remove();
    console.log('App already installed, removing install button');
  } else {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the default mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      deferredPrompt = e;
      // Show the install button with a subtle animation
      setTimeout(() => {
        installBtn.classList.add('visible');
      }, 1000); // Delay appearance slightly for better UX
      console.log('beforeinstallprompt fired - install button shown');
    });

    // Handle install button click
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        console.log('No deferred prompt available');
        // Fallback: show instructions based on platform
        showInstallInstructions();
        return;
      }

      try {
        // Show the native install prompt
        deferredPrompt.prompt();
        
        // Wait for the user's choice
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install: ${outcome}`);
        
        // Clear the deferred prompt
        deferredPrompt = null;
        
        // Hide the button regardless of outcome
        installBtn.classList.remove('visible');
        
        // If user accepted, show success feedback
        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
          // Optional: show a toast or redirect
          setTimeout(() => {
            installBtn.remove();
          }, 300);
        }
      } catch (error) {
        console.error('Install prompt error:', error);
        installBtn.classList.remove('visible');
      }
    });

    // Track when the app is successfully installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed successfully');
      installBtn.classList.remove('visible');
      setTimeout(() => {
        installBtn.remove();
      }, 300);
      
      // Optional: Show a success toast
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = '✅ App installed successfully!';
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
      }
    });

    // Fallback: if beforeinstallprompt never fires but app isn't installed
    setTimeout(() => {
      if (!deferredPrompt && !isAppInstalled()) {
        // Show button anyway with install instructions
        installBtn.classList.add('visible');
        installBtn.addEventListener('click', showInstallInstructions, { once: true });
      }
    }, 3000);
  }

  // Show platform-specific install instructions
  function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isDesktop = !isIOS && !isAndroid;
    
    let message = '';
    if (isIOS) {
      message = '📱 Tap the Share button and select "Add to Home Screen"';
    } else if (isAndroid) {
      message = '📱 Tap the menu (⋮) and select "Install app" or "Add to Home Screen"';
    } else {
      message = '💻 Click the install icon in your browser\'s address bar';
    }
    
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