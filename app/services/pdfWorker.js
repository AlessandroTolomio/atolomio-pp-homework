/**
 * PDF Worker - Handles PDF generation in a separate thread
 * This prevents blocking the main event loop during CPU-intensive PDF creation
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const SpiralGenerator = require('./spiralGenerator');

if (isMainThread) {
  // Main thread - exports the async PDF generation function
  class PDFWorkerService {
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
     * Generate PDF in a worker thread (non-blocking)
     * @param {string} content - Text content to convert to PDF
     * @param {string} jobId - Job ID for unique filename
     * @returns {Promise<string>} Promise that resolves to the filename of generated PDF
     */
    async generatePDFAsync(content, jobId) {
      return new Promise((resolve, reject) => {
        const filename = `pdf_${jobId}.pdf`;
        
        // Create worker thread
        const worker = new Worker(__filename, {
          workerData: { 
            content, 
            filename,
            pdfStorageDir: this.pdfStorageDir
          }
        });
        
        // Handle worker messages
        worker.on('message', (result) => {
          if (result.success) {
            resolve(result.filename);
          } else {
            reject(new Error(result.error));
          }
        });
        
        // Handle worker errors
        worker.on('error', (error) => {
          reject(new Error(`Worker error: ${error.message}`));
        });
        
        // Handle worker exit
        worker.on('exit', (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });
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

  module.exports = PDFWorkerService;

} else {
  // Worker thread - handles the actual PDF generation
  const { content, filename, pdfStorageDir } = workerData;
  
  try {
    const filePath = path.join(pdfStorageDir, filename);

    // Generate spiral layout for PDF content
    const processedContent = SpiralGenerator.generateSpiral(content);
    console.log('Generated spiral layout for PDF');

    // Create a new PDF document
    const doc = new PDFDocument();
    
    // Create write stream
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add content to the PDF with monospace font (spiral layout)
    doc.font('Courier')
       .fontSize(8) // Smaller font for spiral to fit better
       .text(processedContent, 50, 50, {
         width: 500,
         align: 'center',
         lineGap: 1
       });

    // Finalize the PDF
    doc.end();

    // Handle stream events
    stream.on('finish', () => {
      // Send success message back to main thread
      parentPort.postMessage({
        success: true,
        filename: filename,
        filePath: filePath
      });
    });

    stream.on('error', (error) => {
      // Send error message back to main thread
      parentPort.postMessage({
        success: false,
        error: `Failed to write PDF file: ${error.message}`
      });
    });

  } catch (error) {
    // Send error message back to main thread
    parentPort.postMessage({
      success: false,
      error: `PDF generation failed: ${error.message}`
    });
  }
}