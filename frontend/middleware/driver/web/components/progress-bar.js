class ProgressBar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.jobs = new Map();
    }

    createProgressElement(jobId, title) {
        const element = document.createElement('div');
        element.className = 'progress-item';
        element.id = `progress-${jobId}`;
        element.innerHTML = `
      <div class="progress-header">
        <span class="progress-title">${title}</span>
        <span class="progress-percentage">0%</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: 0%"></div>
      </div>
      <div class="progress-info">
        <span class="progress-size">0 MB / 0 MB</span>
        <span class="progress-status">準備中...</span>
      </div>
    `;
        return element;
    }

    startTracking(jobId, title) {
        if (this.jobs.has(jobId)) return;

        const element = this.createProgressElement(jobId, title);
        this.container.appendChild(element);

        // WebSocket または SSE でプログレスを監視
        const ws = new WebSocket(`ws://localhost:12800/ws`);

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'subscribe',
                channels: [`job:${jobId}`]
            }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.event === 'job:progress' && data.job.id === jobId) {
                this.updateProgress(jobId, data.job);
            } else if (data.event === 'job:completed' && data.job.id === jobId) {
                this.completeProgress(jobId, data.job);
                ws.close();
            } else if (data.event === 'job:failed' && data.job.id === jobId) {
                this.failProgress(jobId, data.job);
                ws.close();
            }
        };

        this.jobs.set(jobId, { element, ws });
    }

    updateProgress(jobId, job) {
        const item = this.jobs.get(jobId);
        if (!item) return;

        const element = item.element;
        const progress = job.progress || 0;
        const payload = job.payload || {};

        element.querySelector('.progress-percentage').textContent = `${progress}%`;
        element.querySelector('.progress-bar-fill').style.width = `${progress}%`;

        if (payload.downloadedSize && payload.totalSize) {
            const downloaded = (payload.downloadedSize / 1024 / 1024).toFixed(2);
            const total = (payload.totalSize / 1024 / 1024).toFixed(2);
            element.querySelector('.progress-size').textContent = `${downloaded} MB / ${total} MB`;
        }

        element.querySelector('.progress-status').textContent = 'ダウンロード中...';
    }

    completeProgress(jobId, job) {
        const item = this.jobs.get(jobId);
        if (!item) return;

        const element = item.element;
        element.querySelector('.progress-bar-fill').style.width = '100%';
        element.querySelector('.progress-percentage').textContent = '100%';
        element.querySelector('.progress-status').textContent = '完了';
        element.querySelector('.progress-status').style.color = '#10b981';

        setTimeout(() => {
            element.style.opacity = '0.5';
        }, 3000);
    }

    failProgress(jobId, job) {
        const item = this.jobs.get(jobId);
        if (!item) return;

        const element = item.element;
        element.querySelector('.progress-status').textContent = `エラー: ${job.error?.message || '不明なエラー'}`;
        element.querySelector('.progress-status').style.color = '#ef4444';
        element.querySelector('.progress-bar-fill').style.background = '#ef4444';
    }
}

// グローバルに公開
window.ProgressBar = ProgressBar;
