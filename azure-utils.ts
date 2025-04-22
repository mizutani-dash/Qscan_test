// Azure Document Intelligence APIとの統合を強化するためのユーティリティ関数

// ファイルタイプの検証
export function validateFileType(fileType: string): boolean {
  const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  return supportedTypes.includes(fileType);
}

// Azure APIエンドポイントの検証と正規化
export function normalizeAzureEndpoint(endpoint: string): string {
  if (!endpoint) {
    throw new Error('Azure エンドポイントが指定されていません');
  }
  
  // URLの形式を検証
  try {
    const url = new URL(endpoint);
    if (!url.hostname.includes('cognitiveservices.azure.com')) {
      console.warn('エンドポイントが標準的なAzure Cognitive Servicesのドメインではありません');
    }
    
    // 末尾のスラッシュを削除
    const normalizedEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    return normalizedEndpoint;
  } catch {
    throw new Error('無効なAzureエンドポイントURLです');
  }
}

// APIキーの検証
export function validateApiKey(apiKey: string): boolean {
  if (!apiKey) {
    return false;
  }
  
  // 一般的なAzure APIキーの形式を検証（32文字の16進数）
  const apiKeyRegex = /^[0-9a-fA-F]{32}$/;
  return apiKeyRegex.test(apiKey);
}

// 分析結果からより構造化されたデータを抽出する拡張関数
export function extractStructuredData(analysisResult: Record<string, unknown>): Record<string, unknown> | null {
  try {
    const result: Record<string, unknown> = {
      pages: [],
      tables: [],
      keyValuePairs: [],
    };
    
    // ページデータの抽出
    const analyzeResult = analysisResult.analyzeResult as Record<string, unknown> | undefined;
    const pages = (analyzeResult?.pages || []) as Array<Record<string, unknown>>;
    
    for (const page of pages) {
      const pageData = {
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        unit: page.unit,
        lines: (page.lines as Array<Record<string, unknown>> || []).map((line) => ({
          content: line.content,
          boundingBox: line.boundingBox,
        })),
      };
      (result.pages as Array<Record<string, unknown>>).push(pageData);
    }
    
    // テーブルデータの抽出
    const tables = (analyzeResult?.tables || []) as Array<Record<string, unknown>>;
    for (const table of tables) {
      const tableData: Record<string, unknown> = {
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        cells: [],
      };
      
      // セルデータの抽出
      for (const cell of (table.cells as Array<Record<string, unknown>> || [])) {
        (tableData.cells as Array<Record<string, unknown>>).push({
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          rowSpan: cell.rowSpan || 1,
          columnSpan: cell.columnSpan || 1,
          content: cell.content,
          boundingBox: cell.boundingBox,
        });
      }
      
      (result.tables as Array<Record<string, unknown>>).push(tableData);
    }
    
    // キーと値のペアの抽出
    const keyValuePairs = (analyzeResult?.keyValuePairs || []) as Array<Record<string, unknown>>;
    for (const pair of keyValuePairs) {
      (result.keyValuePairs as Array<Record<string, unknown>>).push({
        key: (pair.key as Record<string, unknown>)?.content || '',
        value: (pair.value as Record<string, unknown>)?.content || '',
      });
    }
    
    return result;
  } catch {
    console.error('構造化データ抽出エラーが発生しました');
    return null;
  }
}

// エラーメッセージを人間が理解しやすい形式に変換
export function humanizeErrorMessage(errorObj: unknown): string {
  if (!errorObj) {
    return '不明なエラーが発生しました';
  }
  
  if (typeof errorObj === 'string') {
    return errorObj;
  }
  
  if (errorObj instanceof Error) {
    return errorObj.message;
  }
  
  if (typeof errorObj === 'object' && errorObj !== null && 'message' in errorObj) {
    return String((errorObj as Record<string, unknown>).message);
  }
  
  return JSON.stringify(errorObj);
}

// Azure APIのレスポンスからエラー情報を抽出
export function extractAzureErrorInfo(response: Response, responseBody: Record<string, unknown>): string {
  try {
    if (response.status === 401) {
      return 'Azure APIの認証に失敗しました。APIキーを確認してください。';
    }
    
    if (response.status === 403) {
      return 'Azure APIへのアクセスが拒否されました。APIキーの権限を確認してください。';
    }
    
    if (response.status === 404) {
      return 'Azure APIのエンドポイントが見つかりません。エンドポイントURLを確認してください。';
    }
    
    if (response.status === 429) {
      return 'Azure APIのレート制限を超えました。しばらく待ってから再試行してください。';
    }
    
    if (responseBody && responseBody.error) {
      const error = responseBody.error as Record<string, unknown> | string;
      
      if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
        return `Azure APIエラー (${error.code}): ${error.message}`;
      }
      
      if (typeof error === 'string') {
        return `Azure APIエラー: ${error}`;
      }
      
      return `Azure APIエラー: ${JSON.stringify(error)}`;
    }
    
    return `Azure APIエラー (${response.status}): ${response.statusText}`;
  } catch {
    return `Azure APIエラー (${response.status})`;
  }
}
