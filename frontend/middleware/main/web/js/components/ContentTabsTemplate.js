// Content Tabs Template (About & Tutorials)
export const contentTabsTemplate = `
<div v-show="activeTab === 'about'" class="content-section active">
    <div class="section-title">
        <i class="fas fa-info-circle"></i>
        About Us
    </div>
    
    <div class="markdown-content-container">
        <div v-html="aboutUsRendered" class="content-page-markdown"></div>
    </div>
</div>

<div v-show="activeTab === 'tutorials'" class="content-section active">
    <div class="section-title">
        <i class="fas fa-book"></i>
        チュートリアル
    </div>
    
    <div class="markdown-content-container">
        <div v-html="tutorialsRendered" class="content-page-markdown"></div>
    </div>
</div>
`;

