> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Install

> Install the Moldable CLI.

Install the `moldable` CLI using the prebuilt release for your OS and architecture.

## Prebuilt release

Download the latest release for your OS and architecture, unzip it, and place the extracted folder somewhere stable (it contains `moldable` plus bundled runtime dependencies under `vendor/`).

Example (macOS/Linux):

```bash theme={null}
# Replace with the correct URL for your release asset
curl -L -o moldable.tgz <release-asset-url>
tar -xzf moldable.tgz

# The archive extracts a folder like `moldable-<version>-<target>/`
sudo mkdir -p /opt/moldable
sudo rm -rf /opt/moldable/current
sudo mv moldable-* /opt/moldable/current
sudo ln -sf /opt/moldable/current/moldable /usr/local/bin/moldable
```
