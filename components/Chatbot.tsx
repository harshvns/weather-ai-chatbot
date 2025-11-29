'use client'

import { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

interface StructuredResponse {
  title: string
  summary: string
  mainContent: string
  suggestions: string[]
  tips?: string[]
  formattedText: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  structuredContent?: StructuredResponse
  timestamp: Date
}

interface ChatbotProps {
  selectedTheme: string
}

export default function Chatbot({ selectedTheme }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [location, setLocation] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`)
        },
        (error) => {
          console.error('Error getting location:', error)
          // Default to Tokyo if location access is denied
          setLocation('35.6762,139.6503')
        }
      )
    } else {
      // Default to Tokyo if geolocation is not supported
      setLocation('35.6762,139.6503')
    }
  }, [])

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('音声認識はお使いのブラウザでサポートされていません。')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.lang = 'ja-JP'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      handleUserMessage(transcript)
      setIsListening(false)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'no-speech') {
        alert('音声が検出されませんでした。もう一度お試しください。')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  // Extract city name from user message - works for any city worldwide (Japanese & English)
  const extractCityFromMessage = (message: string): string | null => {
    // Japanese city name mapping (for backward compatibility)
    const japaneseCityMap: Record<string, string> = {
      '東京': 'Tokyo',
      '大阪': 'Osaka',
      '京都': 'Kyoto',
      '横浜': 'Yokohama',
      '名古屋': 'Nagoya',
      '福岡': 'Fukuoka',
      '札幌': 'Sapporo',
      '神戸': 'Kobe',
      '仙台': 'Sendai',
      '広島': 'Hiroshima'
    }
    
    // First check for known Japanese city names
    for (const [japaneseName, englishName] of Object.entries(japaneseCityMap)) {
      if (message.includes(japaneseName)) {
        return englishName
      }
    }
    
    // Words to skip (not cities) - both English and Japanese
    const skipWords = new Set([
      'what', 'how', 'tell', 'give', 'show', 'current', 'today', 'tomorrow', 
      'weather', 'temperature', 'humidity', 'wind', 'the', 'this', 'that',
      'is', 'are', 'was', 'will', 'can', 'should', 'would', 'could',
      'please', 'thanks', 'thank', 'you', 'me', 'my', 'your', 'our',
      '天気', '気温', '湿度', '風', '今日', '明日', '現在', 'の', 'は', 'を', 'が'
    ])
    
    // Patterns for Japanese queries
    const japanesePatterns = [
      // "[City]の天気" or "[City]で" - Japanese city name before の or で
      /([^\sので、。！？\n]+?)(?:の天気|の|で|の気温|の湿度)/,
      // "天気[City]" or "天気は[City]"
      /(?:天気|気温|湿度)(?:は|が|を)?([^\s、。！？\n]+?)(?:の|で|は|が|を|$)/,
      // "[City]について" or "[City]に関して"
      /([^\sについてに関して、。！？\n]+?)(?:について|に関して)/
    ]
    
    // Try Japanese patterns first
    for (const pattern of japanesePatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        let potentialCity = match[1].trim()
        
        // Skip if it's a skip word
        if (skipWords.has(potentialCity) || skipWords.has(potentialCity.toLowerCase())) {
          continue
        }
        
        // Skip if too short
        if (potentialCity.length < 2) {
          continue
        }
        
        // If it's Japanese characters, return as-is (geocoding API can handle it)
        // If it's English, capitalize properly
        if (/^[A-Za-z\s]+$/.test(potentialCity)) {
          potentialCity = potentialCity.split(/\s+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
        }
        
        return potentialCity
      }
    }
    
    // Patterns for English queries (case insensitive)
    const englishPatterns = [
      // "in [City]" or "in [City], [Country]"
      /(?:in|at|for)\s+([A-Za-z][a-zA-Z\s]+?)(?:\s*,|\s+weather|$)/i,
      // "[City] weather" or "[City]'s weather"
      /([A-Za-z][a-zA-Z\s]+?)\s*(?:weather|'s\s+weather)/i,
      // "[City], [Country]"
      /([A-Za-z][a-zA-Z\s]+?),\s*[A-Za-z][a-zA-Z]+/i,
      // "weather in [City]"
      /weather\s+(?:in|at|for)\s+([A-Za-z][a-zA-Z\s]+?)(?:\s*,|$)/i,
      // "what's the weather in [City]"
      /(?:what|how|tell|show).*?(?:weather|temperature).*?(?:in|at|for)\s+([A-Za-z][a-zA-Z\s]+?)(?:\s*,|$)/i
    ]
    
    // Try English patterns
    for (const pattern of englishPatterns) {
      const match = message.match(pattern)
      if (match && match[1]) {
        let potentialCity = match[1].trim()
        
        // Remove country code if present
        potentialCity = potentialCity.split(',')[0].trim()
        
        // Capitalize properly
        potentialCity = potentialCity.split(/\s+/).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ')
        
        // Skip if it's a common word
        if (skipWords.has(potentialCity.toLowerCase())) {
          continue
        }
        
        // Skip if too short
        if (potentialCity.length < 2) {
          continue
        }
        
        // Skip if contains numbers
        if (/\d/.test(potentialCity) && !/^[IVXLCDM]+$/.test(potentialCity)) {
          continue
        }
        
        return potentialCity
      }
    }
    
    // Fallback: Extract any capitalized word sequence (for mixed language)
    const fallbackPattern = /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)|([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g
    const matches = Array.from(message.matchAll(fallbackPattern))
    
    for (const match of matches) {
      const potentialCity = (match[1] || match[2] || '').trim()
      
      if (potentialCity && 
          potentialCity.length >= 2 && 
          !skipWords.has(potentialCity.toLowerCase()) &&
          !skipWords.has(potentialCity)) {
        
        // Capitalize if English
        if (/^[A-Za-z\s]+$/.test(potentialCity)) {
          return potentialCity.split(/\s+/).map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
        }
        
        // Return as-is if Japanese/other scripts
        return potentialCity
      }
    }
    
    return null
  }

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsProcessing(true)

    try {
      // Extract city name from message, or use default location
      const extractedCity = extractCityFromMessage(text)
      const cityToUse = extractedCity || null
      
      // Get weather data
      const weatherResponse = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          location: extractedCity ? null : location, // Use coordinates only if no city extracted
          cityName: cityToUse 
        }),
      })

      const weatherData = await weatherResponse.json()

      // Get AI response
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          weatherData,
          theme: selectedTheme,
        }),
      })

      const aiData = await aiResponse.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: aiData.response?.formattedText || aiData.response?.mainContent || aiData.raw || '申し訳ございませんが、応答を生成できませんでした。',
        structuredContent: aiData.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTextSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.querySelector('input') as HTMLInputElement
    if (input.value.trim()) {
      handleUserMessage(input.value)
      input.value = ''
    }
  }

  const formatMarkdown = (text: string): string => {
    if (!text) return ''
    
    // Convert markdown to HTML
    let html = text
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br />')
      // Numbered lists (simple)
      .replace(/^\d+\.\s+(.*)$/gim, '<li>$1</li>')
      // Bullet points
      .replace(/^[-*]\s+(.*)$/gim, '<li>$1</li>')
    
    // Wrap consecutive <li> tags in <ul>
    html = html.replace(/(<li>.*?<\/li>\s*)+/g, '<ul>$&</ul>')
    
    return html
  }

  return (
    <div className="chatbot-container">

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>こんにちは！日本語で話しかけてください。</p>
            <p>Hello! Please speak in Japanese.</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.role === 'assistant' && message.structuredContent ? (
                <div className="structured-message">
                  {message.structuredContent.title && (
                    <h3 className="message-title">{message.structuredContent.title}</h3>
                  )}
                  {message.structuredContent.summary && (
                    <p className="message-summary">{message.structuredContent.summary}</p>
                  )}
                  <div 
                    className="formatted-content"
                    dangerouslySetInnerHTML={{ 
                      __html: formatMarkdown(message.structuredContent.formattedText || message.structuredContent.mainContent)
                    }}
                  />
                  {message.structuredContent.suggestions && message.structuredContent.suggestions.length > 0 && (
                    <div className="suggestions-list">
                      <h4 className="suggestions-title">💡 提案:</h4>
                      <ul>
                        {message.structuredContent.suggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {message.structuredContent.tips && message.structuredContent.tips.length > 0 && (
                    <div className="tips-list">
                      <h4 className="tips-title">✨ ヒント:</h4>
                      <ul>
                        {message.structuredContent.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="plain-content">{message.content}</div>
              )}
            </div>
            <div className="message-time">
              {message.timestamp.toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="message assistant-message">
            <div className="message-content">
              <span className="typing-indicator">考え中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <form onSubmit={handleTextSubmit} className="text-input-form">
          <input
            type="text"
            placeholder="メッセージを入力... (Type a message...)"
            className="text-input"
            disabled={isProcessing}
          />
          <button type="submit" className="send-button" disabled={isProcessing}>
            送信
          </button>
        </form>
        <div className="voice-controls">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`voice-button ${isListening ? 'listening' : ''}`}
            disabled={isProcessing}
          >
            {isListening ? '🛑 停止' : '🎤 音声入力'}
          </button>
        </div>
      </div>
    </div>
  )
}

