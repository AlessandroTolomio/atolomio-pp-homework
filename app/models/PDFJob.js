const mongoose = require('mongoose');

const pdfJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  content: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Index for efficient querying of pending jobs
pdfJobSchema.index({ status: 1, createdAt: 1 });

// Static method to find pending jobs in FIFO order
pdfJobSchema.statics.findPendingJobs = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: 1 });
};

// Instance method to update job status
pdfJobSchema.methods.updateStatus = function(newStatus, filePath = null, errorMessage = null) {
  this.status = newStatus;
  if (filePath) this.filePath = filePath;
  if (errorMessage) this.errorMessage = errorMessage;
  return this.save();
};

const PDFJob = mongoose.model('PDFJob', pdfJobSchema);

module.exports = PDFJob;