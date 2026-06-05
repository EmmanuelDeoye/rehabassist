// js/plan.js – Feature gating based on subscription plan

(function () {
  const database = firebase.database();
  const auth = firebase.auth();

  // Minimum plan required for each feature
  const featureMinPlans = {
    assessment: 'free',
    standardized: 'free',
    documentation: 'free',
    rom: 'free',        // free with limited usage (1/mo)
    gait: 'student',    // student gets 5/mo, pro unlimited
    presentation: 'pro',
    assignment: 'student',
    project: 'student',
    study: 'student',
    exam: 'student',
  };

  // Numeric level for comparison
  const planLevel = { free: 0, student: 1, pro: 2 };

  let currentPlan = null; // 'free' | 'student' | 'pro' | null

  // Check whether a feature is allowed
  function isFeatureAllowed(feature) {
    if (!currentPlan) return false;
    const required = featureMinPlans[feature];
    if (!required) return false;
    return (planLevel[currentPlan] || 0) >= (planLevel[required] || 0);
  }

  // Expose current plan
  function getCurrentPlan() {
    return currentPlan;
  }

  // Fetch and cache user's subscription
  async function loadSubscription(user) {
    if (!user) {
      currentPlan = null;
      dispatchUpdate();
      return;
    }
    try {
      const snap = await database.ref(`users/${user.uid}/subscription`).once('value');
      const sub = snap.val();
      if (sub && sub.plan && planLevel[sub.plan] !== undefined) {
        currentPlan = sub.plan;
      } else {
        // No subscription → treat as free & persist it
        currentPlan = 'free';
        await database.ref(`users/${user.uid}/subscription`).set({
          plan: 'free',
          starts: new Date().toISOString(),
          ends: new Date(2099, 11, 31).toISOString(),
          renewal: 'manual',
        });
      }
    } catch (error) {
      console.error('[plan.js] Subscription fetch failed:', error);
      currentPlan = 'free'; // fallback
    }
    dispatchUpdate();
  }

  // Fire custom event so pages can react
  function dispatchUpdate() {
    document.dispatchEvent(
      new CustomEvent('planUpdated', { detail: { plan: currentPlan } })
    );
  }

  // Listen to auth changes and load subscription
  auth.onAuthStateChanged((user) => loadSubscription(user));

  // Expose public API
  window.rehabPlans = {
    isFeatureAllowed,
    getCurrentPlan,
    planLevel,
    featureMinPlans,

    // Default upgrade prompt (can be overridden by page)
    showUpgradePrompt(feature) {
      const required = featureMinPlans[feature] || 'pro';
      const names = { free: 'Free', student: 'Student', pro: 'Pro' };
      const msg = `This feature requires the ${names[required]} plan. Please upgrade to continue.`;
      // Use a toast if available, otherwise alert
      if (typeof showToast === 'function') {
        showToast(msg, 'error', 5000);
      } else {
        alert(msg);
      }
    },
  };
})();