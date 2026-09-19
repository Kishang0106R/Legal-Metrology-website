-- Part 11: Digital Reports and Document Management

-- Create sequence for report numbers
CREATE SEQUENCE IF NOT EXISTS report_number_seq START 1;

-- Function to generate report number (e.g. RPT-2026-000001)
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
    next_val INT;
    year_val TEXT;
BEGIN
    SELECT nextval('report_number_seq') INTO next_val;
    year_val := to_char(CURRENT_DATE, 'YYYY');
    RETURN 'RPT-' || year_val || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_number TEXT UNIQUE NOT NULL DEFAULT generate_report_number(),
    report_type TEXT NOT NULL, -- Inspection Report, Compliance Report, Laboratory Summary Report, Violation Report, Inspection Summary, Evidence Report
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE CASCADE,
    violation_id UUID REFERENCES public.violations(id) ON DELETE SET NULL,
    sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
    laboratory_report_id UUID REFERENCES public.lab_reports(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Draft', -- Draft, Generated, Pending Review, Reviewed, Approved, Published, Superseded, Cancelled
    generated_by UUID REFERENCES public.profiles(id),
    generated_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    version INTEGER DEFAULT 1,
    file_path TEXT,
    editable_file_path TEXT,
    checksum TEXT,
    signature_status TEXT DEFAULT 'Pending',
    signed_by UUID REFERENCES public.profiles(id),
    signed_at TIMESTAMPTZ,
    signature_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report versions table
CREATE TABLE IF NOT EXISTS public.report_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    file_path TEXT,
    editable_file_path TEXT,
    generated_by UUID REFERENCES public.profiles(id),
    generated_at TIMESTAMPTZ,
    checksum TEXT,
    change_summary TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report data snapshots table (to preserve the historical state of the information used to generate them)
CREATE TABLE IF NOT EXISTS public.report_data_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_data_snapshots ENABLE ROW LEVEL SECURITY;

-- Storage Bucket for Reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS for Reports Bucket
-- Assuming role-based access for 'reports' bucket
CREATE POLICY "Allow authenticated access to reports bucket"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'reports' AND auth.role() = 'authenticated');

CREATE POLICY "Allow officers to insert to reports bucket"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'officer' OR role = 'admin' OR role = 'lab_technician' OR role = 'lab_manager')
        )
    ));

CREATE POLICY "Allow officers to update reports bucket"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'reports' AND auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'officer' OR role = 'admin' OR role = 'lab_technician' OR role = 'lab_manager')
        )
    ));


-- RLS Policies for Reports

-- Reports: Select
-- Government users see all in their scope (for simplicity, all for now, or based on office_id via inspection).
-- Business users see reports tied to their inspections/businesses.
CREATE POLICY "Government users can view all reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'officer', 'lab_technician', 'lab_manager')
        )
    );

CREATE POLICY "Business users can view their reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.businesses b ON b.owner_id = p.id
            JOIN public.inspections i ON i.business_id = b.id
            WHERE p.id = auth.uid() AND p.role = 'business' AND reports.inspection_id = i.id
        )
    );

-- Reports: Insert/Update (Officers/Admins/Lab)
CREATE POLICY "Authorized users can insert reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'officer', 'lab_technician', 'lab_manager')
        )
    );

CREATE POLICY "Authorized users can update reports"
    ON public.reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'officer', 'lab_technician', 'lab_manager')
        )
    );

-- Report Versions RLS (Same as Reports)
CREATE POLICY "Users can view report versions"
    ON public.report_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
        )
    );

CREATE POLICY "Authorized users can insert report versions"
    ON public.report_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'officer', 'lab_technician', 'lab_manager')
        )
    );

-- Report Data Snapshots RLS
CREATE POLICY "Users can view report snapshots"
    ON public.report_data_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE r.id = report_id
        )
    );

CREATE POLICY "Authorized users can insert report snapshots"
    ON public.report_data_snapshots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'officer', 'lab_technician', 'lab_manager')
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Enable search indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_report_number ON public.reports(report_number);
CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON public.reports(inspection_id);
CREATE INDEX IF NOT EXISTS idx_reports_violation_id ON public.reports(violation_id);

-- Adding an audit log event for reports
-- Assuming audit log is handled by `audit_logs` table (added in earlier parts)
