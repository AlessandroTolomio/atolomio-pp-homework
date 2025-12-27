/**
 * API Communication Module for Async PDF Generator
 * Handles all HTTP communication with the backend API
 */

const API_BASE_URL = '/api/pdf';

/**
 * Custom error class for API-related errors
 */
class APIError extends Error {
    constructor(message, status, response) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.response = response;
    }
}

/**
 * Generic HTTP request handler with error handling
 * @param {string} url - The URL to make the request to
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - The response data
 * @throws {APIError} - When the request fails
 */
async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        // Handle HTTP errors
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            let errorData = null;
            
            try {
                errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (parseError) {
                // If we can't parse the error response, use the default message
            }
            
            throw new APIError(errorMessage, response.status, errorData);
        }

        // Handle different content types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return response;
        }
    } catch (error) {
        if (error instanceof APIError) {
            throw error;
        }
        
        // Handle network errors or other fetch failures
        throw new APIError(
            `Network error: ${error.message}`,
            0,
            null
        );
    }
}

/**
 * Generate a new PDF job
 * @param {string} content - The text content to convert to PDF
 * @returns {Promise<{jobId: string}>} - The job ID for the created PDF job
 * @throws {APIError} - When the request fails or validation errors occur
 */
export async function generatePDF(content) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new APIError('Content is required and must be a non-empty string', 400, null);
    }

    const response = await makeRequest(`${API_BASE_URL}/generate`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() })
    });

    if (!response.jobId) {
        throw new APIError('Invalid response: missing jobId', 500, response);
    }

    return response;
}

/**
 * Check the status of a PDF job
 * @param {string} jobId - The job ID to check
 * @returns {Promise<{status: string, ready: boolean, jobId: string}>} - The job status information
 * @throws {APIError} - When the request fails or job is not found
 */
export async function checkStatus(jobId) {
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new APIError('Job ID is required and must be a non-empty string', 400, null);
    }

    const response = await makeRequest(`${API_BASE_URL}/status/${encodeURIComponent(jobId.trim())}`);

    // Validate response structure
    if (typeof response.status !== 'string') {
        throw new APIError('Invalid response: missing or invalid status', 500, response);
    }

    return response;
}

/**
 * Get the download URL for a PDF job
 * @param {string} jobId - The job ID to download
 * @returns {string} - The download URL
 * @throws {APIError} - When jobId is invalid
 */
export function getDownloadURL(jobId) {
    if (!jobId || typeof jobId !== 'string' || jobId.trim().length === 0) {
        throw new APIError('Job ID is required and must be a non-empty string', 400, null);
    }

    return `${API_BASE_URL}/download/${encodeURIComponent(jobId.trim())}`;
}

/**
 * Download a PDF file (this will trigger browser download or return error)
 * Note: This function is not currently used but kept for potential future use
 */

/**
 * Utility function to handle API errors in UI
 * @param {Error} error - The error to handle
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(error) {
    if (error instanceof APIError) {
        return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Utility function to check if an error is a network error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a network error
 */
export function isNetworkError(error) {
    return error instanceof APIError && error.status === 0;
}