// Sidebar Template
export const sidebarTemplate = `
<!-- Sidebar Overlay -->
<div :class="['sidebar-overlay', { active: sidebarOpen }]" @click="closeSidebar"></div>

<!-- Sidebar -->
<aside :class="['sidebar', { open: sidebarOpen }]">
    <ul class="sidebar-menu">
        <li v-for="item in sidebarMenu" :key="item.id" class="sidebar-menu-item">
            <button
                :class="['sidebar-menu-button', { active: activeTab === item.id }]"
                @click="switchTab(item.id)"
            >
                <i :class="item.icon"></i>
                <span>{{ item.label }}</span>
            </button>
        </li>
    </ul>
</aside>
`;

