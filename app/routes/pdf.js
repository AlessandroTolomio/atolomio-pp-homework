const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const PDFJob = require('../models/PDFJob');

const router = express.Router();

// POST /api/pdf/generate - Create new PDF generation job
router.post('/generate', async (req, res) => {
  try {
    // Validate input content
    const { content } = req.body;
    
    // Check if content is provided and is a non-empty string
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Content is required and must be a non-empty string'
      });
    }
    
    // Generate unique job ID
    const jobId = uuidv4();
    
    // Create new PDFJob with pending status
    const pdfJob = new PDFJob({
      jobId,
      status: 'pending',
      content: content.trim()
    });
    
    // Save job to database
    await pdfJob.save();
    
    // Return jobId to client
    res.status(201).json({
      jobId: jobId
    });
    
  } catch (error) {
    console.error('Error creating PDF job:', error);
    
    // Handle duplicate jobId error (very unlikely with UUID but good to handle)
    if (error.code === 11000) {
      return res.status(500).json({
        error: 'Failed to create unique job ID, please try again'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error while creating PDF job'
    });
  }
});

// GET /api/pdf/status/:jobId - Get job status and metadata
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Validate jobId parameter
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      return res.status(400).json({
        error: 'Job ID is required and must be a non-empty string'
      });
    }
    
    // Query database for job by jobId
    const pdfJob = await PDFJob.findOne({ jobId: jobId.trim() });
    
    // Handle job not found cases
    if (!pdfJob) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }
    
    // Return current status and metadata
    const response = {
      jobId: pdfJob.jobId,
      status: pdfJob.status,
      ready: pdfJob.status === 'completed',
      createdAt: pdfJob.createdAt,
      updatedAt: pdfJob.updatedAt
    };
    
    // Include filePath if job is completed
    if (pdfJob.status === 'completed' && pdfJob.filePath) {
      response.filePath = pdfJob.filePath;
    }
    
    // Include error message if job failed
    if (pdfJob.status === 'failed' && pdfJob.errorMessage) {
      response.errorMessage = pdfJob.errorMessage;
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Error retrieving job status:', error);
    res.status(500).json({
      error: 'Internal server error while retrieving job status'
    });
  }
});

// GET /api/pdf/download/:jobId - Download completed PDF file
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Validate jobId parameter
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
      return res.status(400).json({
        error: 'Job ID is required and must be a non-empty string'
      });
    }
    
    // Query database for job by jobId
    const pdfJob = await PDFJob.findOne({ jobId: jobId.trim() });
    
    // Handle job not found cases
    if (!pdfJob) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }
    
    // Check if job is completed
    if (pdfJob.status !== 'completed') {
      return res.status(400).json({
        error: `PDF is not ready for download. Current status: ${pdfJob.status}`
      });
    }
    
    // Check if filePath exists in job record
    if (!pdfJob.filePath) {
      return res.status(500).json({
        error: 'PDF file path not found in job record'
      });
    }
    
    // Construct full file path
    const fullFilePath = path.join(__dirname, '..', 'pdfs', pdfJob.filePath);
    
    // Verify file exists on disk
    if (!fs.existsSync(fullFilePath)) {
      return res.status(404).json({
        error: 'PDF file not found on server'
      });
    }
    
    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${pdfJob.filePath}"`);
    
    // Serve the PDF file
    res.sendFile(fullFilePath, (err) => {
      if (err) {
        console.error('Error serving PDF file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Error serving PDF file'
          });
        }
      }
    });
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({
      error: 'Internal server error while downloading PDF'
    });
  }
});

module.exports = router;