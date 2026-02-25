/**
 * Payment Providers Factory
 * Creates and returns the configured payment provider
 */

const PaymentProviderInterface = require('./paymentProvider.interface');
const MockPaymentProvider = require('./mock.provider');
const StripePaymentProvider = require('./stripe.provider');
const PagarmePaymentProvider = require('./pagarme.provider');

const PROVIDERS = {
  mock: MockPaymentProvider,
  stripe: StripePaymentProvider,
  pagarme: PagarmePaymentProvider,
};

let instance = null;

/**
 * Get payment provider instance (singleton)
 * @param {string} providerName - Provider name ('mock', 'stripe', 'mercadopago')
 * @param {object} config - Provider configuration
 * @returns {PaymentProviderInterface}
 */
function getPaymentProvider(providerName = null, config = {}) {
  const provider = providerName || process.env.PAYMENT_PROVIDER || 'mock';
  
  if (instance && instance.getProviderName() === provider) {
    return instance;
  }
  
  const ProviderClass = PROVIDERS[provider];
  if (!ProviderClass) {
    throw new Error(`Payment provider "${provider}" not found. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  
  instance = new ProviderClass(config);
  return instance;
}

/**
 * Reset provider instance (for testing)
 */
function resetProvider() {
  instance = null;
}

module.exports = {
  PaymentProviderInterface,
  MockPaymentProvider,
  StripePaymentProvider,
  PagarmePaymentProvider,
  getPaymentProvider,
  resetProvider,
  PROVIDERS,
};
