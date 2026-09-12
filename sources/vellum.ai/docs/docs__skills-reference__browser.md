# Browser

## What it does

Navigates web pages, interacts with elements, extracts content, fills forms, and takes screenshots using a headless browser. Your assistant's eyes and hands on the internet.

## Setup required

None. Works immediately.

## Permissions

- No macOS permissions needed (runs in the sandbox)
- Credential fill requires stored credentials in the vault for auto-login scenarios

## Common prompts

| You say...                                           | What happens                                             |
| ---------------------------------------------------- | -------------------------------------------------------- |
| “Go to example.com and tell me what's on the page”   | Navigates, extracts, and summarizes page content         |
| “Search for flights from JFK to Lisbon in June”      | Navigates a travel site, extracts results                |
| “What does the homepage of \[competitor] look like?” | Takes a screenshot of a webpage                          |
| “Fill out this form with my info”                    | Navigates to a form and fills fields                     |
| “Log into my Jira and check my open tickets”         | Uses stored credentials to authenticate and extract data |
| “Read this article and summarize it”                 | Fetches and summarizes web content                       |
| “Click the 'Sign Up' button on that page”            | Interacts with specific page elements                    |

## Configuration

- No configuration needed for basic browsing
- For sites requiring login, store credentials in the vault: “Store my GitHub login”
- Credentials are scoped to specific domains (GitHub creds only work on github.com)

## Tips & gotchas

- **Not your browser.** This is a headless browser that runs in the sandbox. It doesn't have your cookies, your logged-in sessions, or your bookmarks. It starts fresh every time.
- **Login-required sites:** You need to store credentials in the vault for your assistant to log into sites. It can't use your existing browser sessions.
- **JavaScript-heavy sites:** Most modern sites work fine. Occasionally, very complex single-page apps may not render perfectly in the headless browser.
- **Screenshots:** Your assistant can take visual screenshots if you want to see what a page actually looks like, rather than just the extracted text.
- **Prefer APIs when available.** If there's a direct API or CLI for a service (GitHub, Jira, etc.), your assistant will prefer that over browser automation. It's faster and more reliable.
