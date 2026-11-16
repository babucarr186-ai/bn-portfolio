# Uncle Apple Store implementation and release report — 16 November 2026

## Delivery status

Implemented locally against `babucarr186-ai/bn-portfolio`, branch `feature/dashboard-charts-scanning`, commit `61e175fce1c316040aa53e1731a50aa82742fc7b`. The live `app.js`, `styles.css`, and `insights.js` matched this branch after line-ending normalization. This is the private Firebase dashboard source; `main` serves the public storefront and was not changed.

**Not deployed.** The owner confirmed Firebase access/test accounts cannot currently be supplied. No Firebase CLI login, production rule read, authenticated database read, database write, migration, user change, billing operation, or Hosting deploy was performed. The existing live URL responds at https://uncle-apple-store.web.app/; that response does not verify this implementation.

## Implemented

- Black/charcoal responsive workspace, restrained purple gradients, rounded cards, system typography, sticky desktop navigation and reduced-motion support. No attached reference image was available; styling follows the written brief.
- Prominent Total Sales, Units Sold, Gross Profit and Gross Profit Margin, in GMD, positioned before operational follow-ups.
- Today, Monday-based week, month-to-date, 3/6/12 completed calendar months and validated custom date ranges. Default six completed months. Comparisons with preceding periods; month-to-date uses comparable elapsed dates, clamped to prior month end.
- Daily/monthly revenue and profit chart, units chart, category units, top products, stock aging, expenses, estimated operating result, current inventory investment and current outstanding balances. Exact chart table and formulas are available in the UI. Date changes use existing loaded records and add no database reads.
- Money aggregated in integer cents; sale profit uses captured historical unit cost, never today's inventory cost. Missing sale costs suppress profit/margin/result. Missing inventory costs label investment incomplete. Empty periods remain gaps. Imported Tracker 2/3 is explicitly separate. Categories reflect current product classifications.
- Printable customer receipts from the sales ledger, including sale reference, current collected amount and balance. Receipt output uses an explicit allowlist and escapes content; private costs/notes are excluded. Initial payment method is labeled as such, not presented as the method of subsequent payments.
- Owner backup export now requests password reauthentication and rechecks active owner membership. Existing scope/limitations remain visible. This is a client workflow verification step, not a new server-side recent-auth policy.
- Legacy owner dashboard refuses to query private collections for a staff session. This prevents frontend cost loading but **does not repair live Security Rules**. Staff operations remain blocked pending verified isolation rollout. No account creation/deactivation UI or new authentication service was introduced.
- Added an in-flight form guard against concurrent repeat submissions and sale-date validation. This is not durable cross-device request idempotency.
- Existing inventory editor, drafts, serial/IMEI transaction uniqueness, atomic sale/stock/payment writes and model/barcode assistance preserved. These are existing capabilities, not all newly implemented.

## Validation actually performed

- 14 calculation/model/scan/receipt unit tests pass (8 existing, 6 new): calendar rollover/leap years, completed periods, inclusive custom periods, invalid/future/reversed dates, quantity/captured costs, integer cents, expenses/losses, missing costs, stock age, scan normalization and receipt escaping/private-field exclusion.
- Headless Chromium synthetic-only UI test passes: desktop and 390px mobile overflow, default/custom filters, charts, receipt popup and cost exclusion, model/storage suggestions, duplicate warning, editable custom models, denied/successful simulated camera flow, track cleanup and explicit confirmation. Owner charts cleared for staff; legacy data loader refuses staff. No Firebase SDK calls are made by this test harness.
- Dashboard-only static build and JavaScript syntax checks pass. `npm exec -- vite build` also passes; no public source files were modified or deployed.
- Desktop/mobile screenshots generated and visually inspected. Screenshots contain synthetic fixtures only; they are not evidence of live financial records.
- Live rules/owner/staff authentication, real device camera, real inventory writes, concurrent production sales/payments, receipt printer hardware, complete financial reconciliation, production record counts and recovery restore **not tested**. Candidate Firestore rules were not changed or deployed; their existing emulator suite was not rerun in this session.

## Security release blocker

The repository's earlier `docs/live-firestore-audit-2026-11-16.md` reports production rules allow staff to read legacy cost-bearing products, sales, losses and drafts (and expenses). This is prior audit evidence, not a fresh live verification. Firestore cannot conceal selected fields of a readable document. Frontend hiding and the new loader guard cannot prevent direct SDK requests.

The branch contains proposed isolated `staffInventory`, `staffSales`, `staffPayments` rules, but publication, owner compatibility, inventory registration/identifier permissions, staff receipt/payment flow and a verified migration remain incomplete. Do not deploy these candidate rules or activate staff based on this UI change. Do not claim secure staff permissions until denied direct requests and allowed atomic operations are demonstrated against deployed rules.

## Not completed

Full staff registration/editing and owner staff management, production permission migration, tamper-resistant complete audit coverage, durable transaction idempotency, product condition/photos, financial reconciliation of historical tracker data, privileged complete backup and tested restore, production authentication tests and deployment. Photographs would also require a storage choice consistent with Spark; no paid storage dependency was added.

## Firebase cost status

No plan or billing changes and no paid API, Cloud Functions, subscription or new service. Reporting has zero additional query overhead beyond existing full collection reads. The initial loader still reads entire known collections; pagination/date-bounded reads remain a scaling task. Backup reads also consume daily quota; plan exports around normal usage. A €0 target is supported by this design but current Spark status and quota headroom cannot be verified without Console access. Do not enable Blaze. Free quota exhaustion may interrupt operations.

## Build and release when access is available

1. Run `node scripts/build-dashboard.mjs`, `node scripts/dashboard-insights.test.mjs` and `node scripts/dashboard-performance.test.mjs`.
2. For synthetic browser checks install the pinned Playwright version from the CI workflow, serve `public/admin` on port 4173 and run `node scripts/dashboard-ui.test.cjs`. The test replaces Firebase configuration with null and never accesses production.
3. Complete the backup/recovery procedure below and verify target project, Spark plan, domains and active release. Use an isolated branch/preview; do not merge into storefront `main`.
4. Review the intentional staff block. Resolve and test staff isolation as a separate staged release before enabling staff operations.
5. For owner UI preview use the dedicated dashboard-only config, with `firebase hosting:channel:deploy redesign-review --project uncle-apple-store --config firebase.dashboard-ui.json --expires 7d`. Preview deployment is not production verification.
6. After authenticated owner compatibility checks, deploy only private Hosting with `firebase deploy --only hosting --project uncle-apple-store --config firebase.dashboard-ui.json`. This config explicitly selects site `uncle-apple-store`, directory `public/admin`, and has no Firestore target. Never use generic `firebase deploy` or the root Hosting config for this work.
7. Verify live owner login, known product/sale/identifier counts, reports against hand-calculated records, receipt, mobile layout and safe test transactions with approved test fixtures. Confirm the public site's release/domain configuration is unchanged. Roll back Hosting via the previous Firebase Hosting release if owner operations regress. Hosting rollback does not roll back database writes.

## Spark-compatible backup/recovery procedure

### Existing JSON export coverage

`backup.js` enumerates products, productDrafts, sales, payments, losses, expenses, trackerRecords, users, and optional staffInventory/staffSales/staffPayments (permission-denied optional collections are listed as skipped). It pages by document ID at 300 per page and encodes timestamps, references, geopoints and bytes. It gets only identifier IDs derivable from product fields.

It excludes unknown collections, all nested subcollections, orphan identifier documents, Firebase Authentication user/password records, IAM, Hosting history, security rules/index configuration and external photo assets. Sequential reads are not an atomic snapshot; a failed required collection aborts the download. Existing export validation is not a restore drill. No export was obtained in this session.

### Before any schema or rules migration

- Owner pauses staff writes for a documented maintenance window. Preserve live rules/indexes, project identifiers and active Hosting release independently.
- Run the owner JSON export, confirm downloaded file, inspect `skippedCollections` and identifier count, and validate with `node scripts/validate-store-backup.cjs /private/path/export.json`. Use the validator's documented invocation if it requests flags. Compare collection counts and sample identifiers/payments with the Console during the pause. Encrypt copies on two owner-controlled offline locations; never commit business data.
- A trusted owner runs a local Admin SDK recursive export using existing authorized IAM credentials to enumerate every collection/subcollection and identifier, preserving Firestore types/document paths. Export Firebase Auth users separately with authorized Firebase CLI/Admin tooling, retaining original UIDs and provider metadata. Never embed credentials in dashboard JavaScript. This privileged step is **required and still outstanding**; the client export does not substitute for it.
- Exporting via a local authorized SDK reads Firestore and consumes Spark quotas; it does not require deploying a server or activating Blaze. Do not use managed Firestore import/export, PITR or scheduled managed backups that require billing.
- Build an isolated emulator recovery copy from the privileged export, reconstruct typed values, load parent/subcollection paths, then verify counts, identifier uniqueness, stock totals, sale/payment references and financial totals. Validate owner/staff rules with synthetic authentication and direct denied requests. Keep restored test data private.
- Only proceed once the restore drill and manifest/checksums succeed. Restore to production is a separately reviewed, potentially destructive operation: require owner approval for concrete target paths and conflict policy. Never blindly overwrite existing documents or reset the database. Preserve Auth UIDs; Auth recovery and Firestore recovery are separate.

Until a complete privileged export and restore drill exist, do not perform a destructive migration. A UI-only release changes no document schema, but still needs authenticated compatibility checks.
