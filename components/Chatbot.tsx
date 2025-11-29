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
    // Set default location immediately
    setLocation('35.6762,139.6503') // Tokyo as default
    
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`${position.coords.latitude},${position.coords.longitude}`)
        },
        (error) => {
          console.error('Error getting location:', error)
          // Keep default Tokyo location
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      )
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
      // Extract location from user message if mentioned, otherwise use current location
      const locationToUse = extractLocationFromMessage(text) || location || '35.6762,139.6503'
      
      // Get weather data
      const weatherResponse = await fetch('/api/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationToUse }),
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

  const extractLocationFromMessage = (message: string): string | null => {
    // Common Japanese city names
    const cityMap: Record<string, string> = {
      '東京': 'Tokyo',
      'とうきょう': 'Tokyo',
      'tokyo': 'Tokyo',
      '大阪': 'Osaka',
      'おおさか': 'Osaka',
      'osaka': 'Osaka',
      '京都': 'Kyoto',
      'きょうと': 'Kyoto',
      'kyoto': 'Kyoto',
      '横浜': 'Yokohama',
      'よこはま': 'Yokohama',
      'yokohama': 'Yokohama',
      '名古屋': 'Nagoya',
      'なごや': 'Nagoya',
      'nagoya': 'Nagoya',
      '福岡': 'Fukuoka',
      'ふくおか': 'fukuoka',
      'fukuoka': 'Fukuoka',
      '札幌': 'Sapporo',
      'さっぽろ': 'Sapporo',
      'sapporo': 'Sapporo',
      '仙台': 'Sendai',
      'せんだい': 'Sendai',
      'sendai': 'Sendai',
      '広島': 'Hiroshima',
      'ひろしま': 'Hiroshima',
      'hiroshima': 'Hiroshima',
    }

    const lowerMessage = message.toLowerCase()
    
    // Check for city names in the message
    for (const [key, city] of Object.entries(cityMap)) {
      if (lowerMessage.includes(key.toLowerCase()) || message.includes(key)) {
        return city
      }
    }

    return null
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

