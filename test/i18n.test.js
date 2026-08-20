import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { SUPPORTED_LOCALES, getBundle, localeParity } from "../src/i18n/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(here, "..", "public", "index.html"), "utf8");

test("en and fr locale bundles have identical key sets", () => {
  const parity = localeParity();
  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(parity[locale], [], `locale "${locale}" is missing keys: ${parity[locale]}`);
  }
});

test("no locale bundle contains an empty translation", () => {
  for (const locale of SUPPORTED_LOCALES) {
    const bundle = getBundle(locale);
    for (const [key, value] of Object.entries(bundle)) {
      assert.ok(typeof value === "string" && value.trim().length > 0, `${locale}.${key} is empty`);
    }
  }
});

test("every data-i18n key used in public/index.html exists in every locale bundle", () => {
  const keys = [...indexHtml.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length > 0, "expected at least one data-i18n usage in index.html");
  for (const locale of SUPPORTED_LOCALES) {
    const bundle = getBundle(locale);
    for (const key of keys) {
      assert.ok(key in bundle, `key "${key}" used in index.html is missing from locale "${locale}"`);
    }
  }
});
