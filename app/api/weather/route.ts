import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json()
    
    // Default to Tokyo if no location provided
    const coords = location || '35.6762,139.6503'
    const [lat, lon] = coords.split(',')

    // Use OpenWeatherMap API (free tier)
    // Note: You'll need to sign up at https://openweathermap.org/api
    // and add your API key to .env.local as OPENWEATHER_API_KEY
    const apiKey = process.env.OPENWEATHER_API_KEY || 'demo_key'
    
    // If no API key is set, return mock data for demo purposes
    if (apiKey === 'demo_key' || apiKey === 'your_openweather_api_key_here') {
      return NextResponse.json({
        location: 'Tokyo, Japan',
        temperature: 22,
        description: '晴れ',
        humidity: 65,
        windSpeed: 5.2,
        icon: '01d',
        mock: true,
      })
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error('Weather API request failed')
    }

    const data = await response.json()

    return NextResponse.json({
      location: `${data.name}, ${data.sys.country}`,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      icon: data.weather[0].icon,
      mock: false,
    })
  } catch (error) {
    console.error('Weather API error:', error)
    // Return mock data on error
    return NextResponse.json({
      location: 'Tokyo, Japan',
      temperature: 22,
      description: '晴れ',
      humidity: 65,
      windSpeed: 5.2,
      icon: '01d',
      mock: true,
      error: 'Using mock data due to API error',
    })
  }
}

