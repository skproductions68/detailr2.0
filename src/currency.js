// currency.js
// Single source of truth for money formatting across the app.
// The shop's currency code lives in shop_settings.currency (e.g. "AED").

export const CURRENCIES = [
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "QAR", label: "QAR — Qatari Riyal" },
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "MYR", label: "MYR — Malaysian Ringgit" },
  { code: "INR", label: "INR — Indian Rupee" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
];

// Format a number as money in the given currency code.
// Falls back gracefully if the code is unknown.
export function formatMoney(amount, currency = "AED") {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    // Unknown currency code — show the number with the code prefixed.
    return `${currency} ${n.toLocaleString()}`;
  }
}
