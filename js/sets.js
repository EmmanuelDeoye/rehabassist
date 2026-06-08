// js/sets.js – Settings page functionality

document.addEventListener('DOMContentLoaded', async () => {
  const auth = firebase.auth();
  const db = firebase.database();
  let currentUser = null;
  let pendingAction = null;

  // DOM Elements
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileSpecialization = document.getElementById('profileSpecialization');
  const updateProfileBtn = document.getElementById('updateProfileBtn');
  const currentPassword = document.getElementById('currentPassword');
  const newPassword = document.getElementById('newPassword');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const subPlan = document.getElementById('subPlan');
  const subBilling = document.getElementById('subBilling');
  const subNextDate = document.getElementById('subNextDate');
  const subAutoRenew = document.getElementById('subAutoRenew');
  const noSubscriptionMsg = document.getElementById('noSubscriptionMsg');
  const subscriptionInfo = document.getElementById('subscriptionInfo');
  const cancelRenewalSection = document.getElementById('cancelRenewalSection');
  const notifToggle = document.getElementById('notifToggle');
  const savePrefsBtn = document.getElementById('savePrefsBtn');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  const themeOptions = document.querySelectorAll('.theme-option');
  const confirmModal = document.getElementById('confirmModal');
  const confirmMessage = document.getElementById('confirmMessage');
  const confirmProceedBtn = document.getElementById('confirmProceedBtn');
  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  const closeConfirmModal = document.getElementById('closeConfirmModal');

  // ==================== TOAST SYSTEM ====================
  function showToast(message, type = 'success') {
    console.log('Showing toast:', message, type);
    
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.custom-toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast container if needed
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.style.cssText = `
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
      `;
      document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    
    // Set colors based on type
    let bgColor = '#10b981'; // success green
    let icon = '✓';
    
    if (type === 'error') {
      bgColor = '#dc2626'; // error red
      icon = '⚠️';
    } else if (type === 'info') {
      bgColor = '#3b82f6'; // info blue
      icon = 'ℹ️';
    } else if (type === 'warning') {
      bgColor = '#f59e0b'; // warning orange
      icon = '⚠️';
    }
    
    toast.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 0.875rem 1.75rem;
      border-radius: 3rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    toast.innerHTML = `<span style="font-size: 1rem;">${icon}</span> ${message}`;
    
    // Add animation styles if not present
    if (!document.querySelector('#toast-animation-style')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-style';
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  // ==================== CONFIRMATION MODAL ====================
  function openConfirmModal(message, callback) {
    if (confirmMessage) confirmMessage.textContent = message;
    pendingAction = callback;
    if (confirmModal) {
      confirmModal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeConfirmModalHandler() {
    if (confirmModal) confirmModal.classList.remove('show');
    document.body.style.overflow = '';
    pendingAction = null;
  }

  // ==================== UPDATE NAVBAR PROFILE ====================
  async function updateNavbarProfile(user) {
    try {
      const userSnap = await db.ref(`users/${user.uid}`).once('value');
      const userData = userSnap.val() || {};
      const displayName = userData.name || user.displayName || user.email?.split('@')[0] || 'User';
      
      // Try to find navbar profile elements (they might be in different places)
      const navbarProfileName = document.querySelector('#profileName');
      const navbarProfileIcon = document.querySelector('#profileIcon');
      
      if (navbarProfileName && navbarProfileName.tagName === 'SPAN') {
        navbarProfileName.textContent = displayName;
      }
      if (navbarProfileIcon) {
        navbarProfileIcon.textContent = displayName.charAt(0).toUpperCase();
      }
      
      // Also try to find any element with class 'profile-name'
      const altProfileNames = document.querySelectorAll('.profile-name');
      altProfileNames.forEach(el => {
        if (el !== profileName) { // Don't override the input field
          el.textContent = displayName;
        }
      });
      
    } catch (error) {
      console.error('Error updating navbar:', error);
    }
  }

  // ==================== LOAD USER DATA ====================
  async function loadUserData(user) {
    if (!user) {
      console.log('No user found');
      return;
    }
    
    currentUser = user;
    const uid = user.uid;
    
    console.log('Loading user data for UID:', uid);
    console.log('User email:', user.email);
    
    try {
      // Get user data from database
      const userSnap = await db.ref(`users/${uid}`).once('value');
      const userData = userSnap.val() || {};
      
      console.log('Database user data:', userData);
      
      // IMPORTANT: Get name from database FIRST, then fallback to auth displayName
      let displayName = '';
      
      // Method 1: Check database name field
      if (userData.name && userData.name.trim() !== '') {
        displayName = userData.name;
        console.log('Found name in database:', displayName);
      }
      
      // Method 2: Check auth displayName
      if (!displayName && user.displayName && user.displayName.trim() !== '') {
        displayName = user.displayName;
        console.log('Found name in auth displayName:', displayName);
      }
      
      // Method 3: Extract from email
      if (!displayName && user.email) {
        displayName = user.email.split('@')[0];
        console.log('Extracted name from email:', displayName);
      }
      
      console.log('Final display name to display:', displayName);
      
      // Set the input field value
      if (profileName) {
        if (displayName) {
          profileName.value = displayName;
          profileName.placeholder = '';
        } else {
          profileName.value = '';
          profileName.placeholder = 'Enter your full name';
        }
      }
      
      // Set email
      if (profileEmail) {
        profileEmail.value = user.email || '';
      }
      
      // Set specialization
      if (profileSpecialization) {
        profileSpecialization.value = userData.specialization || '';
      }
      
      // IMPORTANT: If name exists in auth but not in database, save it
      if ((!userData.name || userData.name === '') && user.displayName && user.displayName.trim() !== '') {
        console.log('Syncing name from Auth to Database:', user.displayName);
        await db.ref(`users/${uid}`).update({
          name: user.displayName,
          email: user.email,
          updatedAt: new Date().toISOString()
        });
        showToast('Profile synced successfully', 'success');
      }
      
      // If still no name, show a gentle reminder
      if (!displayName && profileName) {
        setTimeout(() => {
          showToast('Please enter your name and click Update Profile', 'info');
        }, 1000);
      }
      
      // Update navbar
      await updateNavbarProfile(user);
      
      // ==================== LOAD SUBSCRIPTION ====================
      const subSnap = await db.ref(`users/${uid}/subscription`).once('value');
      const sub = subSnap.val();
      
      console.log('Subscription data:', sub);
      
      if (sub && sub.plan && sub.plan !== 'free') {
        if (subscriptionInfo) subscriptionInfo.style.display = 'block';
        if (noSubscriptionMsg) noSubscriptionMsg.style.display = 'none';
        
        if (subPlan) {
          subPlan.textContent = sub.plan === 'student' ? '🎓 Student' : '💎 Pro';
        }
        
        if (subBilling) {
          subBilling.textContent = sub.billing === 'monthly' ? 'Monthly' : 'Yearly';
        }
        
        if (sub.ends && subNextDate) {
          const endDate = new Date(sub.ends);
          subNextDate.textContent = endDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        } else if (subNextDate) {
          subNextDate.textContent = 'N/A';
        }
        
        const autoRenew = sub.autoRenew !== false;
        
        if (subAutoRenew) {
          subAutoRenew.innerHTML = autoRenew 
            ? '<span class="badge-success">Enabled ✓</span>' 
            : '<span class="badge-warning">Disabled ✗</span>';
        }
        
        if (cancelRenewalSection) {
          if (autoRenew) {
            cancelRenewalSection.innerHTML = `
              <button class="btn-settings-secondary" id="cancelAutoRenewBtn" style="margin-top: 1rem; background: #dc2626; color: white; width: 100%;">
                <i class="fas fa-ban"></i> Cancel Auto-Renewal
              </button>
            `;
            const cancelBtn = document.getElementById('cancelAutoRenewBtn');
            if (cancelBtn) {
              cancelBtn.addEventListener('click', () => {
                openConfirmModal(
                  "Are you sure you want to cancel auto-renewal? Your subscription will remain active until the current period ends, and you will not be charged again.",
                  async () => {
                    await db.ref(`users/${uid}/subscription/autoRenew`).set(false);
                    showToast("Auto-renewal cancelled successfully", 'success');
                    loadUserData(user);
                  }
                );
              });
            }
          } else {
            cancelRenewalSection.innerHTML = '<p style="font-size: 0.8rem; color: var(--settings-text-secondary); margin-top: 1rem; text-align: center;">Auto-renewal is OFF. Your subscription will not renew.</p>';
          }
        }
      } else {
        if (subscriptionInfo) subscriptionInfo.style.display = 'none';
        if (noSubscriptionMsg) noSubscriptionMsg.style.display = 'block';
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
      showToast('Error loading profile data: ' + error.message, 'error');
    }
  }

  // ==================== UPDATE PROFILE ====================
  if (updateProfileBtn) {
    updateProfileBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showToast("Please log in first", 'error');
        return;
      }
      
      const name = profileName ? profileName.value.trim() : '';
      const specialization = profileSpecialization ? profileSpecialization.value : '';
      
      if (!name) {
        showToast("Please enter your name", 'error');
        profileName.focus();
        return;
      }
      
      console.log('Updating profile - Name:', name, 'Specialization:', specialization);
      
      try {
        // Update database
        await db.ref(`users/${currentUser.uid}`).update({
          name: name,
          specialization: specialization,
          email: currentUser.email,
          updatedAt: new Date().toISOString()
        });
        
        // Update Firebase Auth displayName
        await currentUser.updateProfile({ displayName: name });
        
        // Force refresh user object
        await currentUser.reload();
        
        // Update navbar
        await updateNavbarProfile(currentUser);
        
        showToast("Profile updated successfully", 'success');
        
        // Reload data to ensure consistency
        await loadUserData(currentUser);
        
      } catch (error) {
        console.error('Update error:', error);
        showToast(error.message || 'Error updating profile', 'error');
      }
    });
  }

  // ==================== CHANGE PASSWORD ====================
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showToast("Please log in first", 'error');
        return;
      }
      
      const currentPwd = currentPassword ? currentPassword.value : '';
      const newPwd = newPassword ? newPassword.value : '';
      
      if (!currentPwd || !newPwd) {
        showToast("Please fill in both password fields", 'error');
        return;
      }
      
      if (newPwd.length < 6) {
        showToast("New password must be at least 6 characters", 'error');
        return;
      }
      
      try {
        const credential = firebase.auth.EmailAuthProvider.credential(
          currentUser.email,
          currentPwd
        );
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPwd);
        showToast("Password changed successfully", 'success');
        if (currentPassword) currentPassword.value = '';
        if (newPassword) newPassword.value = '';
      } catch (error) {
        console.error('Password error:', error);
        if (error.code === 'auth/wrong-password') {
          showToast("Current password is incorrect", 'error');
        } else if (error.code === 'auth/weak-password') {
          showToast("New password is too weak. Use at least 6 characters.", 'error');
        } else {
          showToast(error.message, 'error');
        }
      }
    });
  }

  // ==================== THEME OPTIONS ====================
  function applyTheme(theme) {
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('rehab-theme', theme);
    
    // Update active state
    themeOptions.forEach(option => {
      if (option.dataset.theme === theme) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
  }
  
  const savedTheme = localStorage.getItem('rehab-theme') || 'system';
  applyTheme(savedTheme);
  
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      applyTheme(option.dataset.theme);
      showToast(`Theme changed to ${option.dataset.theme}`, 'success');
    });
  });

  // ==================== SAVE PREFERENCES ====================
  if (savePrefsBtn) {
    savePrefsBtn.addEventListener('click', () => {
      const notifEnabled = notifToggle ? notifToggle.checked : false;
      localStorage.setItem('rehab-notifications', notifEnabled);
      showToast("Preferences saved successfully", 'success');
    });
  }
  
  // Load notification preference
  const savedNotif = localStorage.getItem('rehab-notifications');
  if (notifToggle && savedNotif !== null) {
    notifToggle.checked = savedNotif === 'true';
  }

  // ==================== DELETE ACCOUNT ====================
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', () => {
      openConfirmModal(
        "⚠️ PERMANENT ACTION: All your data including profile, analyses, and subscription history will be deleted forever. This cannot be undone. Are you absolutely sure?",
        async () => {
          if (!currentUser) return;
          try {
            // Delete user data from database
            await db.ref(`users/${currentUser.uid}`).remove();
            // Delete the auth account
            await currentUser.delete();
            showToast("Account deleted successfully. Redirecting...", 'success');
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 2000);
          } catch (error) {
            console.error('Delete error:', error);
            if (error.code === 'auth/requires-recent-login') {
              showToast("Please log out and log back in before deleting your account", 'error');
            } else {
              showToast(error.message, 'error');
            }
          }
        }
      );
    });
  }

  // ==================== CONFIRM MODAL HANDLERS ====================
  if (confirmProceedBtn) {
    confirmProceedBtn.addEventListener('click', () => {
      if (pendingAction) pendingAction();
      closeConfirmModalHandler();
    });
  }
  
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', closeConfirmModalHandler);
  }
  
  if (closeConfirmModal) {
    closeConfirmModal.addEventListener('click', closeConfirmModalHandler);
  }
  
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) closeConfirmModalHandler();
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmModal?.classList.contains('show')) {
      closeConfirmModalHandler();
    }
  });

  // ==================== THEME TOGGLE (NAVBAR) ====================
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
    });
  }

  // ==================== AUTH STATE LISTENER ====================
  auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Logged out');
    
    if (!user) {
      // Redirect to home if not logged in
      window.location.href = 'index.html';
      return;
    }
    
    // Small delay to ensure Firebase is ready
    setTimeout(async () => {
      await loadUserData(user);
    }, 100);
  });
  
  // ==================== DEBUG HELPER (Remove in production) ====================
  window.debugSettings = async function() {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user logged in');
      return;
    }
    const snap = await db.ref(`users/${user.uid}`).once('value');
    console.log('Full user data:', snap.val());
    console.log('Auth displayName:', user.displayName);
    console.log('Auth email:', user.email);
  };
});