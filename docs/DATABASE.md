# Database Guide

The inspection is the central entity.

```text
Office -> Officer/Profile -> Inspection
Inspection -> Business -> Product
Inspection -> Evidence -> OCR run -> Extracted fields
Inspection -> Compliance run -> Compliance checks -> Officer decision
Inspection -> Sample -> Custody -> Laboratory assignment -> Tests -> Results -> Lab report
Inspection -> Confirmed compliance check -> Violation -> Corrective action
Inspection -> Reports -> Versions and snapshots
Profile -> Notifications and Audit logs
```

## Integrity and history

UUID primary keys identify records. Inspection, sample, laboratory, violation, and report foreign keys use restrictive deletes where history must remain traceable. Sequence-backed numbers identify inspections, samples, lab tests, violations, and reports. Status fields support deactivation and workflow transitions without deleting history.

## Authorization

RLS policies use the authenticated profile, office scope, business ownership, inspector assignment, and laboratory assignment. Frontend route guards improve usability but are not the security boundary. Private Storage buckets use database-backed ownership and scope checks.

## Rule history

Compliance checks store `rule_id` and `rule_version`. Automated results are preliminary; `officer_result`, `reviewed_by`, and `reviewed_at` record the authorized review.
