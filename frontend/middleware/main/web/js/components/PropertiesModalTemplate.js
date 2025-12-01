// Server Properties Modal Template - Schema-Driven Version
export const propertiesModalTemplate = `
<!-- Server Properties Modal -->
<div v-if="propertiesModal.visible" class="modal-overlay" @click.self="closePropertiesModal">
    <div class="modal-content properties-modal" style="max-width: 800px; max-height: 90vh;">
        <div class="modal-header">
            <h3>
                <i class="fas fa-sliders-h"></i>
                サーバープロパティ - {{ propertiesModal.serverName }}
            </h3>
            <button class="modal-close" @click="closePropertiesModal">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <div class="modal-body properties-modal-body" style="padding: 0; overflow-y: auto; max-height: calc(90vh - 180px);">
            <!-- Loading Spinner -->
            <div v-if="propertiesModal.loading" class="properties-loading-overlay" style="display: flex; align-items: center; justify-content: center; min-height: 200px; flex-direction: column; gap: 16px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 36px; color: var(--theme-primary);"></i>
                <p style="color: var(--theme-text-secondary);">プロパティを読み込み中...</p>
            </div>

            <!-- Warning Banner for Load Errors -->
            <div v-if="propertiesModal.loadError && !propertiesModal.loading" class="properties-warning-banner" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 16px; border-radius: 4px; color: #856404;">
                <i class="fas fa-exclamation-triangle"></i>
                <span style="margin-left: 8px;">サーバーからプロパティを取得できませんでした。デフォルト値またはローカルに保存されたデータを使用しています。</span>
            </div>

            <!-- Mode Toggle -->
            <div class="properties-mode-toggle" v-show="!propertiesModal.loading">
                <button 
                    :class="['mode-toggle-btn', { active: propertiesModal.mode === 'basic' }]"
                    @click="switchPropertiesMode('basic')"
                    :disabled="propertiesModal.loading"
                    title="基本的な設定のみ表示"
                >
                    <i class="fas fa-user"></i>
                    基本設定
                </button>
                <button 
                    :class="['mode-toggle-btn', { active: propertiesModal.mode === 'advanced' }]"
                    @click="switchPropertiesMode('advanced')"
                    :disabled="propertiesModal.loading"
                    title="中級者向け設定を含む"
                >
                    <i class="fas fa-user-cog"></i>
                    詳細設定
                </button>
                <button 
                    :class="['mode-toggle-btn', { active: propertiesModal.mode === 'developer' }]"
                    @click="switchPropertiesMode('developer')"
                    :disabled="propertiesModal.loading"
                    title="全ての設定+生テキスト編集"
                >
                    <i class="fas fa-code"></i>
                    開発者設定
                </button>
            </div>

            <!-- Developer Mode: Raw Editor Tab -->
            <div v-if="propertiesModal.mode === 'developer'" class="properties-editor-tabs">
                <button 
                    :class="['editor-tab-btn', { active: propertiesModal.editorTab === 'gui' }]"
                    @click="propertiesModal.editorTab = 'gui'"
                >
                    <i class="fas fa-th-list"></i>
                    GUI編集
                </button>
                <button 
                    :class="['editor-tab-btn', { active: propertiesModal.editorTab === 'raw' }]"
                    @click="switchToRawEditor"
                >
                    <i class="fas fa-file-code"></i>
                    テキスト編集
                </button>
            </div>

            <!-- GUI Editor View -->
            <div v-show="propertiesModal.editorTab === 'gui' && !propertiesModal.loading" class="properties-content" :style="{ opacity: propertiesModal.loading ? 0.5 : 1, pointerEvents: propertiesModal.loading ? 'none' : 'auto' }">
                <!-- Basic Properties Section -->
                <div v-if="propertiesModal.mode === 'basic'" class="properties-section">
                    <div class="properties-section-header">
                        <i class="fas fa-star"></i>
                        <span>基本設定 - {{ getDynamicPropertiesCount('basic') }}項目</span>
                    </div>
                    <div class="properties-grid">
                        <template v-for="(property, key) in getPropertiesByMode('basic')" :key="key">
                            <div :class="getPropertyItemClass(property)">
                                <label v-if="property.type !== 'boolean'" class="property-label">
                                    <i :class="['fas', getPropertyIcon(key)]"></i>
                                    <span class="property-label-text">{{ getPropertyLabel(property, key) }}</span>
                                    <span class="property-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- String Input -->
                                <input v-if="property.type === 'string'"
                                    type="text" 
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :placeholder="property.default"
                                    :minlength="property.constraints.minLength"
                                    :maxlength="property.constraints.maxLength"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Number Input -->
                                <input v-else-if="property.type === 'number'"
                                    type="number" 
                                    v-model.number="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :min="property.constraints.min"
                                    :max="property.constraints.max"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Enum/Select Input -->
                                <select v-else-if="property.type === 'enum'"
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    @change="validatePropertyRealtime(key, property)"
                                >
                                    <option v-for="option in property.constraints.options" 
                                        :key="option.value" 
                                        :value="option.value"
                                    >
                                        {{ option.label[currentLanguage] || option.label.en }}
                                    </option>
                                </select>

                                <!-- Boolean Checkbox -->
                                <label v-else-if="property.type === 'boolean'" class="property-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        v-model="propertiesModal.data[key]"
                                        class="property-checkbox"
                                    />
                                    <span class="property-checkbox-text">
                                        <i :class="['fas', getPropertyIcon(key)]"></i>
                                        {{ getPropertyLabel(property, key) }}
                                    </span>
                                    <span class="property-checkbox-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- Validation Error Message -->
                                <div v-if="propertiesModal.errors[key]" class="property-error-message">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    {{ propertiesModal.errors[key] }}
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Advanced Properties Section (Independent, No Inheritance) -->
                <div v-if="propertiesModal.mode === 'advanced'" class="properties-section">
                    <div class="properties-section-header advanced">
                        <i class="fas fa-cogs"></i>
                        <span>詳細設定 - {{ getDynamicPropertiesCount('advanced') }}項目</span>
                    </div>
                    <div class="properties-grid">
                        <template v-for="(property, key) in getPropertiesByMode('advanced')" :key="key">
                            <div :class="getPropertyItemClass(property)">
                                <label v-if="property.type !== 'boolean'" class="property-label">
                                    <i :class="['fas', getPropertyIcon(key)]"></i>
                                    <span class="property-label-text">{{ getPropertyLabel(property, key) }}</span>
                                    <span class="property-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- String Input -->
                                <input v-if="property.type === 'string'"
                                    type="text" 
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :placeholder="property.default"
                                    :minlength="property.constraints.minLength"
                                    :maxlength="property.constraints.maxLength"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Number Input -->
                                <input v-else-if="property.type === 'number'"
                                    type="number" 
                                    v-model.number="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :min="property.constraints.min"
                                    :max="property.constraints.max"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Enum/Select Input -->
                                <select v-else-if="property.type === 'enum'"
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    @change="validatePropertyRealtime(key, property)"
                                >
                                    <option v-for="option in property.constraints.options" 
                                        :key="option.value" 
                                        :value="option.value"
                                    >
                                        {{ option.label[currentLanguage] || option.label.en }}
                                    </option>
                                </select>

                                <!-- Boolean Checkbox -->
                                <label v-else-if="property.type === 'boolean'" class="property-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        v-model="propertiesModal.data[key]"
                                        class="property-checkbox"
                                    />
                                    <span class="property-checkbox-text">
                                        <i :class="['fas', getPropertyIcon(key)]"></i>
                                        {{ getPropertyLabel(property, key) }}
                                    </span>
                                    <span class="property-checkbox-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- Validation Error Message -->
                                <div v-if="propertiesModal.errors[key]" class="property-error-message">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    {{ propertiesModal.errors[key] }}
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Developer Properties Section -->
                <div v-if="propertiesModal.mode === 'developer'" class="properties-section">
                    <div class="properties-section-header developer">
                        <i class="fas fa-terminal"></i>
                        <span>開発者設定 - {{ getDynamicPropertiesCount('dev') }}項目</span>
                    </div>
                    <div class="properties-grid">
                        <template v-for="(property, key) in getPropertiesByMode('dev')" :key="key">
                            <div :class="getPropertyItemClass(property)">
                                <label v-if="property.type !== 'boolean'" class="property-label">
                                    <i :class="['fas', getPropertyIcon(key)]"></i>
                                    <span class="property-label-text">{{ getPropertyLabel(property, key) }}</span>
                                    <span class="property-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- String Input -->
                                <input v-if="property.type === 'string'"
                                    type="text" 
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :placeholder="property.default"
                                    :minlength="property.constraints.minLength"
                                    :maxlength="property.constraints.maxLength"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Number Input -->
                                <input v-else-if="property.type === 'number'"
                                    type="number" 
                                    v-model.number="propertiesModal.data[key]" 
                                    class="property-input"
                                    :class="{ 'property-input-error': propertiesModal.errors[key] }"
                                    :min="property.constraints.min"
                                    :max="property.constraints.max"
                                    @input="validatePropertyRealtime(key, property)"
                                />

                                <!-- Enum/Select Input -->
                                <select v-else-if="property.type === 'enum'"
                                    v-model="propertiesModal.data[key]" 
                                    class="property-input"
                                    @change="validatePropertyRealtime(key, property)"
                                >
                                    <option v-for="option in property.constraints.options" 
                                        :key="option.value" 
                                        :value="option.value"
                                    >
                                        {{ option.label[currentLanguage] || option.label.en }}
                                    </option>
                                </select>

                                <!-- Boolean Checkbox -->
                                <label v-else-if="property.type === 'boolean'" class="property-checkbox-label">
                                    <input 
                                        type="checkbox" 
                                        v-model="propertiesModal.data[key]"
                                        class="property-checkbox"
                                    />
                                    <span class="property-checkbox-text">
                                        <i :class="['fas', getPropertyIcon(key)]"></i>
                                        {{ getPropertyLabel(property, key) }}
                                    </span>
                                    <span class="property-checkbox-help-icon" :title="getPropertyExplanation(property)">
                                        <i class="fas fa-info-circle"></i>
                                    </span>
                                </label>

                                <!-- Validation Error Message -->
                                <div v-if="propertiesModal.errors[key]" class="property-error-message">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    {{ propertiesModal.errors[key] }}
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>

            <!-- Raw Text Editor View (Developer Only) -->
            <div v-show="propertiesModal.mode === 'developer' && propertiesModal.editorTab === 'raw' && !propertiesModal.loading" class="properties-raw-editor" :style="{ opacity: propertiesModal.loading ? 0.5 : 1, pointerEvents: propertiesModal.loading ? 'none' : 'auto' }">
                <div class="raw-editor-header">
                    <div>
                        <i class="fas fa-file-code"></i>
                        <strong>server.properties</strong> - 直接編集モード
                    </div>
                    <button 
                        class="btn btn-sm btn-secondary"
                        @click="syncRawEditorToGUI"
                        :disabled="!propertiesModal.rawTextValid || propertiesModal.saving || propertiesModal.loading"
                        title="テキストエディタの内容をGUIに反映"
                    >
                        <i class="fas fa-sync"></i>
                        GUIに反映
                    </button>
                </div>
                
                <!-- Raw Editor Container with Line Numbers -->
                <div class="raw-editor-container" style="display: flex; position: relative; border: 1px solid var(--theme-border, #ddd); border-radius: 4px; overflow: hidden;">
                    <!-- Line Numbers Column -->
                    <div class="raw-editor-line-numbers" style="background: var(--theme-bg-secondary, #f5f5f5); padding: 8px 4px; text-align: right; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.5; color: var(--theme-text-secondary, #666); border-right: 1px solid var(--theme-border, #ddd); min-width: 50px; user-select: none; overflow: hidden;">
                        <div 
                            v-for="(line, index) in propertiesModal.rawText.split('\\n')" 
                            :key="index"
                            :class="['raw-editor-line-number', { 
                                'has-error': hasLineError(index + 1),
                                'has-warning': hasLineWarning(index + 1) && !hasLineError(index + 1)
                            }]"
                            style="padding: 0 8px; min-height: 21px; display: flex; align-items: center; justify-content: flex-end;"
                        >
                            <span style="display: inline-flex; align-items: center; gap: 4px;">
                                <i v-if="hasLineError(index + 1)" class="fas fa-times-circle" style="color: #dc3545; font-size: 12px;"></i>
                                <i v-else-if="hasLineWarning(index + 1)" class="fas fa-exclamation-triangle" style="color: #ffc107; font-size: 12px;"></i>
                                <span>{{ index + 1 }}</span>
                            </span>
                        </div>
                    </div>
                    
                    <!-- Textarea -->
                    <textarea 
                        v-model="propertiesModal.rawText"
                        @input="validateRawTextDebounced"
                        class="raw-editor-textarea"
                        placeholder="property=value&#10;difficulty=normal&#10;gamemode=survival&#10;..."
                        spellcheck="false"
                        style="flex: 1; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.5; padding: 8px; border: none; outline: none; resize: none; min-height: 300px;"
                    ></textarea>
                </div>
                
                <!-- Validation Summary Panel -->
                <div v-if="propertiesModal.rawTextErrors.length > 0 || propertiesModal.rawTextWarnings.length > 0" class="raw-editor-validation-summary" style="margin-top: 12px; padding: 12px; background: var(--theme-bg-secondary, #f5f5f5); border-radius: 4px; border-left: 4px solid var(--theme-border, #ddd);">
                    <div style="margin-bottom: 8px; font-weight: bold; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-info-circle"></i>
                        <span>検証結果</span>
                    </div>
                    
                    <!-- Errors Section -->
                    <div v-if="propertiesModal.rawTextErrors.length > 0" style="margin-bottom: 12px;">
                        <div style="color: #dc3545; font-weight: bold; margin-bottom: 4px;">
                            <i class="fas fa-times-circle"></i>
                            エラー: {{ propertiesModal.rawTextErrors.length }}件
                        </div>
                        <div style="max-height: 150px; overflow-y: auto;">
                            <div 
                                v-for="(error, index) in propertiesModal.rawTextErrors" 
                                :key="'error-' + index"
                                style="padding: 6px 8px; margin-bottom: 4px; background: #fff; border-left: 3px solid #dc3545; border-radius: 2px; font-size: 13px;"
                            >
                                <strong style="color: #dc3545;">行 {{ error.lineNumber }}</strong>
                                <span v-if="error.property" style="color: var(--theme-text-secondary, #666);"> - {{ error.property }}</span>
                                <div style="margin-top: 2px; color: var(--theme-text, #333);">{{ error.message }}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Warnings Section -->
                    <div v-if="propertiesModal.rawTextWarnings.length > 0">
                        <div style="color: #ffc107; font-weight: bold; margin-bottom: 4px;">
                            <i class="fas fa-exclamation-triangle"></i>
                            警告: {{ propertiesModal.rawTextWarnings.length }}件
                        </div>
                        <div style="max-height: 150px; overflow-y: auto;">
                            <div 
                                v-for="(warning, index) in propertiesModal.rawTextWarnings" 
                                :key="'warning-' + index"
                                style="padding: 6px 8px; margin-bottom: 4px; background: #fff; border-left: 3px solid #ffc107; border-radius: 2px; font-size: 13px;"
                            >
                                <strong style="color: #ffc107;">行 {{ warning.lineNumber }}</strong>
                                <span v-if="warning.property" style="color: var(--theme-text-secondary, #666);"> - {{ warning.property }}</span>
                                <div style="margin-top: 2px; color: var(--theme-text, #333);">{{ warning.message }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="raw-editor-footer" style="margin-top: 8px;">
                    <i class="fas fa-info-circle"></i>
                    <span>形式: property=value (1行ごと)</span>
                </div>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn btn-secondary" @click="closePropertiesModal">
                <i class="fas fa-times"></i>
                キャンセル
            </button>
            <button class="btn btn-warning" @click="resetPropertiesToDefault">
                <i class="fas fa-undo"></i>
                デフォルトに戻す
            </button>
            <button 
                class="btn btn-primary" 
                @click="saveServerProperties"
                :disabled="propertiesModal.saving || propertiesModal.loading || (propertiesModal.editorTab === 'raw' && !propertiesModal.rawTextValid)"
            >
                <i :class="['fas', propertiesModal.saving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
                {{ propertiesModal.saving ? '保存中...' : '保存' }}
            </button>
        </div>
    </div>
</div>
`;
