# Service Guide

| Service | Purpose | Primary records | Access |
| --- | --- | --- | --- |
| AuthContext | OTP, session restore, profile/status loading, logout | Auth, profiles | Supabase Auth; role from profile |
| audit.ts | Record sensitive activity | audit_logs | Authenticated insert; admin read |
| ocrService.ts | Replaceable OCR processing boundary | ocr_runs, ocr_extracted_fields | Government workflow; failures remain explicit |
| preprocessService.ts | Prepare evidence before OCR | Evidence files | Authorized inspection scope |
| complianceEngine.ts | Evaluate configured rule definitions | compliance_rules, compliance_checks | Authorized review roles |
| reportService.ts | Build PDF and DOCX artifacts | reports, versions, snapshots | Permitted report scope |
| SearchPage | Query permitted records | Businesses, products, inspections, samples, violations, reports | RLS-scoped authenticated users |
| NotificationsPage | Read and update recipient notifications | notifications | Recipient only |

All service failures should show a user-facing message without exposing stack traces, tokens, or database credentials. The OCR implementation may use a clearly labeled demo adapter when the external Python/Tesseract service is unavailable; it must not be presented as production OCR.
