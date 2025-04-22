import { NextRequest, NextResponse } from 'next/server';
import { 
  validateFileType, 
  normalizeAzureEndpoint, 
  validateApiKey, 
  extractStructuredData, 
  humanizeErrorMessage, 
  extractAzureErrorInfo 
} from '../azure-utils';

// Azure Document Intelligence APIを呼び出す関数
async function analyzeDocument(fileBase64: string, fileName: string, fileType: string, apiKey: string, endpoint: string, modelId: string) {
  try {
    // 入力の検証
    if (!validateFileType(fileType)) {
      throw new Error('サポートされていないファイル形式です');
    }
    
    if (!validateApiKey(apiKey)) {
      throw new Error('無効なAPIキーです');
    }
    
    // モデルIDの検証
    if (!modelId || modelId.trim() === '') {
      modelId = 'prebuilt-layout'; // デフォルトモデルとしてprebuilt-layoutを使用
    }
    
    // エンドポイントの正規化
    const baseEndpoint = normalizeAzureEndpoint(endpoint);
    const apiUrl = `${baseEndpoint}/documentintelligence/documentModels/${modelId}:analyze?api-version=2023-07-31`;

    // Azure Document Intelligence APIにリクエスト
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      body: JSON.stringify({
        base64Source: fileBase64
      }),
    });

    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {
        // JSONでない場合はスキップ
      }
      
      const errorMessage = extractAzureErrorInfo(response, errorBody as Record<string, unknown>);
      throw new Error(errorMessage);
    }

    // 非同期操作の結果を取得するためのURLを取得
    await response.json();
    const operationLocation = response.headers.get('Operation-Location');
    
    if (!operationLocation) {
      throw new Error('Operation-Locationヘッダーが見つかりません');
    }

    // 結果が準備できるまで待機
    let analysisResult = null;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 結果を取得
      const statusResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });
      
      if (!statusResponse.ok) {
        let errorBody = {};
        try {
          errorBody = await statusResponse.json();
        } catch {
          // JSONでない場合はスキップ
        }
        
        const errorMessage = extractAzureErrorInfo(statusResponse, errorBody as Record<string, unknown>);
        throw new Error(errorMessage);
      }
      
      const statusResult = await statusResponse.json();
      
      if (statusResult.status === 'succeeded') {
        analysisResult = statusResult;
        break;
      } else if (statusResult.status === 'failed') {
        throw new Error(`分析に失敗しました: ${JSON.stringify(statusResult.errors)}`);
      }
      
      // まだ処理中の場合は続行
    }
    
    if (!analysisResult) {
      throw new Error('タイムアウト: ドキュメント分析の完了を待機できませんでした');
    }
    
    // 結果からテキストを抽出
    const extractedText = extractTextFromAnalysisResult(analysisResult);
    
    // 構造化データも抽出（将来の拡張用）
    const structuredData = extractStructuredData(analysisResult);
    
    return {
      success: true,
      content: extractedText,
      structuredData: structuredData,
    };
  } catch (error) {
    console.error('Azure Document Intelligence APIエラー:', error);
    return {
      success: false,
      error: humanizeErrorMessage(error),
    };
  }
}

// 分析結果からテキストを抽出する関数
function extractTextFromAnalysisResult(result: Record<string, unknown>): string {
  try {
    // ページごとのテキストを抽出
    const analyzeResult = result.analyzeResult as Record<string, unknown> | undefined;
    const pages = (analyzeResult?.pages || []) as Array<Record<string, unknown>>;
    let extractedText = '';
    
    for (const page of pages) {
      const pageNumber = page.pageNumber;
      extractedText += `===== ページ ${pageNumber} =====\n\n`;
      
      // ページ内の行を抽出
      const lines = (page.lines || []) as Array<Record<string, unknown>>;
      for (const line of lines) {
        extractedText += `${line.content}\n`;
      }
      
      extractedText += '\n';
    }
    
    // テーブルがある場合は抽出
    const tables = (analyzeResult?.tables || []) as Array<Record<string, unknown>>;
    if (tables.length > 0) {
      extractedText += '===== テーブル =====\n\n';
      
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        extractedText += `テーブル ${i + 1}:\n`;
        
        // テーブルの行と列を処理
        const cells = (table.cells || []) as Array<Record<string, unknown>>;
        const rowCount = table.rowCount as number || 0;
        const columnCount = table.columnCount as number || 0;
        
        // 2次元配列としてテーブルを再構築
        const tableData: string[][] = Array(rowCount).fill(null).map(() => Array(columnCount).fill(''));
        
        for (const cell of cells) {
          const rowIndex = cell.rowIndex as number;
          const columnIndex = cell.columnIndex as number;
          tableData[rowIndex][columnIndex] = cell.content as string || '';
        }
        
        // テーブルデータを文字列に変換
        for (const row of tableData) {
          extractedText += row.join(' | ') + '\n';
        }
        
        extractedText += '\n';
      }
    }
    
    // キーと値のペアがある場合は抽出
    const keyValuePairs = (analyzeResult?.keyValuePairs || []) as Array<Record<string, unknown>>;
    if (keyValuePairs.length > 0) {
      extractedText += '===== フォームフィールド =====\n\n';
      
      for (const pair of keyValuePairs) {
        const key = ((pair.key as Record<string, unknown>)?.content as string) || '不明なフィールド';
        const value = ((pair.value as Record<string, unknown>)?.content as string) || '';
        extractedText += `${key}: ${value}\n`;
      }
      
      extractedText += '\n';
    }
    
    return extractedText.trim();
  } catch (error) {
    console.error('テキスト抽出エラー:', error);
    return '結果からテキストを抽出できませんでした';
  }
}

// Gemma LLMを使用してテキストを整形する関数（モックバージョン）
// 実際の実装では、ローカルのGemma LLMを呼び出す処理を実装
function formatTextWithGemma(text: string): string {
  // 現時点ではモック実装
  // 実際の実装では、Node.jsからローカルのGemma LLMを呼び出す処理を実装
  
  // 問診票の内容を構造化
  const lines = text.split('\n');
  let formattedText = '【問診票情報】\n';
  
  // 簡易的な整形処理（実際にはGemma LLMで行う）
  const currentSection = '';
  
  for (const line of lines) {
    // ページ区切りは無視
    if (line.startsWith('===== ページ') || line.startsWith('===== テーブル') || line.startsWith('===== フォームフィールド') || line.trim() === '') {
      continue;
    }
    
    // セクション見出しっぽい行を検出
    if (line.includes('：') || line.includes(':')) {
      const parts = line.split(/[：:]/);
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        
        // キーが存在し、値も存在する場合
        if (key && value) {
          formattedText += `・${key}: ${value}\n`;
          continue;
        }
      }
    }
    
    // その他の行はそのまま追加
    if (line.trim()) {
      formattedText += `${line}\n`;
    }
  }
  
  // カルテ用のフォーマットに整形
  formattedText += '\n【カルテ用メモ】\n';
  formattedText += '上記問診票の内容から、以下の点に注意して診察を行うこと。\n';
  formattedText += '※このセクションは実際のGemma LLMによる生成で置き換えられます。\n';
  
  return formattedText;
}

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { 
      fileBase64, 
      fileName, 
      fileType, 
      azureApiKey, 
      azureEndpoint,
      modelId,
      gemmaModelPath
    } = body;
    
    // 必須パラメータの検証
    if (!fileBase64 || !fileName || !fileType) {
      return NextResponse.json(
        { error: 'ファイル情報が不足しています' },
        { status: 400 }
      );
    }
    
    if (!azureApiKey || !azureEndpoint) {
      return NextResponse.json(
        { error: 'Azure APIキーとエンドポイントが必要です' },
        { status: 400 }
      );
    }
    
    // Azure Document Intelligence APIを呼び出し
    const analysisResult = await analyzeDocument(
      fileBase64,
      fileName,
      fileType,
      azureApiKey,
      azureEndpoint,
      modelId || 'prebuilt-layout' // デフォルトモデルとしてprebuilt-layoutを使用
    );
    
    if (!analysisResult.success) {
      return NextResponse.json(
        { error: analysisResult.error },
        { status: 500 }
      );
    }
    
    // 抽出されたテキストを取得
    const extractedText = analysisResult.content;
    
    // Gemma LLMでテキストを整形（モデルパスが指定されている場合）
    let formattedContent = null;
    if (gemmaModelPath && extractedText) {
      formattedContent = formatTextWithGemma(extractedText);
    }
    
    // 結果を返す
    return NextResponse.json({
      content: extractedText,
      formattedContent: formattedContent,
    });
  } catch (error) {
    console.error('APIエラー:', error);
    return NextResponse.json(
      { error: humanizeErrorMessage(error) },
      { status: 500 }
    );
  }
}
