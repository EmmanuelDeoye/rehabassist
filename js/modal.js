// js/auth-modal.js
// Dynamic Auth Modal Creator

function setupPasswordToggles() {
  // Select all password inputs in the modal
  const passwordInputs = document.querySelectorAll('#loginPassword, #regPassword, #regRepeatPassword');
  
  passwordInputs.forEach(input => {
    // Create wrapper if not already wrapped
    if (!input.parentElement.classList.contains('password-input-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'password-input-wrapper';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      
      // Create toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'password-toggle-btn';
      toggleBtn.setAttribute('aria-label', 'Show password');
      toggleBtn.innerHTML = `
        <svg class="eye-icon eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <svg class="eye-icon eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
        </svg>
      `;
      
      wrapper.appendChild(toggleBtn);
      
      // Toggle functionality
      toggleBtn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        // Toggle eye icons
        const eyeOpen = toggleBtn.querySelector('.eye-open');
        const eyeClosed = toggleBtn.querySelector('.eye-closed');
        
        if (isPassword) {
          eyeOpen.style.display = 'none';
          eyeClosed.style.display = 'block';
          toggleBtn.setAttribute('aria-label', 'Hide password');
        } else {
          eyeOpen.style.display = 'block';
          eyeClosed.style.display = 'none';
          toggleBtn.setAttribute('aria-label', 'Show password');
        }
      });
    }
  });
}

function createAuthModal() {
  // Check if modal already exists
  if (document.getElementById('authModal')) {
    return;
  }

  // Create modal HTML
  const modalHTML = `
    <div id="authModal" class="modal">
      <div class="modal-content glass">
        <button class="modal-close" id="closeModal">&times;</button>
        
        <!-- Tabs -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="loginTab">Login</button>
          <button class="auth-tab" id="registerTab">Register</button>
        </div>

        <!-- Login Form -->
        <form id="loginForm" class="auth-form active">
          <h2>Welcome Back</h2>
          <div class="form-group">
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="loginPassword">Password</label>
            <input type="password" id="loginPassword" required placeholder="••••••••">
          </div>
          <div class="form-footer">
            <a href="#" class="forgot-link" id="forgotPassword">Forgot password?</a>
          </div>
          <div class="form-group checkbox">
            <input type="checkbox" id="loginTerms" required>
            <label for="loginTerms">I agree to the <a href="terms_and_condition.html" target="_blank">terms and conditions</a></label>
          </div>
          <button type="submit" class="auth-btn" id="loginSubmitBtn">Login</button>
          <div id="loginError" class="error-message"></div>
        </form>

        <!-- Register Form -->
        <form id="registerForm" class="auth-form">
          <h2>Join rehablix</h2>
          <div class="form-group">
            <label for="regName">Full Name</label>
            <input type="text" id="regName" required placeholder="Your name">
          </div>
          <div class="form-group">
            <label for="regEmail">Email</label>
            <input type="email" id="regEmail" required placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label for="regPassword">Password</label>
            <input type="password" id="regPassword" required placeholder="••••••••" minlength="6">
          </div>
          <div class="form-group">
            <label for="regRepeatPassword">Repeat Password</label>
            <input type="password" id="regRepeatPassword" required placeholder="••••••••" minlength="6">
          </div>
          <div class="form-group">
            <label for="voiceRange">Specialization</label>
            <select id="voiceRange" required>
              <option value="">Select your area</option>
              <option value="occupational therapy">Occupational Therapy</option>
              <option value="psychology">Psychology</option>
              <option value="speech therapy">Speech Therapy</option>
              <option value="physiotherapy">Physiotherapy</option>
              <option value="Doctor">Doctor/Consultant</option>
            </select>
          </div>
          <div class="form-group checkbox">
            <input type="checkbox" id="registerTerms" required>
            <label for="registerTerms">I agree to the <a href="terms_and_condition.html" target="_blank">terms and conditions</a></label>
          </div>
          <button type="submit" class="auth-btn" id="registerSubmitBtn">Create Account</button>
          <div id="registerError" class="error-message"></div>
        </form>

        <!-- Divider -->
        <div class="auth-divider">
          <span>or</span>
        </div>

        <!-- Google Sign-In Button -->
        <div class="google-signin-container">
          <button type="button" class="google-signin-btn" id="googleSignInBtn">
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  `;

  // Create toast element if it doesn't exist
  if (!document.getElementById('toast')) {
    const toastHTML = `<div id="toast" class="toast hidden"></div>`;
    document.body.insertAdjacentHTML('beforeend', toastHTML);
  }

  // Create welcome overlay if it doesn't exist
  if (!document.getElementById('welcomeOverlay')) {
    const overlayHTML = `
      <div id="welcomeOverlay" class="welcome-overlay hidden">
        <div class="welcome-card glass">
          <div class="welcome-content">
            <h2>🎉 Welcome to rehablix! 🎉</h2>
            <p>Your intelligent rehabilitation assistant</p>
            <div class="welcome-icon">⚕️</div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', overlayHTML);
  }

  // Create login button if it doesn't exist
  if (!document.getElementById('loginBtn')) {
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      // Create login button element
      const loginBtn = document.createElement('button');
      loginBtn.id = 'loginBtn';
      loginBtn.className = 'btn-login';
      loginBtn.textContent = 'Login';
      // Initially hidden until auth determines state
      loginBtn.style.display = 'none';
      
      // Find the theme toggle button to insert login button after it
      const themeToggle = navRight.querySelector('.theme-toggle');
      if (themeToggle && themeToggle.parentNode === navRight) {
        // Insert after theme toggle
        themeToggle.insertAdjacentElement('afterend', loginBtn);
      } else {
        // Fallback: append to the end
        navRight.appendChild(loginBtn);
      }
    }
  }

  // Create profile dropdown if it doesn't exist
  if (!document.getElementById('profileDropdown')) {
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      const profileHTML = `
        <div class="profile-dropdown" id="profileDropdown" style="display: none;">
          <button class="btn-profile" id="profileBtn">
            <span class="profile-icon" id="profileIcon">👤</span>
            <span class="profile-name" id="profileName"></span>
          </button>
          <div class="dropdown-menu" id="dropdownMenu">
            <button class="dropdown-item" id="profileMenuItem">
              <span>👤</span> My Profile
            </button>
            <button class="dropdown-item" id="settingsMenuItem">
              <span>⚙️</span> Settings
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" id="logoutMenuItem">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      `;
      navRight.insertAdjacentHTML('beforeend', profileHTML);
    }
  }

  // Insert modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Setup password toggles
  setupPasswordToggles();

  console.log('Auth modal created dynamically');
}

// Auto-create modal when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createAuthModal);
} else {
  createAuthModal();
}