/**
 * JDKレジストリ管理システムの型定義
 * 
 * @module jdk-registry.types
 * @description Minecraft用Java実行環境を管理するためのデータスキーマ定義
 */

/**
 * ファイルのチェックサム情報
 * 
 * @description アンチウイルスソフトによる誤削除や
 * ファイル破損を検出するための整合性情報
 */
export interface FileChecksum {
    /** 
     * ファイルの相対パス
     * @example "bin/java.exe"
     * @example "lib/modules"
     */
    path: string;

    /** 
     * SHA-256ハッシュ値
     * @description ファイルの整合性を検証するためのチェックサム
     */
    checksum: string;

    /** 
     * 最終確認日時
     * @format ISO 8601
     * @example "2025-10-21T08:00:00Z"
     */
    lastVerified: string;
}

/**
 * 検証ステータス
 * 
 * @description JDKインスタンスのファイル整合性状態
 */
export type VerificationStatus =
    | 'verified'    // 検証済み・正常
    | 'unverified'  // 未検証
    | 'corrupted'   // 破損検出
    | 'missing';    // ファイル欠損

/**
 * JDKインスタンスの情報
 * 
 * @description 個別のJava実行環境の完全な情報を保持
 */
export interface JdkInstance {
    /** 
     * 一意識別子
     * @description ディレクトリ名としても使用される
     * @example "jdk-17-temurin"
     * @example "jdk-8-oracle"
     */
    id: string;

    /** 
     * 簡易名称
     * @description ユーザーに表示する短い名前
     * @example "Java 17"
     * @example "Java 8"
     */
    name: string;

    /** 
     * 正式名称
     * @description ベンダー、バージョン、ビルド番号を含む完全な名称
     * @example "Eclipse Temurin JDK 17.0.8+7"
     * @example "Oracle JDK 8u381"
     */
    structName: string;

    /** 
     * メジャーバージョン
     * @description プログラムで使用する数値バージョン
     * @example 8, 17, 21
     */
    majorVersion: number;

    /** 
     * OS種別
     * @example "windows", "linux", "darwin"
     */
    os: string;

    /** 
     * インストール日時
     * @format ISO 8601
     * @example "2024-03-15T10:30:00Z"
     */
    installedAt: string;

    /** 
     * ファイル整合性チェック情報
     * @description 重要なファイル（java.exe, javaw.exe, lib/modulesなど）のチェックサム
     */
    checksums: FileChecksum[];

    /** 
     * 検証ステータス
     * @description 最後の検証結果
     */
    verificationStatus: VerificationStatus;
}

/**
 * グローバルJDK管理データ
 * 
 * @description システム全体のJava実行環境を管理するルートデータ構造
 */
export interface JdkRegistry {
    /** 
     * スキーマバージョン
     * @description データ構造のバージョン管理用
     * @example "1.0.0"
     */
    schemaVersion: string;

    /** 
     * Javaランタイム全体を保存するベースディレクトリ
     * @description すべてのJDKインスタンスがこのディレクトリ配下に配置される
     * @example "C:\\GameRuntimes\\Java"
     * @example "/opt/game-runtimes/java"
     */
    baseRuntimePath: string;

    /** 
     * 現在アクティブなJDKのID
     * @description デフォルトで使用されるJDKインスタンスの識別子
     * @example "jdk-17-temurin"
     */
    activeJdkId?: string;

    /** 
     * 登録されているすべてのJDKインスタンス
     * @description 管理下にあるすべてのJava実行環境
     */
    instances: JdkInstance[];

    /** 
     * レジストリの最終更新日時
     * @format ISO 8601
     * @example "2025-10-21T08:45:00Z"
     */
    lastUpdated: string;
}
