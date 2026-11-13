# Uncle Apple Store — private management dashboard (MVP)

Status: **development draft**. Do not merge/deploy until Firebase authentication, roles and Firestore rules are configured and tested.

## What this first version does

- Private sign-in at \`/admin/\` with individual email/password accounts. No self-signup.
- Owner: can add inventory, record sales, instalment payments, stock damage/loss and expenses.
- Staff: can record sales, instalment payments and stock damage/loss. Cannot add inventory or expenses.
- Product records use unique SKUs. Device = 1 unit; accessories may have several units.
- Sale / damage writes use Firestore transactions to reduce stock atomically, preventing concurrent overselling.
- Shows sales revenue, cash collected, customer balances, cost of goods sold, gross profit, remaining inventory at cost, write-offs, expenses and an **estimated** result.
- Shows low stock, products held unsold for 45+ days, unpaid and overdue sales. Allows CSV export.

**Not yet included:** product import, public catalogue stock synchronization, automated currency conversion, refunds/returns, repair jobs, audit-proof accounting, daily/monthly filters, tax/VAT reporting or payment reminders. Existing website inventory is currently hand-maintained in \`src/catalog/data/\` and has no shared database with this dashboard. Do not assume the public listings are live.

**All figures are GMD only.** When buying stock in EUR, enter the actual GMD equivalent paid (including relevant conversion cost). Shipping, rent and repairs go under expenses; the dashboard has no automatic FX rates.

## Required owner setup (no password, private keys or ID documents in GitHub)

1. At https://console.firebase.google.com/ create a **new project** named for the store. Select **Spark / no-cost** (no billing method). Do not turn on Cloud Functions, App Hosting or paid upgrades. Use a separate project for test data if testing with real customers.
2. Create a web app under **Project settings → Your apps**. Copy the web configuration (apiKey, authDomain, projectId, appId, messagingSenderId) into \`public/admin/firebase-config.js\`, replacing \`null\`. These are public web-app settings, **not** a service account, password or admin key.
3. In **Authentication → Sign-in method**, enable **Email/Password** only. In **Authentication → Users**, add your own owner account, and a separate staff account. Choose unique, strong passwords; do not share passwords.
4. Open **Cloud Firestore**, create the **default database** in production/locked mode. In **Rules**, paste **the complete contents** of \`firestore.rules\` and publish. The initial unapproved user must have NO access.
5. In **Authentication → Users**, copy your exact Firebase **UID**. In Firestore create collection \`users\` and document ID **exactly that UID**. Add fields **role** (string) = \`owner\` and **active** (boolean) = \`true\`. For the staff UID, create another document with role \`staff\` and active true. Only the owner/project administrator should edit these profiles through Firebase Console. To revoke access set active=false, and disable the Auth user.
6. Add the deployment domain(s) in **Authentication → Settings → Authorized domains**: e.g. your Firebase staging domain and, after migrating, \`uncleapplestore.com\`. Add \`www\` if actually used. Do not share the Firebase console access with store staff.
7. Test Firestore Rules using the Firebase rules playground/emulator with (a) signed-out requests, (b) signed-in user **without** a profile, (c) staff and (d) owner. Confirm unauthenticated/unapproved requests cannot read **any** financial records. Confirm staff cannot create inventory, edit cost/price or create expenses.
8. After building \`npm install && npm run build\`, test \`dist/admin/index.html\` through a local web server or Firebase Hosting staging site. **Do not double-click the HTML file** because module imports require HTTP(S). In the dashboard, add a sample product, sell part of it, collect a later instalment, write off damaged stock and add an expense. Check that stock, revenue, receivables and estimated result reconcile.
9. To switch hosting later, first verify the entire current public site, SEO pages, assets and PWA on a Firebase Hosting staging domain. Using the Firebase CLI: \`firebase login\`, \`firebase use --add\`, \`npm run build\`, \`firebase deploy --only firestore:rules,hosting\`. **Do not change domain DNS until the production site and security checks pass.** Deploying Firestore rules first before admin UI is essential.

## Data model (collections)

- \`users/{uid}\`: \`{ role: 'owner'|'staff', active: true }\`; created in Firebase Console only.
- \`products/{SKU}\`: stockQty, unitCostGmd, unitPriceGmd, receivedOn, category, name, notes.
- \`sales/{autoId}\`: productId, quantity, unitCostGmd at sale, unitPriceGmd, totalGmd, paidGmd, customer, date, dueOn.
- \`payments/{autoId}\`: associated saleId, amountGmd, method, createdBy, createdAt.
- \`losses/{autoId}\`: productId, quantity, costGmd, reason, date.
- \`expenses/{autoId}\`: category, amountGmd, date, note.

Owner/staff permissions are enforced by Firestore Rules, **not** by hiding buttons or the admin page. A publicly accessible HTML/JavaScript frontend is normal; it must never contain private credentials or inventory financial data. Review all rules before live deployment. The present rules are an initial access-control baseline, not a substitute for an independent security review. They do not guarantee staff-entered transaction totals match payment provider settlements.

## Accounting definitions

- **Revenue** = sum of recorded sales, including instalment sales.
- **Collected** = sum of initial payments and later instalments, as stored on sales.
- **Receivables** = revenue − collected. Not the same as cash profit.
- **Gross profit** = revenue − recorded sold-unit costs (excludes shipping, rent, damages, refunds).
- **Estimated result** = gross profit − stock write-off cost − entered expenses.
- **Inventory at cost** = quantity remaining × unit acquisition cost.
- **Aged unsold** = stock still on hand at least 45 days after its recorded receiving date.

Initial sales and subsequent payments are logged in \`payments\`. There is no automated receipt generation or bank matching yet.

## Deployment note

The current repository uses a static Vite build and GitHub Pages for its published site. \`public/admin/\` is copied into Vite \`dist/admin/\`. Adding this feature on a **separate branch** does not alter the published shop. Only merge after verified setup. Firebase Hosting is configured in \`firebase.json\` as a **possible future** deployment target; it is not automatically activated or connected to the real domain.

**Spark free tier:** Firebase Authentication and Firestore/Hosting have limits. When free quotas are exhausted, operations can be unavailable rather than unlimited/free. Watch usage in Firebase Console. The existing domain registration is a separate cost.

## Production safety checklist

- [ ] Only the owner has Firebase Console project administration.
- [ ] Firestore rules deployed **before** enabling admin login.
- [ ] Owner account and separate staff account work; unapproved account is denied.
- [ ] No password/service account/private customer data committed to repository.
- [ ] Stock decrements are transactional; try two sales against a 1-unit item.
- [ ] Incorrect payment > balance and loss > stock are rejected.
- [ ] Export contains only expected shop data; customer information stays private.
- [ ] Public listings continue to work; no automatic sync assumed.
- [ ] Backup / CSV export plan in place.
- [ ] Validate mobile usability and browser compatibility before launch.
