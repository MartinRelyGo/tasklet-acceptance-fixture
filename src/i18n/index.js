/**
 * Minimal, honest localization layer: flat JSON key -> string bundles per
 * locale, loaded once at startup. This is the localization guard a coding
 * agent must keep intact (see test/i18n.test.js).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function loadLocale(code) {
  const raw = readFileSync(join(here, `${code}.json`), "utf8");
  return JSON.parse(raw);
}

export const SUPPORTED_LOCALES = ["en", "fr"];

const locales = Object.fromEntries(SUPPORTED_LOCALES.map((code) => [code, loadLocale(code)]));

const FALLBACK_LOCALE = "en";

export function getBundle(locale) {
  return locales[locale] ?? locales[FALLBACK_LOCALE];
}

export function t(locale, key, vars = {}) {
  const bundle = getBundle(locale);
  let value = bundle[key] ?? locales[FALLBACK_LOCALE][key] ?? key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replaceAll(`{{${name}}}`, String(replacement));
  }
  return value;
}

function allKeys() {
  const keys = new Set();
  for (const bundle of Object.values(locales)) {
    for (const key of Object.keys(bundle)) keys.add(key);
  }
  return [...keys];
}

export function missingKeys(locale) {
  const bundle = locales[locale];
  if (!bundle) return allKeys();
  return allKeys().filter((key) => !(key in bundle));
}

export function localeParity() {
  return Object.fromEntries(SUPPORTED_LOCALES.map((code) => [code, missingKeys(code)]));
}
