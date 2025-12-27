/**
 * PDF Utilities Module - Shared PDF generation functionality
 * Handles PDF generation for normalized strings
 */

import { generatePDF, checkStatus, getDownloadURL, getErrorMessage, isNetworkError } from './api.js';

// Global variable to store the page identifier for localStorage keys
let currentPageId = null;

/**
 * Initialize PDF utilities with page identifier
 * @param {string} pageId - Unique identifier for the page (e.g., 'brackets', 'pairs-en')
 */
export function initializePDFUtils(pageId) {
    currentPageId = pageId;
    
    // Setup close button for PDF status section
    setupClosePDFStatusButton();
    
    // Restore last job from localStorage on initialization
    restoreLastJobFromStorage();
}

/**
 * Generate spiral PDF from normalized strings
 * @param {Array} normalizedStrings - Array of objects with normalized strings
 * @param {HTMLElement} button - The button element to show loading state
 * @param {Function} showMessage - Function to show simple messages to user
 * @returns {Promise<void>}
 */
export async function generateSpiralPDF(normalizedStrings, button, showMessage) {
    if (!normalizedStrings || normalizedStrings.length === 0) {
        showMessage('warning', 'No normalized strings available for PDF generation');
        return;
    }
    
    const originalText = button.textContent;
    
    try {
        // Collect all normalized strings and join with commas
        const normalizedWords = normalizedStrings.map(item => item.normalized);
        const content = normalizedWords.join(', ');
        
        // Show loading state
        button.disabled = true;
        button.textContent = 'Generating...';
        
        // Call the PDF generation API using the shared API module
        const response = await generatePDF(content);
        
        // Save job to localStorage
        saveJobToStorage(response.jobId);
        
        // Show PDF status section
        showPDFStatus(response.jobId);
        
        // Start monitoring the job status
        startJobMonitoring(response.jobId);
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        showMessage('error', `PDF generation failed: ${getErrorMessage(error)}`);
    } finally {
        // Reset button state
        button.disabled = normalizedStrings.length === 0;
        button.textContent = originalText;
    }
}

/**
 * Show PDF status section with job information
 * @param {string} jobId - The job ID
 */
function showPDFStatus(jobId) {
    const statusSection = document.getElementById('pdfStatusSection');
    const jobIdElement = document.getElementById('pdfJobId');
    const jobStatusElement = document.getElementById('pdfJobStatus');
    const downloadSection = document.getElementById('pdfDownloadSection');
    
    if (statusSection && jobIdElement && jobStatusElement) {
        // Show the status section
        statusSection.style.display = 'block';
        
        // Set job ID
        jobIdElement.textContent = jobId;
        
        // Set initial status
        jobStatusElement.textContent = 'pending';
        jobStatusElement.className = 'badge bg-warning text-dark';
        
        // Hide download section initially
        if (downloadSection) {
            downloadSection.style.display = 'none';
        }
        
        // Scroll to status section
        statusSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Update PDF status display
 * @param {string} status - The job status
 * @param {string} jobId - The job ID (for download link)
 */
function updatePDFStatus(status, jobId) {
    const jobStatusElement = document.getElementById('pdfJobStatus');
    const downloadSection = document.getElementById('pdfDownloadSection');
    const downloadLink = document.getElementById('pdfDownloadLink');
    
    if (jobStatusElement) {
        jobStatusElement.textContent = status;
        jobStatusElement.className = `badge ${getStatusBadgeClass(status)}`;
    }
    
    // Show download section if completed
    if (downloadSection && downloadLink) {
        if (status === 'completed') {
            downloadLink.href = getDownloadURL(jobId);
            downloadSection.style.display = 'block';
        } else {
            downloadSection.style.display = 'none';
        }
    }
}

/**
 * Get CSS class for status badge based on status
 * @param {string} status - The job status
 * @returns {string} - The CSS class for the badge
 */
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-warning text-dark';
        case 'processing':
            return 'bg-info text-white';
        case 'completed':
            return 'bg-success text-white';
        case 'failed':
            return 'bg-danger text-white';
        default:
            return 'bg-secondary text-white';
    }
}

/**
 * Monitor job status and update the status section
 * @param {string} jobId - The job ID to monitor
 */
async function startJobMonitoring(jobId) {
    const maxAttempts = 20; // Maximum 20 attempts (1 minute with 3-second intervals)
    let attempts = 0;
    
    const checkJobStatus = async () => {
        try {
            attempts++;
            const statusData = await checkStatus(jobId);
            
            // Update status display
            updatePDFStatus(statusData.status, jobId);
            
            if (statusData.status === 'completed') {
                // Job completed, stop monitoring
                return;
            } else if (statusData.status === 'failed') {
                // Job failed, clear from localStorage and stop monitoring
                clearJobFromStorage();
                return;
            } else if (attempts >= maxAttempts) {
                // Max attempts reached, stop monitoring
                return;
            }
            
            // Job still pending/processing, continue monitoring
            setTimeout(checkJobStatus, 3000); // Check again in 3 seconds
            
        } catch (error) {
            console.error('Job status check failed:', error);
            
            // For network errors, retry a few times
            if (isNetworkError(error) && attempts < maxAttempts) {
                setTimeout(checkJobStatus, 5000); // Retry in 5 seconds for network errors
            } else {
                // Update status to show error
                updatePDFStatus('failed', jobId);
                clearJobFromStorage();
            }
        }
    };
    
    // Start checking after a short delay
    setTimeout(checkJobStatus, 2000);
}

/**
 * Save job ID to localStorage with page-specific key
 * @param {string} jobId - The job ID to save
 */
function saveJobToStorage(jobId) {
    if (!currentPageId) {
        console.warn('Page ID not set, cannot save job to localStorage');
        return;
    }
    
    try {
        localStorage.setItem(`${currentPageId}JobId`, jobId);
        localStorage.setItem(`${currentPageId}JobTimestamp`, Date.now().toString());
    } catch (error) {
        console.warn('Failed to save job to localStorage:', error);
    }
}

/**
 * Get last job ID from localStorage for current page
 * @returns {string|null} - The last job ID or null if not found/expired
 */
function getLastJobFromStorage() {
    if (!currentPageId) {
        return null;
    }
    
    try {
        const jobId = localStorage.getItem(`${currentPageId}JobId`);
        const timestamp = localStorage.getItem(`${currentPageId}JobTimestamp`);
        
        if (!jobId || !timestamp) {
            return null;
        }
        
        // Check if the job is older than 24 hours (86400000 ms)
        const now = Date.now();
        const jobAge = now - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (jobAge > maxAge) {
            // Job is too old, remove it
            clearJobFromStorage();
            return null;
        }
        
        return jobId;
    } catch (error) {
        console.warn('Failed to get job from localStorage:', error);
        return null;
    }
}

/**
 * Setup close button for PDF status section
 */
function setupClosePDFStatusButton() {
    const closeButton = document.getElementById('closePdfStatus');
    const statusSection = document.getElementById('pdfStatusSection');
    
    if (closeButton && statusSection) {
        closeButton.addEventListener('click', () => {
            // Hide the status section
            statusSection.style.display = 'none';
            
            // Clear job from localStorage
            clearJobFromStorage();
        });
    }
}

/**
 * Clear job from localStorage for current page
 */
function clearJobFromStorage() {
    if (!currentPageId) {
        return;
    }
    
    try {
        localStorage.removeItem(`${currentPageId}JobId`);
        localStorage.removeItem(`${currentPageId}JobTimestamp`);
    } catch (error) {
        console.warn('Failed to clear job from localStorage:', error);
    }
}

/**
 * Restore last job from localStorage on page load
 */
async function restoreLastJobFromStorage() {
    const lastJobId = getLastJobFromStorage();
    
    if (!lastJobId) {
        return;
    }
    
    try {
        // Check the status of the last job
        const statusData = await checkStatus(lastJobId);
        
        // Show the PDF status section
        showPDFStatus(lastJobId);
        
        // Update the status immediately
        updatePDFStatus(statusData.status, lastJobId);
        
        // Only start monitoring if the job is still pending or processing
        if (statusData.status === 'pending' || statusData.status === 'processing') {
            startJobMonitoring(lastJobId);
            console.log(`Restored job ${lastJobId} with status: ${statusData.status} for page: ${currentPageId}`);
        } else if (statusData.status === 'completed') {
            console.log(`Restored completed job ${lastJobId} for page: ${currentPageId}`);
        } else {
            // Job failed or has some other status, clear it
            clearJobFromStorage();
        }
    } catch (error) {
        console.warn('Failed to restore last job:', error);
        // If we can't check the status, clear the stored job
        clearJobFromStorage();
    }
}

/**
 * Setup PDF button functionality
 * @param {HTMLElement} button - The PDF generation button
 * @param {Function} getNormalizedStrings - Function that returns the current normalized strings
 * @param {Function} showMessage - Function to show messages to user
 */
export function setupPDFButton(button, getNormalizedStrings, showMessage) {
    if (!button) return;
    
    button.addEventListener('click', async () => {
        const normalizedStrings = getNormalizedStrings();
        await generateSpiralPDF(normalizedStrings, button, showMessage);
    });
}

/**
 * Update PDF button state based on normalized strings count
 * @param {HTMLElement} button - The PDF generation button
 * @param {number} count - Number of normalized strings
 */
export function updatePDFButtonState(button, count) {
    if (button) {
        button.disabled = count === 0;
    }
}