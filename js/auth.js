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
  const googleSignInBtn = document.getElementById('googleSignInBtn');
  
  // Get the history navigation button element (supports both IDs used across pages)
  const historyNavBtn = document.getElementById('historyNavBtn');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  // Use whichever button exists in the current page
  const historyButton = historyNavBtn || toggleHistoryBtn;

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

  // Get user initials for profile icon
  function getUserInitials(name) {
    if (!name) return '👤';
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Translate Firebase error codes to friendly messages
  function getFriendlyErrorMessage(error) {
    const errorCode = error.code || '';
    
    const errorMessages = {
      // Login errors
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/user-disabled': 'This account has been disabled. Please contact support.',
      'auth/user-not-found': 'No account found with this email. Would you like to create one?',
      'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
      'auth/invalid-credential': 'Incorrect email or password. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
      
      // Registration errors
      'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
      'auth/weak-password': 'Please choose a stronger password — at least 6 characters.',
      'auth/operation-not-allowed': 'Registration is currently unavailable. Please try again later.',
      
      // Google sign-in errors
      'auth/popup-closed-by-user': 'Sign-in was cancelled.',
      'auth/popup-blocked': 'Pop-up was blocked by your browser. Please allow pop-ups for this site.',
      'auth/cancelled-popup-request': 'Sign-in was cancelled.',
      'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method. Try logging in with email and password instead.',
      
      // Password reset errors
      'auth/missing-email': 'Please enter your email address first.',
      
      // Generic / network errors
      'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
      'auth/internal-error': 'Something went wrong on our end. Please try again in a moment.',
      'auth/timeout': 'The request timed out. Please check your connection and try again.',
    };
    
    // Return friendly message if we have one, otherwise a clean generic message
    if (errorMessages[errorCode]) {
      return errorMessages[errorCode];
    }
    
    // Fallback: if Firebase gave us a message, clean it up
    if (error.message) {
      // Remove "Firebase: " prefix and " (auth/...)" suffix
      let cleanMessage = error.message
        .replace(/^Firebase:\s*/i, '')
        .replace(/\s*\(auth\/[^)]+\)\s*$/i, '')
        .trim();
      
      // If it still looks technical, use a generic message
      if (cleanMessage.length > 100 || cleanMessage.includes('{')) {
        return 'Something went wrong. Please try again.';
      }
      
      return cleanMessage;
    }
    
    return 'Something went wrong. Please try again.';
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
        if (profileIcon) {
          if (userData && userData.photoURL) {
            profileIcon.innerHTML = `<img src="${userData.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
          } else {
            profileIcon.textContent = getUserInitials(displayName);
          }
        }
      }).catch((error) => {
        console.error('Error fetching user data:', error);
        const emailName = user.email.split('@')[0];
        heroTitle.innerHTML = `Welcome <span class="hero-accent">${emailName}</span>`;
        if (profileName) profileName.textContent = emailName;
        if (profileIcon) profileIcon.textContent = getUserInitials(emailName);
      });
    } else {
      heroTitle.innerHTML = `Welcome to <span class="hero-accent">rehablix</span>`;
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

  // Show or hide the history button based on login state
  function updateHistoryButtonVisibility(user) {
    if (!historyButton) {
      console.warn('History button not found in DOM - this is fine if the page has no history button');
      return;
    }
    
    if (user) {
      // User is logged in: make the history button visible
      historyButton.style.display = 'inline-flex';
      console.log('History button shown (user logged in)');
    } else {
      // User is logged out: hide the history button
      historyButton.style.display = 'none';
      console.log('History button hidden (user logged out)');
    }
  }

  // ============= GOOGLE SIGN-IN =============
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
      const provider = new firebase.auth.GoogleAuthProvider();
      
      try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        
        if (!snapshot.exists()) {
          const userData = {
            name: user.displayName || user.email.split('@')[0],
            email: user.email,
            specialization: '',
            createdAt: new Date().toISOString(),
            userId: user.uid,
            photoURL: user.photoURL || '',
            provider: 'google',
            termsAgreed: true,
            termsAgreedAt: new Date().toISOString()
          };
          await userRef.set(userData);
          showToast('🎉 Account created with Google!');
          showWelcomeAnimation();
        } else {
          const existingData = snapshot.val();
          const displayName = existingData.name || user.displayName || user.email.split('@')[0];
          showToast(`👋 Welcome back, ${displayName}!`);
        }
        
        closeModal();
      } catch (error) {
        console.error('Google sign-in error:', error);
        showToast(getFriendlyErrorMessage(error), 4000, true);
      }
    });
  }

  // Listen for auth state changes
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
    // Show/hide the history navigation button based on authentication status
    updateHistoryButtonVisibility(user);
    
    if (user) {
      console.log('User logged in:', user.email);
    } else {
      console.log('User logged out');
    }
  });

  // Event Listeners
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
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
      closeModal();
    }
  });

  // LOGIN FORM HANDLER WITH TERMS VALIDATION
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail')?.value;
      const password = document.getElementById('loginPassword')?.value;
      const loginTerms = document.getElementById('loginTerms')?.checked;
      const submitBtn = document.getElementById('loginSubmitBtn');
      
      if (!email || !password) return;
      
      // Check if terms are agreed
      if (!loginTerms) {
        if (loginError) loginError.textContent = 'Please agree to the terms and conditions.';
        return;
      }
      
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
        if (loginError) loginError.textContent = getFriendlyErrorMessage(error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }

  // REGISTER FORM HANDLER WITH TERMS VALIDATION
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('regName')?.value;
      const email = document.getElementById('regEmail')?.value;
      const password = document.getElementById('regPassword')?.value;
      const repeatPassword = document.getElementById('regRepeatPassword')?.value;
      const specialization = document.getElementById('voiceRange')?.value;
      const registerTerms = document.getElementById('registerTerms')?.checked;
      const submitBtn = document.getElementById('registerSubmitBtn');
      
      if (!name || !email || !password || !repeatPassword || !specialization) return;
      
      // Check if terms are agreed
      if (!registerTerms) {
        if (registerError) registerError.textContent = 'You must agree to the terms and conditions.';
        return;
      }
      
      if (password !== repeatPassword) {
        if (registerError) registerError.textContent = 'Passwords do not match. Please try again.';
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
          termsAgreedAt: new Date().toISOString(),
          userId: user.uid,
          provider: 'email'
        });
        
        closeModal();
        showWelcomeAnimation();
        
      } catch (error) {
        console.error('Registration error:', error);
        if (registerError) registerError.textContent = getFriendlyErrorMessage(error);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    });
  }

  if (forgotPassword) {
    forgotPassword.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      
      if (!email) {
        if (loginError) loginError.textContent = 'Please enter your email address first so we can send you a reset link.';
        return;
      }
      
      try {
        await auth.sendPasswordResetEmail(email);
        showToast('📧 Password reset link sent! Check your inbox.');
        closeModal();
      } catch (error) {
        console.error('Password reset error:', error);
        if (loginError) loginError.textContent = getFriendlyErrorMessage(error);
      }
    });
  }

  if (welcomeOverlay) {
    welcomeOverlay.addEventListener('click', () => {
      welcomeOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  console.log('Auth.js initialization complete');
}