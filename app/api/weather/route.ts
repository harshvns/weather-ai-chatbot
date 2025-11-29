import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let location: string | undefined
  try {
    const body = await request.json()
    location = typeof body.location === 'string' ? body.location : undefined
    
    // Use OpenWeatherMap API (free tier)
    const apiKey = process.env.OPENWEATHER_API_KEY || 'demo_key'
    
    // If no API key is set, return mock data for demo purposes
    if (apiKey === 'demo_key' || apiKey === 'your_openweather_api_key_here') {
      const mockLocation = location && typeof location === 'string' && !location.includes(',') ? location : 'Tokyo'
      return NextResponse.json({
        location: `${mockLocation}, Japan`,
        temperature: 22,
        description: '晴れ',
        humidity: 65,
        windSpeed: 5.2,
        icon: '01d',
        mock: true,
      })
    }

    let url: string
    let locationName: string

    // Check if location is coordinates (lat,lon) or city name
    if (location && typeof location === 'string' && location.includes(',')) {
      // It's coordinates
      const [lat, lon] = location.split(',')
      if (isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
        throw new Error('Invalid coordinates')
      }
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.trim()}&lon=${lon.trim()}&appid=${apiKey}&units=metric&lang=ja`
      locationName = `${lat},${lon}`
    } else {
      // It's a city name
      const cityName = location || 'Tokyo'
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&appid=${apiKey}&units=metric&lang=ja`
      locationName = cityName
    }
    
    const response = await fetch(url, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Weather API error:', response.status, errorData)
      
      // If city not found, try with coordinates (Tokyo as fallback)
      if (response.status === 404 && !locationName.includes(',')) {
        const fallbackUrl = `https://api.openweathermap.org/data/2.5/weather?lat=35.6762&lon=139.6503&appid=${apiKey}&units=metric&lang=ja`
        const fallbackResponse = await fetch(fallbackUrl)
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json()
          return NextResponse.json({
            location: `${fallbackData.name}, ${fallbackData.sys.country}`,
            temperature: Math.round(fallbackData.main.temp),
            description: fallbackData.weather[0].description,
            humidity: fallbackData.main.humidity,
            windSpeed: fallbackData.wind.speed,
            icon: fallbackData.weather[0].icon,
            mock: false,
          })
        }
      }
      
      throw new Error(`Weather API request failed: ${response.status}`)
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
    // Return mock data on error with location name if provided
    const errorLocation = location && typeof location === 'string' && !location.includes(',') ? location : 'Tokyo'
    return NextResponse.json({
      location: `${errorLocation}, Japan`,
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

