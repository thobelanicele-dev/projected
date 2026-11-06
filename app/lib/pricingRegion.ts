export type CurrencyCode = "ZAR" | "USD" | "EUR" | "GBP";

// Which currency the landing page prices are shown in. Billing is always in
// South African Rand; this only changes what the visitor sees.
//
//   South Africa                      -> Rand
//   United Kingdom (and its crown     -> Pound
//   dependencies, which use the pound)
//   Europe                            -> Euro
//   everywhere else (the Americas,    -> US Dollar
//   Asia, the rest of Africa, ...)
//
// "Europe" means EU members, the rest of the EEA, and the other European
// countries and microstates. Russia, Belarus and Turkey sit across the
// continental line and fall through to US Dollar.
const POUND = ["GB", "JE", "GG", "IM", "GI"];

const EURO = [
  // EU members
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // rest of the EEA and Switzerland
  "IS", "LI", "NO", "CH",
  // other European countries and microstates
  "AL", "AD", "BA", "ME", "MK", "MD", "MC", "RS", "SM", "UA", "VA", "XK",
];

const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  ZA: "ZAR",
  ...Object.fromEntries(POUND.map((c) => [c, "GBP" as const])),
  ...Object.fromEntries(EURO.map((c) => [c, "EUR" as const])),
};

// `countryCode` is the two-letter code Vercel puts in the x-vercel-ip-country
// header. Anything missing or unrecognised (including local development) gets USD.
export function currencyForCountry(countryCode: string | null | undefined): CurrencyCode {
  const code = (countryCode ?? "").trim().toUpperCase();
  return COUNTRY_TO_CURRENCY[code] ?? "USD";
}
