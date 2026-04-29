# i18n tooling

## Audit

```bash
npm run i18n:audit
```

(equivalent: `node scripts/i18n/audit.mjs`)

Wired into CI as a **zero-debt gate**: PRs cannot merge with translation debt.

Checks:
1. Missing keys across `es.json` / `en.json` / `pt.json`
2. Untranslated strings (ES==EN or ES==PT) — skips entries listed in `cognates.json`
3. Interpolation parity (`{var}` placeholders must match across languages)
4. Stale cognates (entries that are now actually translated and should be removed from the whitelist)

Exit code `0` if clean, `1` otherwise.

## Cognates whitelist

`cognates.json` lists keys where ES==EN or ES==PT is **intentional**:

- **Brand names**: `Marketplace`, `Webhooks`, `WhatsApp`, `Instagram`, `Supabase`
- **Tech terms**: `Pipeline`, `Voice AI`, `Backend`, `Lead Scoring`
- **True cognates**: `Cancelar`, `Confirmar`, `Total` (identical word in ES & PT-BR)

When you add a new key that legitimately has the same value across languages, add it to the whitelist. The audit reports stale entries when a cognate becomes a real translation, so the list self-prunes.

## Master language

`es.json` is the source of truth. `en.json` and `pt.json` are translations. Adding a key to `es.json` requires adding the same key to the other two.
