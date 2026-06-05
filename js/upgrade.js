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
    student: { monthly: 4.99, yearly: 47.99 },
    pro: { monthly: 14.99, yearly: 143.99 }
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
  const PAYSTACK_PUBLIC_KEY = 'pk_test_fa4c2f591a02152bf21c30f8f9359b4a7be241d4';
  const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-b879ba7c16b007a6b9abc7253b739730-X';
  const GPAY_MERCHANT_ID = 'BCR2DN4T2Z2Z