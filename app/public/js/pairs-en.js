/**
 * Pairs-EN Module - String Normalization Functionality
 * Handles English pairs normalization and display in a table
 */

import { setupPDFButton, updatePDFButtonState, initializePDFUtils } from './pdf-utils.js';

console.log('Pairs-EN module loaded');

/**
 * DOM Elements
 */
const elements = {
    inputForm: document.getElementById('pairsForm'),
    inputField: document.getElementById('pairsInput'),
    addButton: document.getElementById('addButton'),
    clearButton: document.getElementById('clearButton'),
    generatePdfButton: document.getElementById('generatePdfButton'),
    resultsTable: document.getElementById('resultsTable'),
    resultsBody: document.getElementById('resultsBody'),
    emptyState: document.getElementById('emptyState')
};

/**
 * Application state
 */
const state = {
    normalizedStrings: []
};

// Page identifier for localStorage keys
const PAGE_ID = 'pairs-en';

/**
 * Save normalized strings to localStorage
 */
function saveStringsToStorage() {
    try {
        localStorage.setItem(`${PAGE_ID}NormalizedStrings`, JSON.stringify(state.normalizedStrings));
    } catch (error) {
        console.warn('Failed to save strings to localStorage:', error);
    }
}

/**
 * Load normalized strings from localStorage
 */
function loadStringsFromStorage() {
    try {
        const saved = localStorage.getItem(`${PAGE_ID}NormalizedStrings`);
        if (saved) {
            state.normalizedStrings = JSON.parse(saved);
        }
    } catch (error) {
        console.warn('Failed to load strings from localStorage:', error);
        state.normalizedStrings = [];
    }
}

/**
 * Clear normalized strings from localStorage
 */
function clearStringsFromStorage() {
    try {
        localStorage.removeItem(`${PAGE_ID}NormalizedStrings`);
    } catch (error) {
        console.warn('Failed to clear strings from localStorage:', error);
    }
}

/**
 * Normalize English pairs in a string
 * @param {string} input - The input string to normalize
 * @returns {string} - The normalized string
 */
function normalizePairsEN(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Define the pairs mapping (a-z, b-y, c-x, etc.)
    const pairs = {
        'a': 'z', 'b': 'y', 'c': 'x', 'd': 'w', 'e': 'v', 'f': 'u',
        'g': 't', 'h': 's', 'i': 'r', 'j': 'q', 'k': 'p', 'l': 'o', 'm': 'n'
    };
    
    // Convert to lowercase and trim
    let word = input.toLowerCase().trim();
    
    // Remove pairs from both ends while they match
    while (word.length > 1 && pairs[word[0]] === word[word.length - 1]) {
        word = word.slice(1, -1);
    }
    
    return word;
}

/**
 * Initialize the pairs-en module
 */
function init() {
    // Initialize PDF utilities with page identifier
    initializePDFUtils('pairs-en');
    
    // Load saved strings from localStorage
    loadStringsFromStorage();
    
    setupEventListeners();
    setupPDFButton(elements.generatePdfButton, () => state.normalizedStrings, showMessage);
    updateDisplay();
    console.log('Pairs-EN module initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    if (elements.inputForm) {
        elements.inputForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (elements.clearButton) {
        elements.clearButton.addEventListener('click', handleClearAll);
    }
}

/**
 * Handle form submission
 * @param {Event} event - The form submit event
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    const input = elements.inputField?.value?.trim();
    
    if (!input) {
        showMessage('warning', 'Please enter some text to normalize');
        return;
    }
    
    // Normalize the input
    const normalized = normalizePairsEN(input);
    
    // Add to array
    state.normalizedStrings.push({
        id: Date.now(),
        original: input,
        normalized: normalized
    });
    
    // Save to localStorage
    saveStringsToStorage();
    
    // Clear input
    elements.inputField.value = '';
    
    // Update display
    updateDisplay();
    
    // Show success message
    showMessage('success', 'String normalized and added to the table');
}

/**
 * Handle clear all button
 */
function handleClearAll() {
    if (state.normalizedStrings.length === 0) {
        return;
    }
    
    if (confirm('Are you sure you want to clear all normalized strings?')) {
        state.normalizedStrings = [];
        clearStringsFromStorage();
        updateDisplay();
        showMessage('info', 'All strings cleared');
    }
}

/**
 * Update the display table
 */
function updateDisplay() {
    if (!elements.resultsBody || !elements.resultsTable || !elements.emptyState) {
        return;
    }
    
    // Clear existing rows
    elements.resultsBody.innerHTML = '';
    
    if (state.normalizedStrings.length === 0) {
        // Show empty state
        elements.emptyState.style.display = 'block';
        elements.resultsTable.style.display = 'none';
        return;
    }
    
    // Hide empty state and show table
    elements.emptyState.style.display = 'none';
    elements.resultsTable.style.display = 'table';
    
    // Add rows for each normalized string
    state.normalizedStrings.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.original}</td>
            <td class="text-success">${item.normalized}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="removeItem(${item.id})">
                    Remove
                </button>
            </td>
        `;
        elements.resultsBody.appendChild(row);
    });
    
    // Update clear button state
    if (elements.clearButton) {
        elements.clearButton.disabled = state.normalizedStrings.length === 0;
    }
    
    // Update generate PDF button state
    updatePDFButtonState(elements.generatePdfButton, state.normalizedStrings.length);
}

/**
 * Remove an item from the array
 * @param {number} id - The ID of the item to remove
 */
function removeItem(id) {
    state.normalizedStrings = state.normalizedStrings.filter(item => item.id !== id);
    saveStringsToStorage();
    updateDisplay();
    showMessage('info', 'String removed from table');
}

/**
 * Show user-friendly messages
 * @param {string} type - Type of message ('success', 'info', 'warning', 'error')
 * @param {string} message - The message to display
 */
function showMessage(type, message) {
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
    
    // No auto-remove - user can dismiss manually
}

// Make removeItem available globally for onclick handlers
window.removeItem = removeItem;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}