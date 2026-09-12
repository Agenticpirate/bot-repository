# DoorDash

## What it does

Orders food, groceries, and convenience items from DoorDash. Yes, your AI assistant can literally order you lunch.

## Setup required

DoorDash account connection required. Say:

> “Set up DoorDash.”

Your assistant opens a Chrome window to the DoorDash login page. Sign in as usual — your assistant detects the login automatically and captures the session. The Chrome window stays open in the background for API requests.

## Permissions

- DoorDash account credentials stored in the vault
- No macOS permissions needed
- Payment uses whatever payment method is on your DoorDash account

## Common prompts

| You say...                               | What happens                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| “Order me lunch”                         | Finds nearby restaurants and walks you through options                                     |
| “I want pizza from the closest place”    | Searches nearby pizza spots, shows options                                                 |
| “Order me a coffee”                      | Finds nearby coffee shops and helps you order                                              |
| “Get me groceries: milk, eggs, bread”    | Creates a grocery delivery order                                                           |
| “Reorder what I got last time”           | Not yet supported — your assistant can search and reorder from the same restaurant instead |
| “What's the cheapest Thai food near me?” | Searches and sorts by price                                                                |

## Configuration

- Delivery address pulled from your location in USER.md
- Payment handled through your DoorDash account settings
- Tips are set per-order at checkout. Tell your assistant about dietary restrictions and it will remember them as a preference for future orders

## Tips & gotchas

- **You approve before it charges you.** Your assistant walks you through the order and confirms before placing it. It won't surprise-order $80 of sushi.
- **Address:** Make sure your assistant knows your address. It pulls from your location, but if you want delivery somewhere else, just say so: “Order to my office at 123 Main St.”
- **Progress tracking:** Your assistant shows a live task progress card while the order is being placed, so you can see each step.
- **Dietary needs:** Tell your assistant about dietary restrictions (“I'm vegetarian,” “no shellfish”) and it'll filter options accordingly. Save it as a preference so you don't have to repeat it.
- **Tipping:** You can specify a tip amount at checkout (e.g., “add a $5 tip”). Your assistant will ask if you don't specify one
