'use client'

import { useState, useEffect, useRef } from 'react'
import Chatbot from '@/components/Chatbot'
import './page.css'

const THEMES = [
  { value: 'travel', label: '旅行 (Travel)', icon: '✈️' },
  { value: 'fashion', label: 'ファッション (Fashion)', icon: '👗' },
  { value: 'sports', label: 'スポーツ (Sports)', icon: '⚽' },
  { value: 'agriculture', label: '農業 (Agriculture)', icon: '🌾' },
  { value: 'general', label: '一般 (General)', icon: '💬' },
]

export default function Home() {
  const [colorTheme, setColorTheme] = useState<'light' | 'dark'>('dark')
  const [selectedTheme, setSelectedTheme] = useState('general')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const themeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('colorTheme') as 'light' | 'dark' | null
    if (savedTheme) {
      setColorTheme(savedTheme)
      document.documentElement.setAttribute('data-theme', savedTheme)
    } else {
      // Default to dark theme
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  useEffect(() => {
    // Close theme menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false)
      }
    }

    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemeMenu])

  const toggleTheme = () => {
    const newTheme = colorTheme === 'dark' ? 'light' : 'dark'
    setColorTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('colorTheme', newTheme)
  }

  const handleThemeSelect = (themeValue: string) => {
    setSelectedTheme(themeValue)
    setShowThemeMenu(false)
  }

  const currentTheme = THEMES.find(t => t.value === selectedTheme) || THEMES[4]

  return (
    <main className="main-container">
      <div className="page-header">
        <button
          onClick={toggleTheme}
          className="theme-toggle-button-top"
          aria-label="Toggle theme"
          title={colorTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {colorTheme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="header-text">
          <h1 className="app-title">🌤️ Weather AI Chatbot</h1>
          <p className="app-subtitle">Japanese Voice-Enabled Weather Assistant</p>
        </div>
        <div className="theme-selector-wrapper" ref={themeMenuRef}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className={`theme-selector-icon-button ${showThemeMenu ? 'active' : ''}`}
            aria-label="Select theme"
            title="Click to change theme"
          >
            <span className="theme-icon-display">{currentTheme.icon}</span>
            <span className="theme-change-indicator">⌄</span>
            <span className="theme-label-hint">Theme</span>
          </button>
          {showThemeMenu && (
            <div className="theme-menu-dropdown">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleThemeSelect(theme.value)}
                  className={`theme-menu-item ${selectedTheme === theme.value ? 'active' : ''}`}
                >
                  <span className="theme-icon">{theme.icon}</span>
                  <span className="theme-label">{theme.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="app-container">
        <Chatbot selectedTheme={selectedTheme} />
      </div>
    </main>
  )
}

