import axios from 'axios';

/**
 * Fetches the latest exchange rates using Axios.
 * Includes a 5-minute cache to prevent redundant network requests.
 */
const fetchRates = (() => {
  let cache: any = null;
  let cacheTime = 0;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  return async (base = 'USD') => {
    const now = Date.now();
    const targetBase = base.toUpperCase();

    // Return cached data if it's fresh and matches the requested base
    if (
      cache &&
      now - cacheTime < CACHE_DURATION &&
      cache.base === targetBase
    ) {
      return cache.rates;
    }

    try {
      const response = await axios.get('https://api.exchangerate.fun/latest', {
        params: { base: targetBase },
        timeout: 5000, // 5 second timeout safety net
      });

      // Axios stores the parsed JSON payload directly in response.data
      cache = response.data;
      cacheTime = now;

      return response.data.rates;
    } catch (error: any) {
      console.error('Failed to fetch exchange rates via Axios:', error.message);

      // Fallback to cache if available during a network error
      if (cache) {
        console.warn('Serving stale cached data due to network failure.');
        return cache.rates;
      }
      throw error;
    }
  };
})();

/**
 * Helper function to get a specific exchange rate.
 * @param {string} targetCurrency - The currency code to convert to (e.g., 'EUR')
 * @param {string} baseCurrency - The currency code to convert from (default: 'USD')
 * @returns {Promise<number>} The exchange rate
 */
async function getExchangeRate(targetCurrency: string, baseCurrency = 'USD') {
  const target = targetCurrency.toUpperCase();
  const rates = await fetchRates(baseCurrency);

  if (target in rates) {
    return rates[target];
  }

  throw new Error(
    `Currency code "${targetCurrency}" not found in available rates.`,
  );
}

/**
 * Converts an amount from one currency to another.
 * @param {number} amount - The amount to convert
 * @param {string} from - The currency code to convert from (e.g., 'USD')
 * @param {string} to - The currency code to convert to (e.g., 'EUR')
 * @returns {Promise<number>} The converted amount
 */
async function convert(amount: number, from: string, to: string) {
  try {
    const rate = await getExchangeRate(to, from);
    return amount * rate;
  } catch (err: any) {
    console.error(`Conversion error: ${err.message}`);
    return null;
  }
}

export const CurrencyHelper = {
  getExchangeRate,
  convert,
};
