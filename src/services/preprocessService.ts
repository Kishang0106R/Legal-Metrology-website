export type PreprocessOptions = { grayscale?: boolean; denoise?: boolean; contrast?: boolean; deskew?: boolean }

// The browser only exposes the pipeline contract for now. Heavy image work belongs in the OCR service.
export const preprocessImage = async (imagePath: string, _options: PreprocessOptions = {}) => ({ imagePath, status: 'Ready for OCR Service' as const })
