# GCP

Run your assistant on a Compute Engine VM in your own Google Cloud Platform (GCP) project.

It keeps your assistant running after you close your laptop, on a machine and a disk you own. This is the VPS approach: you create the VM, install Vellum on it, and reach it through a tunnel.

[Prefer to watch? How to set up a Vellum AI assistant on Google Cloud VPS/VM · 11 min watch](https://www.youtube.com/watch?v=7kwHOvhk8Nk)

## What you need

- A GCP project with billing enabled, and the `gcloud` CLI.
- An API key for the LLM provider of your choice, on hand.
- About 15 minutes.

## Provision the VM

1. **Set up gcloud and the project.** Install the CLI from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install), then:

   ```
   gcloud init
   gcloud projects create my-assistant-project
   gcloud config set project my-assistant-project
   gcloud services enable compute.googleapis.com
   ```

   Enable billing in the [Billing console](https://console.cloud.google.com/billing), or Compute Engine won't start an instance.

2. **Create the VM.** `e2-standard-4` (4 vCPU, 16 GB) is a comfortable default; `e2-standard-2` works for light use. Pick a zone near you. 20 GB of disk is plenty to start; boot disks can be grown later, never shrunk.

   ```
   gcloud compute instances create vellum-assistant \
     --zone=us-central1-a \
     --machine-type=e2-standard-4 \
     --boot-disk-size=20GB \
     --image-family=debian-12 \
     --image-project=debian-cloud
   ```

   **Note:** an always-on VM bills continuously, so check Google's [pricing calculator](https://cloud.google.com/products/calculator) for what your choices cost per month.

3. **SSH in.** Key propagation takes a minute or two after the VM is created, so retry if the first attempt is refused.
   ```
   gcloud compute ssh vellum-assistant --zone=us-central1-a
   ```

## Install and hatch

Everything from here runs on the VM.

1. **Install Vellum and its dependencies.**
   ```
   # Bun's installer needs curl and unzip
   sudo apt-get update
   sudo apt-get install -y curl unzip git

   # Vellum ships as a Bun package, so Bun needs to be installed
   curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.11"
   source ~/.bashrc

   # Install Vellum itself
   bun install -g vellum
   ```

2. **Hatch the assistant.**

   ```
   vellum hatch
   ```

   You'll be asked to pick an LLM provider and enter an API key for it. It then starts the assistant and gateway, and prints a local runtime URL like `http://127.0.0.1:7830`.

3. **Talk to it.** Your assistant is alive! Message it interactively from the terminal and confirm everything works.
   ```
   vellum client
   ```

4. **(Optional) Pair for remote access.** So far the assistant is only reachable via CLI from the VM itself. You can set up a tunnel, then pair to it from your phone or laptop. To learn more, see [Pair a device](/docs/hosting-options/pair-a-device).

## Day to day

- `vellum ps` shows what's running; `vellum wake` and `vellum sleep` start and stop it, keeping the workspace on disk.
- If you paired any devices, `vellum devices` lists them and `vellum devices revoke <id>` cuts one off.

Nothing restarts on its own after a VM reboot. Bring the assistant back with `vellum wake`, and restart your tunnel too if you set one up.

Stopping the instance keeps the disk and everything on it. Deleting it takes the workspace too, unless you kept the disk.

## Troubleshooting

- Creating the VM fails

  New projects start with low CPU quotas, and a zone can run out of a machine type. A quota error means you need more CPUs in that region; a zone-capacity error means the type isn't available there right now. Retry in another zone (`--zone=us-central1-b`) or with a smaller `--machine-type`.

- SSH won't connect, or the installs on the VM fail

  Some organizations block external IP addresses by policy. A VM without one is reachable through Identity-Aware Proxy, by adding `--tunnel-through-iap` to `gcloud compute ssh`, but it also has no outbound internet until someone configures Cloud NAT, which is what makes `apt-get` and the Bun installer hang or fail.

- `vellum`: command not found

  Bun's install directory isn't on your `PATH` in this shell. Open a new SSH session, or run `source ~/.bashrc`.
