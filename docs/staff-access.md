# Staff access

Staff sign in using their individual email at `/staff.html`. The main dashboard also sends an approved staff user there. The owner continues to use the main dashboard. Firebase Authentication verifies the account, and a Firestore `users/{uid}` document controls dashboard access.

| Staff can | Owner controls |
| --- | --- |
| Search stock by model, SKU, serial number or IMEI, and see selling prices and device details | Buying costs, profit, expenses, losses, drafts, private notes and tracker records |
| Record a sale at the listed price and collect payments on their own sales | Add stock, edit prices, review all sales and record payments on staff sales |

The staff catalog is an allowlisted copy of existing inventory. Publishing stock creates these copies and private cost versions without modifying the source records. New owner product edits, sales and write-offs keep the catalog updated. Staff sales reduce both stock counts atomically. Staff cannot read cost versions or another staff member's transactions. The owner dashboard includes staff sales and their original buying cost in the charts and ledger.

## Deploy to Uncle Apple Store

Use the staff-permissions branch and an authenticated Firebase CLI with access to the `uncle-apple-store` project. Save the current Firestore rules and download a fresh owner export before replacing the rules. The JSON export is not a full disaster-recovery backup. Keep staff accounts inactive during deployment and initial checks.

From the branch's checkout, run these in order:

```sh
firebase deploy --only firestore:rules --project uncle-apple-store --config firebase.json
firebase deploy --only hosting --project uncle-apple-store --config firebase.dashboard-ui.json
```

The Hosting config targets the private dashboard's Firebase site. These commands do not deploy the storefront.

1. Open the owner dashboard, verify the existing stock and sales are visible, then go to **Products → Publish existing stock for staff**. Repeat safely if interrupted. A product with a zero selling price is visible in stock but staff cannot sell it.
2. In Firebase Authentication, create one account with the staff member's own email. Use a temporary password and have them set their own password through Firebase's password reset flow. In Firestore, add a document to the `users` collection with the exact UID as the document ID, `role` (string) set to `staff`, and `active` (boolean) set to `true`.
3. Use a separate browser session to sign in and confirm stock lookup at [Staff sign in](https://uncle-apple-store.web.app/staff.html). Do not enter a fake sale on production stock. The automated browser test covers sales and payments in emulators.
4. To revoke access, set `active` to `false` and disable the Authentication user. If a rollback is required, deactivate staff profiles before restoring a previous policy. Once staff transactions exist, preserve the staff collections and private cost versions so the owner can reconcile those records.

## Verification

The **Private dashboard checks** workflow runs the Firestore rules suite and the browser sign-in flow against Firebase emulators using synthetic records. It verifies that staff cannot read costs or private collections, change the selling price, alter stock without a sale, view another staff member's records, or access the dashboard without an approved account. It also checks owner drafts and identifiers, atomic sales and payments, the owner ledger and charts, and simultaneous attempts to sell the last unit.
