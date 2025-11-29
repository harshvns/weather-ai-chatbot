import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let cityName: string | null = null
  
  try {
    const requestData = await request.json()
    const { location } = requestData
    cityName = requestData.cityName || null
    
    const apiKey = process.env.OPENWEATHER_API_KEY || 'demo_key'
    
    // If no API key is set, return mock data for demo purposes
    if (apiKey === 'demo_key' || apiKey === 'your_openweather_api_key_here') {
      const mockLocation = cityName || 'Tokyo, Japan'
      return NextResponse.json({
        location: mockLocation,
        temperature: 22,
        description: '晴れ',
        humidity: 65,
        windSpeed: 5.2,
        icon: '01d',
        mock: true,
      })
    }

    let weatherUrl: string | null = null

    // If city name is provided, use geocoding API first, then weather API
    if (cityName) {
      // Clean the city name (remove extra whitespace, handle common variations)
      const cleanCityName = cityName.trim().replace(/\s+/g, ' ')
      
      // First, get coordinates from city name using geocoding API
      // OpenWeatherMap geocoding API supports city names worldwide (English, Japanese, etc.)
      // URL encode the city name to handle Japanese characters and special characters
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanCityName)}&limit=5&appid=${apiKey}`
      
      const geocodeResponse = await fetch(geocodeUrl)
      
      if (!geocodeResponse.ok) {
        throw new Error('Geocoding API request failed')
      }

      const geocodeData = await geocodeResponse.json()
      
      if (!geocodeData || geocodeData.length === 0) {
        // If city not found, try with country code variations
        // Try common country codes if city name doesn't include one
        const countryVariations = ['', ',US', ',UK', ',JP', ',CA', ',AU', ',FR', ',DE', ',IT', ',ES']
        
        for (const country of countryVariations) {
          const tryUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanCityName + country)}&limit=1&appid=${apiKey}`
          const tryResponse = await fetch(tryUrl)
          
          if (tryResponse.ok) {
            const tryData = await tryResponse.json()
            if (tryData && tryData.length > 0) {
              const { lat, lon } = tryData[0]
              weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
              break
            }
          }
        }
        
        // If still not found, fall back to coordinates or default
        if (!weatherUrl) {
          const coords = location || '35.6762,139.6503'
          const [lat, lon] = coords.split(',')
          weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
        }
      } else {
        // Use the first (most relevant) result
        const { lat, lon } = geocodeData[0]
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
      }
    } else {
      // Use coordinates directly
      const coords = location || '35.6762,139.6503'
      const [lat, lon] = coords.split(',')
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
    }
    
    // Ensure weatherUrl is set
    if (!weatherUrl) {
      const coords = location || '35.6762,139.6503'
      const [lat, lon] = coords.split(',')
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`
    }
    
    const response = await fetch(weatherUrl)
    
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
    const fallbackLocation = cityName || 'Tokyo, Japan'
    return NextResponse.json({
      location: fallbackLocation,
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

