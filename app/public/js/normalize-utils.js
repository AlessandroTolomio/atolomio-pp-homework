/**
 * Normalization Utilities Module
 * Shared functionality for string normalization modules including localStorage management,
 * UI handling, and common normalization workflow
 */

/**
 * Storage manager for normalized strings
 */
export class StorageManager {
    constructor(pageId) {
        this.pageId = pageId;
        this.storageKey = `${pageId}NormalizedStrings`;
    }

    /**
     * Save normalized strings to localStorage
     * @param {Array} strings - Array of normalized strings to save
     */
    save(strings) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(strings));
        } catch (error) {
            console.warn('Failed to save strings to localStorage:', error);
        }
    }

    /**
     * Load normalized strings from localStorage
     * @returns {Array} - Array of normalized strings
     */
    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load strings from localStorage:', error);
            return [];
        }
    }

    /**
     * Clear normalized strings from localStorage
     */
    clear() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (error) {
            console.warn('Failed to clear strings from localStorage:', error);
        }
    }
}

/**
 * Show user-friendly messages
 * @param {string} type - Type of message ('success', 'info', 'warning', 'error')
 * @param {string} message - The message to display
 */
export function showMessage(type, message) {
    const alertClass = {
        'success': 'alert-success',
        'info': 'alert-info', 
        'warning': 'alert-warning',
        'error': 'alert-danger'
    }[type] || 'alert-info';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass} alert-dismissible fade show`;
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert at the top of the main container
    const container = document.querySelector('.container.main-container');
    if (container && container.firstChild) {
        container.insertBefore(messageDiv, container.firstChild);
    }
}

/**
 * Base class for normalization modules
 */
export class NormalizationModule {
    constructor(pageId, elements, normalizeFunction, updatePDFButtonState = null) {
        this.pageId = pageId;
        this.elements = elements;
        this.normalizeFunction = normalizeFunction;
        this.updatePDFButtonState = updatePDFButtonState;
        this.storage = new StorageManager(pageId);
        this.state = {
            normalizedStrings: []
        };
    }

    /**
     * Initialize the module
     */
    init() {
        // Load saved strings from localStorage
        this.state.normalizedStrings = this.storage.load();
        
        this.setupEventListeners();
        this.updateDisplay();
        console.log(`${this.pageId} module initialized`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        if (this.elements.inputForm) {
            this.elements.inputForm.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }
        
        if (this.elements.clearButton) {
            this.elements.clearButton.addEventListener('click', () => this.handleClearAll());
        }
    }

    /**
     * Handle form submission
     * @param {Event} event - The form submit event
     */
    handleFormSubmit(event) {
        event.preventDefault();
        
        const input = this.elements.inputField?.value?.trim();
        
        if (!input) {
            showMessage('warning', 'Please enter some text to normalize');
            return;
        }
        
        // Normalize the input using the provided function
        const normalized = this.normalizeFunction(input);
        
        // Add to array
        this.state.normalizedStrings.push({
            id: Date.now(),
            original: input,
            normalized: normalized
        });
        
        // Save to localStorage
        this.storage.save(this.state.normalizedStrings);
        
        // Clear input
        this.elements.inputField.value = '';
        
        // Update display
        this.updateDisplay();
        
        // Show success message
        showMessage('success', 'String normalized and added to the table');
    }

    /**
     * Handle clear all button
     */
    handleClearAll() {
        if (this.state.normalizedStrings.length === 0) {
            return;
        }
        
        if (confirm('Are you sure you want to clear all normalized strings?')) {
            this.state.normalizedStrings = [];
            this.storage.clear();
            this.updateDisplay();
            showMessage('info', 'All strings cleared');
        }
    }

    /**
     * Remove an item from the array
     * @param {number} id - The ID of the item to remove
     */
    removeItem(id) {
        this.state.normalizedStrings = this.state.normalizedStrings.filter(item => item.id !== id);
        this.storage.save(this.state.normalizedStrings);
        this.updateDisplay();
        showMessage('info', 'String removed from table');
    }

    /**
     * Update the display table
     */
    updateDisplay() {
        if (!this.elements.resultsBody || !this.elements.resultsTable || !this.elements.emptyState) {
            return;
        }
        
        // Clear existing rows
        this.elements.resultsBody.innerHTML = '';
        
        if (this.state.normalizedStrings.length === 0) {
            // Show empty state
            this.elements.emptyState.style.display = 'block';
            this.elements.resultsTable.style.display = 'none';
            return;
        }
        
        // Hide empty state and show table
        this.elements.emptyState.style.display = 'none';
        this.elements.resultsTable.style.display = 'table';
        
        // Add rows for each normalized string
        this.state.normalizedStrings.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${item.original}</td>
                <td class="text-success">${item.normalized}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.currentModule.removeItem(${item.id})">
                        Remove
                    </button>
                </td>
            `;
            this.elements.resultsBody.appendChild(row);
        });
        
        // Update clear button state
        if (this.elements.clearButton) {
            this.elements.clearButton.disabled = this.state.normalizedStrings.length === 0;
        }
        
        // Update generate PDF button state if available
        if (this.elements.generatePdfButton && this.updatePDFButtonState) {
            this.updatePDFButtonState(this.elements.generatePdfButton, this.state.normalizedStrings.length);
        }
    }

    /**
     * Get current normalized strings for PDF generation
     * @returns {Array} - Current normalized strings
     */
    getNormalizedStrings() {
        return this.state.normalizedStrings;
    }
}