# 問診票OCR処理ウェブアプリ開発計画

## 開発タスク
- [x] 開発環境のセットアップ
- [x] Next.jsアプリケーションの作成とTailwind CSSの設定
- [x] ファイルアップロードインターフェースの実装
- [x] APIルートの実装（ドキュメント処理用）
- [x] Azure Document Intelligence APIの統合
- [x] ローカルLLM（Gemma）の統合
- [x] アプリケーションのテストとデプロイ

## 詳細
- 問診票（PDFまたはJPEG）をブラウザ上でアップロード
- Microsoft AzureのIntelligent Document APIでOCR処理
- 読み取りデータをGemma LLMに渡して整形
- カルテにコピーできる形式で出力
- APIキーはブラウザ上で設定可能に
