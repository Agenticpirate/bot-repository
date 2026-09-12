# Weather

## What it does

Gets current conditions and multi-day forecasts for any location in the world.

## Setup required

None. Works immediately out of the box.

## Permissions

None. Runs entirely in the sandbox.

## Common prompts

| You say...                                   | What happens                               |
| -------------------------------------------- | ------------------------------------------ |
| “What's the weather?”                        | Current conditions for your saved location |
| “What's the weather in Tokyo?”               | Current conditions for a specific city     |
| “Will it rain tomorrow?”                     | Next-day forecast for your location        |
| “Give me the 7-day forecast”                 | Extended outlook with temps and conditions |
| “Should I bring an umbrella?”                | Practical weather advice                   |
| “What's the weather like in Lisbon in June?” | Seasonal/travel weather lookup             |

## Configuration

- Your default location is pulled from USER.md (set during onboarding or anytime: “I'm in New York”)
- Supports any city worldwide
- Returns temperatures, conditions, humidity, wind, and multi-day outlook

## Tips & gotchas

- **Auto-location:** If you've told your assistant where you live, you never need to specify a city for local weather. Just “what's the weather?” works.
- **Visual output:** Weather responses include a styled forecast card with icons, hourly breakdown, and multi-day outlook. It's not just text.
- **Travel planning:** Ask about weather in a destination city for specific dates and your assistant will factor it into suggestions.
