# Dashboard charts and easier product entry

This update adds owner-only performance charts to Home and barcode/model assistance to Add Product. Inventory and database rules are unchanged. The frontend baseline was recovered from the live Firebase site on 16 November 2026 because the existing development branch had an older owner UI. Existing draft revisions, identifier transactions and product forms are preserved.

## Figures

- Monthly sales and profit use `sales.date` and captured sale unit cost, not present-day inventory cost. Money is aggregated as integer cents. Missing buying costs make that month's profit unknown.
- Cash collected and unpaid balances are explicitly all-time totals on dashboard sales; no false monthly cash allocation from sale dates.
- Six-month charts show no-record gaps. Percent changes require two completed months with records and a positive baseline. Current-month and zero/negative-baseline comparisons are not inferred.
- Expenses are booked entirely on their entered date (no rent amortisation). Stock ages are current quantities, including an unknown-date bucket.
- Tracker 2 & 3 stays separate; imported sale dates/deduplication have not been verified.

## Product entry

Category-specific editable model suggestions, iPhone-specific storage/colour suggestions, and camera scanning for IMEI/serial barcodes. Scanning runs locally via pinned ZXing Browser 0.1.5, loaded only on request. Camera stops on capture, cancel, navigation away, sign-out and tab hiding. Captures require explicit confirmation and do not save a product. Denied or unavailable cameras leave typing/pasting available. Numeric UPC/EAN codes are rejected as serials. Existing transaction-level uniqueness is retained; the inline duplicate warning is advisory and uses loaded inventory.

iPhone options source: https://support.apple.com/en-us/108044, retrieved 2026-11-16. Other families are starter suggestions, not exhaustive specifications. Custom models and values remain allowed.

## Test and deploy

`node --test scripts/dashboard-insights.test.mjs`

The Dashboard experience checks workflow also runs Chromium tests with synthetic records and saves desktop/mobile screenshots. It never authenticates or writes production data. Physical phone camera decoding still needs an on-device check.

Deploy only the UI after checks pass:

`firebase deploy --only hosting --project uncle-apple-store --config firebase.dashboard-ui.json`

This config has no Firestore target. Do not deploy `firestore.rules` from this branch as part of this UI update: the proposed staff isolation migration remains separate and needs compatibility work. Do not enable staff accounts based on this UI update; see the existing live Firestore audit. No public storefront, DNS, inventory migration or staff permission changes are included.
