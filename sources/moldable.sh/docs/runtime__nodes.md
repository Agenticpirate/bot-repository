> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Nodes

> Pairing and runtime for connected nodes.

Nodes are devices/agents that connect to the gateway runtime; pairing authorizes them and stores a token for future connections.

Nodes are primarily used by higher-level tooling that needs explicit operator approval for device pairing.

## Example

If a node requests pairing, approve it with:

```bash theme={null}
moldable gateway node pair-list
moldable gateway node pair-approve <node-id>
```

## Node pairing

Node pairing is an explicit approval step. Until a node is approved, it cannot be used.

## Useful commands

```bash theme={null}
moldable gateway node pair-list
moldable gateway node pair-approve <node-id>
moldable gateway node pair-reject <node-id>
moldable gateway node runtime-list
moldable gateway node invoke <node-id> "<command>"
```
