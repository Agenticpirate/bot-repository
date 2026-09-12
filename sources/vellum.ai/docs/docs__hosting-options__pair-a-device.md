# Pair a device

Reach a self-hosted assistant from your phone or another computer.

[Prefer to watch? How to use your locally hosted AI assistant on mobile · 3 min watch](https://www.youtube.com/watch?v=LL8N3j91Yg4)

## Overview

A self-hosted assistant runs on one computer, and by default that is the only place you can talk to it. Two pieces of setup let another device reach it:

- **A tunnel** gives your assistant an https address other devices can reach. You start it once and leave it running.
- **A pairing** gives one device permission to use that address. Every device is paired and revoked separately.

**You connect through your own address, not through vellum.ai.** The tunnel URL serves the Vellum web app pointed at your assistant, so a paired device talks straight to your machine. Conversations never pass through Vellum's servers.

## Before you start

Your assistant has to be running on the computer that hosts it. `vellum ps` to check, `vellum wake` to start it. No assistant yet? See [Local hosting](/docs/hosting-options/local-hosting).

## Install nginx

Tunnels run through nginx. Vellum starts it for you, but won't install it. Run this on the computer hosting your assistant.

macOSLinux

```
brew install nginx
```

```
sudo apt-get update
sudo apt-get install -y nginx

# nginx lands in /usr/sbin, which isn't on PATH for non-root users
echo 'export PATH="$PATH:/usr/sbin"' >> ~/.bashrc && source ~/.bashrc
```

## Set up a tunnel provider

**ngrok** gives your assistant a public https address, so any phone or laptop can open it with nothing installed on that device.

**Tailscale** keeps the address off the public internet, which is more private but costs you two things. Every device you pair needs Tailscale installed and signed in, phone included. And a Tailscale address can't receive inbound webhooks, so channels like Telegram and Twilio still need a public tunnel alongside it. Vellum leaves an existing one in place and uses the Tailscale address for pairing only.

Either way, a device still has to be paired and approved before it can do anything. If you're not sure, start with ngrok.

### ngrokRecommended

1. **Create a free account** at [ngrok.com](https://ngrok.com).

2. **Install the agent.**

   macOSLinux

   ```
   # Install ngrok
   brew install ngrok/ngrok/ngrok

   # Confirm it's there
   ngrok --version
   ```

   ```
   # ngrok ships as a snap. Ubuntu Desktop has snapd already, but
   # Debian and most server images don't.
   sudo apt update
   sudo apt install -y snapd

   # Install ngrok
   sudo snap install ngrok

   # snap links binaries into /snap/bin, which isn't on PATH by default
   echo 'export PATH="$PATH:/snap/bin"' >> ~/.bashrc && source ~/.bashrc

   # Confirm it's there
   ngrok --version
   ```

3. **Add your authtoken** from the [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) page in the dashboard:
   ```
   ngrok config add-authtoken <your-token>
   ```

4. **(Optional) Claim a static domain.** Without one, ngrok issues a new URL every time the tunnel restarts, and your paired devices keep pointing at the old one. Restarts are easy to trigger: a reboot, a Ctrl+C, or a `vellum wake`. Reserving a domain on the [Domains](https://dashboard.ngrok.com/domains) page saves you re-pairing each time. Note the one you pick; you'll pass it to Vellum in the next section.

### Tailscale

1. **Create a free account** at [tailscale.com](https://tailscale.com), install it on the host machine (`brew install tailscale`), and run `tailscale up` to sign in. Your machine gets a stable name like `your-mac.tailnet-name.ts.net`.
2. **Turn on HTTPS certificates.** In the admin console, open DNS and enable HTTPS Certificates (see [Enabling HTTPS](https://tailscale.com/kb/1153/enabling-https) in the Tailscale docs). Without it the tunnel command fails, though it prints Tailscale's own link to switch them on.
3. **Install Tailscale on every device you want to pair.** Miss this and the pairing link simply won't open: the address doesn't resolve outside your network.

## Start the tunnel

Run this on the computer hosting the assistant. For ngrok, pass [the domain](https://dashboard.ngrok.com/domains) you reserved:

```
vellum tunnel --provider ngrok --domain your-assistant.ngrok.app -d
```

For Tailscale:

```
vellum tunnel --provider tailscale -d
```

`-d` runs the tunnel in the background, so it survives closing the terminal. It has to stay up for as long as you want remote access.

Either way the command waits for the tunnel to come up, then prints `Tunnel established:` with the address your devices will use, where it is logging, and the `kill` command that stops it again. Vellum saves that address so the pairing steps below fill it in for you, and remembers your ngrok domain so later runs don't need `--domain`.

## Pair your device

The last step is to pair the device, and the easiest route is the desktop app on the host computer. Open Vellum there and go to Settings → General → Pair a device.

The card confirms your tunnel is reachable, then Generate pairing QR gives you a QR code to scan from a phone and a link you can open on another computer. Codes work once and expire after 10 minutes, so generate a fresh one per device.

Scanning finishes the job. The host approved that code when it created it, so there is nothing to confirm and no code to type. With the Vellum mobile app installed, the page offers to hand the pairing over to it.

The card only appears on the machine running the assistant, since being there is what authorizes the pairing. Once paired, a device stays paired across reloads, though only while the tunnel is up: pairing grants access to your tunnel address, not a separate route in.

### Other ways to pair

**Start from the device itself.** Open your [tunnel address](#start-the-tunnel) on the device. It lands on the pairing page, shows a short code, and waits. On the host, the request appears under Pairing requests in the same card. Check that code against the device's screen before approving: the match is what proves the request came from your device. Or approve from a shell with `vellum pair --web-approve <code>`.

**No desktop app on the host.** If you hatched the assistant over SSH on a VPS, pair from the CLI instead. It prints a pairing link and the same link as a QR code, using the address from `vellum tunnel`:

```
vellum pair
```

Add `--app` to point the QR at the mobile app instead of a browser, `--url` to pair against a different address, `--label` to name the pairing, or `--json` for scripting.

**Pair another computer.** A second machine with the `vellum` CLI joins with that link rather than a browser, and `vellum pair` prints the exact command to run under it. The link already carries an approved code, so the import finishes right away and registers the assistant locally for `vellum client`:

```
vellum connect import "https://your-assistant.ngrok.app/assistant/pair#device_code=..."
```

No link handy? Give it your tunnel address on its own. That machine mints its own code, prints it, and waits for you to approve it on the host, from Pairing requests in the card or with `vellum pair --web-approve <code>`:

```
vellum connect import https://your-assistant.ngrok.app
```

Ctrl+C on the waiting machine stops only that side. The request stays in the host's pending list, still approvable, until it expires 10 minutes after it was minted. To withdraw it sooner, click Deny beside it in the Pair a device card; the CLI has no deny command.

## Revoke a device

Revoking happens on the host. To see what's paired to it:

```
vellum devices
```

Each row shows the device type, pairing and last-used dates, and a hashed id. That hash is what you revoke with:

```
vellum devices revoke 3f9a1c...
```

Confirm the prompt (`--yes` skips it) and that device loses access immediately; it has to be paired again to return. The row marked This machine is the host's own credential and can't be revoked.

Two things that look like revoking but aren't:

- `vellum unpair <name>` runs on the paired machine and only forgets the connection there. The host still trusts it.
- Stopping the tunnel cuts everything off at once, but revokes nothing: it all reconnects when the tunnel returns.

A Paired devices list with the same revoke button is rolling out in the Pair a device card. Until it reaches your build, use the CLI.

## Troubleshooting

- My phone worked yesterday and can't connect today

  The tunnel isn't running, or the address changed. On ngrok without a reserved domain it changes on every restart: reserve one, pass it once with `--domain`, and pair again.

- I get an ngrok warning page instead of my assistant

  Expected on the free plan, on a browser's first visit. Tap through it.

- Pairing says it needs a public https address

  No tunnel is running yet. Vellum won't build a pairing code around a `localhost` address, which would point the phone back at itself.

- “tailscale serve failed”

  Usually HTTPS certificates aren't enabled for your tailnet; the error carries Tailscale's link to switch them on. If it says Tailscale isn't logged in, run `tailscale up`.

- On Tailscale, the other device can't open the link

  That device needs Tailscale installed and signed in to the same account. Tailscale addresses don't resolve anywhere else.

- “Pairing expired”

  Codes last 10 minutes and work once. Generate a fresh one from the settings card or with `vellum pair`.
