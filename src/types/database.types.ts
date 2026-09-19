export type Status = 'Compliant' | 'Completed' | 'Active' | 'Approved' | 'Pending' | 'Under Review' | 'Requires Verification' | 'Non-Compliant' | 'Violation' | 'Rejected' | 'Draft' | 'Inactive' | 'Not Applicable'

export type ModuleKey = 'offices' | 'officers' | 'businesses' | 'products' | 'inspections' | 'ocr' | 'compliance' | 'samples' | 'laboratory' | 'violations' | 'reports' | 'search' | 'notifications' | 'settings'

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
