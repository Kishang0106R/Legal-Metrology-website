export type ComplianceEvaluation = { automated_result: string; automated_reason: string; observed_value: string | null; confidence: number | null; field_name: string | null }

export function evaluateRule(rule: any, fields: any[]): ComplianceEvaluation {
  const fieldName = rule.configuration?.field ?? null
  const field = fields.find((item) => item.field_name === fieldName)
  const observed = field?.manually_verified && field.verified_value != null ? field.verified_value : field?.normalized_value ?? field?.extracted_value ?? null
  const confidence = field?.confidence ?? null
  if (rule.check_type === 'presence') {
    if (!field || field.detection_status === 'Not Detected' || !observed) return { automated_result: 'Not Detected', automated_reason: 'The expected field was not detected in OCR output. This does not by itself establish a legal violation.', observed_value: null, confidence, field_name: fieldName }
    if (confidence != null && confidence < 60 && !field.manually_verified) return { automated_result: 'Uncertain', automated_reason: 'OCR confidence is below the configured threshold. Manual verification is required.', observed_value: observed, confidence, field_name: fieldName }
    return { automated_result: field.manually_verified ? 'Pass' : 'Pass', automated_reason: `${fieldName} was detected in OCR-extracted fields. This is a preliminary automated finding pending officer review.`, observed_value: observed, confidence, field_name: fieldName }
  }
  if (!field || !observed) return { automated_result: 'Requires Manual Verification', automated_reason: 'This rule requires officer review because the configured source field is unavailable.', observed_value: null, confidence, field_name: fieldName }
  return { automated_result: 'Requires Manual Verification', automated_reason: 'This configured rule type is not automatically evaluated by the current engine. Officer review is required.', observed_value: observed, confidence, field_name: fieldName }
}
