/**
 * Pairs-EN Module - String Normalization Functionality
 * Handles English pairs normalization and display in a table
 */

import { setupPDFButton, updatePDFButtonState, initializePDFUtils } from './pdf-utils.js';
import { NormalizationModule, showMessage } from './normalize-utils.js';

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

// Page identifier for localStorage keys
const PAGE_ID = 'pairs-en';

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

// Create module instance
const pairsModule = new NormalizationModule(PAGE_ID, elements, normalizePairsEN, updatePDFButtonState);

/**
 * Initialize the pairs-en module
 */
function init() {
    // Initialize PDF utilities with page identifier
    initializePDFUtils('pairs-en');
    
    // Initialize the normalization module
    pairsModule.init();
    
    // Setup PDF button
    setupPDFButton(elements.generatePdfButton, () => pairsModule.getNormalizedStrings(), showMessage);
    
    // Make module available globally for remove buttons
    window.currentModule = pairsModule;
    
    console.log('Pairs-EN module initialized');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}