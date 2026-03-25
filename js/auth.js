// js/auth.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('Auth.js loaded with Firebase Realtime Database');
  
  // Check if Firebase is initialized
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded!');
    return;
  }
  
  // Wait a moment for Firebase to fully initialize
  setTimeout(initializeAuth, 100);
});

function initializeAuth() {
  if (firebase.apps.length === 0) {
    console.error('Firebase not initialized.');
    return;
  }

  // DOM Elements with null checks
  const modal = document.getElementById('authModal');
  const loginBtn = document.getElementById('loginBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const profileBtn = document.getElementById('profileBtn');
  const profileIcon = document.getElementById('profileIcon');
  const profileName = document.getElementById('profileName');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const logoutMenuItem = document.getElementById('logoutMenuItem');
  const profileMenuItem = document.getElementById('profileMenuItem');
  const settingsMenuItem = document.getElementById('settingsMenuItem');
  const closeBtn = document.getElementById('closeModal');
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toast = document.getElementById('toast');
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  const heroTitle = document.getElementById('heroTitle');
  const forgotPassword = document.getElementById('forgotPassword');

  // Check if critical elements exist
  if (!modal || !loginBtn || !closeBtn) {
    console.error('Critical auth elements are missing!');
    return;
  }

  // Get Firebase instances
  const auth = firebase.auth();
  const database = firebase.database();

  // Show toast message
  function showToast(message, duration = 3000, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.background = isError ? '#dc2626' : 'var(--accent)';
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // Show welcome animation
  function showWelcomeAnimation() {
    if (!welcomeOverlay) return;
    welcomeOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
      welcomeOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }, 4000);
  }

  // Get user initials for profile icon
  function getUserInitials(name) {
    if (!name) return '👤';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Update hero title based on auth state
  function updateHeroTitle(user) {
    if (!heroTitle) return;
    
    if (user) {
      const userId = user.uid;
      database.ref('users/' + userId).once('value').then((snapshot) => {
        const userData = snapshot.val();
        const displayName = userData && userData.name ? userData.name : user.displayName || user.email.split('@')[0];
        heroTitle.innerHTML = `Welcome <span class="hero-accent">${displayName}</span>`;
        
        if (profileName) profileName.textContent = displayName;
        if (profileIcon) profileIcon.textContent = getUserInitials(displayName);
      }).catch((error) => {
        console.error('Error fetching user data:', error);
        const emailName = user.email.split('@')[0];
        heroTitle.innerHTML = `Welcome <span class="hero-accent">${emailName}</span>`;
        if (profileName) profileName.textContent = emailName;
        if (profileIcon) profileIcon.textContent = getUserInitials(emailName);
      });
    } else {
      heroTitle.innerHTML = `rehab.ai <span class="hero-accent">AI tools</span>`;
    }
  }

  // Update UI based on auth state
  function updateAuthUI(user) {
    if (!loginBtn || !profileDropdown) return;
    
    if (user) {
      loginBtn.style.display = 'none';
      profileDropdown.style.display = 'inline-block';
      updateHeroTitle(user);
    } else {
      loginBtn.style.display = 'inline-block';
      profileDropdown.style.display = 'none';
      updateHeroTitle(null);
    }
  }

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
    if (user) {
      console.log('User logged in:', user.email);
    } else {
      console.log('User logged out');
    }
  });

  // Only add event listeners if elements exist
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      if (loginError) loginError.textContent = '';
      if (registerError) registerError.textContent = '';
    });
  }

  if (profileBtn && dropdownMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdownMenu && profileBtn && !profileBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });

  if (profileMenuItem) {
    profileMenuItem.addEventListener('click', () => {
      if (dropdownMenu) dropdownMenu.classList.remove('show');
      showToast('👤 Profile page coming soon!');
    });
  }

  if (settingsMenuItem) {
    settingsMenuItem.addEventListener('click', () => {
      if (dropdownMenu) dropdownMenu.classList.remove('show');
      showToast('⚙️ Settings page coming soon!');
    });
  }

  if (logoutMenuItem) {
    logoutMenuItem.addEventListener('click', async () => {
      if (dropdownMenu) dropdownMenu.classList.remove('show');
      try {
        await auth.signOut();
        showToast('👋 Logged out successfully!');
      } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out. Please try again.', 3000, true);
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  // Click outside to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Tab switching
  if (loginTab && registerTab && loginForm && registerForm) {
    loginTab.addEventListener('click', () => {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      if (loginError) loginError.textContent = '';
      if (registerError) registerError.textContent = '';
    });

    registerTab.addEventListener('click', () => {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      if (loginError) loginError.textContent = '';
      if (registerError) registerError.textContent = '';
    });
  }

  // Close modal function
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
    if (loginForm) loginForm.reset();
    if (registerForm) registerForm.reset();
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
  }

  // Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
      closeModal();
    }
  });

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail')?.value;
      const password = document.getElementById('loginPassword')?.value;
      const submitBtn = document.getElementById('loginSubmitBtn');
      
      if (!email || !password) return;
      
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Logging in...';
        }
        if (loginError) loginError.textContent = '';
        
        await auth.signInWithEmailAndPassword(email, password);
        closeModal();
        showToast(`👋 Welcome back!`);
        
      } catch (error) {
        console.error('Login error:', error);
        if (loginError) loginError.textContent = 'Login failed. ' + error.message;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }

  // Register form submission
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('regName')?.value;
      const email = document.getElementById('regEmail')?.value;
      const password = document.getElementById('regPassword')?.value;
      const repeatPassword = document.getElementById('regRepeatPassword')?.value;
      const specialization = document.getElementById('voiceRange')?.value;
      const terms = document.getElementById('terms')?.checked;
      const submitBtn = document.getElementById('registerSubmitBtn');
      
      if (!name || !email || !password || !repeatPassword || !specialization || !terms) return;
      
      if (password !== repeatPassword) {
        if (registerError) registerError.textContent = 'Passwords do not match!';
        return;
      }
      
      if (password.length < 6) {
        if (registerError) registerError.textContent = 'Password must be at least 6 characters.';
        return;
      }
      
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating account...';
        }
        if (registerError) registerError.textContent = '';
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });
        
        await database.ref('users/' + user.uid).set({
          name: name,
          email: email,
          specialization: specialization,
          createdAt: new Date().toISOString(),
          termsAgreed: true,
          userId: user.uid
        });
        
        closeModal();
        showWelcomeAnimation();
        
      } catch (error) {
        console.error('Registration error:', error);
        if (registerError) registerError.textContent = 'Registration failed. ' + error.message;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    });
  }

  // Forgot password
  if (forgotPassword) {
    forgotPassword.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      
      if (!email) {
        if (loginError) loginError.textContent = 'Please enter your email address.';
        return;
      }
      
      try {
        await auth.sendPasswordResetEmail(email);
        showToast('📧 Password reset email sent!');
        closeModal();
      } catch (error) {
        console.error('Password reset error:', error);
        if (loginError) loginError.textContent = 'Error sending reset email.';
      }
    });
  }

  // Close welcome overlay on click
  if (welcomeOverlay) {
    welcomeOverlay.addEventListener('click', () => {
      welcomeOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  console.log('Auth.js initialization complete');
}