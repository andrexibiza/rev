# Check: tests (trigger: tests/, fixtures, CI, any PR citing test evidence)
Owner hat: bad-test finder. Load references/bad-tests.md §§2,6. (Deploys as .agents/checks/tests.md in target repos.)
- [ ] Cited tests: assertion + exercised-entity identity verified at pin.
- [ ] Sole distinguishers sensitivity-probed (red symptom / green restore) — receipts linked.
- [ ] New tests in PR sensitivity-checked before counting as evidence.
- [ ] Flaky/quarantine changes manifested with owner + expiry.
Verdict rule: merge safety resting on insensitive test = BLOCKING.
