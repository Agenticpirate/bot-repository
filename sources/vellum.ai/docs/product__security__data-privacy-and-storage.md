> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Data Privacy and Storage

> Learn about Vellum's data storage, encryption, and privacy practices, including how interactions are stored and how data is handled.

This page outlines Vellum's approach to data storage, encryption, and privacy, addressing common questions about how your data is handled within the platform.

## Interaction Storage

### How Vellum Stores Interactions

Vellum stores all interactions (prompt executions, workflow executions, etc.) in your account to enable:

* Monitoring and observability through the Completions tab
* Debugging and troubleshooting of production issues
* Quality assessment and improvement over time
* Historical record of model performance

These interactions are accessible through the respective monitoring tabs in Prompt Deployments and Workflow Deployments, allowing you to review past executions, filter by various parameters, and analyze performance trends.

### Retention Policies

By default, interaction data is stored indefinitely. However, Enterprise customers can configure [data retention policies](/product/organizations/data-retention-policies) to automatically delete monitoring data after a specified period (30, 60, 90, or 365 days) to comply with their internal data governance requirements.

## Data Transmission to LLM Providers

### How Vellum Handles Your Data

When you execute a prompt or workflow:

1. Vellum sends the content of your prompt (including any variables and context) to the selected LLM provider (e.g., OpenAI, Anthropic, etc.) as necessary to generate a response
2. The transmission occurs via encrypted channels (TLS/HTTPS)
3. Only the data required for the specific execution is sent to the LLM provider

Vellum does not send your interaction data to LLM providers for any purpose other than generating the requested responses.

## Data Encryption

### Document Storage Encryption

All data stored in Vellum, including documents in Document Indexes, is encrypted using AES-256 GCM encryption. This industry-standard encryption protocol ensures that your sensitive information remains secure both in transit and at rest.

### Additional Security Measures

Vellum implements multiple layers of security:

* All API communications use TLS encryption
* Authentication is required for all API access
* [Role-based access control (RBAC)](/product/security/rbac-permissions) for granular permission management
* Optional [HMAC authentication](/product/security/hmac-authentication) for webhooks and outgoing API calls

## Training and Model Improvement

### Use of Interaction Data

Vellum does not send your interactions or feedback to LLM providers for training purposes. Your data is used only for:

1. Providing the services you've requested
2. Enabling the monitoring and observability features within your account

When you submit "Completion Actuals" through the [Completion Actuals API](/product/deployments/observability-in-production#capturing-end-user-feedback), this feedback is stored in your account for your own quality monitoring purposes and is not used to train or fine-tune LLMs.

## Compliance and Certifications

Vellum maintains SOC 2 Type 2 compliance and is HIPAA compliant, demonstrating our commitment to security, availability, and confidentiality. Our security practices are regularly audited to ensure they meet industry standards and healthcare data protection requirements.

For more information about Vellum's security practices or compliance certifications, please contact your account representative or email [support@vellum.ai](mailto:support@vellum.ai).