> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Integrate Custom Models in Your Vellum Workspace Easily

> Learn how to add both private and public custom models to your Vellum workspace for enhanced functionality and domain-specific advantages.

Vellum supports several of the industry's most popular models by default available in your workspace right away. However, you may wish to use a custom model that gives your business some additional advantage not provided by these off the shelf models, such as higher rate limits or more domain-specific training. These models can also be set up for use within Vellum!

Custom models fall under two categories: *private* models and *public* models. Both could be added via the `Models` tab within Vellum.

![Models Tab](https://storage.googleapis.com/vellum-public/help-docs/models-tab.png)

## Adding Private Models

Private models are *new* instances of models that were created by you outside of Vellum and are looking to integrate into the platform. When you navigate to the models page, the supported types of private models will be accessible from a section on the top of the page:

![Adding Private Custom Models](https://storage.googleapis.com/vellum-public/help-docs/supported-private-models.png)

Clicking on one of the templates will take you to an onboarding flow on how to connect your private model to Vellum. Once you've completed the pre-requisite steps and add in the requested form info, your model should be successfully added to your workspace!

We currently support the following private Model Templates:

* OpenAI models hosted on Azure
* OpenAI fine-tuned models
* Fine-tuned models hosted on Fireworks AI

## Adding Public Models

Public models are *shared* instances of models that are hosted by model providers and are granted access to them by various authentication schemes, most commonly via an API Token. Some are enabled in your workspace by default when you create a new workspace in Vellum. To find other public models not yet enabled in your workspace, navigate to the models page and scroll down to the `Available Models` section:

![Adding Public Custom Models](https://storage.googleapis.com/vellum-public/help-docs/public-models.png)

To help filter the options, you could select just `Available` in the drop down on the right or use the search bar to look for the specific model of interest.

While most of these models require just adding your API key from the relevant model provider, some like those from `AWS Bedrock` will require some additional steps taken within your account. These directions will be laid out within each model's onboarding modal when you click to enable them in your workspace.

## Request a Model

Don't see a custom model listed here but want to try it within Vellum? Reach out to us on Slack for support!