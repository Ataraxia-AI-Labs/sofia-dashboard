"""i18n audit — checks for missing keys, untranslated strings, broken interpolations.

Usage: python scripts/i18n/audit.py
Exit code 0 if clean, 1 if any issue.

A 'cognates.json' whitelist lets known true cognates / brand names / tech terms
(e.g. 'Marketplace', 'Webhooks', 'Cancelar') skip the identical-string check.
"""
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MESSAGES = REPO / "messages"
COGNATES = REPO / "scripts" / "i18n" / "cognates.json"


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        path = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, path))
        else:
            out[path] = v
    return out


def get_placeholders(s):
    if not isinstance(s, str):
        return set()
    return set(re.findall(r"\{(\w+)\}", s))


def main():
    es = flatten(json.loads((MESSAGES / "es.json").read_text(encoding="utf-8")))
    en = flatten(json.loads((MESSAGES / "en.json").read_text(encoding="utf-8")))
    pt = flatten(json.loads((MESSAGES / "pt.json").read_text(encoding="utf-8")))
    cog = json.loads(COGNATES.read_text(encoding="utf-8"))
    es_eq_en = set(cog["es_eq_en"])
    es_eq_pt = set(cog["es_eq_pt"])

    es_set, en_set, pt_set = set(es), set(en), set(pt)
    all_keys = es_set | en_set | pt_set

    print(f"es: {len(es)} | en: {len(en)} | pt: {len(pt)} | total unique: {len(all_keys)}")

    issues = 0

    # 1. Missing keys per language
    missing_in_en = sorted(all_keys - en_set)
    missing_in_es = sorted(all_keys - es_set)
    missing_in_pt = sorted(all_keys - pt_set)
    for label, missing in (("EN", missing_in_en), ("ES", missing_in_es), ("PT", missing_in_pt)):
        if missing:
            issues += len(missing)
            print(f"\n=== MISSING IN {label}: {len(missing)} ===")
            for k in missing[:10]:
                print(f"  - {k}")
            if len(missing) > 10:
                print(f"  ... and {len(missing) - 10} more")

    # 2. Identical values (untranslated) — skip cognates
    bad_es_en = [
        k for k in es_set & en_set
        if es[k] == en[k]
        and isinstance(es[k], str)
        and len(es[k]) > 4
        and k not in es_eq_en
    ]
    bad_es_pt = [
        k for k in es_set & pt_set
        if es[k] == pt[k]
        and isinstance(es[k], str)
        and len(es[k]) > 4
        and k not in es_eq_pt
    ]
    if bad_es_en:
        issues += len(bad_es_en)
        print(f"\n=== UNTRANSLATED ES==EN: {len(bad_es_en)} ===")
        for k in bad_es_en[:10]:
            print(f"  - {k} = {es[k][:60]!r}")
    if bad_es_pt:
        issues += len(bad_es_pt)
        print(f"\n=== UNTRANSLATED ES==PT: {len(bad_es_pt)} ===")
        for k in bad_es_pt[:10]:
            print(f"  - {k} = {es[k][:60]!r}")

    # 3. Interpolation parity
    mismatched = []
    for k in es_set & en_set:
        if get_placeholders(es[k]) != get_placeholders(en[k]):
            mismatched.append((k, "EN", es[k], en[k]))
    for k in es_set & pt_set:
        if get_placeholders(es[k]) != get_placeholders(pt[k]):
            mismatched.append((k, "PT", es[k], pt[k]))
    if mismatched:
        issues += len(mismatched)
        print(f"\n=== INTERPOLATION MISMATCHES: {len(mismatched)} ===")
        for k, lang, a, b in mismatched[:10]:
            print(f"  - {k} ({lang})")
            print(f"      ES: {a[:80]!r}")
            print(f"      {lang}: {b[:80]!r}")

    # 4. Stale cognates entries (no longer identical) — clean-up signal
    stale_en = [k for k in es_eq_en if k in es and k in en and es[k] != en[k]]
    stale_pt = [k for k in es_eq_pt if k in es and k in pt and es[k] != pt[k]]
    if stale_en or stale_pt:
        print(f"\n=== STALE COGNATES (now translated, can be removed from whitelist): "
              f"{len(stale_en) + len(stale_pt)} ===")
        for k in stale_en:
            print(f"  - es_eq_en: {k}")
        for k in stale_pt:
            print(f"  - es_eq_pt: {k}")

    if issues == 0:
        print("\nOK — zero translation debt")
        return 0
    print(f"\nFAIL — {issues} issues")
    return 1


if __name__ == "__main__":
    sys.exit(main())
