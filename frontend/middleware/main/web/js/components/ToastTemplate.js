// Toast Notifications Template
export const toastTemplate = `
<div class="toast-container">
    <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', toast.type]"
        @click="removeToast(toast.id)"
    >
        <div class="toast-icon">
            <i class="fas fa-check-circle" v-if="toast.type === 'success'"></i>
            <i class="fas fa-exclamation-circle" v-else-if="toast.type === 'error'"></i>
            <i class="fas fa-exclamation-triangle" v-else-if="toast.type === 'warning'"></i>
            <i class="fas fa-info-circle" v-else></i>
        </div>
        <div class="toast-message">{{ toast.message }}</div>
    </div>
</div>
`;

