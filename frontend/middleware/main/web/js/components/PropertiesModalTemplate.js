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
                        title="テキストエディタの内容をGUIに反映"
                    >
                        <i class="fas fa-sync"></i>
                        GUIに反映
                    </button>
                </div>
                <textarea 
                    v-model="propertiesModal.rawText"
                    class="raw-editor-textarea"
                    placeholder="property=value&#10;difficulty=normal&#10;gamemode=survival&#10;..."
                    spellcheck="false"
                ></textarea>
                <div class="raw-editor-footer">
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
                :disabled="propertiesModal.saving || propertiesModal.loading"
            >
                <i :class="['fas', propertiesModal.saving ? 'fa-spinner fa-spin' : 'fa-save']"></i>
                {{ propertiesModal.saving ? '保存中...' : '保存' }}
            </button>
        </div>
    </div>
</div>
`;
