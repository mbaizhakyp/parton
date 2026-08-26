# Forever Dolly — Bug Log

One row per bug. Status: OPEN / FIXED / WONTFIX (with reason). Keep WONTFIX rows — they feed the writeup's "unfinished edges" section.

| ID | Found (phase) | Symptom | Root cause | Fix | Status | Verified how |
|----|---------------|---------|-----------|-----|--------|--------------|
| B1 | 0 (scaffold) | `deepspace app undeploy gymbro` fails with `Invalid app id`, blocking app registration (quota full). Platform bug, not app code. | `gymbro` is a legacy app whose id is its name (no `app_…` format); the undeploy endpoint rejects legacy ids. By-name and by-host forms also fail because the app was never deployed. | No CLI workaround exists: deploy also validates the `app_` format (`invalid_app_id`), so a legacy app can be neither deployed nor undeployed — untouchable by the toolchain. Escalated: dashboard feedback form + Discord ticket-0246. | OPEN | Reproduced undeploy in 3 CLI forms (`--json`: `undeploy_failed` / `app_not_found`); deploy-then-undeploy workaround tested — deploy refused client-side with `invalid_app_id` |

## Conventions

- Log the bug **when found**, even mid-task — don't reconstruct at the end.
- "Root cause" is required before FIXED status; symptom-patches get a `ponytail:` note in code and a WONTFIX-style explanation here.
- "Verified how" must be a concrete action (e.g. "re-ran two-tab test"), not "looks fine".
- Bugs found in agent-written code: note which model wrote it — feeds the writeup's "what the agent did / what I verified" section.
