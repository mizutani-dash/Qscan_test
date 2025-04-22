import { useState } from 'react';
import { useGemma } from '../lib/gemma';

// APIルートとGemma LLMを統合するためのカスタムフック
export function useDocumentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    content?: string;
    formattedContent?: string;
    error?: string;
  } | null>(null);
  
  const { isLoading: isGemmaLoading, processText } = useGemma();
  
  // ファイルをBase64エンコードする関数
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (typeof reader.result === 'string') {
          // data:application/pdf;base64, などのプレフィックスを削除
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('ファイルの読み込みに失敗しました'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };
  
  // ドキュメント処理関数
  const processDocument = async (
    file: File,
    azureApiKey: string,
    azureEndpoint: string,
    modelId: string,
    gemmaModelPath?: string
  ) => {
    try {
      setIsProcessing(true);
      setResult(null);
      
      // ファイルをBase64エンコード
      const fileBase64 = await fileToBase64(file);
      
      // Azure Document Intelligence APIにリクエスト
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64,
          fileName: file.name,
          fileType: file.type,
          azureApiKey,
          azureEndpoint,
          modelId,
          gemmaModelPath
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `APIエラー: ${response.status}`);
      }
      
      const apiResult = await response.json();
      
      // APIから返されたテキストがある場合
      if (apiResult.content) {
        let formattedContent = apiResult.formattedContent;
        
        // APIからフォーマット済みテキストが返されなかった場合、
        // かつGemmaモデルパスが指定されている場合は、
        // クライアント側でGemma LLMを使用して整形
        if (!formattedContent && gemmaModelPath) {
          formattedContent = await processText(apiResult.content, {
            modelPath: gemmaModelPath,
            temperature: 0.2,
            maxTokens: 1000
          });
        }
        
        setResult({
          content: apiResult.content,
          formattedContent: formattedContent || undefined
        });
      } else {
        throw new Error('テキストの抽出に失敗しました');
      }
    } catch (error) {
      console.error('ドキュメント処理エラー:', error);
      setResult({
        error: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    isProcessing: isProcessing || isGemmaLoading,
    result,
    processDocument
  };
}
