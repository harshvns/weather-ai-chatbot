import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const THEME_PROMPTS: Record<string, string> = {
  travel: '旅行に関する提案をしてください。天気に基づいて、どこに行くべきか、何をすべきか、どのような服装が適切かを日本語で提案してください。',
  fashion: 'ファッションに関する提案をしてください。天気に基づいて、どのような服装が適切か、どのようなアイテムを持っていくべきかを日本語で提案してください。',
  sports: 'スポーツに関する提案をしてください。天気に基づいて、どのようなスポーツ活動が適切か、どのような準備が必要かを日本語で提案してください。',
  agriculture: '農業に関する提案をしてください。天気に基づいて、どのような農作業が適切か、どのような注意が必要かを日本語で提案してください。',
  general: '天気に基づいた一般的な提案を日本語でしてください。',
}

interface StructuredResponse {
  title: string
  summary: string
  mainContent: string
  suggestions: string[]
  tips?: string[]
  formattedText: string
}

export async function POST(request: NextRequest) {
  try {
    const { userMessage, weatherData, theme } = await request.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.error('GEMINI_API_KEY is not set or is placeholder')
      return NextResponse.json(
        { 
          error: 'API key not configured', 
          details: 'Please set GEMINI_API_KEY in your .env file',
          response: {
            title: '設定エラー',
            summary: 'APIキーが設定されていません',
            mainContent: '申し訳ございませんが、APIキーが正しく設定されていません。.envファイルにGEMINI_API_KEYを設定してください。',
            suggestions: [],
            formattedText: '**設定エラー**\n\nAPIキーが正しく設定されていません。.envファイルにGEMINI_API_KEYを設定してください。'
          }
        },
        { status: 500 }
      )
    }

    // Validate API key format (should start with AIza)
    if (!apiKey.startsWith('AIza')) {
      console.error('Invalid API key format')
      return NextResponse.json(
        { 
          error: 'Invalid API key format',
          details: 'API key should start with AIza',
          response: {
            title: 'APIキーエラー',
            summary: 'APIキーの形式が正しくありません',
            mainContent: 'APIキーの形式が正しくありません。正しいAPIキーを設定してください。',
            suggestions: [],
            formattedText: '**APIキーエラー**\n\nAPIキーの形式が正しくありません。正しいAPIキーを設定してください。'
          }
        },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const systemInstruction = `あなたは親切で専門的な日本語の天気アシスタントです。天気情報に基づいて、ユーザーに実用的で具体的な提案を提供します。回答は常に構造化されたJSON形式で返してください。`

    const themePrompt = THEME_PROMPTS[theme] || THEME_PROMPTS.general

    const weatherInfo = `
現在の天気情報:
- 場所: ${weatherData.location}
- 気温: ${weatherData.temperature}°C
- 天気: ${weatherData.description}
- 湿度: ${weatherData.humidity}%
- 風速: ${weatherData.windSpeed} m/s
${weatherData.mock ? '(注: これはモックデータです)' : ''}

**重要**: 上記の天気情報は、ユーザーが質問した場所（または現在地）の実際の天気データです。必ずこの天気情報を使用して回答してください。この天気情報が提供されているということは、その場所のデータが取得できていることを意味します。データがないと言ってはいけません。
`

    const prompt = `
${systemInstruction}

${weatherInfo}

テーマ: ${theme}
${themePrompt}

ユーザーの質問: ${userMessage}

上記の天気情報とテーマに基づいて、ユーザーの質問に対して親切で実用的な回答を提供してください。

**絶対に守ってください（重要）**:
1. 上記の天気情報は実際のデータです。必ずこのデータを使用してください。
2. 「データがない」「情報が手元にない」などと言ってはいけません。
3. 提供された天気情報の場所名（${weatherData.location}）をそのまま使用してください。
4. ユーザーが質問した場所の天気情報として、上記のデータを提示してください。
5. 上記の天気情報が提供されているということは、その場所のデータが正常に取得できていることを意味します。

**重要**: 回答は必ず以下のJSON形式で返してください。JSON以外のテキストは含めないでください。

{
  "title": "回答のタイトル（簡潔に）",
  "summary": "回答の要約（1-2文）",
  "mainContent": "メインの回答内容（段落形式、\\nで改行）",
  "suggestions": ["提案1", "提案2", "提案3"],
  "tips": ["ヒント1", "ヒント2"],
  "formattedText": "表示用のフォーマット済みテキスト（マークダウン形式、見出し、リスト、強調など適切に使用）"
}

formattedTextでは、以下のマークダウン記法を使用できます：
- **太字** で重要なポイントを強調
- *斜体* で補足情報
- ## 見出し でセクション分け
- - リスト項目 で箇条書き
- 1. 番号付きリスト で順序立てた提案

JSON形式で返答してください。
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Try to parse JSON from the response
    let structuredResponse: StructuredResponse
    try {
      // Extract JSON from the response (handle cases where there might be markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      // Fallback to simple response if JSON parsing fails
      console.error('JSON parsing error:', parseError)
      structuredResponse = {
        title: '回答',
        summary: text.substring(0, 100) + '...',
        mainContent: text,
        suggestions: [],
        formattedText: text,
      }
    }

    return NextResponse.json({ 
      response: structuredResponse,
      raw: text 
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    
    // Handle specific API key errors
    if (error?.message?.includes('API Key') || error?.message?.includes('API_KEY_INVALID')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key',
          details: 'The Gemini API key is invalid or expired. Please check your .env file.',
          response: {
            title: 'APIキーエラー',
            summary: 'APIキーが無効または期限切れです',
            mainContent: '申し訳ございませんが、APIキーが無効または期限切れのようです。.envファイルのGEMINI_API_KEYを確認し、有効なAPIキーを設定してください。\n\n新しいAPIキーは https://makersuite.google.com/app/apikey で取得できます。',
            suggestions: [
              '.envファイルを確認してください',
              '新しいAPIキーを取得してください',
              'サーバーを再起動してください'
            ],
            formattedText: '**APIキーエラー**\n\nAPIキーが無効または期限切れのようです。.envファイルのGEMINI_API_KEYを確認し、有効なAPIキーを設定してください。\n\n新しいAPIキーは [Google AI Studio](https://makersuite.google.com/app/apikey) で取得できます。'
          }
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to generate response', 
        details: error instanceof Error ? error.message : 'Unknown error',
        response: {
          title: 'エラー',
          summary: '応答の生成に失敗しました',
          mainContent: '申し訳ございませんが、応答を生成できませんでした。もう一度お試しください。',
          suggestions: [],
          formattedText: '**エラー**\n\n応答の生成に失敗しました。もう一度お試しください。'
        }
      },
      { status: 500 }
    )
  }
}

