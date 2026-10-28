# Reference: Errors, Config, I18n (Cross-cutting seams)

Errors: taxonomy (user, validation, conflict, transient, permanent, indeterminate — settlement language reused), error as API contract (api-contracts), no silent swallowing (catch without receipt = finding), context preservation (cause chains without secret leakage), retryability decided at error definition. Config: sources precedence explicit (env/file/flags/remote — ambient precedence guessing is coordinate bug), validation at load with provenance diagnostics (which source won, values redacted), dynamic reload generations, config as code (reviewed, parity with docs defaults). Secrets config via security file.

I18n/L10n: string externalization completeness (hardcoded user strings census), plural/select forms, date/number/currency via platform formatters (string concat = finding), RTL + text expansion layout seams, locale fallback promises, translation germination gates (docs-parity applied to UI catalogs), pseudo-localization in CI as distinguisher.

## Deep patterns
Error design studio: classify every thrown/returned error in touched code into taxonomy; unclassified = finding. Config studio: draw precedence graph for one setting across env/file/flag/remote/default; any implicit override (stale env file beating fresh injection — desktop auth case) is generation bug pattern. Feature-flag config joins release debt. I18n studio: pseudo-localization run (expanded strings, accents, RTL) screenshots as evidence; hardcode census via string extraction diff; plural rules per locale tested with 0/1/2/many fixtures.
Checklist seeds: error taxonomy table present; config precedence documented + provenance log sample; locale fixtures green.
