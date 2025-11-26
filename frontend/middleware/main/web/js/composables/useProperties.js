// Server Properties Management Logic - Schema-Driven Version
import { apiRequest } from '../utils/api.js';
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
         * Open properties modal for a server
         */
        openPropertiesModal(server) {
            if (!server) return;

            this.propertiesModal.visible = true;
            this.propertiesModal.serverUuid = server.uuid;
            this.propertiesModal.serverName = server.name;
            this.propertiesModal.mode = 'basic'; // Default to basic mode
            this.propertiesModal.editorTab = 'gui'; // Default to GUI tab
            this.propertiesModal.errors = {}; // Initialize errors object

            // Load properties from localStorage
            const savedProperties = this.loadServerProperties(server.uuid);
            
            if (savedProperties) {
                // Merge saved properties with defaults (in case new properties were added)
                this.propertiesModal.data = {
                    ...this.getDefaultProperties(),
                    ...savedProperties
                };
            } else {
                // Use default values
                this.propertiesModal.data = this.getDefaultProperties();
            }

            // Sync to raw editor
            this.syncGUIToRawEditor();
        },

        /**
         * Close properties modal
         */
        closePropertiesModal() {
            this.propertiesModal.visible = false;
            this.propertiesModal.serverUuid = null;
            this.propertiesModal.serverName = '';
            this.propertiesModal.data = {};
            this.propertiesModal.rawText = '';
            this.propertiesModal.mode = 'basic';
            this.propertiesModal.editorTab = 'gui';
            this.propertiesModal.errors = {}; // Clear errors
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
            try {
                const parsedProperties = this.rawTextToProperties(this.propertiesModal.rawText);
                
                // Merge with defaults to ensure all properties exist
                this.propertiesModal.data = {
                    ...this.getDefaultProperties(),
                    ...parsedProperties
                };
                
                this.showSuccess('テキストエディタの内容をGUIに反映しました');
                
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
         * Save server properties to localStorage
         */
        saveServerProperties() {
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

                // If in raw editor mode, sync raw to GUI first
                if (this.propertiesModal.mode === 'developer' && this.propertiesModal.editorTab === 'raw') {
                    const parsedProperties = this.rawTextToProperties(this.propertiesModal.rawText);
                    this.propertiesModal.data = {
                        ...this.getDefaultProperties(),
                        ...parsedProperties
                    };
                }

                // Save to localStorage
                const storageKey = `server-properties-${serverUuid}`;
                const dataToSave = {
                    version: 2, // Updated version with new schema
                    lastModified: new Date().toISOString(),
                    properties: this.propertiesModal.data
                };

                localStorage.setItem(storageKey, JSON.stringify(dataToSave));

                this.showSuccess('プロパティを保存しました');
                this.closePropertiesModal();

                // Log for debugging
                console.log('Saved properties for server:', serverUuid, dataToSave);
            } catch (error) {
                console.error('Error saving properties:', error);
                this.showError('プロパティの保存に失敗しました');
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
            if (property.type === 'number') {
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
                
                if (minLength !== undefined && value.length < minLength) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'minLength', { minLength, maxLength }) };
                }
                if (maxLength !== undefined && value.length > maxLength) {
                    return { valid: false, message: this.getJapaneseErrorMessage(key, property, 'maxLength', { minLength, maxLength }) };
                }
            } else if (property.type === 'enum') {
                const validValues = property.constraints.options.map(opt => opt.value);
                if (!validValues.includes(value)) {
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
        }
    };
}
