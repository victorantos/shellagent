import { z } from 'zod'
import { buildTool } from './registry.js'

const weatherData: Record<string, { temp: number; condition: string }> = {
  london: { temp: 12, condition: 'Cloudy' },
  tokyo: { temp: 22, condition: 'Sunny' },
  'new york': { temp: 18, condition: 'Partly cloudy' },
  zurich: { temp: 14, condition: 'Rainy' },
  sydney: { temp: 25, condition: 'Clear' },
}

export const mockWeatherTool = buildTool({
  name: 'MockWeather',
  description: 'Get weather for a city (demo tool with fake data).',
  inputSchema: z.object({
    city: z.string().describe('City name'),
  }),
  isReadOnly: true,
  isConcurrencySafe: true,
  needsPermission: false,
  async execute(input) {
    await new Promise((r) => setTimeout(r, 500))
    const data = weatherData[input.city.toLowerCase()]
    if (!data) {
      return { output: `Weather data not available for "${input.city}". Try: London, Tokyo, New York, Zurich, Sydney.` }
    }
    return { output: `${input.city}: ${data.temp}°C, ${data.condition}` }
  },
})
