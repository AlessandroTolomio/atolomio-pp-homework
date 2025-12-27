const PDFJob = require('../models/PDFJob');
const PDFWorkerService = require('./pdfWorker');
const path = require('path');

class QueueProcessor {
  constructor() {
    this.pdfWorker = new PDFWorkerService();
    this.isProcessing = false;
    this.pollingInterval = 5000; // 5 seconds
    this.intervalId = null;
  }

  /**
   * Start the queue processor with polling mechanism
   */
  start() {
    if (this.intervalId) {
      console.log('Queue processor is already running');
      return;
    }

    console.log('Starting PDF queue processor with Worker Threads...');
    
    // Process any existing jobs immediately
    this.processNextJob();
    
    // Set up polling interval
    this.intervalId = setInterval(() => {
      this.processNextJob();
    }, this.pollingInterval);
    
    console.log(`Queue processor started with ${this.pollingInterval}ms polling interval`);
  }

  /**
   * Stop the queue processor
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Queue processor stopped');
    }
  }

  /**
   * Process the next pending job in FIFO order
   */
  async processNextJob() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      // Find the oldest pending job (FIFO order)
      const pendingJob = await PDFJob.findOne({ status: 'pending' })
        .sort({ createdAt: 1 });

      if (!pendingJob) {
        // No pending jobs, nothing to do
        return;
      }

      console.log(`Processing job ${pendingJob.jobId} in worker thread...`);

      // Update job status to processing
      await pendingJob.updateStatus('processing');

      try {
        // Generate the PDF using worker thread (non-blocking)
        const filename = await this.pdfWorker.generatePDFAsync(pendingJob.content, pendingJob.jobId);
        
        // Update job status to completed with file path
        await pendingJob.updateStatus('completed', filename);
        
        console.log(`Job ${pendingJob.jobId} completed successfully in worker thread. File: ${filename}`);
        
      } catch (pdfError) {
        // PDF generation failed, update job status to failed
        const errorMessage = `PDF generation failed: ${pdfError.message}`;
        await pendingJob.updateStatus('failed', null, errorMessage);
        
        console.error(`Job ${pendingJob.jobId} failed in worker thread:`, errorMessage);
      }

    } catch (error) {
      console.error('Error in queue processor:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Resume processing of jobs that were in 'processing' state during system restart
   */
  async resumeProcessingJobs() {
    try {
      // Find jobs that were in processing state (likely due to system restart)
      const processingJobs = await PDFJob.find({ status: 'processing' });
      
      if (processingJobs.length > 0) {
        console.log(`Found ${processingJobs.length} jobs in processing state, resetting to pending...`);
        
        // Reset them back to pending so they can be processed again
        await PDFJob.updateMany(
          { status: 'processing' },
          { status: 'pending' }
        );
        
        console.log('Processing jobs reset to pending status');
      }
    } catch (error) {
      console.error('Error resuming processing jobs:', error);
    }
  }
}

module.exports = QueueProcessor;