// Server Properties Management Logic - Schema-Driven Version
import { apiGet, apiPost } from '../utils/api.js';
import { API_ENDPOINTS } from '../Endpoints.js';
import { propertiesSchema, propertyIcons } from '../content/propertiesSchema.js';

export function createPropertiesMethods() {
    return {
        /**
         * Get default properties values from schema
         */
        getDefaultProperties() {
            const defaults = {};
            
            // Combine all properties from all tiers
            ['basic', 'advanced', 'dev'].forEach(tier => {
                Object.entries(propertiesSchema[tier]).forEach(([key, property]) => {
                    defaults[key] = property.default;
                });
            });
            
            return defaults;
        },

        /**
         * Get properties for a specific mode
         */
        getPropertiesByMode(mode) {
            if (mode === 'basic') {
                return propertiesSchema.basic;
            } else if (mode === 'advanced') {
                return propertiesSchema.advanced;
            } else if (mode === 'dev' || mode === 'developer') {
                return propertiesSchema.dev;
            }
            return {};
        },

        /**
         * Get property icon class
         */
        getPropertyIcon(key) {
            return propertyIcons[key] || 'fa-cog';
        },

        /**
         * Get property label with key in parentheses
         */
        getPropertyLabel(property, key) {
            const jaLabel = property.explanation.ja.split('を')[0].split('に')[0].split('で')[0];
            return `${jaLabel} (${key})`;
        },

        /**
         * Get property explanation based on current language
         */
        getPropertyExplanation(property) {
            return property.explanation[this.currentLanguage] || property.explanation.ja;
        },

        /**
         * Get property item CSS class based on type
         */
        getPropertyItemClass(property) {
            if (property.type === 'boolean') {
                return 'property-item property-item-checkbox';
            }
            return 'property-item';
        },

        /**
         * Current language (default to Japanese)
         */
        get currentLanguage() {
            return 'ja'; // Can be made dynamic later
        },

        /**
         * Convert API properties (all strings) to typed values for UI
         * @param {Object} apiProperties - Properties from API (all string values)
         * @returns {Object} Typed properties object
         */
        convertApiPropertiesToTyped(apiProperties) {
            const typed = {};
            
            for (const [key, stringValue] of Object.entries(apiProperties)) {
                // Find property in schema to determine type
                let property = null;
                for (const tier of ['basic', 'advanced', 'dev']) {
                    if (propertiesSchema[tier][key]) {
                        property = propertiesSchema[tier][key];
                        break;
                    }
                }
                
                if (property) {
                    // Convert based on schema type
                    if (property.type === 'boolean') {
                        typed[key] = stringValue === 'true';
                    } else if (property.type === 'number') {
                        const num = Number(stringValue);
                        typed[key] = isNaN(num) ? stringValue : num;
                    } else {
                        // string or enum - keep as string
                        typed[key] = stringValue;
                    }
                } else {
                    // Unknown property - keep as string but try to infer type
                    if (stringValue === 'true' || stringValue === 'false') {
                        typed[key] = stringValue === 'true';
                    } else if (!isNaN(stringValue) && stringValue !== '') {
                        typed[key] = Number(stringValue);
                    } else {
                        typed[key] = stringValue;
                    }
                }
            }
            
            return typed;
        },

        /**
         * Convert typed properties to API format (all strings)
         * @param {Object} typedProperties - Typed properties object
         * @returns {Object} API format properties (all string values)
         */
        convertTypedPropertiesToApi(typedProperties) {
            const apiFormat = {};
            
            for (const [key, value] of Object.entries(typedProperties)) {
                // Convert to string based on type
                if (typeof value === 'boolean') {
                    apiFormat[key] = value ? 'true' : 'false';
                } else if (typeof value === 'number') {
                    apiFormat[key] = String(value);
                } else if (value === null || value === undefined) {
                    apiFormat[key] = '';
                } else {
                    apiFormat[key] = String(value);
                }
            }
            
            return apiFormat;
        },

        /**
         * Merge API properties with schema defaults
         * @param {Object} apiProperties - Properties from API (all strings)
         * @returns {Object} Merged properties (API values override defaults)
         */
        mergePropertiesWithDefaults(apiProperties) {
            const defaults = this.getDefaultProperties();
            const typedApiProperties = this.convertApiPropertiesToTyped(apiProperties);
            
            // Merge: defaults first, then typed API values override
            // Also preserve unknown properties from API (as typed)
            const merged = {
                ...defaults,
                ...typedApiProperties
            };
            
            // Add any unknown properties that weren't in schema
            for (const [key, value] of Object.entries(apiProperties)) {
                if (!merged.hasOwnProperty(key)) {
                    // Try to infer type for unknown properties
                    if (value === 'true' || value === 'false') {
                        merged[key] = value === 'true';
                    } else if (!isNaN(value) && value !== '') {
                        merged[key] = Number(value);
                    } else {
                        merged[key] = value;
                    }
                }
            }
            
            return merged;
        },

        /**
         * Fetch properties from API
         * @param {string} serverUuid - Server UUID
         * @returns {Promise<Object|null>} Properties object or null if error
         */
        async fetchPropertiesFromAPI(serverUuid) {
            try {
                const url = API_ENDPOINTS.server.getProperties(serverUuid);
                const response = await apiGet(url);
                
                if (response.ok && response.data) {
                    return response.data;
                } else {
                    console.error('API returned error:', response);
                    return null;
                }
            } catch (error) {
                console.error('Error fetching properties from API:', error);
                throw error;
            }
        },

        /**
         * Save properties to API
         * @param {string} serverUuid - Server UUID
         * @param {Object} properties - Properties to save (typed)
         * @returns {Promise<boolean>} Success status
         */
        async savePropertiesToAPI(serverUuid, properties) {
            try {
                const url = API_ENDPOINTS.server.setProperties(serverUuid);
                const apiFormatProperties = this.convertTypedPropertiesToApi(properties);
                
                const response = await apiPost(url, {
                    data: apiFormatProperties
                });
                
                if (response.ok) {
                    return true;
                } else {
                    console.error('API returned error:', response);
                    const errorMessage = response.error?.message || 'プロパティの保存に失敗しました';
                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error('Error saving properties to API:', error);
                throw error;
            }
        },

        /**
         * Open properties modal for a server
         */
        async openPropertiesModal(server) {
            if (!server) return;

            // Initialize modal state
            this.propertiesModal.visible = true;
            this.propertiesModal.serverUuid = server.uuid;
            this.propertiesModal.serverName = server.name;
            this.propertiesModal.mode = 'basic'; // Default to basic mode
            this.propertiesModal.editorTab = 'gui'; // Default to GUI tab
            this.propertiesModal.errors = {}; // Initialize errors object
            this.propertiesModal.loading = true; // Show loading state
            this.propertiesModal.loadError = false; // Track if API load failed

            try {
                // Step 1: Try to fetch from API
                const apiProperties = await this.fetchPropertiesFromAPI(server.uuid);
                
                if (apiProperties !== null) {
                    // Success: Merge API properties with defaults
                    this.propertiesModal.data = this.mergePropertiesWithDefaults(apiProperties);
                    
                    // Save to localStorage as backup
                    this.saveServerPropertiesToLocalStorage(server.uuid, this.propertiesModal.data);
                } else {
                    // API returned error, try localStorage as backup
                    const savedProperties = this.loadServerProperties(server.uuid);
                    
                    if (savedProperties) {
                        this.propertiesModal.data = {
                            ...this.getDefaultProperties(),
                            ...savedProperties
                        };
                        this.showError('サーバーからプロパティを取得できませんでした。ローカルに保存されたデータを使用します。');
                    } else {
                        // No backup data, use defaults
                        this.propertiesModal.data = this.getDefaultProperties();
                        this.showError('サーバーからプロパティを取得できませんでした。デフォルト値で表示しています。');
                    }
                    this.propertiesModal.loadError = true;
                }
            } catch (error) {
                // Network error or other exception - try localStorage as backup
                console.error('Failed to fetch properties from API:', error);
                
                const savedProperties = this.loadServerProperties(server.uuid);
                
                if (savedProperties) {
                    this.propertiesModal.data = {
                        ...this.getDefaultProperties(),
                        ...savedProperties
                    };
                    this.showError('サーバーからプロパティを取得できませんでした。ローカルに保存されたデータを使用します。');
                } else {
                    // No backup data, use defaults
                    this.propertiesModal.data = this.getDefaultProperties();
                    this.showError('サーバーからプロパティを取得できませんでした。デフォルト値で表示しています。');
                }
                this.propertiesModal.loadError = true;
            } finally {
                // Hide loading state
                this.propertiesModal.loading = false;
                
                // Sync to raw editor
                this.syncGUIToRawEditor();
            }
        },

        /**
         * Close properties modal
         */
        closePropertiesModal() {
            // Clean up overlay resources
            this.cleanupRawEditorOverlay();
            
            this.propertiesModal.visible = false;
            this.propertiesModal.serverUuid = null;
            this.propertiesModal.serverName = '';
            this.propertiesModal.data = {};
            this.propertiesModal.rawText = '';
            this.propertiesModal.mode = 'basic';
            this.propertiesModal.editorTab = 'gui';
            this.propertiesModal.errors = {}; // Clear errors
            this.propertiesModal.loading = false; // Clear loading state
            this.propertiesModal.saving = false; // Clear saving state
            this.propertiesModal.loadError = false; // Clear error flag
            // Clear raw text validation state
            this.propertiesModal.rawTextErrors = [];
            this.propertiesModal.rawTextWarnings = [];
            this.propertiesModal.rawTextValid = true;
            this.propertiesModal.rawEditorTooltip = null; // Clear tooltip
        },

        /**
         * Switch between Basic/Advanced/Developer modes
         * Fix: Ensure GUI is properly restored when switching from raw editor
         */
        switchPropertiesMode(mode) {
            // If currently in raw editor mode, sync raw to GUI first
            if (this.propertiesModal.editorTab === 'raw') {
                try {
                    const parsedProperties = this.rawTextToProperties(this.propertiesModal.rawText);
                    this.propertiesModal.data = {
                        ...this.propertiesModal.data,
                        ...parsedProperties
                    };
                } catch (error) {
                    console.error('Error syncing raw editor to GUI:', error);
                }
            }
            
            this.propertiesModal.mode = mode;
            
            // Ensure we're in GUI tab when switching modes
            this.propertiesModal.editorTab = 'gui';
            
            // When switching to developer mode, sync GUI to raw editor
            if (mode === 'developer') {
                this.syncGUIToRawEditor();
            }
        },

        /**
         * Switch to raw editor (Developer mode only)
         * Fix: Sync GUI to raw editor to ensure data consistency
         */
        switchToRawEditor() {
            // Sync current GUI data to raw editor before switching
            this.syncGUIToRawEditor();
            this.propertiesModal.editorTab = 'raw';
            // Validate raw text when switching to raw editor
            this.validateRawText();
            // Initialize overlay synchronization
            this.initializeRawEditorOverlay();
        },

        /**
         * Convert properties object to raw text format
         */
        propertiesToRawText(properties) {
            const lines = [];
            lines.push('# Minecraft Server Properties');
            lines.push('# Edited via Properties Manager');
            lines.push('# Last modified: ' + new Date().toLocaleString());
            lines.push('');
            
            for (const [key, value] of Object.entries(properties)) {
                lines.push(`${key}=${value}`);
            }
            
            return lines.join('\n');
        },

        /**
         * Parse raw text to properties object
         */
        rawTextToProperties(rawText) {
            const properties = {};
            const lines = rawText.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith('#')) {
                    continue;
                }
                
                // Parse property=value
                const equalIndex = trimmed.indexOf('=');
                if (equalIndex === -1) continue;
                
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                
                // Convert value to appropriate type
                if (value === 'true') {
                    properties[key] = true;
                } else if (value === 'false') {
                    properties[key] = false;
                } else if (!isNaN(value) && value !== '') {
                    properties[key] = Number(value);
                } else {
                    properties[key] = value;
                }
            }
            
            return properties;
        },

        /**
         * Sync GUI properties to raw text editor
         */
        syncGUIToRawEditor() {
            this.propertiesModal.rawText = this.propertiesToRawText(this.propertiesModal.data);
        },

        /**
         * Sync raw text editor to GUI properties
         * Fix: Properly restore GUI data after syncing
         */
        syncRawEditorToGUI() {
            // Validate before syncing
            this.validateRawText();
            
            // Check if there are errors
            if (this.propertiesModal.rawTextErrors.length > 0) {
                this.showError('エラーがあります。エラーを修正してからGUIに反映してください。');
                return;
            }
            
            try {
                const parsedProperties = this.rawTextToProperties(this.propertiesModal.rawText);
                
                // Merge with defaults to ensure all properties exist
                this.propertiesModal.data = {
                    ...this.getDefaultProperties(),
                    ...parsedProperties
                };
                
                const warningCount = this.propertiesModal.rawTextWarnings.length;
                if (warningCount > 0) {
                    this.showSuccess(`テキストエディタの内容をGUIに反映しました（警告: ${warningCount}件）`);
                } else {
                    this.showSuccess('テキストエディタの内容をGUIに反映しました');
                }
                
                // Switch back to GUI tab
                this.propertiesModal.editorTab = 'gui';
            } catch (error) {
                console.error('Error parsing raw text:', error);
                this.showError('テキストの解析に失敗しました。形式を確認してください。');
            }
        },

        /**
         * Reset properties to default values
         */
        resetPropertiesToDefault() {
            if (confirm('プロパティをデフォルト値に戻しますか？\nこの操作は取り消せません。')) {
                this.propertiesModal.data = this.getDefaultProperties();
                
                // Sync to raw editor if in developer mode
                if (this.propertiesModal.mode === 'developer') {
                    this.syncGUIToRawEditor();
                }
                
                this.showSuccess('プロパティをデフォルト値にリセットしました');
            }
        },

        /**
         * Save properties to localStorage as backup
         * @param {string} serverUuid - Server UUID
         * @param {Object} properties - Properties to save
         */
        saveServerPropertiesToLocalStorage(serverUuid, properties) {
            try {
                const storageKey = `server-properties-${serverUuid}`;
                const dataToSave = {
                    version: 2,
                    lastModified: new Date().toISOString(),
                    properties: properties
                };
                localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            } catch (error) {
                console.error('Error saving to localStorage:', error);
                // Don't throw - localStorage is just a backup
            }
        },

        /**
         * Save server properties to API
         */
        async saveServerProperties() {
            try {
                const serverUuid = this.propertiesModal.serverUuid;
                
                if (!serverUuid) {
                    this.showError('サーバーUUIDが見つかりません');
                    return;
                }

                // Check for validation errors before saving
                if (this.propertiesModal.errors && Object.keys(this.propertiesModal.errors).length > 0) {
                    this.showError('入力エラーがあります。エラーを修正してから保存してください');
                    return;
                }

                // If in raw editor mode, validate and sync raw to GUI first
                if (this.propertiesModal.mode === 'developer' && this.propertiesModal.editorTab === 'raw') {
                    // Validate raw text
                    this.validateRawText();
                    
                    // Check if there are errors
                    if (this.propertiesModal.rawTextErrors.length > 0) {
                        this.showError('エラーがあります。エラーを修正してから保存してください。');
                        return;
                    }
                    
                    const parsedProperties = this.rawTextToProperties(this.propertiesModal.rawText);
                    this.propertiesModal.data = {
                        ...this.getDefaultProperties(),
                        ...parsedProperties
                    };
                }

                // Set saving state
                this.propertiesModal.saving = true;

                // Save to API
                await this.savePropertiesToAPI(serverUuid, this.propertiesModal.data);
                
                // Also save to localStorage as backup
                this.saveServerPropertiesToLocalStorage(serverUuid, this.propertiesModal.data);

                this.showSuccess('プロパティを保存しました');
                this.closePropertiesModal();

                // Log for debugging
                console.log('Saved properties for server:', serverUuid);
            } catch (error) {
                console.error('Error saving properties:', error);
                const errorMessage = error.message || 'プロパティの保存に失敗しました';
                this.showError(errorMessage);
                
                // Keep modal open so user can retry
                this.propertiesModal.saving = false;
            }
        },

        /**
         * Load server properties from localStorage
         */
        loadServerProperties(serverUuid) {
            try {
                const storageKey = `server-properties-${serverUuid}`;
                const savedData = localStorage.getItem(storageKey);

                if (!savedData) {
                    return null;
                }

                const parsed = JSON.parse(savedData);
                
                // Return properties object
                return parsed.properties || null;
            } catch (error) {
                console.error('Error loading properties:', error);
                return null;
            }
        },

        /**
         * Delete server properties from localStorage
         */
        deleteServerProperties(serverUuid) {
            try {
                const storageKey = `server-properties-${serverUuid}`;
                localStorage.removeItem(storageKey);
                console.log('Deleted properties for server:', serverUuid);
            } catch (error) {
                console.error('Error deleting properties:', error);
            }
        },

        /**
         * Get properties count by mode for display
         */
        getPropertiesCountByMode(mode) {
            const counts = {
                basic: 14,
                advanced: 18,
                developer: 20,
                dev: 20
            };
            return counts[mode] || 0;
        },

        /**
         * Get dynamic properties count from schema (NEW)
         */
        getDynamicPropertiesCount(mode) {
            const properties = this.getPropertiesByMode(mode);
            return Object.keys(properties).length;
        },

        /**
         * Validate property value based on schema constraints
         */
        validatePropertyValue(key, value) {
            // Find the property in schema
            let property = null;
            let tier = null;
            
            for (const [tierName, properties] of Object.entries(propertiesSchema)) {
                if (properties[key]) {
                    property = properties[key];
                    tier = tierName;
                    break;
                }
            }
            
            if (!property) {
                return { valid: true }; // Unknown property, skip validation
            }
            
            // Validate based on type and constraints
            if (property.type === 'boolean') {
                // For raw text validation, value is a string "true" or "false"
                const stringValue = String(value).toLowerCase();
                if (stringValue !== 'true' && stringValue !== 'false') {
                    const label = property.explanation.ja.split('を')[0].split('に')[0].split('で')[0];
                    return { valid: false, message: `${label}は "true" または "false" で入力してください` };
                }
            } else if (property.type === 'number') {
                const numValue = Number(value);
                const { min, max } = property.constraints;
                
                if (isNaN(numValue)) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'invalid_number') };
                }
                if (min !== undefined && numValue < min) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'min', { min, max }) };
                }
                if (max !== undefined && numValue > max) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'max', { min, max }) };
                }
            } else if (property.type === 'string') {
                const { minLength, maxLength } = property.constraints;
                const stringValue = String(value);
                
                if (minLength !== undefined && stringValue.length < minLength) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'minLength', { minLength, maxLength }) };
                }
                if (maxLength !== undefined && stringValue.length > maxLength) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'maxLength', { minLength, maxLength }) };
                }
            } else if (property.type === 'enum') {
                const validValues = property.constraints.options.map(opt => opt.value);
                const stringValue = String(value);
                if (!validValues.includes(stringValue)) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'invalid_enum') };
                }
            }

            return { valid: true };
        },

        /**
         * Generate Japanese error messages based on property constraints (NEW)
         */
        getJapaneseErrorMessage(key, property, errorType, params = {}) {
            const label = property.explanation.ja.split('を')[0].split('に')[0].split('で')[0];
            
            switch (errorType) {
                case 'invalid_number':
                    return `${label}は数値で入力してください`;
                    
                case 'min':
                case 'max':
                    // Special formatting for range validation
                    const { min, max } = params;
                    if (min !== undefined && max !== undefined) {
                        return `${label}は${min}～${max}の範囲で入力してください`;
                    } else if (min !== undefined) {
                        return `${label}は${min}以上で入力してください`;
                    } else if (max !== undefined) {
                        return `${label}は${max}以下で入力してください`;
                    }
                    break;
                    
                case 'minLength':
                case 'maxLength':
                    const { minLength, maxLength } = params;
                    if (errorType === 'minLength') {
                        return `${label}は${minLength}文字以上で入力してください`;
                    } else {
                        return `${label}は${maxLength}文字以内で入力してください`;
                    }
                    
                case 'invalid_enum':
                    return `${label}の値が無効です。有効な選択肢から選んでください`;
                    
                default:
                    return `${label}の入力値が正しくありません`;
            }
        },

        /**
         * Validate property name format
         * @param {string} name - Property name
         * @returns {boolean} True if valid
         */
        validatePropertyName(name) {
            if (!name || name.trim().length === 0) {
                return false;
            }
            // 1-255 characters, alphanumeric, dots, hyphens, underscores
            const pattern = /^[a-zA-Z0-9._-]{1,255}$/;
            return pattern.test(name);
        },

        /**
         * Check for duplicate properties in raw text
         * @param {Array} lines - Array of parsed line objects
         * @returns {Array} Array of duplicate warnings
         */
        checkDuplicateProperties(lines) {
            const warnings = [];
            const seenProperties = new Map(); // Map<propertyName, firstLineNumber>
            
            lines.forEach((line, index) => {
                if (line.property) {
                    const lineNumber = index + 1;
                    if (seenProperties.has(line.property)) {
                        const firstOccurrence = seenProperties.get(line.property);
                        warnings.push({
                            lineNumber: lineNumber,
                            property: line.property,
                            type: 'duplicate',
                            message: `プロパティ "${line.property}" が重複しています（最初の定義は行 ${firstOccurrence}）`
                        });
                    } else {
                        seenProperties.set(line.property, lineNumber);
                    }
                }
            });
            
            return warnings;
        },

        /**
         * Validate raw text format and content
         * @param {string} rawText - Raw text from editor
         * @returns {Object} { errors: [], warnings: [] }
         */
        validateRawTextComplete(rawText) {
            const errors = [];
            const warnings = [];
            const lines = rawText.split('\n');
            const parsedLines = [];
            
            // First pass: Parse and format validation
            lines.forEach((line, index) => {
                const lineNumber = index + 1;
                const trimmed = line.trim();
                
                // Skip empty lines and comments
                if (!trimmed || trimmed.startsWith('#')) {
                    parsedLines.push({ lineNumber, line, property: null, value: null, type: 'comment' });
                    return;
                }
                
                // Check for property=value format
                const equalIndex = trimmed.indexOf('=');
                if (equalIndex === -1) {
                    errors.push({
                        lineNumber: lineNumber,
                        property: null,
                        type: 'format',
                        message: '無効な形式です。property=value の形式で入力してください'
                    });
                    parsedLines.push({ lineNumber, line, property: null, value: null, type: 'error' });
                    return;
                }
                
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                
                // Validate property name
                if (!this.validatePropertyName(key)) {
                    errors.push({
                        lineNumber: lineNumber,
                        property: key,
                        type: 'format',
                        message: `プロパティ名 "${key}" が無効です。英数字、ハイフン(-)、ピリオド(.)、アンダースコア(_)のみ使用可能です（1-255文字）`
                    });
                    parsedLines.push({ lineNumber, line, property: key, value: value, type: 'error' });
                    return;
                }
                
                parsedLines.push({ lineNumber, line, property: key, value: value, type: 'property' });
            });
            
            // Second pass: Duplicate detection
            const duplicateWarnings = this.checkDuplicateProperties(parsedLines);
            warnings.push(...duplicateWarnings);
            
            // Third pass: Schema validation for valid properties
            parsedLines.forEach((parsedLine) => {
                if (parsedLine.type === 'property' && parsedLine.property) {
                    const key = parsedLine.property;
                    const value = parsedLine.value;
                    
                    // Find property in schema
                    let property = null;
                    for (const tier of ['basic', 'advanced', 'dev']) {
                        if (propertiesSchema[tier][key]) {
                            property = propertiesSchema[tier][key];
                            break;
                        }
                    }
                    
                    if (property) {
                        // Validate against schema
                        const validation = this.validatePropertyValue(key, value);
                        if (!validation.valid) {
                            errors.push({
                                lineNumber: parsedLine.lineNumber,
                                property: key,
                                type: 'schema',
                                message: validation.message
                            });
                        }
                    } else {
                        // Unknown property - warning only
                        warnings.push({
                            lineNumber: parsedLine.lineNumber,
                            property: key,
                            type: 'unknown',
                            message: `未知のプロパティ "${key}" です。スキーマに定義されていませんが、保存は可能です`
                        });
                    }
                }
            });
            
            return { errors, warnings };
        },

        /**
         * Validate raw text with debounce (called from UI)
         * This is the main entry point for validation
         */
        validateRawTextDebounced() {
            // Clear previous timeout if exists
            if (this._rawTextValidationTimeout) {
                clearTimeout(this._rawTextValidationTimeout);
            }
            
            // Set new timeout
            this._rawTextValidationTimeout = setTimeout(() => {
                this.validateRawText();
            }, 300); // 300ms debounce
        },

        /**
         * Validate raw text immediately
         */
        validateRawText() {
            const rawText = this.propertiesModal.rawText || '';
            const validation = this.validateRawTextComplete(rawText);
            
            // Update state
            this.propertiesModal.rawTextErrors = validation.errors;
            this.propertiesModal.rawTextWarnings = validation.warnings;
            this.propertiesModal.rawTextValid = validation.errors.length === 0;
        },

        /**
         * Get errors/warnings for a specific line number
         * @param {number} lineNumber - Line number (1-based)
         * @returns {Object} { errors: [], warnings: [] }
         */
        getLineValidationIssues(lineNumber) {
            const errors = this.propertiesModal.rawTextErrors.filter(e => e.lineNumber === lineNumber);
            const warnings = this.propertiesModal.rawTextWarnings.filter(w => w.lineNumber === lineNumber);
            return { errors, warnings };
        },


        /**
         * Real-time validation for property input (NEW)
         */
        validatePropertyRealtime(key, property) {
            // Initialize errors object if it doesn't exist
            if (!this.propertiesModal.errors) {
                this.propertiesModal.errors = {};
            }

            const value = this.propertiesModal.data[key];
            
            // Skip validation for empty optional fields
            if (!property.required && (value === '' || value === null || value === undefined)) {
                delete this.propertiesModal.errors[key];
                return;
            }

            // Validate based on type and constraints
            if (property.type === 'number') {
                const numValue = Number(value);
                const { min, max } = property.constraints;
                
                if (value === '' || value === null || value === undefined) {
                    if (property.required) {
                        this.propertiesModal.errors[key] = this.getJapaneseErrorMessage(key, property, 'required');
                    }
                    return;
                }
                
                if (isNaN(numValue)) {
                    this.propertiesModal.errors[key] = this.getJapaneseErrorMessage(key, property, 'invalid_number');
                    return;
                }
                
                if ((min !== undefined && numValue < min) || (max !== undefined && numValue > max)) {
                    this.propertiesModal.errors[key] = this.getJapaneseErrorMessage(key, property, 'min', { min, max });
                    return;
                }
            } else if (property.type === 'string') {
                const { minLength, maxLength } = property.constraints;
                
                if (minLength !== undefined && value.length < minLength) {
                    this.propertiesModal.errors[key] = this.getJapaneseErrorMessage(key, property, 'minLength', { minLength, maxLength });
                    return;
                }
                if (maxLength !== undefined && value.length > maxLength) {
                    this.propertiesModal.errors[key] = this.getJapaneseErrorMessage(key, property, 'maxLength', { minLength, maxLength });
                    return;
                }
            }

            // If validation passes, remove error
            delete this.propertiesModal.errors[key];
        },

        /**
         * Export properties as downloadable file (for future use)
         */
        exportPropertiesAsFile(serverUuid) {
            const properties = this.loadServerProperties(serverUuid);
            if (!properties) {
                this.showError('エクスポートするプロパティがありません');
                return;
            }

            const rawText = this.propertiesToRawText(properties);
            const blob = new Blob([rawText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'server.properties';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('server.properties をダウンロードしました');
        },

        /**
         * Sync overlay scroll position with textarea scroll
         * Called from @scroll directive on textarea
         */
        syncRawEditorOverlayScroll() {
            // Hide tooltip when scrolling
            this.hideTooltip();
            
            // Use nextTick to ensure refs are available
            this.$nextTick(() => {
                const textarea = this.$refs.rawTextarea;
                const overlay = this.$refs.rawEditorOverlay;
                
                if (textarea && overlay) {
                    overlay.scrollTop = textarea.scrollTop;
                    overlay.scrollLeft = textarea.scrollLeft;
                }
            });
        },

        /**
         * Initialize raw editor overlay synchronization
         * Sets up ResizeObserver and initial scroll sync
         */
        initializeRawEditorOverlay() {
            // Clean up any existing observer
            if (this._rawEditorResizeObserver) {
                this._rawEditorResizeObserver.disconnect();
                this._rawEditorResizeObserver = null;
            }

            // Use nextTick to ensure DOM is ready
            this.$nextTick(() => {
                const textarea = this.$refs.rawTextarea;
                const overlay = this.$refs.rawEditorOverlay;
                const container = textarea?.parentElement;

                if (!textarea || !overlay || !container) {
                    return;
                }

                // Initial scroll sync
                overlay.scrollTop = textarea.scrollTop;
                overlay.scrollLeft = textarea.scrollLeft;

                // Set up ResizeObserver to sync on size changes
                this._rawEditorResizeObserver = new ResizeObserver(() => {
                    // Sync scroll position when size changes
                    overlay.scrollTop = textarea.scrollTop;
                    overlay.scrollLeft = textarea.scrollLeft;
                });

                // Observe both textarea and container for size changes
                this._rawEditorResizeObserver.observe(textarea);
                this._rawEditorResizeObserver.observe(container);
            });
        },

        /**
         * Clean up raw editor overlay resources
         */
        cleanupRawEditorOverlay() {
            if (this._rawEditorResizeObserver) {
                this._rawEditorResizeObserver.disconnect();
                this._rawEditorResizeObserver = null;
            }
            
            // Clean up tooltip timeout
            if (this._tooltipTimeout) {
                clearTimeout(this._tooltipTimeout);
                this._tooltipTimeout = null;
            }
            
            // Reset hovered line tracking
            this._currentHoveredLine = null;
            
            // Clean up measurement element
            if (this._textMeasurementElement) {
                document.body.removeChild(this._textMeasurementElement);
                this._textMeasurementElement = null;
            }
        },

        /**
         * Calculate line position (top and left)
         * @param {number} lineNumber - 1-based line number
         * @returns {Object} { top, left }
         */
        calculateLinePosition(lineNumber) {
            const textarea = this.$refs.rawTextarea;
            if (!textarea) {
                return { top: 0, left: 0 };
            }

            const lineHeight = 13 * 1.6; // 20.8px (font-size * line-height)
            const paddingTop = 16;
            const paddingLeft = 16;
            
            const top = paddingTop + (lineNumber - 1) * lineHeight;
            const left = paddingLeft - textarea.scrollLeft;
            
            return { top, left };
        },

        /**
         * Detect if a line wraps by measuring text width
         * @param {string} lineText - The text content of the line
         * @param {number} lineNumber - Line number for context
         * @returns {boolean} True if line wraps
         */
        detectLineWrapping(lineText, lineNumber) {
            const textarea = this.$refs.rawTextarea;
            if (!textarea) {
                return false;
            }

            // Create or reuse measurement element
            if (!this._textMeasurementElement) {
                this._textMeasurementElement = document.createElement('span');
                this._textMeasurementElement.style.position = 'absolute';
                this._textMeasurementElement.style.visibility = 'hidden';
                this._textMeasurementElement.style.whiteSpace = 'pre';
                this._textMeasurementElement.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
                this._textMeasurementElement.style.fontSize = '13px';
                this._textMeasurementElement.style.padding = '0';
                this._textMeasurementElement.style.margin = '0';
                document.body.appendChild(this._textMeasurementElement);
            }

            // Set text and measure
            this._textMeasurementElement.textContent = lineText;
            const textWidth = this._textMeasurementElement.offsetWidth;
            
            // Calculate available width
            const paddingLeft = 16;
            const paddingRight = 16;
            const scrollbarWidth = textarea.offsetWidth - textarea.clientWidth;
            const availableWidth = textarea.clientWidth - paddingLeft - paddingRight - (scrollbarWidth > 0 ? scrollbarWidth : 0);
            
            return textWidth > availableWidth;
        },

        /**
         * Get line text content for a specific line number
         * @param {number} lineNumber - 1-based line number
         * @returns {string} Line text content
         */
        getLineText(lineNumber) {
            const rawText = this.propertiesModal.rawText || '';
            const lines = rawText.split('\n');
            return lines[lineNumber - 1] || '';
        },

        /**
         * Check if line is empty (only whitespace)
         * @param {string} lineText - Line text content
         * @returns {boolean} True if line is empty or whitespace only
         */
        isLineEmpty(lineText) {
            return !lineText || lineText.trim().length === 0;
        },

        /**
         * Get CSS styles for error/warning line indicator
         * @param {Object} line - Line object with lineNumber, type, messages
         * @returns {Object} CSS style object
         */
        getLineIndicatorStyle(line) {
            const { top, left } = this.calculateLinePosition(line.lineNumber);
            const lineText = this.getLineText(line.lineNumber);
            const isEmpty = this.isLineEmpty(lineText);
            const isWrapped = !isEmpty && this.detectLineWrapping(lineText, line.lineNumber);
            
            const textarea = this.$refs.rawTextarea;
            if (!textarea) {
                return {};
            }

            const paddingLeft = 16;
            const paddingRight = 16;
            const scrollbarWidth = textarea.offsetWidth - textarea.clientWidth;
            const availableWidth = textarea.clientWidth - paddingLeft - paddingRight - (scrollbarWidth > 0 ? scrollbarWidth : 0);
            
            const lineHeight = 13 * 1.6; // 20.8px
            
            // For all lines (empty or not), create full-height hover area
            // The underline/icon will be positioned within this area
            let hoverWidth;
            if (isWrapped) {
                // Full width for wrapped lines
                hoverWidth = availableWidth;
            } else if (isEmpty) {
                // For empty lines, use full available width for hover area
                hoverWidth = availableWidth;
            } else {
                // Measure actual text width for non-wrapped lines
                if (!this._textMeasurementElement) {
                    this._textMeasurementElement = document.createElement('span');
                    this._textMeasurementElement.style.position = 'absolute';
                    this._textMeasurementElement.style.visibility = 'hidden';
                    this._textMeasurementElement.style.whiteSpace = 'pre';
                    this._textMeasurementElement.style.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
                    this._textMeasurementElement.style.fontSize = '13px';
                    document.body.appendChild(this._textMeasurementElement);
                }
                this._textMeasurementElement.textContent = lineText;
                hoverWidth = this._textMeasurementElement.offsetWidth;
            }
            
            return {
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${hoverWidth}px`,
                height: `${lineHeight}px`, // Full line height for hover area
                pointerEvents: 'auto',
                cursor: 'default',
                zIndex: 2
            };
        },

        /**
         * Calculate smart tooltip position relative to cursor with edge detection
         * @param {number} clientX - Mouse X coordinate
         * @param {number} clientY - Mouse Y coordinate
         * @param {Object} tooltipElement - Tooltip DOM element (optional, for size calculation)
         * @returns {Object} { x, y, placement } - Position and placement info
         */
        calculateTooltipPosition(clientX, clientY, tooltipElement = null) {
            const offsetX = 10; // Offset from cursor
            const offsetY = 10; // Offset above cursor
            const tooltipWidth = tooltipElement ? tooltipElement.offsetWidth : 400; // Default max-width
            const tooltipHeight = tooltipElement ? tooltipElement.offsetHeight : 100; // Estimated height
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 10; // Margin from viewport edges
            
            let x = clientX + offsetX;
            let y = clientY - offsetY;
            let placement = 'top-left'; // Default placement
            
            // Check right edge
            if (x + tooltipWidth + margin > viewportWidth) {
                x = clientX - tooltipWidth - offsetX; // Place to the left of cursor
                placement = 'top-right';
            }
            
            // Check left edge
            if (x < margin) {
                x = margin;
            }
            
            // Check top edge
            if (y - tooltipHeight - margin < 0) {
                y = clientY + offsetY; // Place below cursor
                placement = 'bottom-left';
            }
            
            // Check bottom edge
            if (y + tooltipHeight + margin > viewportHeight) {
                y = viewportHeight - tooltipHeight - margin;
            }
            
            return { x, y, placement };
        },

        /**
         * Show tooltip for error/warning line
         * @param {Event} event - Mouse event
         * @param {Object} line - Line object with lineNumber, type, messages
         */
        showTooltip(event, line) {
            // Clear any existing timeout
            if (this._tooltipTimeout) {
                clearTimeout(this._tooltipTimeout);
            }
            
            // Track current hovered line
            this._currentHoveredLine = line.lineNumber;
            
            // Debounce tooltip display (200ms)
            this._tooltipTimeout = setTimeout(() => {
                // Check if we're still on the same line
                if (this._currentHoveredLine !== line.lineNumber) {
                    return;
                }
                
                // Get error and warning messages separately
                const errors = this.propertiesModal.rawTextErrors.filter(e => e.lineNumber === line.lineNumber);
                const warnings = this.propertiesModal.rawTextWarnings.filter(w => w.lineNumber === line.lineNumber);
                
                // Calculate position relative to cursor
                const position = this.calculateTooltipPosition(event.clientX, event.clientY);
                
                // Set tooltip data
                this.propertiesModal.rawEditorTooltip = {
                    lineNumber: line.lineNumber,
                    errors: errors,
                    warnings: warnings,
                    hasErrors: errors.length > 0,
                    hasWarnings: warnings.length > 0,
                    x: position.x,
                    y: position.y,
                    placement: position.placement
                };
            }, 200);
        },

        /**
         * Update tooltip position on mouse move
         * @param {Event} event - Mouse event
         * @param {Object} line - Line object
         */
        updateTooltipPosition(event, line) {
            // Only update if tooltip is already showing for this line
            if (!this.propertiesModal.rawEditorTooltip || 
                this.propertiesModal.rawEditorTooltip.lineNumber !== line.lineNumber) {
                return;
            }
            
            // Get tooltip element for accurate size calculation
            const tooltipElement = document.querySelector('.raw-editor-tooltip');
            
            // Recalculate position
            const position = this.calculateTooltipPosition(
                event.clientX, 
                event.clientY, 
                tooltipElement
            );
            
            // Update tooltip position
            this.propertiesModal.rawEditorTooltip.x = position.x;
            this.propertiesModal.rawEditorTooltip.y = position.y;
            this.propertiesModal.rawEditorTooltip.placement = position.placement;
        },

        /**
         * Hide tooltip
         */
        hideTooltip() {
            if (this._tooltipTimeout) {
                clearTimeout(this._tooltipTimeout);
                this._tooltipTimeout = null;
            }
            this._currentHoveredLine = null;
            this.propertiesModal.rawEditorTooltip = null;
        },

        /**
         * Update raw editor indicators (called by watch handlers)
         */
        updateRawEditorIndicators() {
            // This method is called when errors/warnings change
            // The template will automatically re-render based on rawEditorErrorLines computed property
            // We just need to ensure the overlay is initialized
            if (this.propertiesModal.editorTab === 'raw') {
                this.initializeRawEditorOverlay();
            }
        }
    };
}
