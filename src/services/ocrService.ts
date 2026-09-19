export type OcrField = { field_name: string; extracted_value: string | null; normalized_value: string | null; confidence: number | null; detection_status: 'Detected' | 'Not Detected' | 'Uncertain' | 'Needs Review' | 'Manually Added'; source_text: string | null }
export type OcrResult = { rawText: string; overallConfidence: number; engine: string; engineVersion: string; fields: OcrField[] }

export type OcrInput = { inspectionId: string; evidenceId: string; imagePath: string }

// Replace this implementation with a Python/Tesseract/OpenCV API adapter later.
export const ocrService = {
  mode: 'demo' as const,
  async runOCR(_input: OcrInput): Promise<OcrResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 900))
    return {
      rawText: 'DEMO OCR DATA - NOT GENERATED FROM THE UPLOADED IMAGE\n\nABC FOODS PVT LTD\nNET QUANTITY: 500 g\nMRP: Rs. 120/-\nCOUNTRY OF ORIGIN: INDIA',
      overallConfidence: 88,
      engine: 'Demo OCR',
      engineVersion: '0.1-demo',
      fields: [
        { field_name: 'manufacturer_name', extracted_value: 'ABC Foods Pvt Ltd', normalized_value: 'ABC Foods Pvt Ltd', confidence: 96, detection_status: 'Detected', source_text: 'ABC FOODS PVT LTD' },
        { field_name: 'net_quantity', extracted_value: '500 g', normalized_value: '500', confidence: 94, detection_status: 'Detected', source_text: 'NET QUANTITY: 500 g' },
        { field_name: 'quantity_unit', extracted_value: 'g', normalized_value: 'g', confidence: 94, detection_status: 'Detected', source_text: 'NET QUANTITY: 500 g' },
        { field_name: 'mrp', extracted_value: 'Rs. 120/-', normalized_value: '120', confidence: 91, detection_status: 'Detected', source_text: 'MRP: Rs. 120/-' },
        { field_name: 'country_of_origin', extracted_value: 'India', normalized_value: 'India', confidence: 87, detection_status: 'Detected', source_text: 'COUNTRY OF ORIGIN: INDIA' },
        { field_name: 'consumer_care_phone', extracted_value: null, normalized_value: null, confidence: null, detection_status: 'Not Detected', source_text: null },
      ],
    }
  },
}
