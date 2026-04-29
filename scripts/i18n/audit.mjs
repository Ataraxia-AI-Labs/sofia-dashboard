#!/usr/bin/env node
/**
 * i18n audit — checks for missing keys, untranslated strings, broken interpolations.
 *
 * Usage: node scripts/i18n/audit.mjs
 * Exit code 0 if clean, 1 if any issue.
 *
 * A `cognates.json` whitelist lets known true cognates / brand names / tech terms
 * (e.g. "Marketplace", "Webhooks", "Cancelar") skip the identical-string check.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const MESSAGES = resolve(REPO, "messages");
const COGNATES = resolve(REPO, "scripts", "i18n", "cognates.json");

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, path, out);
    } else {
      out[path] = v;
    }
  }
  return out;
}

function placeholders(s) {
  if (typeof s !== "string") return new Set();
  return new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}

function setEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function main() {
  const es = flatten(loadJson(resolve(MESSAGES, "es.json")));
  const en = flatten(loadJson(resolve(MESSAGES, "en.json")));
  const pt = flatten(loadJson(resolve(MESSAGES, "pt.json")));
  const cog = loadJson(COGNATES);
  const esEqEn = new Set(cog.es_eq_en);
  const esEqPt = new Set(cog.es_eq_pt);

  const esKeys = new Set(Object.keys(es));
  const enKeys = new Set(Object.keys(en));
  const ptKeys = new Set(Object.keys(pt));
  const allKeys = new Set([...esKeys, ...enKeys, ...ptKeys]);

  console.log(
    `es: ${esKeys.size} | en: ${enKeys.size} | pt: ${ptKeys.size} | total unique: ${allKeys.size}`,
  );

  let issues = 0;

  // 1. Missing keys per language
  for (const [label, set] of [
    ["EN", enKeys],
    ["ES", esKeys],
    ["PT", ptKeys],
  ]) {
    const missing = [...allKeys].filter((k) => !set.has(k)).sort();
    if (missing.length) {
      issues += missing.length;
      console.log(`\n=== MISSING IN ${label}: ${missing.length} ===`);
      for (const k of missing.slice(0, 10)) console.log(`  - ${k}`);
      if (missing.length > 10) console.log(`  ... and ${missing.length - 10} more`);
    }
  }

  // 2. Identical values (untranslated) — skip cognates
  const badEsEn = [...esKeys]
    .filter(
      (k) =>
        enKeys.has(k) &&
        es[k] === en[k] &&
        typeof es[k] === "string" &&
        es[k].length > 4 &&
        !esEqEn.has(k),
    )
    .sort();
  const badEsPt = [...esKeys]
    .filter(
      (k) =>
        ptKeys.has(k) &&
        es[k] === pt[k] &&
        typeof es[k] === "string" &&
        es[k].length > 4 &&
        !esEqPt.has(k),
    )
    .sort();
  if (badEsEn.length) {
    issues += badEsEn.length;
    console.log(`\n=== UNTRANSLATED ES==EN: ${badEsEn.length} ===`);
    for (const k of badEsEn.slice(0, 10)) console.log(`  - ${k} = ${JSON.stringify(es[k]).slice(0, 80)}`);
  }
  if (badEsPt.length) {
    issues += badEsPt.length;
    console.log(`\n=== UNTRANSLATED ES==PT: ${badEsPt.length} ===`);
    for (const k of badEsPt.slice(0, 10)) console.log(`  - ${k} = ${JSON.stringify(es[k]).slice(0, 80)}`);
  }

  // 3. Interpolation parity
  const mismatched = [];
  for (const k of esKeys) {
    if (enKeys.has(k) && !setEqual(placeholders(es[k]), placeholders(en[k]))) {
      mismatched.push([k, "EN", es[k], en[k]]);
    }
    if (ptKeys.has(k) && !setEqual(placeholders(es[k]), placeholders(pt[k]))) {
      mismatched.push([k, "PT", es[k], pt[k]]);
    }
  }
  if (mismatched.length) {
    issues += mismatched.length;
    console.log(`\n=== INTERPOLATION MISMATCHES: ${mismatched.length} ===`);
    for (const [k, lang, a, b] of mismatched.slice(0, 10)) {
      console.log(`  - ${k} (${lang})`);
      console.log(`      ES: ${JSON.stringify(a).slice(0, 80)}`);
      console.log(`      ${lang}: ${JSON.stringify(b).slice(0, 80)}`);
    }
  }

  // 4. Stale cognates (now have real translations) — clean-up signal
  const staleEn = [...esEqEn].filter(
    (k) => esKeys.has(k) && enKeys.has(k) && es[k] !== en[k],
  );
  const staleP = [...esEqPt].filter(
    (k) => esKeys.has(k) && ptKeys.has(k) && es[k] !== pt[k],
  );
  if (staleEn.length || staleP.length) {
    console.log(
      `\n=== STALE COGNATES (now translated, can be removed from whitelist): ${staleEn.length + staleP.length} ===`,
    );
    for (const k of staleEn) console.log(`  - es_eq_en: ${k}`);
    for (const k of staleP) console.log(`  - es_eq_pt: ${k}`);
  }

  if (issues === 0) {
    console.log("\nOK — zero translation debt");
    return 0;
  }
  console.log(`\nFAIL — ${issues} issues`);
  return 1;
}

process.exit(main());
