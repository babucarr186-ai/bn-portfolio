# Uncle Apple Store — staff privacy rollout (NOT YET LIVE)

This is a **review branch**, not a production change. Do not deploy the new Firestore rules until their emulator authorization tests pass, owner data is backed up, and the complete stock/sales workflow has been verified in a staging project.

## Access policy

| Data | Owner | Staff |
| --- | --- | --- |
| \`products\` (includes unitCostGmd) | read/write | NO READ, stock-only transactional blind decrement |
| \`staffInventory\` (no purchase costs) | read/write/publish | read; sale-linked stock decrement only |
| \`sales\`, \`payments\` (legacy financial data) | read/write | NO ACCESS |
| \`staffSales\`, \`staffPayments\` | all records | ONLY their own transactions, with transaction-linked updates |
| \`losses\`, \`expenses\`, \`trackerRecords\` | owner | NO ACCESS |
| \`users\` | approved administrator | only own role document |
| Profit, investment dashboards | owner only | never rendered or queried |

*Product cost is not a field in staffInventory or staffSales.* Existing source inventory and its private notes remain in \`products\`.

## Workflow

1. Owner creates staff account in **Firebase Authentication** and then creates its \`users/<AUTH_UID>\` document with \`role\` (string) \`staff\` and \`active\` (boolean) \`true\`. Do NOT give workers Google/Firebase Console IAM access or the project owner's Google credentials.
2. Owner continues to log in at \`/admin/\`; workers log in at \`/admin/staff.html\`. A staff member using the owner login is redirected to their staff view.
3. Owner reviews products and clicks **Publish missing products to staff**. This creates a copy with name, SKU, category, stock, retail price and date only; private notes and purchase costs are not copied. New items created in the owner UI create both docs automatically.
4. Staff looks up SKU or product name, records a sale (customer, quantity, fixed selling price, initial payment, method and due date). One atomic transaction creates a staff sale and reduces the safe and private stock counts. It uses a blind decrement to the private document and cannot read private costs.
5. Staff records later instalments for only their own sales; an atomic transaction updates the collected amount and creates an immutable staff payment record.
6. Owner sees all staff sales and owner legacy sales in the financial overview and a new staff-sales ledger. Owner-only costs are resolved by SKU for profit estimates. Accurate accounting requires stable purchase-cost-per-SKU lots and proper expense recording.

**Do not use the Worker login as a business-owner email account.** Each worker should have a unique personal login. Never share passwords.

## Limitations to address before operational launch

- **Transactions are not bank reconciliation.** Staff can register a payment that must later be matched to cash or Wave receipts by the owner.
- Worker access to their own transactions implies they can calculate their own recorded sales amounts. The entire-store financial reports remain hidden.
- Staff can ONLY see sales they created. A shared customer follow-up queue, shared shifts, refunds and returns require additional role design. Do not grant unrestricted historical sales access as a shortcut.
- Owner edits to inventory outside the dashboard (direct Firestore Console updates) could desynchronize the safe and private stock records. Use the dashboard and reconcile both stores if bulk editing.
- Product purchase-cost estimates use the *current* private cost document for worker sales. This requires each SKU to represent a unique cost lot; if cost changes, add immutable lot costing before claiming accounting accuracy.
- The staff-facing \`notes\` field must never contain supplier prices, trade terms, passwords or private personal details. The existing product-publish action omits old private notes automatically.
- The website's public product listings are **not automatically synchronized** with Firestore. This rollout changes only the private admin.
- Existing Firestore records need backed-up, reviewed, and reconciled before migration. Do not bulk import unverified old Google Sheets records.
- Firestore rules protect mobile/web clients. Anyone granted Firebase Console/Cloud IAM administration may bypass client rules. Keep project administration owner-only.
- Before a live deployment test the Firebase rules in the emulator for the 4 personas: anonymous, inactive, staff A, staff B, and owner. Verify rejection of cost reads, global sales listing, price edits, unlinked writes, and overpayments.

## Test in CI

\`scripts/staff-firestore-rules.test.mjs\` contains Firestore Emulator checks for deny/allow permissions and atomic sale/payment writes. Workflow: \`.github/workflows/admin-checks.yml\`. These tests require Firebase Tools, Java, and \`@firebase/rules-unit-testing\`. **Do not merge while the tests fail.**

## Rollout commands (after tests and owner approval only)

\`\`\`bash
git pull
npm ci
npm run build
firebase hosting:channel:deploy admin-test --project uncle-apple-store --expires 7d --config firebase.admin-preview.json
\`\`\`

The preview configuration publishes only \`dist/admin/\`. Its staff URL is the preview Channel URL plus \`/staff.html\`. Publishing to the preview does not update \`uncleapplestore.com\`.

Deploy Firestore rules **separately** after confirming that active owner operations are compatible and after reviewing the current production rules backup:

\`\`\`bash
firebase deploy --only firestore:rules --project uncle-apple-store
\`\`\`

This command overwrites live rules. Rollout must be deliberate; it is not safe to execute blindly or assume all owner workflows are working after a new ruleset.

## Firebase console approval

If an authorized user cannot see their dashboard, compare Firebase Authentication UID and Firestore \`users/<UID>\` **exactly**. The document must exist in the **default** database of the \`uncle-apple-store\` project and use a boolean \`active: true\`. Do not repeatedly delete/create owner accounts. This is separate from the GitHub/Firebase CLI Google account.
