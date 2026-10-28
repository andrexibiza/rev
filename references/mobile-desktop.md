# Reference: Mobile + Desktop (Platform hats; joint with UX/Release)

Mobile: lifecycle (background kill, state restoration as lifetime promise), offline/sync conflicts (generation fencing on device), permissions (runtime grants scoped, denial flows), store constraints, battery/network budgets measured on device classes, deep links as untrusted input, local storage encryption platform truth (keychain/keystore evidence). Desktop: multi-window state, file associations/protocol handlers, auto-update (release), OS integration (notifications, tray, shortcuts) parity per platform without pretending identical (systems §5), crash recovery (accepted work owed across restart — Hermes continuation lesson generalized).

Shared: persisted state forward/backward compat (upgrade + rollback reading), accessibility per OS, packaged-artifact verification (never dev-build evidence).

Review specifics: state restoration drill (kill mid-flow, resume — owed work + form state per promise), sync conflict UI (generation pairs shown honestly, last-write-wins declared or rejected), permission priming flows (ask in context, denial recovery), offline queue settlement visibility (pending work never looks sent). Desktop: single-instance, second-launch handoff (coordinate vs authority — argv is untrusted input), file lock/ownership across processes (generation), auto-update failure recovery (partial download never executes — signature + atomic swap).

Checklist seeds: kill/restart matrix per platform, upgrade-with-old-data + downgrade drill, protocol-handler hostile input cases, store/policy constraints (tracking, encryption export) declared where applicable.
