/**
 * Vue Application Template - Main Entry Point
 * 
 * This is the base template file that imports and combines all modular templates.
 * All templates are organized into separate files for better maintainability.
 * 
 * File Structure:
 * - LoadingTemplate.js: Loading overlay component
 * - AuthTemplate.js: Authentication screens (signup/login)
 * - NavbarTemplate.js: Navigation bar component
 * - SidebarTemplate.js: Sidebar menu component
 * - DashboardHeaderTemplate.js: Dashboard header and messages
 * - ServersTabTemplate.js: Server list tab
 * - CreateServerTabTemplate.js: Server creation/edit form
 * - SettingsTabTemplate.js: Settings tab
 * - DownloadsTabTemplate.js: Downloads management tab
 * - ContentTabsTemplate.js: About & Tutorials tabs
 * - JdkManagementTabTemplate.js: JDK management tab
 * - ModalsTemplate.js: All modal dialogs
 * - ToastTemplate.js: Toast notifications
 */

// Import all template modules
import { loadingTemplate } from './LoadingTemplate.js';
import { authTemplate } from './AuthTemplate.js';
import { navbarTemplate } from './NavbarTemplate.js';
import { sidebarTemplate } from './SidebarTemplate.js';
import { dashboardHeaderTemplate } from './DashboardHeaderTemplate.js';
import { serversTabTemplate } from './ServersTabTemplate.js';
import { createServerTabTemplate } from './CreateServerTabTemplate.js';
import { settingsTabTemplate } from './SettingsTabTemplate.js';
import { downloadsTabTemplate } from './DownloadsTabTemplate.js';
import { contentTabsTemplate } from './ContentTabsTemplate.js';
import { jdkManagementTabTemplate } from './JdkManagementTabTemplate.js';
import { modalsTemplate } from './ModalsTemplate.js';
import { toastTemplate } from './ToastTemplate.js';

// Combine all templates into the main application template
export const appTemplate = `
${loadingTemplate}

${authTemplate}

<main v-else class="main-wrapper">
    ${navbarTemplate}

    ${sidebarTemplate}

    <div class="dashboard">
        ${dashboardHeaderTemplate}

        ${serversTabTemplate}

        ${createServerTabTemplate}

        ${settingsTabTemplate}

        ${downloadsTabTemplate}

        ${contentTabsTemplate}

        ${jdkManagementTabTemplate}
    </div>

    ${modalsTemplate}

    ${toastTemplate}
</main>
`;
