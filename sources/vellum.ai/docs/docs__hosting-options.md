# Hosting options

Your Vellum assistant needs a computer to run on. Which computer, and who manages it, is the hosting decision. The right choice depends on what matters most to you.

There are two primary options available today, **Vellum Cloud** (recommended) and **Local**, plus advanced self-hosted paths for technical users. This page explains all of them so you can make an informed choice.

## The three dimensions

Every hosting option is a tradeoff between three things:

#### Ease of use

How much setup and maintenance is required? Does Vellum handle the infrastructure, or do you?

#### Privacy

Where does your data live? Does it pass through Vellum's servers, or does it stay entirely on hardware you control?

#### Security

How isolated is the assistant from your personal files and system? What's the blast radius if something goes wrong?

No single option wins on all three. The more convenient the setup, the more you're trusting someone else with your data. The more private the setup, the more you're managing yourself.

## The options

There are two primary hosting options available today, plus advanced self-hosted paths for users who want full control.

### Vellum CloudRecommended

Your assistant runs entirely on Vellum's secure infrastructure. Ready out of the box. No local setup, no servers to manage, no hardware requirements. Just sign in and go.

- **Ease of use:** The best. Minimal setup, Vellum handles everything.
- **Privacy:** Your data lives in your private, encrypted Vellum Cloud account. If keeping your data off third-party infrastructure is a priority, consider Local instead.
- **Security:** Arguably the most secure option for the user. The assistant runs completely sandboxed in Vellum's cloud, not on any of your hardware. If something goes wrong, the blast radius is contained to our infrastructure, not yours.
- **Availability:** Always on, 24/7. Your assistant is available even when your computer is off or asleep, reachable from web, desktop, mobile, voice, and chat channels.

### Local

Your assistant runs on your Mac or Windows PC. Your workspace stays on your machine, with direct access to local files and tools. Prompts and relevant context are still sent to your configured AI model provider.

- **Native**: The assistant runs directly as a process on your Mac or Windows PC. It's the simplest local setup and gives the assistant full access to your system.
- **Docker** Coming soon — The assistant runs inside a Docker container on your Mac. Better isolation than native, but requires Docker to be installed and running.
- **Apple Container** Coming soon — Runs on native Apple virtual machines. No Docker required. You get isolation plus Apple's hardware optimizations and native security features.

All local options keep your data on your machine (great for privacy) and give the assistant direct access to your files and tools (great for power). The tradeoff: the assistant is only available when your computer is awake.

### User-Hosted Remote

Your assistant runs on cloud infrastructure that you own and manage: your GCP project, or even a Mac Mini running at home that you connect to remotely.

- **Ease of use:** The most setup required. You manage the infrastructure, credentials, and networking.
- **Privacy:** Your data stays on your infrastructure. Nothing passes through Vellum's servers.
- **Security:** You control the isolation level, but you also bear the responsibility for it.

This is the option for technical users who want full control and 24/7 availability without relying on Vellum's infrastructure.

## Which should I choose?

#### Most people: Vellum CloudRecommended

It's always on, there's nothing to maintain, you don't need to buy extra hardware, and we'll continue building features (like host computer use) to bridge any functional gaps between cloud and local. For the vast majority of users, this is the right answer.

#### Privacy-conscious users: Local

If keeping your data off third-party servers is a priority, local is the way to go. Today that means native. Once available, Apple Container on your Mac (or a dedicated Mac Mini) will be the best local option, giving you both privacy and better isolation.

#### Technical users who want full control: User-Hosted Remote

If you want 24/7 availability, full data ownership, and you're comfortable managing cloud infrastructure, deploy to your own GCP project. It's more work to set up, but you get the best of both worlds: always-on and self-managed.

## Explore hosting paths

### [Cloud hosting](/docs/hosting-options/cloud-hosting)

[Always-on, sandboxed per account, reachable from web, desktop, voice, and chat. The recommended path.](/docs/hosting-options/cloud-hosting)

### [Local hosting](/docs/hosting-options/local-hosting)

[Native, Docker, and Apple Container. How local hosting works, the flavors, and tradeoffs.](/docs/hosting-options/local-hosting)

### [GCP](/docs/hosting-options/gcp)

[Step by step: provision a Compute Engine VM, hatch on it, and reach it from your phone and laptop.](/docs/hosting-options/gcp)
