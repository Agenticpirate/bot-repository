# Local hosting

[Prefer to watch? How to setup a locally hosted Vellum AI assistant in under 5 minutes · 3 min watch](https://www.youtube.com/watch?v=SJgflx6XDeQ)

## Overview

Most users should run on [Vellum Cloud](/docs/hosting-options). If you want local instead, this page is for you.

Local hosting means your assistant runs on your Mac or Windows PC. Your data stays on your machine, the assistant has direct access to your files and tools, and there's no cloud infrastructure to manage. The tradeoff: it's only available when your computer is awake.

Today, local hosting uses native (the assistant runs directly as a process on your Mac or Windows PC). Docker and Apple Container options are on the roadmap and will provide better isolation while keeping everything local.

## The flavors

### NativeAvailable now

The assistant runs directly as a process on your Mac or Windows PC. No containers, no virtual machines. Choose local hosting in the desktop app; installing the app alone does not switch a cloud assistant to local hosting.

- Pros

  Fastest setup, lowest latency, full access to local files and tools, maximum privacy (data never leaves your machine).

- Cons

  Least isolated. The assistant is running on your actual system with fewer security boundaries. If something goes wrong, the blast radius includes your machine.

### DockerComing soon

The assistant runs inside a Docker container on your Mac. Think of it as a computer inside your computer. The assistant has its own isolated environment with its own filesystem, and it's walled off from the rest of your system.

- Pros

  Better isolation than native, reproducible environment, data stays local.

- Cons

  Requires Docker to be installed and running. Slightly more setup than native.

### Apple ContainerComing soon

Similar to Docker, but runs on native Apple virtual machines. You get container-level isolation without needing to install Docker, plus Apple's hardware optimizations and native security features.

- Pros

  No Docker dependency, native Apple security and hardware optimization, strong isolation, data stays local.

- Cons

  Requires macOS with Apple silicon. Slightly more setup than native.

## Comparison

| Flavor          | Isolation | Setup    | Dependencies          | Status      |
| --------------- | --------- | -------- | --------------------- | ----------- |
| Native          | Minimal   | Easiest  | None                  | Available   |
| Docker          | Container | Moderate | Docker Desktop        | Coming soon |
| Apple Container | VM        | Moderate | macOS + Apple silicon | Coming soon |

## When local is the right choice

- You care a lot about data privacy and want nothing leaving your machine.
- You want the assistant to have direct access to your local files, tools, and system.
- You're developing and iterating quickly and want the fastest feedback loop.
- You prefer keeping runtime data on hardware you physically control.

If you need 24/7 availability or want the assistant sandboxed away from your personal machine, check out [Hosting options](/docs/hosting-options) for Vellum Cloud and User-Hosted Remote.

## The availability tradeoff

With any local option, the assistant is only available when your computer is awake. If your computer is asleep or shut down, scheduled tasks won't fire and the assistant can't respond until it wakes back up.

For most people using their primary computer, this means the assistant works great during the workday and whenever the computer is active. If you need always-on availability without buying dedicated hardware, Vellum Cloud is the better fit.

## What's next for local

Docker and Apple Container options are in development. Once they ship and stabilize, native local may be phased out in favor of the containerized options, which offer much better security isolation while keeping all the same privacy and access benefits.

If you're on native today, you won't need to do anything disruptive. Migration paths will be provided when the time comes.
