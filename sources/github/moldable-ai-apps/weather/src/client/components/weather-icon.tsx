import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  type LucideIcon,
  Moon,
  Sun,
} from 'lucide-react'

function weatherIcon(code: number, isDay = true): LucideIcon {
  if (code === 0) return isDay ? Sun : Moon
  if (code <= 2) return isDay ? CloudSun : CloudMoon
  if (code === 3) return Cloud
  if (code <= 48) return CloudFog
  if (code <= 57) return CloudDrizzle
  if (code <= 67) return CloudRain
  if (code <= 77) return CloudSnow
  if (code <= 82) return CloudRain
  if (code <= 86) return CloudSnow
  return CloudLightning
}

/**
 * Weather conditions are information, not primary actions. A restrained,
 * condition-led palette makes a forecast much easier to scan than blue icons
 * for every state.
 */
export function weatherToneClass(code: number, isDay = true): string {
  if (code === 0) {
    return isDay ? 'weather-condition-sun' : 'weather-condition-moon'
  }
  if (code <= 2) {
    return isDay ? 'weather-condition-partly-cloudy' : 'weather-condition-moon'
  }
  if (code === 3) return 'weather-condition-cloud'
  if (code <= 48) return 'weather-condition-fog'
  if (code <= 57) return 'weather-condition-drizzle'
  if (code <= 67 || code <= 82) return 'weather-condition-rain'
  if (code <= 86) return 'weather-condition-snow'
  return 'weather-condition-storm'
}

export function WeatherIcon({
  code,
  isDay = true,
  className,
}: {
  code: number
  isDay?: boolean
  className?: string
}) {
  const Icon = weatherIcon(code, isDay)
  return <Icon className={className} aria-hidden />
}
