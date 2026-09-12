# Amazon

## What it does

Searches, browses, and shops on Amazon and Amazon Fresh for you — from finding products to placing orders — using your existing Amazon account.

## Setup required

First-time setup needed. Your assistant uses your Chrome browser session to interact with Amazon, so you'll need to sign in once:

1. Make sure Chrome is open with the Vellum extension connected
2. Say: *“Order something from Amazon”* — your assistant will check your session and prompt you to sign in if needed
3. A Chrome window opens to the Amazon login page. Sign in as usual — your assistant detects the login automatically

After that, your session is saved and reused until it expires. If it does expire, your assistant will ask you to sign in again.

## Permissions

- Requires the Vellum Chrome extension to be installed and connected
- Uses your existing Amazon account (no separate credentials stored)
- Each command runs on your host machine and will ask for permission before executing

## Common prompts

| You say...                                   | What happens                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| “Order a pack of AA batteries from Amazon”   | Searches, shows top results with prices, adds your pick to cart, and walks you through checkout |
| “Find me a blue t-shirt, size large”         | Searches, finds matching products, handles size and color variations automatically              |
| “What's in my Amazon cart?”                  | Shows your current cart with items, quantities, and prices                                      |
| “Remove the headphones from my cart”         | Removes the specified item from your cart                                                       |
| “Check out my Amazon cart”                   | Shows order summary with totals, asks for confirmation before placing the order                 |
| “Search Amazon for a laptop stand under $30” | Searches and filters results by your criteria                                                   |

## Amazon Fresh

Amazon Fresh is fully supported for grocery delivery. The flow is the same as regular Amazon shopping, with the addition of delivery slot selection.

| You say...                              | What happens                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| “Order milk and eggs from Amazon Fresh” | Searches Fresh, adds items to your Fresh cart, and handles delivery slot selection |
| “Add strawberries to my Fresh cart”     | Searches Fresh for strawberries and adds the best match                            |
| “When can I get a Fresh delivery?”      | Shows available delivery windows so you can pick one                               |

Fresh orders require a delivery slot before checkout. Your assistant will remind you to pick one if you haven't already.

## Configuration

- No manual configuration needed
- Session is captured automatically when you sign into Amazon in Chrome
- Supports multiple payment methods — your assistant can list your saved cards and let you choose at checkout

## Tips & gotchas

- **Your assistant never places orders without asking.** You'll always see a cart summary and total before anything is charged. Explicit confirmation is required.
- **Chrome extension must be connected.** If commands fail with an extension error, open Chrome, click the Vellum extension icon, and click Connect.
- **Sessions expire.** Amazon sessions don't last forever. If your assistant says the session expired, you'll need to sign in again — it takes about 30 seconds.
- **Fresh and regular Amazon have separate carts.** Items added to your Fresh cart won't appear in your regular Amazon cart, and vice versa.
- **Rate limiting.** Amazon may throttle rapid requests. Your assistant handles this automatically by spacing out requests, but if you see errors, just wait a moment and try again.
- **Product variations.** For items with sizes, colors, or styles, your assistant will show you the available options and let you pick — or it'll choose the best match if you've already specified (e.g., “large blue”).
