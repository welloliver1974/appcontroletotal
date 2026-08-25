/**
 * Real-time Weather Service using Open-Meteo (100% Free, Public, Zero-Key).
 * Caches location and weather in sessionStorage for 30 minutes.
 */

export interface WeatherData {
  temperature: number
  tempMax: number
  tempMin: number
  weatherCode: number
  description: string
  icon: string
  cityName: string
  updatedAt: string
}

const WEATHER_CODE_MAP: Record<number, { desc: string; icon: string }> = {
  0: { desc: 'Céu limpo e ensolarado', icon: '☀️' },
  1: { desc: 'Predomínio de sol', icon: '🌤️' },
  2: { desc: 'Parcialmente nublado', icon: '⛅' },
  3: { desc: 'Nublado', icon: '☁️' },
  45: { desc: 'Nevoeiro', icon: '🌫️' },
  48: { desc: 'Nevoeiro com geada', icon: '🌫️' },
  51: { desc: 'Garoa leve', icon: '🌦️' },
  53: { desc: 'Garoa moderada', icon: '🌦️' },
  55: { desc: 'Garoa densa', icon: '🌧️' },
  61: { desc: 'Chuva fraca', icon: '🌧️' },
  63: { desc: 'Chuva moderada', icon: '🌧️' },
  65: { desc: 'Chuva forte', icon: '🌧️' },
  71: { desc: 'Neve fraca', icon: '🌨️' },
  73: { desc: 'Neve moderada', icon: '🌨️' },
  75: { desc: 'Neve intensa', icon: '❄️' },
  80: { desc: 'Pancadas de chuva', icon: '🌦️' },
  81: { desc: 'Pancadas fortes de chuva', icon: '⛈️' },
  82: { desc: 'Pancadas violentas de chuva', icon: '⛈️' },
  95: { desc: 'Tempestade com trovoadas', icon: '⛈️' },
  96: { desc: 'Tempestade com granizo leve', icon: '⛈️' },
  99: { desc: 'Tempestade com granizo forte', icon: '⛈️' },
}

const CACHE_KEY = 'act.weather.cache'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 min

export async function fetchCurrentWeather(): Promise<WeatherData | null> {
  // 1. Check in-memory session cache
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data
      }
    }
  } catch {}

  // 2. Obtain approximate coordinates (Default: Santo André - SP / Horário de Brasília)
  let lat = -23.6639
  let lon = -46.5383
  let cityName = 'Santo André - SP'

  try {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p),
          () => resolve(null),
          { timeout: 3000, maximumAge: 60000 },
        )
      })
      if (pos) {
        lat = pos.coords.latitude
        lon = pos.coords.longitude
      }
    }
  } catch {}

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=America%2FSao_Paulo`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return null
    const json = await res.json()

    const currentTemp = Math.round(json.current?.temperature_2m ?? 24)
    const code = json.current?.weather_code ?? 0
    const tempMax = Math.round(json.daily?.temperature_2m_max?.[0] ?? currentTemp + 4)
    const tempMin = Math.round(json.daily?.temperature_2m_min?.[0] ?? currentTemp - 4)

    const mapped = WEATHER_CODE_MAP[code] || { desc: 'Tempo estável', icon: '⛅' }

    // Timezone & city formatting
    if (json.timezone === 'America/Sao_Paulo' && Math.abs(lat - (-23.6639)) < 0.2) {
      cityName = 'Santo André - SP'
    } else if (json.timezone) {
      const tzParts = String(json.timezone).split('/')
      cityName = tzParts[tzParts.length - 1]?.replace(/_/g, ' ') || 'Santo André - SP'
    }

    const weatherData: WeatherData = {
      temperature: currentTemp,
      tempMax,
      tempMin,
      weatherCode: code,
      description: mapped.desc,
      icon: mapped.icon,
      cityName,
      updatedAt: new Date().toISOString(),
    }

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: weatherData }))
    } catch {}

    return weatherData
  } catch (err) {
    console.warn('[WeatherService] Open-Meteo fetch error:', err)
    return null
  }
}
