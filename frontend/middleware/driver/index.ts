import express from 'express';
import path from 'path';
/**
 * メイン関数
 * エントリポイントとして考えておｋ
 * @param port サーバのポート
 */
async function main(port: number) {
/**
 * expressを使いwebサーバーを立てる
 *  */;
    const app = express();

    //サーバーの定義
    app.get('/', (req, res) => {//ランディングページの実装
        res.sendFile(path.join(__dirname, 'web', 'index.html'));
    });


    /**
     * サーバー起動
     */
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}
main(12800);