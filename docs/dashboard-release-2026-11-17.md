# Private dashboard release — 17 November 2026

This updates the prior delivery report. The owner dashboard redesign is now live at https://uncle-apple-store.web.app/ . It was promoted from the verified `redesign-review` channel to the same site's live channel. The owner confirmed that sign-in and existing records loaded in the preview before promotion. HTML, CSS, app, reporting and receipt assets were verified against local tested files. The public storefront was not modified or deployed.

## Verified project and cost status

Authorized project: `uncle-apple-store`. Firebase reports billing disabled; Standard Firestore `(default)`, region `eur3`, `freeTier: true`, PITR disabled. No plan/billing changes, paid services, Cloud Functions or managed backups introduced. Existing initial full-collection queries and exports still consume free quotas. Reporting filters add no new database queries.

## Actual data preservation and recovery

A privileged recursive Firestore ListDocuments export at one readTime captured every enumerated document, including unknown collection names and identifier records. Exact counts and manifests are retained privately. A trailing-space collection name was found. Existing browser JSON export misses the trailing-space collection, confirming it is not complete disaster recovery.

Firebase Authentication export preserves the existing account data. Live rules and pre-release Hosting metadata were saved independently. The private backup and checksums are stored outside the repository under `/workspace/firebase-session`; credentials and business exports have not been committed or hosted. Owner should retain private offline copies; the workspace is not permanent offsite storage. Authentication hashes/provider recovery, IAM/configuration and Hosting recovery remain separate from Firestore restoration.

All exported documents were restored to a local emulator with SDK field equality, including exact timestamp seconds/nanoseconds and trailing-space names. The emulator REST mapping normalized the malformed `active ` key, so the successful restore used the SDK; the raw source JSON was preserved unmodified. A post-deployment recursive read confirmed all original document paths and field values unchanged. The agent made zero production document/user writes.

Available dashboard sales are recent; the default completed-month window therefore contains no recorded dashboard sales. Tracker history lacks validated sale dates and remains separate. No historical financial series was fabricated.

## Tests

- 14 calculation, date, model/scan and receipt tests pass.
- Chromium synthetic desktop/mobile tests pass, including custom filters, receipt cost exclusion, scanning flows and staff legacy loader denial.
- Recovery emulator checks pass: owner collection reads, product registration, atomic sale/stock/initial payment, later payment, identifier uniqueness, draft create/edit/delete, unauthenticated denial, role escalation denial.
- Live rules' staff cost leak reproduced locally. Proposed interim owner-only rules deny staff get/list/create/update across confidential legacy paths while preserving owner workflows. Syntax validator returns no errors.
- Real owner sign-in/record loading confirmed by the owner in preview. No real staff account exists; no staff production login test was possible without adding accounts. Emulator tests are not live staff-token tests.

## Security change awaiting explicit approval

The exact prototype change in `firestore.owner-only.rules` is `member()` accepting only `['owner']` instead of `['owner','staff']`; no schema/data migration. A dedicated rules-only configuration is `firebase.owner-security.json`. Owner CRUD validation remains the previously deployed validation. This is an interim confidentiality restriction, not a completed staff system or a complete schema-hardening rewrite.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for blocking staff access to legacy documents containing private purchase costs while preserving approved owner workflows. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

Automatic approval review rejected production deployment because persistent denial of staff workflows requires explicit owner approval of this precise rule change. The owner approval question is pending. The existing production rules remain in effect until approval and successful verified deployment. Do not enable staff accounts meanwhile. Local UI denial is not a database security boundary.

Once explicitly approved, deploy only `firestore:rules` with the dedicated config and verify the deployed source. Keep prior live rules for rollback. Do not deploy the separate candidate `firestore.rules`, which assumes an unfinished staff-data migration.

## Hosting recovery

Previous version: `add035cdfbee8f54`. New verified preview version: `85e2361ea297f3c3`. Only site `uncle-apple-store` was promoted. Hosting rollback restores frontend/configuration only; it does not restore data or rules. A subsequent owner refresh/login check is recommended after the rules decision.

## Still incomplete

Staff inventory registration/updates and isolated sales/payment workflows, owner staff management, complete tamper-resistant action audit, product condition/photos, durable request idempotency, reconciled historical tracker analytics and production staff authentication tests remain unfinished. Authentication export has been saved but a complete live Auth restoration was not attempted. Do not describe this release as completion of all original requirements.
