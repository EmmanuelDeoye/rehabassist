// js/upgrade.js – Country-specific pricing with "99" effect, multi-gateway payments

document.addEventListener('DOMContentLoaded', async () => {

  // ===== DOM Elements =====
  const plansGrid = document.getElementById('plansGrid');
  const paymentModal = document.getElementById('paymentModal');
  const closePaymentModal = document.getElementById('closePaymentModal');
  const paymentMethodsContainer = document.getElementById('paymentMethods');
  const paymentPlanBadge = document.getElementById('paymentPlanBadge');
  const paymentCurrency = document.getElementById('paymentCurrency');
  const paymentAmount = document.getElementById('paymentAmount');
  const paymentPeriod = document.getElementById('paymentPeriod');
  const paymentBilling = document.getElementById('paymentBilling');
  const billingToggle = document.getElementById('billingToggle');
  const locationFlag = document.getElementById('locationFlag');
  const locationText = document.getElementById('locationText');
  const currencyCode = document.getElementById('currencyCode');
  const currencyNotice = document.getElementById('currencyNotice');
  const toastContainer = document.getElementById('toast-container');

  // ===== State =====
  let currentUser = null;
  let currentPlan = 'free';
  let selectedPlan = null;
  let isYearly = false;
  let userCountry = 'US';
  let userCurrency = 'USD';
  let exchangeRate = 1;
  let paymentGateways = [];

  const database = firebase.database();
  const auth = firebase.auth();

  // ===== Base Prices in USD (with "99" effect) =====
  const BASE_PRICES = {
    student: { monthly: 1.99, yearly: 20.99 },
    pro: { monthly: 4.99, yearly: 49.99 }
  };

  // ===== Country Config: Currency, Gateways, Price Multipliers =====
  const COUNTRY_CONFIG = {
    NG: { currency: 'NGN', symbol: '₦', gateways: ['paystack', 'flutterwave'], flag: '🇳🇬', name: 'Nigeria', multiplier: 1550 },
    GH: { currency: 'GHS', symbol: 'GH₵', gateways: ['paystack', 'flutterwave'], flag: '🇬🇭', name: 'Ghana', multiplier: 12.5 },
    KE: { currency: 'KES', symbol: 'KSh', gateways: ['flutterwave'], flag: '🇰🇪', name: 'Kenya', multiplier: 145 },
    ZA: { currency: 'ZAR', symbol: 'R', gateways: ['paystack', 'flutterwave'], flag: '🇿🇦', name: 'South Africa', multiplier: 18.5 },
    US: { currency: 'USD', symbol: '$', gateways: ['gpay'], flag: '🇺🇸', name: 'United States', multiplier: 1 },
    GB: { currency: 'GBP', symbol: '£', gateways: ['gpay'], flag: '🇬🇧', name: 'United Kingdom', multiplier: 0.79 },
    IN: { currency: 'INR', symbol: '₹', gateways: ['gpay'], flag: '🇮🇳', name: 'India', multiplier: 83 },
    CA: { currency: 'CAD', symbol: 'CA$', gateways: ['gpay'], flag: '🇨🇦', name: 'Canada', multiplier: 1.36 },
    AU: { currency: 'AUD', symbol: 'A$', gateways: ['gpay'], flag: '🇦🇺', name: 'Australia', multiplier: 1.53 },
    DE: { currency: 'EUR', symbol: '€', gateways: ['gpay'], flag: '🇩🇪', name: 'Germany', multiplier: 0.92 },
    FR: { currency: 'EUR', symbol: '€', gateways: ['gpay'], flag: '🇫🇷', name: 'France', multiplier: 0.92 },
    BR: { currency: 'BRL', symbol: 'R$', gateways: ['gpay'], flag: '🇧🇷', name: 'Brazil', multiplier: 5.05 },
    TZ: { currency: 'TZS', symbol: 'TSh', gateways: ['flutterwave'], flag: '🇹🇿', name: 'Tanzania', multiplier: 2550 },
    UG: { currency: 'UGX', symbol: 'USh', gateways: ['flutterwave'], flag: '🇺🇬', name: 'Uganda', multiplier: 3800 },
    RW: { currency: 'RWF', symbol: 'RF', gateways: ['flutterwave'], flag: '🇷🇼', name: 'Rwanda', multiplier: 1300 },
    CM: { currency: 'XAF', symbol: 'FCFA', gateways: ['flutterwave'], flag: '🇨🇲', name: 'Cameroon', multiplier: 610 },
    CI: { currency: 'XOF', symbol: 'CFA', gateways: ['flutterwave'], flag: '🇨🇮', name: "Côte d'Ivoire", multiplier: 610 },
    SN: { currency: 'XOF', symbol: 'CFA', gateways: ['flutterwave'], flag: '🇸🇳', name: 'Senegal', multiplier: 610 },
  };

  // Default config for unknown countries
  const DEFAULT_CONFIG = { currency: 'USD', symbol: '$', gateways: ['gpay'], flag: '🌍', name: 'International', multiplier: 1 };

  // ===== Payment Gateway Keys =====
  const PAYSTACK_PUBLIC_KEY = 'pk_live_4c70eb590578eaedff80c3ea23da34d711af4fec';
  const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-b879ba7c16b007a6b9abc7253b739730-X';
  const GPAY_MERCHANT_ID = 'BCR2DN4T2Z2Z3Z2Z'; // Test merchant ID

  // ===== Helpers =====
  function showToast(message, type = 'success', duration = 3500) {
    if (!toastContainer) {
      console.log('Toast:', message);
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function getCountryConfig(countryCode) {
    return COUNTRY_CONFIG[countryCode] || DEFAULT_CONFIG;
  }

  function calculatePrice(basePrice, countryConfig) {
    // Convert USD base to local currency, then apply "99" effect
    let rawPrice = basePrice * countryConfig.multiplier;
    
    // Round to nearest whole number, then subtract 0.01 for "99" effect
    // For amounts < 10, use .99 directly
    if (rawPrice < 10) {
      return Math.round(rawPrice) - 0.01;
    } else if (rawPrice < 100) {
      return Math.round(rawPrice) - 0.01;
    } else if (rawPrice < 1000) {
      return Math.round(rawPrice / 10) * 10 - 1;
    } else {
      return Math.round(rawPrice / 100) * 100 - 1;
    }
  }

  function formatPrice(price, symbol) {
    if (price === 0) return `${symbol}0`;
    // Handle small decimals
    if (price < 1 && price > 0) return `${symbol}${price.toFixed(2)}`;
    // Handle .99 effect
    if (price % 1 !== 0) return `${symbol}${price.toFixed(2)}`;
    return `${symbol}${price.toLocaleString()}`;
  }

  // ===== Detect Location =====
  async function detectLocation() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      userCountry = data.country_code || 'US';
      const config = getCountryConfig(userCountry);
      userCurrency = config.currency;
      exchangeRate = config.multiplier;
      paymentGateways = config.gateways;
      
      // Update UI
      if (locationFlag) locationFlag.textContent = config.flag;
      if (locationText) locationText.textContent = `Prices in ${config.name} (${config.currency})`;
      if (currencyCode) currencyCode.textContent = config.currency;
      if (currencyNotice) currencyNotice.style.display = 'flex';
      
      return config;
    } catch (error) {
      console.error('Location detection failed:', error);
      userCountry = 'US';
      const config = DEFAULT_CONFIG;
      userCurrency = config.currency;
      exchangeRate = config.multiplier;
      paymentGateways = config.gateways;
      
      if (locationFlag) locationFlag.textContent = config.flag;
      if (locationText) locationText.textContent = `Prices in USD (International)`;
      if (currencyCode) currencyCode.textContent = 'USD';
      if (currencyNotice) currencyNotice.style.display = 'flex';
      
      return config;
    }
  }

  // ===== Update Plan Prices =====
  function updatePlanPrices(config) {
    const symbol = config.symbol;
    
    // Update currency symbols
    const freeCurrency = document.getElementById('freeCurrency');
    const studentCurrency = document.getElementById('studentCurrency');
    const proCurrency = document.getElementById('proCurrency');
    
    if (freeCurrency) freeCurrency.textContent = symbol;
    if (studentCurrency) studentCurrency.textContent = symbol;
    if (proCurrency) proCurrency.textContent = symbol;
    
    // Calculate prices with "99" effect
    const studentMonthly = calculatePrice(BASE_PRICES.student.monthly, config);
    const studentYearly = calculatePrice(BASE_PRICES.student.yearly, config);
    const proMonthly = calculatePrice(BASE_PRICES.pro.monthly, config);
    const proYearly = calculatePrice(BASE_PRICES.pro.yearly, config);
    
    // Update displayed prices
    const studentPriceEl = document.getElementById('studentPrice');
    const proPriceEl = document.getElementById('proPrice');
    
    if (studentPriceEl) {
      const price = isYearly ? studentYearly : studentMonthly;
      studentPriceEl.textContent = price.toFixed(2);
    }
    
    if (proPriceEl) {
      const proPrice = isYearly ? proYearly : proMonthly;
      proPriceEl.textContent = proPrice.toFixed(2);
    }
    
    // Update period display
    document.querySelectorAll('.period').forEach(el => {
      el.textContent = isYearly ? '/year' : '/month';
    });
  }

  // ===== Billing Toggle =====
  if (billingToggle) {
    billingToggle.addEventListener('change', () => {
      isYearly = billingToggle.checked;
      const config = getCountryConfig(userCountry);
      updatePlanPrices(config);
      
      // Update toggle labels
      document.querySelectorAll('.toggle-label').forEach(label => {
        label.classList.toggle('active', label.dataset.billing === (isYearly ? 'yearly' : 'monthly'));
      });
    });
  }

  document.querySelectorAll('.toggle-label').forEach(label => {
    label.addEventListener('click', () => {
      const billing = label.dataset.billing;
      isYearly = billing === 'yearly';
      if (billingToggle) billingToggle.checked = isYearly;
      const config = getCountryConfig(userCountry);
      updatePlanPrices(config);
      
      document.querySelectorAll('.toggle-label').forEach(l => {
        l.classList.toggle('active', l.dataset.billing === billing);
      });
    });
  });

  // ===== Function to open Auth Modal =====
  function openAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
      authModal.classList.add('show');
      document.body.style.overflow = 'hidden';
      
      // Ensure login tab is active
      const loginTab = document.getElementById('loginTab');
      const registerTab = document.getElementById('registerTab');
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      
      if (loginTab && registerTab && loginForm && registerForm) {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
      }
    } else {
      // Fallback redirect
      window.location.href = 'index.html';
    }
  }

  // ===== Plan Selection (IMPROVED VERSION) =====
  function attachPlanButtonListeners() {
    console.log('Attaching plan button listeners...');
    const planButtons = document.querySelectorAll('.plan-btn:not(.current-plan)');
    console.log(`Found ${planButtons.length} plan buttons`);
    
    planButtons.forEach(btn => {
      // Remove existing listeners by cloning
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const plan = newBtn.dataset.plan;
        console.log(`Plan button clicked: ${plan}`);
        
        if (!plan || plan === 'free') {
          console.log('Free plan - no action');
          return;
        }

        // Check if user is logged in
        if (!currentUser) {
          console.log('User not logged in, opening auth modal');
          showToast('Please log in to subscribe', 'error', 3000);
          openAuthModal();
          return;
        }

        // User is logged in, proceed with payment
        console.log(`User logged in: ${currentUser.email}, proceeding with ${plan} plan`);
        selectedPlan = plan;
        openPaymentModal(plan);
      });
    });
  }

  // ===== Payment Modal =====
  function openPaymentModal(plan) {
    console.log(`Opening payment modal for ${plan}`);
    if (!paymentModal) {
      console.error('Payment modal element not found');
      showToast('Payment system error. Please refresh the page.', 'error');
      return;
    }
    
    const config = getCountryConfig(userCountry);
    const basePrice = BASE_PRICES[plan][isYearly ? 'yearly' : 'monthly'];
    const price = calculatePrice(basePrice, config);
    
    if (paymentPlanBadge) paymentPlanBadge.textContent = plan === 'student' ? '🎓 Student Plan' : '💎 Pro Plan';
    if (paymentCurrency) paymentCurrency.textContent = config.symbol;
    if (paymentAmount) paymentAmount.textContent = price.toFixed(2);
    if (paymentPeriod) paymentPeriod.textContent = isYearly ? '/year' : '/month';
    if (paymentBilling) paymentBilling.textContent = isYearly ? 'Billed yearly (save 20%)' : 'Billed monthly';
    
    // Render payment methods
    renderPaymentMethods(config);
    
    paymentModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function renderPaymentMethods(config) {
    if (!paymentMethodsContainer) return;
    
    paymentMethodsContainer.innerHTML = '';
    
    config.gateways.forEach(gateway => {
      let iconClass, name, desc, icon;
      
      switch (gateway) {
        case 'paystack':
          iconClass = 'paystack';
          name = 'Paystack';
          desc = 'Card, Bank Transfer, USSD';
          icon = 'P';
          break;
        case 'flutterwave':
          iconClass = 'flutterwave';
          name = 'Flutterwave';
          desc = 'Card, Bank, Mobile Money';
          icon = 'F';
          break;
        case 'gpay':
          iconClass = 'gpay';
          name = 'Google Pay';
          desc = 'Credit/Debit Card, UPI';
          icon = 'G';
          break;
      }
      
      const btn = document.createElement('button');
      btn.className = 'payment-method-btn';
      btn.dataset.gateway = gateway;
      btn.innerHTML = `
        <div class="payment-method-icon ${iconClass}">${icon}</div>
        <div class="payment-method-info">
          <div class="payment-method-name">${name}</div>
          <div class="payment-method-desc">${desc}</div>
        </div>
      `;
      
      btn.addEventListener('click', () => initiatePayment(gateway));
      paymentMethodsContainer.appendChild(btn);
    });
  }

  // ===== Initiate Payment =====
  function initiatePayment(gateway) {
    if (!selectedPlan || !currentUser) {
      showToast('Please log in to continue', 'error');
      return;
    }
    
    console.log(`Initiating ${gateway} payment for ${selectedPlan} plan`);
    
    const config = getCountryConfig(userCountry);
    const basePrice = BASE_PRICES[selectedPlan][isYearly ? 'yearly' : 'monthly'];
    const price = calculatePrice(basePrice, config);
    
    switch (gateway) {
      case 'paystack':
        initPaystack(price, config);
        break;
      case 'flutterwave':
        initFlutterwave(price, config);
        break;
      case 'gpay':
        initGooglePay(price, config);
        break;
    }
  }

  // ===== Paystack =====
  function initPaystack(amount, config) {
    // Convert to kobo (smallest unit) for Paystack
    const amountInSmallest = Math.round(amount * 100);
    
    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: currentUser.email,
      amount: amountInSmallest,
      currency: config.currency,
      ref: `rehab_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      metadata: {
        plan: selectedPlan,
        billing: isYearly ? 'yearly' : 'monthly',
        user_id: currentUser.uid,
        country: userCountry
      },
      callback: (response) => handlePaymentSuccess('paystack', response),
      onClose: () => showToast('Payment cancelled', 'warning', 2000)
    });
    handler.openIframe();
  }

  // ===== Flutterwave =====
  function initFlutterwave(amount, config) {
    FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `rehab_${Date.now()}`,
      amount: amount,
      currency: config.currency,
      payment_options: 'card,banktransfer,ussd,mobilemoney',
      customer: {
        email: currentUser.email,
        name: currentUser.displayName || 'User'
      },
      meta: {
        plan: selectedPlan,
        billing: isYearly ? 'yearly' : 'monthly',
        user_id: currentUser.uid,
        country: userCountry
      },
      customizations: {
        title: 'rehablix',
        description: `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan - ${isYearly ? 'Yearly' : 'Monthly'}`
      },
      callback: (data) => {
        if (data.status === 'successful') {
          handlePaymentSuccess('flutterwave', data);
        }
      },
      onclose: () => showToast('Payment cancelled', 'warning', 2000)
    });
  }

  // ===== Google Pay =====
  async function initGooglePay(amount, config) {
    const baseRequest = {
      apiVersion: 2,
      apiVersionMinor: 0
    };

    const allowedCardNetworks = ['MASTERCARD', 'VISA', 'AMEX'];
    const allowedCardAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];

    const tokenizationSpecification = {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'example',
        gatewayMerchantId: GPAY_MERCHANT_ID
      }
    };

    const baseCardPaymentMethod = {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks
      }
    };

    const cardPaymentMethod = Object.assign({}, baseCardPaymentMethod, {
      tokenizationSpecification: tokenizationSpecification
    });

    const paymentsClient = new google.payments.api.PaymentsClient({
      environment: 'TEST'
    });

    const isReadyToPayRequest = Object.assign({}, baseRequest);
    isReadyToPayRequest.allowedPaymentMethods = [baseCardPaymentMethod];

    try {
      const response = await paymentsClient.isReadyToPay(isReadyToPayRequest);
      
      if (response.result) {
        const paymentDataRequest = Object.assign({}, baseRequest);
        paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
        paymentDataRequest.transactionInfo = {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toFixed(2),
          currencyCode: config.currency,
          countryCode: userCountry
        };
        paymentDataRequest.merchantInfo = {
          merchantName: 'rehablix',
          merchantId: GPAY_MERCHANT_ID
        };

        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
        handlePaymentSuccess('gpay', { paymentMethodData: paymentData });
      } else {
        showToast('Google Pay is not available on this device', 'error');
      }
    } catch (err) {
      console.error('Google Pay error:', err);
      showToast('Google Pay payment failed', 'error');
    }
  }

  // ===== Payment Success Handler =====
  async function handlePaymentSuccess(gateway, response) {
    if (!currentUser || !selectedPlan) return;
    
    console.log(`Payment successful via ${gateway}`);
    
    const endDate = new Date();
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    try {
      await database.ref(`users/${currentUser.uid}/subscription`).set({
        plan: selectedPlan,
        billing: isYearly ? 'yearly' : 'monthly',
        starts: new Date().toISOString(),
        ends: endDate.toISOString(),
        gateway: gateway,
        transactionRef: response.reference || response.tx_ref || response.paymentMethodData?.token || '',
        country: userCountry,
        currency: userCurrency,
        amount: calculatePrice(BASE_PRICES[selectedPlan][isYearly ? 'yearly' : 'monthly'], getCountryConfig(userCountry))
      });
      
      if (closePaymentModalHandler) closePaymentModalHandler();
      showToast(`🎉 Successfully subscribed to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan!`, 'success', 5000);
      
      // Dispatch plan update event
      document.dispatchEvent(new CustomEvent('planUpdated', { detail: { plan: selectedPlan } }));
      
      // Update UI
      updateCurrentPlanUI(selectedPlan);
      
      // Redirect after short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
      
    } catch (error) {
      console.error('Subscription update failed:', error);
      showToast('Payment successful but subscription update failed. Please contact support.', 'error', 5000);
    }
  }

  function closePaymentModalHandler() {
    if (paymentModal) {
      paymentModal.classList.remove('show');
      document.body.style.overflow = '';
    }
    selectedPlan = null;
  }

  if (closePaymentModal) {
    closePaymentModal.addEventListener('click', closePaymentModalHandler);
  }
  
  if (paymentModal) {
    paymentModal.addEventListener('click', (e) => {
      if (e.target === paymentModal) closePaymentModalHandler();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paymentModal && paymentModal.classList.contains('show')) {
      closePaymentModalHandler();
    }
  });

  // ===== Update Current Plan UI =====
  function updateCurrentPlanUI(plan) {
    document.querySelectorAll('.plan-card').forEach(card => {
      const cardPlan = card.dataset.plan;
      const btn = card.querySelector('.plan-btn');
      
      if (cardPlan === plan) {
        if (btn) {
          btn.textContent = 'Current Plan';
          btn.classList.add('current-plan');
          btn.disabled = true;
        }
      } else if (btn && cardPlan !== 'free') {
        btn.textContent = 'Get Started';
        btn.classList.remove('current-plan');
        btn.disabled = false;
      }
    });
    
    // Re-attach listeners after UI update
    attachPlanButtonListeners();
  }

  // ===== Load User's Current Subscription =====
  async function loadCurrentSubscription() {
    if (!currentUser) return;
    
    try {
      const snap = await database.ref(`users/${currentUser.uid}/subscription`).once('value');
      const sub = snap.val();
      
      if (sub && sub.plan) {
        currentPlan = sub.plan;
        updateCurrentPlanUI(sub.plan);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }

  // ===== Auth Listener =====
  auth.onAuthStateChanged(async (user) => {
    console.log('Auth state changed:', user ? `Logged in as ${user.email}` : 'Logged out');
    currentUser = user;
    if (user) {
      await loadCurrentSubscription();
    } else {
      // Reset UI for logged out state
      document.querySelectorAll('.plan-btn:not(.current-plan)').forEach(btn => {
        if (btn.dataset.plan !== 'free') {
          btn.textContent = 'Get Started';
          btn.disabled = false;
        }
      });
    }
    // Re-attach listeners after auth state changes
    attachPlanButtonListeners();
  });

  // ===== Theme Toggle =====
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const newTheme = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('rehab-theme', newTheme);
    });
  }

  // ===== Initialize =====
  async function initialize() {
    console.log('Initializing upgrade.js...');
    const config = await detectLocation();
    updatePlanPrices(config);
    
    // Initial attachment of listeners
    setTimeout(() => {
      attachPlanButtonListeners();
    }, 500);
  }

  initialize();
});
