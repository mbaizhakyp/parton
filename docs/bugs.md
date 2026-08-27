# Forever Dolly — Bug Log

One row per bug. Status: OPEN / FIXED / WONTFIX (with reason). Keep WONTFIX rows — they feed the writeup's "unfinished edges" section.

| ID | Found (phase) | Symptom | Root cause | Fix | Status | Verified how |
|----|---------------|---------|-----------|-----|--------|--------------|
| B1 | 0 (scaffold) | `deepspace app undeploy gymbro` fails with `Invalid app id`, blocking app registration (quota full). Platform bug, not app code. | `gymbro` is a legacy app whose id is its name (no `app_…` format); the undeploy endpoint rejects legacy ids. By-name and by-host forms also fail because the app was never deployed. | No CLI workaround exists: deploy also validates the `app_` format (`invalid_app_id`), so a legacy app can be neither deployed nor undeployed — untouchable by the toolchain. Escalated: dashboard feedback form + Discord ticket-0246. | OPEN | Reproduced undeploy in 3 CLI forms (`--json`: `undeploy_failed` / `app_not_found`); deploy-then-undeploy workaround tested — deploy refused client-side with `invalid_app_id` |

| B2 | 2 (wall) | Posting a tribute fails; toast: `Members can't edit "authorId"` | Client sent `authorId` in the create payload. `userBound` columns are stamped server-side from the JWT on create; sending the field trips the `writableFields` check first. Sonnet-written UI code. | Removed `authorId` from the create payload; typed it optional client-side with a comment. | FIXED | Posted a tribute on the live site after redeploy; appears with correct author |

| B4 | stress tests | Rapid double-click on "Post to the Wall" creates two tributes | Two native clicks in the same JS tick both run `handleSubmit` before React commits `setSubmitting(true)`; the button's `disabled` prop reacts one render too late. Found by wall-edge.spec.ts (Sonnet test agent); race is stricter than B3's serialized clicks. | Synchronous `submittingRef` re-entrancy guard in `ComposerModal.handleSubmit`; reset in `finally`. | FIXED | wall-edge.spec.ts double-click test flips from red to green |

| B5 | round 3 (settings) | Display name saved in Settings silently reverts to the Google name | Two-layer platform behavior: (1) `users.name` is SYSTEM_ASSIGNED — the worker refuses direct client writes regardless of schema permissions, and the optimistic `put` still reports success (`putConfirmed` hangs, never acked); (2) even a sanctioned `registerUser` rename is re-stamped from the JWT by the SDK's own connect-time registerUser on every WS reconnect. `users.name` is a platform mirror by design. | Custom names moved to an app-owned `profiles` collection (action-only writes via `setDisplayName`, explicit-recordId upsert); wall composer, Settings, and `submitQuiz` prefer `profiles.displayName` over `users.name`. | FIXED | wall-ui.spec.ts "display name edited in Settings bylines the next tribute" red → green; local DB inspected to confirm the clobber before the fix |

## Conventions

- Log the bug **when found**, even mid-task — don't reconstruct at the end.
- "Root cause" is required before FIXED status; symptom-patches get a `ponytail:` note in code and a WONTFIX-style explanation here.
- "Verified how" must be a concrete action (e.g. "re-ran two-tab test"), not "looks fine".
- Bugs found in agent-written code: note which model wrote it — feeds the writeup's "what the agent did / what I verified" section.
