# Reference: UX + Accessibility (UX hat)

Surface is promise. Sources: curriculum Module 09; WCAG principles (perceivable, operable, understandable, robust) as derivation base.

Review by flows, not screens: happy path, empty, loading (skeleton vs spinner semantics), error (recoverable? data preserved? next action clear?), offline/degraded, permission-denied, long-content, slow-network. Each flow state is behavior with assertions: focus moves correctly on view change, errors announced (live regions) not color-only, keyboard completes flow without pointer, contrast meets ratio on actual rendered pairs (measure, don't eyeball tokens), targets sized, motion respects reduced-motion, screen-reader names/roles match visual relations (Module 00 verb test applied to UI).

Evidence kinds: executed flow (browser automation with a11y assertions that can go red — axe-class checks plus manual focus-order trace), rendered measurement (contrast, layout shift), source semantics (heading order, label association). Screenshot alone proves appearance at one viewport (Ch.9 log/screenshot limit) — never operability. Findings carry viewport + input modality + assistive-tech scope. Desktop (Electron) specifics: native menu/shortcut parity, OS dark/high-contrast modes, window resize lifetimes.

Praise rule applies: name working flows preserved, especially when fix touches shared components (regression radius includes every screen consuming component — graph radius for UI).

## Worked patterns
Form error handling: preserve input, announce error, focus first invalid, describe fix in text (not color). Destructive actions: consequence named (object + irreversibility), undo window or explicit confirmation proportional to blast radius (consumer products borrow authority proportionality). Loading: skeleton preserves layout (shift budget), timeout states name next action. Empty states distinguish "none yet" (create action), "none match" (clear filters), "failed to load" (retry) — conflating them misleads decisions.
Component radius: shared component change requires flow regression list (every consuming flow) — systems graph includes UI consumers. Motion/animation: vestibular safety, reduced-motion variant parity. Internationalization: string externalization, plural/gender forms, RTL layout seams — germination parity applies to UI strings.
Checklist (executed): keyboard-only completion recording; focus-order trace diff base/head; contrast measurements table; axe-class automated pass + manual name/role/value spot checks; 200% zoom + narrow viewport pass. Findings name flow + modality + viewport scope.

## Standards anchor
WCAG (W3C Web Content Accessibility Guidelines) principles — Perceivable, Operable, Understandable, Robust — operationalized in §flows above. Conformance level (A/AA/AAA) is repo-declared promise; lanes evidence criteria at declared level on touched flows, never claim site-wide conformance from sampled flows (scope law). Platform HIGs (Apple/Google/Microsoft) as Report-kind guidance; OS settings (reduce motion, forced colors, voice control) executed in drills where desktop/mobile hats apply.
