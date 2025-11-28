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
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set')
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
`

    const prompt = `
${systemInstruction}

${weatherInfo}

テーマ: ${theme}
${themePrompt}

ユーザーの質問: ${userMessage}

上記の天気情報とテーマに基づいて、ユーザーの質問に対して親切で実用的な回答を提供してください。

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
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate response', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

