> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Moldable Gateway

> The local gateway/runtime for Moldable.

<div className="flex items-center">
  <img src="https://mintcdn.com/desideratallc/ctjcdahTraCR8Yi4/assets/logo-full.svg?fit=max&auto=format&n=ctjcdahTraCR8Yi4&q=85&s=d3cb431ef86949aa9528ee5c4ae95b06" alt="Moldable Gateway" className="moldable-logo-full block dark:hidden" width="780" height="122" data-path="assets/logo-full.svg" />

  <img src="https://mintcdn.com/desideratallc/ctjcdahTraCR8Yi4/assets/logo-full-dark.svg?fit=max&auto=format&n=ctjcdahTraCR8Yi4&q=85&s=8025b86c8ca280e26f0c395e188c1a0d" alt="Moldable Gateway" className="moldable-logo-full hidden dark:block" width="780" height="122" data-path="assets/logo-full-dark.svg" />
</div>

<p className="mt-2 text-sm text-gray-500">
  <a href="https://moldable.sh" className="text-orange-600 hover:underline">
    Moldable
  </a>

  {" "}

  is local, private, personal software that's built for change — powered by AI and shaped by
  conversation.
</p>

***

Moldable Gateway is the local gateway/runtime for Moldable. It connects messaging channels (like Telegram and WhatsApp Cloud) to your configured AI backend, and keeps the control plane and state on your machine.

It's designed to be simple, secure, and extensible.

## Quickstart

Install the `moldable` CLI and make sure it is on your `PATH`. See [Install](/install).

```bash theme={null}
moldable onboard
moldable gateway run
moldable gateway pair list
moldable gateway pair approve telegram <code>
```

During onboarding you will:

* Choose a recommended setup:
  * Just me (this computer only)
  * Local network (other devices on same Wi-Fi)
  * Remote access with a tunnel
  * Telegram (local-only)
  * Webhooks (e.g. WhatsApp Cloud)
* Optionally customize advanced settings (bind, auth, DM policy)
* Enable channels and enter credentials (Telegram or WhatsApp Cloud)
* Configure the AI adapter (URL, optional model, reasoning effort)

## Start here

* [Install](/install)
* [Overview](/core/overview)
* [Getting started](/getting-started)
* [Configuration](/core/configuration)
* [CLI reference](/ops/cli)
* [Security and pairing](/core/security-and-pairing)

## Browse by area

* [Core](/core)
* [Ingress](/ingress)
* [Runtime](/runtime)
* [Ops](/ops)

## Learn the concepts

* [Gateway architecture](/core/architecture)
* [Message flow](/core/message-flow)

## Use the adapters

* [Channels](/channels)
* [AI adapters](/ai)

## Operate the gateway

* [Sessions and storage](/core/sessions-and-storage)
* [Operations](/ops)
* [State paths](/core/state-paths)
