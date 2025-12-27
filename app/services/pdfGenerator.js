const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PDFGeneratorService {
  constructor() {
    this.pdfStorageDir = path.join(__dirname, '..', 'pdfs');
    this.ensureStorageDirectory();
  }

  /**
   * Ensure the PDF storage directory exists
   */
  ensureStorageDirectory() {
    if (!fs.existsSync(this.pdfStorageDir)) {
      fs.mkdirSync(this.pdfStorageDir, { recursive: true });
    }
  }

  /**
   * Generate a unique filename for PDF files
   * @returns {string} Unique filename with .pdf extension
   */
  generateUniqueFilename() {
    const uniqueId = uuidv4();
    return `pdf_${uniqueId}.pdf`;
  }

  /**
   * Generate PDF from text content and save to local storage
   * @param {string} content - Text content to convert to PDF
   * @param {string} filename - Optional filename, if not provided generates unique one
   * @returns {Promise<string>} Promise that resolves to the file path of generated PDF
   */
  async generatePDF(content, filename = null) {
    return new Promise((resolve, reject) => {
      try {
        // Generate unique filename if not provided
        const pdfFilename = filename || this.generateUniqueFilename();
        const filePath = path.join(this.pdfStorageDir, pdfFilename);

        // Create a new PDF document
        const doc = new PDFDocument();
        
        // Pipe the PDF to a file
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add content to the PDF with monospace font
        doc.font('Courier')
           .fontSize(10)
           .text(content, 50, 50, {
             width: 500,
             align: 'left',
             lineGap: 2
           });

        // Finalize the PDF
        doc.end();

        // Handle stream events
        stream.on('finish', () => {
          resolve(filePath);
        });

        stream.on('error', (error) => {
          reject(new Error(`Failed to write PDF file: ${error.message}`));
        });

      } catch (error) {
        reject(new Error(`PDF generation failed: ${error.message}`));
      }
    });
  }

  /**
   * Check if a PDF file exists in storage
   * @param {string} filename - Name of the PDF file
   * @returns {boolean} True if file exists, false otherwise
   */
  fileExists(filename) {
    const filePath = path.join(this.pdfStorageDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Get the full path to a PDF file
   * @param {string} filename - Name of the PDF file
   * @returns {string} Full path to the PDF file
   */
  getFilePath(filename) {
    return path.join(this.pdfStorageDir, filename);
  }
}

module.exports = PDFGeneratorService;