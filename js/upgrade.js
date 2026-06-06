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
    student: { monthly: 2.99, yearly: 28.99 },
    pro: { monthly: 9.99, yearly: 99.99 }
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
      locationFlag.textContent = config.flag;
      locationText.textContent = `Prices in ${config.name} (${config.currency})`;
      currencyCode.textContent = config.currency;
      currencyNotice.style.display = 'flex';
      
      return config;
    } catch (error) {
      console.error('Location detection failed:', error);
      userCountry = 'US';
      const config = DEFAULT_CONFIG;
      userCurrency = config.currency;
      exchangeRate = config.multiplier;
      paymentGateways = config.gateways;
      
      locationFlag.textContent = config.flag;
      locationText.textContent = `Prices in USD (International)`;
      currencyCode.textContent = 'USD';
      currencyNotice.style.display = 'flex';
      
      return config;
    }
  }

  // ===== Update Plan Prices =====
  function updatePlanPrices(config) {
    const symbol = config.symbol;
    
    // Update currency symbols
    document.getElementById('freeCurrency').textContent = symbol;
    document.getElementById('studentCurrency').textContent = symbol;
    document.getElementById('proCurrency').textContent = symbol;
    
    // Calculate prices with "99" effect
    const studentMonthly = calculatePrice(BASE_PRICES.student.monthly, config);
    const studentYearly = calculatePrice(BASE_PRICES.student.yearly, config);
    const proMonthly = calculatePrice(BASE_PRICES.pro.monthly, config);
    const proYearly = calculatePrice(BASE_PRICES.pro.yearly, config);
    
    // Update displayed prices
    const price = isYearly ? studentYearly : studentMonthly;
    document.getElementById('studentPrice').textContent = price.toFixed(2);
    
    const proPrice = isYearly ? proYearly : proMonthly;
    document.getElementById('proPrice').textContent = proPrice.toFixed(2);
    
    // Update period display
    document.querySelectorAll('.period').forEach(el => {
      el.textContent = isYearly ? '/year' : '/month';
    });
  }

  // ===== Billing Toggle =====
  billingToggle.addEventListener('change', () => {
    isYearly = billingToggle.checked;
    const config = getCountryConfig(userCountry);
    updatePlanPrices(config);
    
    // Update toggle labels
    document.querySelectorAll('.toggle-label').forEach(label => {
      label.classList.toggle('active', label.dataset.billing === (isYearly ? 'yearly' : 'monthly'));
    });
  });

  document.querySelectorAll('.toggle-label').forEach(label => {
    label.addEventListener('click', () => {
      const billing = label.dataset.billing;
      isYearly = billing === 'yearly';
      billingToggle.checked = isYearly;
      const config = getCountryConfig(userCountry);
      updatePlanPrices(config);
      
      document.querySelectorAll('.toggle-label').forEach(l => {
        l.classList.toggle('active', l.dataset.billing === billing);
      });
    });
  });

  // ===== Plan Selection =====
  document.querySelectorAll('.plan-btn:not(.current-plan)').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.dataset.plan;
      if (!plan || plan === 'free') return;
      
      if (!currentUser) {
        showToast('Please log in to subscribe', 'error');
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.click();
        return;
      }
      
      selectedPlan = plan;
      openPaymentModal(plan);
    });
  });

  // ===== Payment Modal =====
  function openPaymentModal(plan) {
    const config = getCountryConfig(userCountry);
    const basePrice = BASE_PRICES[plan][isYearly ? 'yearly' : 'monthly'];
    const price = calculatePrice(basePrice, config);
    
    paymentPlanBadge.textContent = plan === 'student' ? '🎓 Student Plan' : '💎 Pro Plan';
    paymentCurrency.textContent = config.symbol;
    paymentAmount.textContent = price.toFixed(2);
    paymentPeriod.textContent = isYearly ? '/year' : '/month';
    paymentBilling.textContent = isYearly ? 'Billed yearly (save 20%)' : 'Billed monthly';
    
    // Render payment methods
    renderPaymentMethods(config);
    
    paymentModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function renderPaymentMethods(config) {
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
    if (!selectedPlan || !currentUser) return;
    
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
      
      closePaymentModalHandler();
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
    paymentModal.classList.remove('show');
    document.body.style.overflow = '';
    selectedPlan = null;
  }

  closePaymentModal.addEventListener('click', closePaymentModalHandler);
  paymentModal.addEventListener('click', (e) => {
    if (e.target === paymentModal) closePaymentModalHandler();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paymentModal.classList.contains('show')) {
      closePaymentModalHandler();
    }
  });

  // ===== Update Current Plan UI =====
  function updateCurrentPlanUI(plan) {
    document.querySelectorAll('.plan-card').forEach(card => {
      const cardPlan = card.dataset.plan;
      const btn = card.querySelector('.plan-btn');
      
      if (cardPlan === plan) {
        btn.textContent = 'Current Plan';
        btn.classList.add('current-plan');
        btn.disabled = true;
      } else {
        btn.textContent = cardPlan === 'pro' ? 'Get Started' : 'Get Started';
        btn.classList.remove('current-plan');
        btn.disabled = false;
      }
    });
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
    currentUser = user;
    if (user) {
      await loadCurrentSubscription();
    }
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
    const config = await detectLocation();
    updatePlanPrices(config);
    
    // Load initial plan
    if (window.rehabPlans) {
      currentPlan = window.rehabPlans.getCurrentPlan() || 'free';
      updateCurrentPlanUI(currentPlan);
    }
  }

  initialize();
});
