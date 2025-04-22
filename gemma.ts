'use client';

import { useState } from 'react';

// Gemma LLMとの統合のためのインターフェース
interface GemmaConfig {
  modelPath: string;
  temperature?: number;
  maxTokens?: number;
}

// Gemma LLMを使用してテキスト処理を行う関数
// 実際の実装では、WebAssemblyやWebWorkerを使用してブラウザ内でGemmaを実行
export async function processWithGemma(
  text: string, 
  config: GemmaConfig, 
  prompt?: string
): Promise<string> {
  try {
    // 現時点ではモック実装
    // 実際の実装では、WebAssemblyやWebWorkerを使用してブラウザ内でGemmaを実行
    
    // デフォルトのプロンプト
    const defaultPrompt = `
あなたは医療アシスタントです。以下の問診票から抽出されたテキストを分析し、
医師がカルテに記載するための整形された形式に変換してください。
重要な医療情報を抽出し、構造化された形式で提示してください。

抽出テキスト:
${text}

以下の形式で出力してください:
【基本情報】
・氏名: (患者名)
・年齢: (年齢)
・性別: (性別)

【主訴・症状】
(主訴や症状の箇条書き)

【既往歴】
(既往歴の箇条書き)

【現病歴】
(現病歴の要約)

【服薬情報】
(服薬情報の箇条書き)

【アレルギー】
(アレルギー情報)

【診察メモ】
(問診票から読み取れる重要ポイントや注意点)
`;

    // 実際の処理では使用するが、現在のモック実装では使用しない
    const _finalPrompt = prompt || defaultPrompt;
    
    // 問診票の内容を構造化
    const lines = text.split('\n');
    let formattedText = '【基本情報】\n';
    
    // 名前、年齢、性別を抽出
    let name = '不明';
    let age = '不明';
    let gender = '不明';
    
    // 簡易的なパターンマッチング
    for (const line of lines) {
      if (line.match(/氏名|名前|患者名/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) name = match[1].trim();
      }
      else if (line.match(/年齢/i)) {
        const match = line.match(/[：:]\s*(\d+)/);
        if (match && match[1]) age = `${match[1]}歳`;
      }
      else if (line.match(/性別/i)) {
        if (line.includes('男')) gender = '男性';
        else if (line.includes('女')) gender = '女性';
      }
    }
    
    formattedText += `・氏名: ${name}\n`;
    formattedText += `・年齢: ${age}\n`;
    formattedText += `・性別: ${gender}\n\n`;
    
    // 主訴・症状を抽出
    formattedText += '【主訴・症状】\n';
    let foundSymptoms = false;
    
    for (const line of lines) {
      if (line.match(/症状|主訴|訴え|痛み|不調/i) && !line.match(/既往歴|病歴/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) {
          formattedText += `・${match[1].trim()}\n`;
          foundSymptoms = true;
        }
      }
    }
    
    if (!foundSymptoms) {
      formattedText += '特記事項なし\n';
    }
    
    // 既往歴を抽出
    formattedText += '\n【既往歴】\n';
    let foundHistory = false;
    
    for (const line of lines) {
      if (line.match(/既往歴|病歴|過去の病気/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) {
          const history = match[1].trim();
          if (history && !history.match(/なし|無し|特になし/i)) {
            formattedText += `・${history}\n`;
            foundHistory = true;
          }
        }
      }
    }
    
    if (!foundHistory) {
      formattedText += '特記事項なし\n';
    }
    
    // 現病歴（簡易的な抽出）
    formattedText += '\n【現病歴】\n';
    let currentIllness = '情報なし';
    
    for (const line of lines) {
      if (line.match(/現病歴|現在の状態|現在の症状/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) currentIllness = match[1].trim();
      }
    }
    
    formattedText += `${currentIllness}\n`;
    
    // 服薬情報を抽出
    formattedText += '\n【服薬情報】\n';
    let foundMedication = false;
    
    for (const line of lines) {
      if (line.match(/薬|服薬|内服|処方/i) && !line.match(/アレルギー/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) {
          const medication = match[1].trim();
          if (medication && !medication.match(/なし|無し|特になし/i)) {
            formattedText += `・${medication}\n`;
            foundMedication = true;
          }
        }
      }
    }
    
    if (!foundMedication) {
      formattedText += '特記事項なし\n';
    }
    
    // アレルギー情報を抽出
    formattedText += '\n【アレルギー】\n';
    let foundAllergy = false;
    
    for (const line of lines) {
      if (line.match(/アレルギー|過敏症/i)) {
        const match = line.match(/[：:]\s*(.+)/);
        if (match && match[1]) {
          const allergy = match[1].trim();
          if (allergy && !allergy.match(/なし|無し|特になし/i)) {
            formattedText += `・${allergy}\n`;
            foundAllergy = true;
          }
        }
      }
    }
    
    if (!foundAllergy) {
      formattedText += '特記事項なし\n';
    }
    
    // 診察メモ
    formattedText += '\n【診察メモ】\n';
    formattedText += '問診票の内容から、以下の点に注意して診察を行うことが推奨されます：\n';
    
    // 簡易的なメモ生成（実際にはGemma LLMで生成）
    if (gender === '女性' && parseInt(age) > 40) {
      formattedText += '・40代以上の女性のため、婦人科系の検査も考慮\n';
    }
    
    if (foundSymptoms) {
      formattedText += '・訴えられている症状の詳細な確認が必要\n';
    }
    
    if (foundHistory) {
      formattedText += '・既往歴に関連する現在の症状との関連性を確認\n';
    }
    
    if (foundMedication) {
      formattedText += '・現在の服薬状況と薬剤の相互作用の確認\n';
    }
    
    if (foundAllergy) {
      formattedText += '・アレルギー情報に基づく処方時の注意\n';
    }
    
    formattedText += '\n※この診察メモは問診票の情報のみに基づいており、実際の診察で詳細な確認が必要です。';
    
    // 実際の実装では、ここでGemma LLMの処理結果を返す
    return formattedText;
  } catch (error) {
    console.error('Gemma LLM処理エラー:', error);
    return `Gemma LLM処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Gemma LLMの状態管理用フック
export function useGemma() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Gemma LLMのロード処理（モック）
  const loadGemma = async (modelPath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 実際の実装では、ここでWebAssemblyモデルをロード
      // 現時点ではモック実装のため、単に遅延を追加
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsLoaded(true);
      return true;
    } catch (err) {
      setError(`Gemma LLMのロードに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gemma LLMを使用してテキスト処理
  const processText = async (text: string, config: GemmaConfig, prompt?: string) => {
    if (!isLoaded && !config.modelPath) {
      setError('Gemma LLMがロードされていません');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // モデルがロードされていない場合はロード
      if (!isLoaded) {
        const loaded = await loadGemma(config.modelPath);
        if (!loaded) {
          throw new Error('Gemma LLMのロードに失敗しました');
        }
      }
      
      // テキスト処理
      const result = await processWithGemma(text, config, prompt);
      return result;
    } catch (err) {
      const errorMessage = `テキスト処理に失敗しました: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      return errorMessage;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoaded,
    isLoading,
    error,
    loadGemma,
    processText
  };
}
