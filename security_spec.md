# Security Specification for ZMK Arsenal App

## 1. Data Invariants
- Calculations MUST belong to a user (`userId` match).
- Settings is a global singleton document named `prices` (or similar).
- Calculations are immutable after creation (mostly).
- User verification (email verified) is required for writes.

## 2. The "Dirty Dozen" Payloads
1. **P1 (Identity Spoof):** Create calculation with `userId` of another user.
2. **P2 (Identity Spoof):** Update calculation's `userId`.
3. **P3 (PII Leak):** Read calculation of another user.
4. **P4 (State Shortcutting):** Set `createdAt` to a fake client-side timestamp.
5. **P5 (Resource Poisoning):** Document ID longer than 128 chars.
6. **P6 (Settings Hijack):** Update `settings/prices` as a non-admin.
7. **P7 (Ghost Field Injection):** Add `isVerified: true` to a calculation.
8. **P8 (Bulk Scrap):** List calculation collection without filtering by `userId`.
9. **P9 (Admin Spoof):** Try to create an `admins` document for yourself.
10. **P10 (Negative Prices):** Setting `scrapPrice` to a negative value or non-string (handled by schema).
11. **P11 (Orphaned Write):** Creating a calculation for a non-existent steel grade (validated by schema).
12. **P12 (Denial of Wallet):** Sending a huge string for `label`.

## 3. The Test Runner
(Will be implemented in `firestore.rules.test.ts` if needed, but the priority is the rules and blueprint).
