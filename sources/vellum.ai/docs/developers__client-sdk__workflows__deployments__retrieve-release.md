> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Retrieve Workflow Deployment Release

GET https://api.vellum.ai/v1/workflow-deployments/{id}/releases/{release_id_or_release_tag}

Retrieve a specific Workflow Deployment Release by either its UUID or the name of a Release Tag that points to it.

Reference: https://docs.vellum.ai/developers/client-sdk/workflows/deployments/retrieve-release

## Authentication

- `X-API-KEY` header (required) — API Key authentication via header

## Request

### Path parameters

- `id` (string, required) — Either the Workflow Deployment's ID or its unique name
- `release_id_or_release_tag` (string, required) — Either the UUID of Workflow Deployment Release you'd like to retrieve, or the name of a Release Tag that's pointing to the Workflow Deployment Release you'd like to retrieve.

## Response

### 200

- `id` (string, required)
- `created` (string, required)
- `environment` (object, required)
  - `id` (string, required)
  - `name` (string, required)
  - `label` (string, required)
- `created_by` (object, required, nullable)
  - `id` (string, required)
  - `email` (string, required)
  - `full_name` (string, optional)
- `workflow_version` (object, required) — The workflow version associated with a workflow deployment release.
  - `id` (string, required)
  - `input_variables` (list of object, required)
    - `id` (string, required)
    - `key` (string, required)
    - `type` (enum, required) — * `STRING` - STRING * `NUMBER` - NUMBER * `JSON` - JSON * `CHAT_HISTORY` - CHAT_HISTORY * `SEARCH_RESULTS` - SEARCH_RESULTS * `ERROR` - ERROR * `ARRAY` - ARRAY * `FUNCTION_CALL` - FUNCTION_CALL * `AUDIO` - AUDIO * `VIDEO` - VIDEO * `IMAGE` - IMAGE * `DOCUMENT` - DOCUMENT * `NULL` - NULL * `THINKING` - THINKING * `REFERENCE` - REFERENCE
      - Allowed values: `STRING`, `NUMBER`, `JSON`, `CHAT_HISTORY`, `SEARCH_RESULTS`, `ERROR`, `ARRAY`, `FUNCTION_CALL`, `AUDIO`, `VIDEO`, `IMAGE`, `DOCUMENT`, `NULL`, `THINKING`, `REFERENCE`
    - `required` (boolean, optional, nullable)
    - `default` (object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
      - STRING
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
      - NUMBER
        - `type` (enum, required)
          - Allowed values: `NUMBER`
        - `value` (double, required, nullable)
      - JSON
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
      - AUDIO
        - `type` (enum, required)
          - Allowed values: `AUDIO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - VIDEO
        - `type` (enum, required)
          - Allowed values: `VIDEO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - IMAGE
        - `type` (enum, required)
          - Allowed values: `IMAGE`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - DOCUMENT
        - `type` (enum, required)
          - Allowed values: `DOCUMENT`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - FUNCTION_CALL
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
      - ERROR
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
      - ARRAY
        - `type` (enum, required)
          - Allowed values: `ARRAY`
        - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
      - CHAT_HISTORY
        - `type` (enum, required)
          - Allowed values: `CHAT_HISTORY`
        - `value` (list of object, required, nullable)
          - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
          - `text` (string, optional, nullable)
          - `content` (object or object or object or object or object or object or object, optional, nullable)
            - STRING
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
          - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
          - `metadata` (map from string to any, optional, nullable)
      - SEARCH_RESULTS
        - `type` (enum, required)
          - Allowed values: `SEARCH_RESULTS`
        - `value` (list of object, required, nullable)
          - `text` (string, required) — The text of the chunk that matched the search query.
          - `score` (double, required) — A score representing how well the chunk matches the search query.
          - `keywords` (list of string, required)
          - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `label` (string, required) — The human-readable name for the document.
            - `id` (string, optional, nullable) — The ID of the document.
            - `external_id` (string, optional, nullable) — The unique ID of the document as represented in an external system and specified when it was originally uploaded.
            - `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.
          - `meta` (object, optional, nullable) — Additional information about the search result.
            - `source` (object, optional, nullable)
      - THINKING
        - `type` (enum, required)
          - Allowed values: `THINKING`
        - `value` (object, required, nullable) — A value representing a string.
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
    - `extensions` (object, optional, nullable) — A set of fields with additional properties for use in Vellum Variables.
      - `color` (string, optional, nullable)
      - `description` (string, optional, nullable)
      - `title` (string, optional, nullable)
    - `schema` (map from string to any, optional, nullable)
  - `output_variables` (list of object, required)
    - `id` (string, required)
    - `key` (string, required)
    - `type` (enum, required) — * `STRING` - STRING * `NUMBER` - NUMBER * `JSON` - JSON * `CHAT_HISTORY` - CHAT_HISTORY * `SEARCH_RESULTS` - SEARCH_RESULTS * `ERROR` - ERROR * `ARRAY` - ARRAY * `FUNCTION_CALL` - FUNCTION_CALL * `AUDIO` - AUDIO * `VIDEO` - VIDEO * `IMAGE` - IMAGE * `DOCUMENT` - DOCUMENT * `NULL` - NULL * `THINKING` - THINKING * `REFERENCE` - REFERENCE
      - Allowed values: `STRING`, `NUMBER`, `JSON`, `CHAT_HISTORY`, `SEARCH_RESULTS`, `ERROR`, `ARRAY`, `FUNCTION_CALL`, `AUDIO`, `VIDEO`, `IMAGE`, `DOCUMENT`, `NULL`, `THINKING`, `REFERENCE`
    - `required` (boolean, optional, nullable)
    - `default` (object or object or object or object or object or object or object or object or object or object or object or object or object, optional, nullable)
      - STRING
        - `type` (enum, required)
          - Allowed values: `STRING`
        - `value` (string, required, nullable)
      - NUMBER
        - `type` (enum, required)
          - Allowed values: `NUMBER`
        - `value` (double, required, nullable)
      - JSON
        - `type` (enum, required)
          - Allowed values: `JSON`
        - `value` (any, required, nullable)
      - AUDIO
        - `type` (enum, required)
          - Allowed values: `AUDIO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - VIDEO
        - `type` (enum, required)
          - Allowed values: `VIDEO`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - IMAGE
        - `type` (enum, required)
          - Allowed values: `IMAGE`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - DOCUMENT
        - `type` (enum, required)
          - Allowed values: `DOCUMENT`
        - `value` (object, required, nullable)
          - `src` (string, required) — The reference to the source data. This can be one of the following formats: 1. A base64-encoded data URL (e.g., 'data:application/pdf;base64,JVBERi0xLjQKJcfs...'). 2. A url pointing to a file accessible over HTTP or HTTPS. 3. A reference to a file that's been previously uploaded to Vellum, in the form of 'vellum:uploaded-file:\{uploaded\_file\_id}'. You can use the Uploaded Files API to retrieve the url of the uploaded file given its ID. See [https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve](https://docs.vellum.ai/developers/client-sdk/uploaded-files/retrieve) for details.
          - `metadata` (map from string to any, optional, nullable)
      - FUNCTION_CALL
        - `type` (enum, required)
          - Allowed values: `FUNCTION_CALL`
        - `value` (object, required, nullable) — The final resolved function call value.
          - `arguments` (map from string to any, required)
          - `name` (string, required)
          - `id` (string, optional, nullable)
      - ERROR
        - `type` (enum, required)
          - Allowed values: `ERROR`
        - `value` (object, required, nullable)
          - `code` (enum, required) — * `INVALID_REQUEST` - INVALID_REQUEST * `INVALID_INPUTS` - INVALID_INPUTS * `PROVIDER_ERROR` - PROVIDER_ERROR * `PROVIDER_CREDENTIALS_UNAVAILABLE` - PROVIDER_CREDENTIALS_UNAVAILABLE * `INTEGRATION_CREDENTIALS_UNAVAILABLE` - INTEGRATION_CREDENTIALS_UNAVAILABLE * `REQUEST_TIMEOUT` - REQUEST_TIMEOUT * `INTERNAL_SERVER_ERROR` - INTERNAL_SERVER_ERROR * `USER_DEFINED_ERROR` - USER_DEFINED_ERROR * `WORKFLOW_CANCELLED` - WORKFLOW_CANCELLED * `NODE_CANCELLED` - NODE_CANCELLED * `PROVIDER_QUOTA_EXCEEDED` - PROVIDER_QUOTA_EXCEEDED * `CHAT_QUOTA_EXCEEDED` - CHAT_QUOTA_EXCEEDED
            - Allowed values: `INVALID_REQUEST`, `INVALID_INPUTS`, `PROVIDER_ERROR`, `PROVIDER_CREDENTIALS_UNAVAILABLE`, `INTEGRATION_CREDENTIALS_UNAVAILABLE`, `REQUEST_TIMEOUT`, `INTERNAL_SERVER_ERROR`, `USER_DEFINED_ERROR`, `WORKFLOW_CANCELLED`, `NODE_CANCELLED`, `PROVIDER_QUOTA_EXCEEDED`, `CHAT_QUOTA_EXCEEDED`
          - `message` (string, required)
          - `raw_data` (map from string to any, optional, nullable)
      - ARRAY
        - `type` (enum, required)
          - Allowed values: `ARRAY`
        - `value` (list of object or object or object or object or object or object or object or object or object or object or object or object or object, required, nullable)
      - CHAT_HISTORY
        - `type` (enum, required)
          - Allowed values: `CHAT_HISTORY`
        - `value` (list of object, required, nullable)
          - `role` (enum, required) — * `SYSTEM` - System * `ASSISTANT` - Assistant * `USER` - User * `FUNCTION` - Function
            - Allowed values: `SYSTEM`, `ASSISTANT`, `USER`, `FUNCTION`
          - `text` (string, optional, nullable)
          - `content` (object or object or object or object or object or object or object, optional, nullable)
            - STRING
            - FUNCTION_CALL
            - ARRAY
            - AUDIO
            - VIDEO
            - IMAGE
            - DOCUMENT
          - `source` (string, optional, nullable) — An optional identifier representing who or what generated this message.
          - `metadata` (map from string to any, optional, nullable)
      - SEARCH_RESULTS
        - `type` (enum, required)
          - Allowed values: `SEARCH_RESULTS`
        - `value` (list of object, required, nullable)
          - `text` (string, required) — The text of the chunk that matched the search query.
          - `score` (double, required) — A score representing how well the chunk matches the search query.
          - `keywords` (list of string, required)
          - `document` (object, required) — The document that contains the chunk that matched the search query.
            - `label` (string, required) — The human-readable name for the document.
            - `id` (string, optional, nullable) — The ID of the document.
            - `external_id` (string, optional, nullable) — The unique ID of the document as represented in an external system and specified when it was originally uploaded.
            - `metadata` (map from string to any, optional, nullable) — A previously supplied JSON object containing metadata that can be filtered on when searching.
          - `meta` (object, optional, nullable) — Additional information about the search result.
            - `source` (object, optional, nullable)
      - THINKING
        - `type` (enum, required)
          - Allowed values: `THINKING`
        - `value` (object, required, nullable) — A value representing a string.
          - `type` (enum, required)
            - Allowed values: `STRING`
          - `value` (string, required, nullable)
    - `extensions` (object, optional, nullable) — A set of fields with additional properties for use in Vellum Variables.
      - `color` (string, optional, nullable)
      - `description` (string, optional, nullable)
      - `title` (string, optional, nullable)
    - `schema` (map from string to any, optional, nullable)
  - `dependencies` (list of object or object, optional, nullable)
    - INTEGRATION
      - `type` (enum, required)
        - Allowed values: `INTEGRATION`
      - `name` (enum, required) — * `SLACK` - Slack * `NOTION` - Notion * `GOOGLE` - Google * `CALENDLY` - Calendly * `CANVA` - Canva * `CLICKUP` - ClickUp * `CODA` - Coda * `HUBSPOT` - Hubspot * `INTERCOM` - Intercom * `INSTAGRAM` - Instagram * `LINEAR` - Linear * `LINKUP` - Linkup * `LISTENNOTES` - Listen Notes * `LMNT` - LMNT * `LINKEDIN` - LinkedIn * `MAILCHIMP` - Mailchimp * `MIRO` - Miro * `MEM0` - Mem0 * `MONDAY` - Monday * `NEON` - Neon * `OUTLOOK` - Outlook * `MICROSOFT_TEAMS` - Microsoft Teams * `GITHUB` - Github * `GOOGLE_SHEETS` - Google Sheets * `GOOGLE_CALENDAR` - Google Calendar * `GOOGLE_CLASSROOM` - Google Classroom * `GOOGLE_DRIVE` - Google Drive * `GMAIL` - Gmail * `GOOGLE_ADS` - Google Ads * `GOOGLE_ANALYTICS` - Google Analytics * `GOOGLE_BIGQUERY` - Google BigQuery * `GOOGLE_DOCS` - Google Docs * `GOOGLE_PHOTOS` - Google Photos * `GOOGLE_SEARCH_CONSOLE` - Google Search Console * `GOOGLE_SLIDES` - Google Slides * `GOOGLE_TASKS` - Google Tasks * `ACCULYNX` - AccuLynx * `AFFINITY` - Affinity * `AGENCYZOOM` - AgencyZoom * `AHREFS` - Ahrefs * `AIRTABLE` - Airtable * `APOLLO` - Apollo * `ASANA` - Asana * `ATLASSIAN` - Atlassian * `BITBUCKET` - Bitbucket * `BOX` - Box * `BREVO` - Brevo * `BREX` - Brex * `BROWSERBASE_TOOL` - Browserbase Tool * `CAL` - Cal * `CANVAS` - Canvas * `ELEVENLABS` - ElevenLabs * `EXA` - Exa * `GAMMA` - Gamma * `GITLAB` - Gitlab * `GONG` - Gong * `FIRECRAWL` - Firecrawl * `FIGMA` - Figma * `FIREFLIES` - Fireflies * `GOOGLE_MAPS` - Google Maps * `GOOGLEMEET` - Google Meet * `HEYGEN` - HeyGen * `JIRA` - Jira * `JUNGLESCOUT` - Jungle Scout * `KLAVIYO` - Klaviyo * `PAGERDUTY` - PagerDuty * `PARSERA` - Parsera * `PEOPLEDATALABS` - People Data Labs * `PERPLEXITY` - Perplexity * `POSTHOG` - PostHog * `PRODUCTBOARD` - Productboard * `QUICKBOOKS` - QuickBooks * `REDDIT` - Reddit * `SALESFORCE` - Salesforce * `SEMRUSH` - Semrush * `SEMANTICSCHOLAR` - Semantic Scholar * `SENDGRID` - SendGrid * `SERPAPI` - Serp Api * `SHARE_POINT` - SharePoint * `SHOPIFY` - Shopify * `SHORTCUT` - Shortcut * `SLACKBOT` - Slackbot * `SPOTIFY` - Spotify * `STRIPE` - Stripe * `SUPABASE` - Supabase * `TAVILY` - Tavily * `TELEGRAM` - Telegram * `TIKTOK` - TikTok * `TODOIST` - Todoist * `WEBFLOW` - Webflow * `YOUSEARCH` - You Search * `ZENDESK` - Zendesk * `ZENROWS` - ZenRows * `DROPBOX` - Dropbox * `EVENTBRITE` - Eventbrite * `FACEBOOK` - Facebook * `CONFLUENCE` - Confluence * `COINBASE` - Coinbase * `DISCORD` - Discord * `DOCUSIGN` - DocuSign * `TRELLO` - Trello * `TWITTER` - Twitter * `HEYREACH` - HeyReach * `ACTIVE_CAMPAIGN` - Active Campaign * `CUSTOMER_IO` - Customer.io * `SEGMENT` - Segment * `WHATSAPP` - WhatsApp * `YOUTUBE` - YouTube
        - Allowed values: `SLACK`, `NOTION`, `GOOGLE`, `CALENDLY`, `CANVA`, `CLICKUP`, `CODA`, `HUBSPOT`, `INTERCOM`, `INSTAGRAM`, `LINEAR`, `LINKUP`, `LISTENNOTES`, `LMNT`, `LINKEDIN`, `MAILCHIMP`, `MIRO`, `MEM0`, `MONDAY`, `NEON`, `OUTLOOK`, `MICROSOFT_TEAMS`, `GITHUB`, `GOOGLE_SHEETS`, `GOOGLE_CALENDAR`, `GOOGLE_CLASSROOM`, `GOOGLE_DRIVE`, `GMAIL`, `GOOGLE_ADS`, `GOOGLE_ANALYTICS`, `GOOGLE_BIGQUERY`, `GOOGLE_DOCS`, `GOOGLE_PHOTOS`, `GOOGLE_SEARCH_CONSOLE`, `GOOGLE_SLIDES`, `GOOGLE_TASKS`, `ACCULYNX`, `AFFINITY`, `AGENCYZOOM`, `AHREFS`, `AIRTABLE`, `APOLLO`, `ASANA`, `ATLASSIAN`, `BITBUCKET`, `BOX`, `BREVO`, `BREX`, `BROWSERBASE_TOOL`, `CAL`, `CANVAS`, `ELEVENLABS`, `EXA`, `GAMMA`, `GITLAB`, `GONG`, `FIRECRAWL`, `FIGMA`, `FIREFLIES`, `GOOGLE_MAPS`, `GOOGLEMEET`, `HEYGEN`, `JIRA`, `JUNGLESCOUT`, `KLAVIYO`, `PAGERDUTY`, `PARSERA`, `PEOPLEDATALABS`, `PERPLEXITY`, `POSTHOG`, `PRODUCTBOARD`, `QUICKBOOKS`, `REDDIT`, `SALESFORCE`, `SEMRUSH`, `SEMANTICSCHOLAR`, `SENDGRID`, `SERPAPI`, `SHARE_POINT`, `SHOPIFY`, `SHORTCUT`, `SLACKBOT`, `SPOTIFY`, `STRIPE`, `SUPABASE`, `TAVILY`, `TELEGRAM`, `TIKTOK`, `TODOIST`, `WEBFLOW`, `YOUSEARCH`, `ZENDESK`, `ZENROWS`, `DROPBOX`, `EVENTBRITE`, `FACEBOOK`, `CONFLUENCE`, `COINBASE`, `DISCORD`, `DOCUSIGN`, `TRELLO`, `TWITTER`, `HEYREACH`, `ACTIVE_CAMPAIGN`, `CUSTOMER_IO`, `SEGMENT`, `WHATSAPP`, `YOUTUBE`
      - `provider` (string, required)
      - `label` (string, optional, nullable)
    - MODEL_PROVIDER
      - `type` (enum, required)
        - Allowed values: `MODEL_PROVIDER`
      - `name` (enum, required) — * `ANTHROPIC` - Anthropic * `AWS_BEDROCK` - AWS Bedrock * `AZURE_AI_FOUNDRY` - Azure AI Foundry * `AZURE_OPENAI` - Azure OpenAI * `BASETEN` - BaseTen * `CEREBRAS` - Cerebras * `COHERE` - Cohere * `CUSTOM` - Custom * `DEEP_SEEK` - DeepSeek * `FIREWORKS_AI` - Fireworks AI * `GOOGLE` - Google * `GOOGLE_VERTEX_AI` - Google Vertex AI * `GROQ` - Groq * `HUGGINGFACE` - HuggingFace * `IBM_WATSONX` - IBM WatsonX * `MISTRAL_AI` - Mistral AI * `MOSAICML` - MosaicML * `MYSTIC` - Mystic * `NVIDIA` - NVIDIA * `OPENAI` - OpenAI * `OPEN_ROUTER` - Open Router * `OPENPIPE` - OpenPipe * `PERPLEXITY` - Perplexity * `PYQ` - Pyq * `REPLICATE` - Replicate * `SAMBANOVA` - SambaNova * `TOGETHER_AI` - Together AI * `X_AI` - xAI * `FASTWEB` - Fastweb * `SWISSCOM` - Swisscom
        - Allowed values: `ANTHROPIC`, `AWS_BEDROCK`, `AZURE_AI_FOUNDRY`, `AZURE_OPENAI`, `BASETEN`, `CEREBRAS`, `COHERE`, `CUSTOM`, `DEEP_SEEK`, `FIREWORKS_AI`, `GOOGLE`, `GOOGLE_VERTEX_AI`, `GROQ`, `HUGGINGFACE`, `IBM_WATSONX`, `MISTRAL_AI`, `MOSAICML`, `MYSTIC`, `NVIDIA`, `OPENAI`, `OPEN_ROUTER`, `OPENPIPE`, `PERPLEXITY`, `PYQ`, `REPLICATE`, `SAMBANOVA`, `TOGETHER_AI`, `X_AI`, `FASTWEB`, `SWISSCOM`
      - `model_name` (string, required)
      - `label` (string, optional, nullable)
- `deployment` (object, required)
  - `id` (string, required)
  - `name` (string, required)
- `release_tags` (list of object, required)
  - `name` (string, required) — The name of the Release Tag
  - `source` (enum, required) — The source of how the Release Tag was originally created * `SYSTEM` - System * `USER` - User
    - Allowed values: `SYSTEM`, `USER`
- `reviews` (list of object, required)
  - `id` (string, required)
  - `created` (string, required)
  - `reviewer` (object, required)
    - `id` (string, required)
    - `full_name` (string, optional)
  - `state` (enum, required) — * `APPROVED` - Approved * `CHANGES_REQUESTED` - Changes Requested * `COMMENTED` - Commented
    - Allowed values: `APPROVED`, `CHANGES_REQUESTED`, `COMMENTED`
- `description` (string, optional)

## Examples

**Response**

```json
{
  "id": "string",
  "created": "2024-01-15T09:30:00Z",
  "environment": {
    "id": "string",
    "name": "string",
    "label": "string"
  },
  "created_by": {
    "id": "string",
    "email": "string",
    "full_name": "string"
  },
  "workflow_version": {
    "id": "string",
    "input_variables": [
      {
        "id": "string",
        "key": "string",
        "type": "STRING",
        "required": true,
        "default": {
          "type": "STRING",
          "value": "string"
        },
        "extensions": {
          "color": "string",
          "description": "string",
          "title": "string"
        },
        "schema": {}
      }
    ],
    "output_variables": [
      {
        "id": "string",
        "key": "string",
        "type": "STRING",
        "required": true,
        "default": {
          "type": "STRING",
          "value": "string"
        },
        "extensions": {
          "color": "string",
          "description": "string",
          "title": "string"
        },
        "schema": {}
      }
    ],
    "dependencies": [
      {
        "type": "INTEGRATION",
        "name": "SLACK",
        "provider": "string",
        "label": "string"
      }
    ]
  },
  "deployment": {
    "id": "string",
    "name": "string"
  },
  "release_tags": [
    {
      "name": "string",
      "source": "SYSTEM"
    }
  ],
  "reviews": [
    {
      "id": "string",
      "created": "2024-01-15T09:30:00Z",
      "reviewer": {
        "id": "string",
        "full_name": "string"
      },
      "state": "APPROVED"
    }
  ],
  "description": "string"
}
```

**SDK Code**

```python
import requests

url = "https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag"

headers = {"X-API-KEY": "<apiKey>"}

response = requests.get(url, headers=headers)

print(response.json())
```

```typescript
import { VellumClient } from "vellum-ai";

const client = new VellumClient({ apiKey: "YOUR_API_KEY", apiVersion: "YOUR_API_VERSION" });
await client.workflowDeployments.retrieveWorkflowDeploymentRelease("id", "release_id_or_release_tag");

```

```go
package main

import (
	"fmt"
	"net/http"
	"io"
)

func main() {

	url := "https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag"

	req, _ := http.NewRequest("GET", url, nil)

	req.Header.Add("X-API-KEY", "<apiKey>")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(res)
	fmt.Println(string(body))

}
```

```ruby
require 'uri'
require 'net/http'

url = URI("https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Get.new(url)
request["X-API-KEY"] = '<apiKey>'

response = http.request(request)
puts response.read_body
```

```java
import com.mashape.unirest.http.HttpResponse;
import com.mashape.unirest.http.Unirest;

HttpResponse<String> response = Unirest.get("https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag")
  .header("X-API-KEY", "<apiKey>")
  .asString();
```

```php
<?php
require_once('vendor/autoload.php');

$client = new \GuzzleHttp\Client();

$response = $client->request('GET', 'https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag', [
  'headers' => [
    'X-API-KEY' => '<apiKey>',
  ],
]);

echo $response->getBody();
```

```csharp
using RestSharp;

var client = new RestClient("https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag");
var request = new RestRequest(Method.GET);
request.AddHeader("X-API-KEY", "<apiKey>");
IRestResponse response = client.Execute(request);
```

```swift
import Foundation

let headers = ["X-API-KEY": "<apiKey>"]

let request = NSMutableURLRequest(url: NSURL(string: "https://api.vellum.ai/v1/workflow-deployments/id/releases/release_id_or_release_tag")! as URL,
                                        cachePolicy: .useProtocolCachePolicy,
                                    timeoutInterval: 10.0)
request.httpMethod = "GET"
request.allHTTPHeaderFields = headers

let session = URLSession.shared
let dataTask = session.dataTask(with: request as URLRequest, completionHandler: { (data, response, error) -> Void in
  if (error != nil) {
    print(error as Any)
  } else {
    let httpResponse = response as? HTTPURLResponse
    print(httpResponse)
  }
})

dataTask.resume()
```