// API Utility Functions
import { API_ENDPOINTS } from '../Endpoints.js';
import { validateJsonResponse } from './helpers.js';

/**
 * Fetch wrapper with error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            credentials: 'include',
            ...options
        });
        return await validateJsonResponse(response);
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

/**
 * POST request helper
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Response data
 */
export async function apiPost(url, data) {
    return apiRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

/**
 * PUT request helper
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} Response data
 */
export async function apiPut(url, data) {
    return apiRequest(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

/**
 * DELETE request helper
 * @param {string} url - API endpoint URL
 * @returns {Promise<Object>} Response data
 */
export async function apiDelete(url) {
    return apiRequest(url, {
        method: 'DELETE'
    });
}

/**
 * GET request helper (for clarity, though apiRequest can be used directly)
 * @param {string} url - API endpoint URL
 * @returns {Promise<Object>} Response data
 */
export async function apiGet(url) {
    return apiRequest(url);
}
