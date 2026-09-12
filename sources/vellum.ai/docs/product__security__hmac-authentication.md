> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# HMAC Authentication

> This guide will walk you through the process of setting up and using HMAC authentication in Vellum.

This guide will walk you through the process of setting up and using HMAC authentication in Vellum. HMAC authentication provides an additional layer of security for outgoing API calls and webhooks.

## Setup

1. **Create a new secret token securely:** You can do this in Python using the `secrets` module. Here's a simple example:

   #### Python Secret Token Generation

   ```python
   import secrets
   print(secrets.token_hex(16))
   ```

2. **Provide your secret token to Vellum:** Navigate to [Workspace Settings](https://app.vellum.ai/organization?tab=workspaces\&workspace-settings-tab=environments). Click the "Provide HMAC Token" button and enter your secret token.

## When HMAC is Applied

HMAC authentication is automatically applied to specific types of outgoing requests from Vellum, but not all.

### Automatic HMAC Application

HMAC signatures are **automatically included** in the following scenarios:

* **[API Nodes](/product/workflows/nodes/api-node)** in Workflows making HTTP requests to external services
* **[Webhooks](/product/monitoring/webhooks)** configured in your Vellum organization settings

### Manual HMAC Implementation Required

HMAC signatures are **NOT automatically included** for :

* **[Code Execution Nodes](/product/workflows/nodes/code-execution-node)** in Workflows

  If you need to make authenticated requests from within a Code Execution Node, you'll need to implement HMAC signature generation yourself.

  #### Manual HMAC Implementation in Code Execution Node

  Consider also storing your HMAC secret as a [Workspace Secret](/product/workflows/nodes/api-node#secrets) for secure
  access within your Code Execution Nodes.

  #### Manual HMAC Implementation in Code Execution Node

  ```python
  import hmac
  import hashlib
  import time
  import requests

  def generate_hmac_headers(secret: str, method: str, url: str, body: str = ""):
      timestamp = str(int(time.time()))
      message = f"{timestamp}\n{method}\n{url}\n{body}"

      hash_object = hmac.new(secret.encode(), msg=message.encode(), digestmod=hashlib.sha256)
      signature = hash_object.hexdigest()

      return {
          'X-Vellum-Timestamp': timestamp,
          'X-Vellum-Signature': signature
      }

  # Example usage in a Code Execution Node
  def main():
      secret = "your-hmac-secret"  # Store this securely
      method = "POST"
      url = "https://your-api.com/endpoint"
      body = '{"key": "value"}'

      headers = generate_hmac_headers(secret, method, url, body)
      headers['Content-Type'] = 'application/json'

      response = requests.post(url, data=body, headers=headers)
      return response.json()
  ```

## Verifying HMAC Signatures

When Vellum automatically applies HMAC authentication, each request will contain two headers: `X-Vellum-Timestamp` and `X-Vellum-Signature`.
You can reference these headers to verify the authenticity of requests made to your service from Vellum.

### Verification Steps

1. **Verify the timestamp:** Check that the value of `X-Vellum-Timestamp` is within the last 60 seconds.

2. **Create the message string:** Concatenate the following values together, separated by one newline character, into a new string `message`:

   * `X-Vellum-Timestamp`
   * The request method (GET, POST, etc)
   * The request URL
   * The request body

   #### Python HMAC Content

   ```python
   message = f"{timestamp}\n{method}\n{url}\n{body}"
   ```

3. **Verify the signature.** Use the [HMAC](https://en.wikipedia.org/wiki/HMAC) algorithm with SHA-256 to verify the authenticity of `X-Vellum-Signature`.

   #### Python HMAC Signature Verification Example

   ```python
   import hmac
   import hashlib

   def verify(message: str, secret: str, signature: str) -> bool:
       hash_object = hmac.new(secret.encode(), msg=message.encode(), digestmod=hashlib.sha256)
       expected_signature = hash_object.hexdigest()
       return hmac.compare_digest(expected_signature, signature)
   ```