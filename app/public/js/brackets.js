/**
 * Brackets Module - String Normalization Functionality
 * Handles bracket normalization and display in a table
 */

import { setupPDFButton, updatePDFButtonState, initializePDFUtils } from './pdf-utils.js';
import { NormalizationModule, showMessage } from './normalize-utils.js';

console.log('Brackets module loaded');

/**
 * DOM Elements
 */
const elements = {
    inputForm: document.getElementById('bracketsForm'),
    inputField: document.getElementById('bracketsInput'),
    addButton: document.getElementById('addButton'),
    clearButton: document.getElementById('clearButton'),
    generatePdfButton: document.getElementById('generatePdfButton'),
    resultsTable: document.getElementById('resultsTable'),
    resultsBody: document.getElementById('resultsBody'),
    emptyState: document.getElementById('emptyState')
};

// Page identifier for localStorage keys
const PAGE_ID = 'brackets';

/**
 * Check if internal brackets are balanced
 * @param {string} word - The string to check
 * @returns {boolean} - True if brackets are balanced
 */
function checkInternalBrackets(word) {
    let ref = 0;
    
    for (const char of word) {
        if (char === '(') {
            ref += 1;
        } else if (char === ')') {
            ref -= 1;
            if (ref < 0) return false;
        }
    }
    
    return ref === 0;
}

/**
 * Normalize brackets in a string
 * @param {string} input - The input string to normalize
 * @returns {string} - The normalized string
 */
function normalizeBrackets(input) {
    if (!input || typeof input !== 'string') {
        return '';
    }
    
    // Convert to string and trim
    let word = input.trim();
    
    // Remove outer brackets while they match and internal brackets are balanced
    while (word.length > 1 && 
           word[0] === '(' && 
           word[word.length - 1] === ')' && 
           checkInternalBrackets(word.slice(1, -1))) {
        word = word.slice(1, -1);
    }
    
    return word;
}

// Create module instance
const bracketsModule = new NormalizationModule(PAGE_ID, elements, normalizeBrackets, updatePDFButtonState);

/**
 * Initialize the brackets module
 */
function init() {
    // Initialize PDF utilities with page identifier
    initializePDFUtils('brackets');
    
    // Initialize the normalization module
    bracketsModule.init();
    
    // Setup PDF button
    setupPDFButton(elements.generatePdfButton, () => bracketsModule.getNormalizedStrings(), showMessage);
    
    // Make module available globally for remove buttons
    window.currentModule = bracketsModule;
    
    console.log('Brackets module initialized');
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}