# Uncle Apple Store — production Firestore rules audit (2026-11-16)

**Status:** reviewed using the owner's pasted current production rules (249 lines), Firebase Console read-only browser inspection, and GitHub development branch. **No production changes or data migration have been performed.**

## Findings in LIVE production rules

**Critical: do not activate staff accounts until permissions are changed.**

| Live collection | Current staff permission | Risk |
| --- | --- | --- |
| `products` | read and create; edit device fields and reduce stock | Exposes `unitCostGmd`; permits unaudited decreases |
| `sales` | read/create; increase `paidGmd` | Exposes sale cost/customer history; payment can be changed without a receipt |
| `payments` | read/create | All payment details visible; creates are not linked to a validated sale update |
| `losses` | read/create | Reveals loss costs; staff can write off stock |
| `expenses` | read | Reveals confidential owner overhead |
| `productDrafts` | read/create/update/delete | Reveals draft `cost`; staff can delete drafts belonging to the owner |
| `productIdentifiers` | get/create/delete | Staff can modify serial/IMEI index following product changes |
| `trackerRecords` | owner only | Correct confidentiality boundary |
| `users` | authenticated user reads own document; admin-only writes | Role self-promotion blocked |

The current Firebase Auth users screen showed **one account** on 2026-11-16. The audit does not establish that no other access methods exist, and the Firestore role policy remains unsafe if staff are granted access.

## Candidate implementation in THIS review branch

- Owner-only access to legacy private `products`, `sales`, `payments`, `losses`, `expenses`, `trackerRecords`.
- Separate staff-safe `staffInventory`, `staffSales`, `staffPayments` where purchase costs are omitted and staff sales/payments are individually scoped.
- Staff may reduce private stock only inside a matched transaction linked to a new staff sale and synchronized staff stock.
- The LIVE `productDrafts` field validation and `productIdentifiers` serial/IMEI index checks were copied into the development rules, but access to those collections is owner-only.
- Emulator tests check owner/staff/anonymous/inactive roles, private cost denial, unauthorized edits, staff sale and payment atomics, draft and identifier restrictions.

## MUST resolve before production rollout

1. Back up production data **and** the live rule version independently. A rule-text copy is not a database backup.
2. Compare the **currently deployed owner dashboard** with the development branch. The live UI includes draft and identifier editing that the branch's simplified owner UI does **not** fully implement. Do not overwrite the live dashboard with the branch UI until merged.
3. Preserve the live serial/IMEI uniqueness logic, test creating and updating products with identifiers, test draft lifecycle and owner sales in an emulator/staging project.
4. Implement safe worker lookup by IMEI/serial in `staffInventory` without leaking private notes or supplier costs. The current development worker search looks for an identifier but the safe inventory publication does not yet include those fields.
5. Confirm real Firebase owner login and existing documents in the production project before attempting any rules migration.
6. Reconcile staff-safe stock with 37 currently visible stock lines; avoid re-import duplicates from tracker records.
7. Deploy rules separately from Hosting only after safe staging tests. Confirm owner and staff tests immediately after deployment; keep a rollback plan.
8. Confirm banking/Wave receipts and historical acquisition costs before relying on gross profit figures.

### Important limitation

Cloud Firestore security rules protect client SDK operations, not project administrators with IAM/Admin SDK credentials. Keep Firebase Console IAM restricted to owners.
