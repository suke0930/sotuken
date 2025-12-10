// Download Management Logic
import { API_ENDPOINTS } from '../Endpoints.js';
import { apiRequest, apiPost, apiDelete } from '../utils/api.js';

export function createDownloadMethods() {
    return {
        async fetchDownloadList() {
            if (!this.downloadListType) {
                this.showError('リストタイプを選択してください');
                return;
            }

            this.fetchingList = true;

            try {
                const data = await apiRequest(API_ENDPOINTS.download.list(this.downloadListType));

                if (data.success) {
                    this.downloadListData = data.data;
                    this.showSuccess('リストを取得しました');
                } else {
                    this.showError(`エラー: ${data.error.message}`);
                }
            } catch (error) {
                console.error('Failed to fetch list:', error);
                this.showError('サーバーからのリスト取得に失敗しました');
            } finally {
                this.fetchingList = false;
            }
        },

        selectFile(fileInfo) {
            this.selectedFile = fileInfo;
        },

        async startDownload() {
            if (!this.selectedFile) {
                this.showError('ダウンロードするファイルを選択してください');
                return;
            }

            this.startingDownload = true;

            try {
                const data = await apiPost(API_ENDPOINTS.download.start, {
                    url: this.selectedFile.url
                });

                if (data.success) {
                    console.log('Download started:', data.data);
                    this.addDownload(data.data.status);
                    this.showSuccess('ダウンロードを開始しました');
                } else {
                    this.showError(`エラー: ${data.error.message}`);
                }
            } catch (error) {
                console.error('Failed to start download:', error);
                this.showError('ダウンロードの開始に失敗しました');
            } finally {
                this.startingDownload = false;
            }
        },

        addDownload(status) {
            const existingIndex = this.activeDownloads.findIndex(d => d.taskId === status.taskId);
            if (existingIndex === -1) {
                this.activeDownloads.unshift(status);
            }
        },

        updateDownloadProgress(progress) {
            const index = this.activeDownloads.findIndex(d => d.taskId === progress.taskId);
            if (index !== -1) {
                this.activeDownloads[index] = progress;
            } else {
                this.addDownload(progress);
            }
        },

        handleDownloadComplete(data) {
            console.log('✅ Download completed:', data);
            const index = this.activeDownloads.findIndex(d => d.taskId === data.taskId);
            if (index !== -1) {
                this.activeDownloads[index].status = 'completed';
            }
            this.showSuccess('ダウンロードが完了しました');
        },

        handleDownloadError(data) {
            console.error('❌ Download error:', data);
            const index = this.activeDownloads.findIndex(d => d.taskId === data.taskId);
            if (index !== -1) {
                this.activeDownloads[index].status = 'error';
            }
            this.showError(`ダウンロードエラー: ${data.error || '不明なエラー'}`);
        },

        async cancelDownload(taskId) {
            try {
                const data = await apiDelete(API_ENDPOINTS.download.cancel(taskId));

                if (data.success) {
                    const index = this.activeDownloads.findIndex(d => d.taskId === taskId);
                    if (index !== -1) {
                        this.activeDownloads[index].status = 'cancelled';
                    }
                    this.showSuccess('ダウンロードをキャンセルしました');
                } else {
                    this.showError(`キャンセル失敗: ${data.error.message}`);
                }
            } catch (error) {
                console.error('Error cancelling download:', error);
                this.showError('ダウンロードのキャンセル中にエラーが発生しました');
            }
        }
    };
}
