'use client';

import { useState, useRef, useEffect } from 'react';
import { useDocumentProcessing } from './hooks/useDocumentProcessing';
import Image from 'next/image';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState({
    azureApiKey: '',
    azureEndpoint: '',
    modelId: 'prebuilt-layout', // デフォルトモデルとしてprebuilt-layoutを設定
    gemmaModelPath: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ドキュメント処理フックを使用
  const { isProcessing, result, processDocument } = useDocumentProcessing();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile) {
      // PDFまたは画像ファイルのプレビュー処理
      if (selectedFile.type === 'application/pdf') {
        setPreview('/pdf-icon.png'); // PDFアイコンを表示（後で作成）
      } else if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      }
    } else {
      setPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/'))) {
      setFile(droppedFile);
      
      if (droppedFile.type === 'application/pdf') {
        setPreview('/pdf-icon.png'); // PDFアイコンを表示
      } else if (droppedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreview(event.target?.result as string);
        };
        reader.readAsDataURL(droppedFile);
      }
      
      // ファイル入力の値を更新
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setApiKeys(prev => ({
      ...prev,
      [id === 'azure-api-key' ? 'azureApiKey' : 
       id === 'azure-endpoint' ? 'azureEndpoint' : 
       id === 'azure-model-id' ? 'modelId' : 'gemmaModelPath']: value
    }));
  };

  const handleProcessFile = async () => {
    if (!file || !apiKeys.azureApiKey || !apiKeys.azureEndpoint) {
      alert('ファイルとAzure APIキー、エンドポイントを設定してください');
      return;
    }
    
    // ドキュメント処理フックを使用してファイルを処理
    await processDocument(
      file,
      apiKeys.azureApiKey,
      apiKeys.azureEndpoint,
      apiKeys.modelId,
      apiKeys.gemmaModelPath || undefined
    );
  };

  // 結果をクリップボードにコピーする関数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('クリップボードにコピーしました');
      })
      .catch(err => {
        console.error('コピーに失敗しました:', err);
        alert('コピーに失敗しました');
      });
  };

  // APIキーをローカルストレージに保存
  useEffect(() => {
    // ページロード時にローカルストレージから読み込み
    if (typeof window !== 'undefined') {
      const savedApiKey = localStorage.getItem('azureApiKey');
      const savedEndpoint = localStorage.getItem('azureEndpoint');
      const savedModelId = localStorage.getItem('azureModelId');
      const savedGemmaPath = localStorage.getItem('gemmaModelPath');
      
      if (savedApiKey) setApiKeys(prev => ({ ...prev, azureApiKey: savedApiKey }));
      if (savedEndpoint) setApiKeys(prev => ({ ...prev, azureEndpoint: savedEndpoint }));
      if (savedModelId) setApiKeys(prev => ({ ...prev, modelId: savedModelId }));
      if (savedGemmaPath) setApiKeys(prev => ({ ...prev, gemmaModelPath: savedGemmaPath }));
    }
  }, []);
  
  // APIキーが変更されたらローカルストレージに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (apiKeys.azureApiKey) localStorage.setItem('azureApiKey', apiKeys.azureApiKey);
      if (apiKeys.azureEndpoint) localStorage.setItem('azureEndpoint', apiKeys.azureEndpoint);
      if (apiKeys.modelId) localStorage.setItem('azureModelId', apiKeys.modelId);
      if (apiKeys.gemmaModelPath) localStorage.setItem('gemmaModelPath', apiKeys.gemmaModelPath);
    }
  }, [apiKeys]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            問診票OCR処理アプリ
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            PDFまたはJPEG形式の問診票をアップロードして、OCR処理と整形を行います
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              問診票のアップロード
            </h2>
            
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="flex flex-col items-center">
                  {file?.type === 'application/pdf' ? (
                    <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="mb-4 max-w-xs">
                      <Image 
                        src={preview} 
                        alt="プレビュー" 
                        className="max-h-48 rounded-lg mx-auto" 
                        width={192}
                        height={192}
                      />
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300">{file?.name}</p>
                  <button 
                    className="mt-4 text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    ファイルを削除
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                    クリックまたはドラッグ＆ドロップでファイルをアップロード
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PDFまたはJPEG形式のファイルに対応しています
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleProcessFile}
                disabled={!file || isProcessing || !apiKeys.azureApiKey || !apiKeys.azureEndpoint}
                className={`px-6 py-2 rounded-md font-medium text-white ${
                  !file || isProcessing || !apiKeys.azureApiKey || !apiKeys.azureEndpoint
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition-colors`}
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </span>
                ) : (
                  'OCR処理を開始'
                )}
              </button>
            </div>
          </div>
          
          {/* OCR結果表示エリア */}
          {result && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                OCR処理結果
              </h2>
              
              {result.error ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
                  <p className="font-medium">エラーが発生しました</p>
                  <p className="text-sm mt-1">{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.content && (
                    <div>
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                        抽出されたテキスト
                      </h3>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md max-h-60 overflow-y-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {result.content}
                        </pre>
                      </div>
                      <button
                        onClick={() => result.content && copyToClipboard(result.content)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        テキストをコピー
                      </button>
                    </div>
                  )}
                  
                  {result.formattedContent && (
                    <div>
                      <h3 className="text-md font-medium text-gray-700 dark:text-gray-300 mb-2">
                        整形されたテキスト（カルテ用）
                      </h3>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md max-h-60 overflow-y-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {result.formattedContent}
                        </pre>
                      </div>
                      <button
                        onClick={() => result.formattedContent && copyToClipboard(result.formattedContent)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        整形テキストをコピー
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              APIキー設定
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="azure-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Azure Document Intelligence APIキー <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="azure-api-key"
                  value={apiKeys.azureApiKey}
                  onChange={handleInputChange}
                  placeholder="APIキーを入力"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="azure-endpoint" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Azure Document Intelligence エンドポイント <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="azure-endpoint"
                  value={apiKeys.azureEndpoint}
                  onChange={handleInputChange}
                  placeholder="https://your-resource.cognitiveservices.azure.com/"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="azure-model-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Azure Document Intelligence モデルID
                </label>
                <input
                  type="text"
                  id="azure-model-id"
                  value={apiKeys.modelId}
                  onChange={handleInputChange}
                  placeholder="カスタムモデルIDまたはprebuilt-layout"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  デフォルト: prebuilt-layout（空の場合はこのモデルが使用されます）
                </p>
              </div>
              <div>
                <label htmlFor="gemma-model-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gemma LLMモデルパス
                </label>
                <input
                  type="text"
                  id="gemma-model-path"
                  value={apiKeys.gemmaModelPath}
                  onChange={handleInputChange}
                  placeholder="ローカルGemmaモデルのパス"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
