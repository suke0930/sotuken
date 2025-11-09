// Utility Helper Functions

/**
 * Format a date string to Japanese locale format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ja-JP');
}

/**
 * Format seconds to Japanese time format (時間 分 秒)
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    if (seconds < 0 || !isFinite(seconds)) {
        return '--';
    }
    
    const hours = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}時間 ${min}分`;
    } else if (min > 0) {
        return `${min}分 ${sec}秒`;
    } else {
        return `${sec}秒`;
    }
}

/**
 * Show temporary message (used by components)
 * @param {Object} context - Vue component context (this)
 * @param {string} messageVar - Variable name ('errorMessage' or 'successMessage')
 * @param {string} message - Message text
 * @param {number} duration - Display duration in milliseconds
 */
export function showMessage(context, messageVar, message, duration = 5000) {
    context[messageVar] = message;
    setTimeout(() => {
        context[messageVar] = '';
    }, duration);
}

/**
 * Validate if response is JSON
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object|null>} JSON data or null if invalid
 */
export async function validateJsonResponse(response) {
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`サーバーが予期しない形式の応答を返しました (Status: ${response.status})`);
    }
    return response.json();
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
