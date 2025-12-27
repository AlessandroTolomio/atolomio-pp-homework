const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const QueueProcessor = require('./services/queueProcessor');

// Connect to MongoDB
connectDB();

// Initialize and start queue processor
const queueProcessor = new QueueProcessor();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database monitoring endpoint
app.get('/api/debug/jobs', async (req, res) => {
  try {
    const PDFJob = require('./models/PDFJob');
    
    // Get all jobs sorted by creation date (newest first)
    const jobs = await PDFJob.find({})
      .sort({ createdAt: -1 })
      .select('jobId status content filePath errorMessage createdAt updatedAt')
      .limit(50); // Limit to last 50 jobs for performance
    
    // Get summary statistics
    const stats = await PDFJob.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const summary = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    
    stats.forEach(stat => {
      summary[stat._id] = stat.count;
    });
    
    // Format response
    const response = {
      summary,
      totalJobs: jobs.length,
      jobs: jobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        contentPreview: job.content ? job.content.substring(0, 100) + (job.content.length > 100 ? '...' : '') : null,
        filePath: job.filePath,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        processingTime: job.status === 'completed' || job.status === 'failed' 
          ? Math.round((new Date(job.updatedAt) - new Date(job.createdAt)) / 1000) + 's'
          : null
      }))
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Error getting database content:', error);
    res.status(500).json({ error: 'Failed to retrieve database content' });
  }
});

// Import routes
const pdfRoutes = require('./routes/pdf');

// API routes
app.use('/api/pdf', pdfRoutes);

// Additional page routes
app.get('/brackets', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'brackets.html'));
});

app.get('/pairs-en', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pairs-en.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Resume any jobs that were in processing state during restart
  await queueProcessor.resumeProcessingJobs();
  
  // Start the queue processor
  queueProcessor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  queueProcessor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  queueProcessor.stop();
  process.exit(0);
});

module.exports = app;