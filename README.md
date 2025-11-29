# Weather AI Chatbot

A Next.js-based chatbot that combines Japanese voice input, real-time weather data, and generative AI.

## Features

- 🗣️ Japanese voice input using Web Speech API
- 🌤️ Real-time weather data from OpenWeatherMap
- 🤖 Generative AI suggestions using Google Gemini
- 🎨 Modern UI with theme selection

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   Create a `.env.local` file in the root directory with the following:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   ```
   
   **Note:** The Gemini API key is already provided. You only need to add your OpenWeatherMap API key. If you don't have one yet, the app will use mock weather data for demonstration purposes.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Getting an OpenWeatherMap API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account (it's free!)
3. Get your API key from the dashboard
4. Add it to `.env.local` as `OPENWEATHER_API_KEY`

**Note:** The app will work with mock weather data if you don't have an OpenWeatherMap API key, but real weather data requires a valid key.

## Features in Detail

- **Japanese Voice Input**: Uses the Web Speech API to recognize Japanese speech. Click the microphone button and speak in Japanese.
- **Weather Integration**: Automatically detects your location and fetches current weather data.
- **AI-Powered Suggestions**: Uses Google Gemini to generate contextual suggestions based on weather and selected theme.
- **Theme Selection**: Choose from Travel, Fashion, Sports, Agriculture, or General themes for tailored responses.

