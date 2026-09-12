> ## Documentation Index
> Fetch the complete documentation index at: https://docs.moldable.sh/llms.txt
> Use this file to discover all available pages before exploring further.

# Doctor

> Validate and repair gateway state and config.

Doctor is a safe, guided fixer for common config or state problems.

The doctor command validates config and checks state directories. Internally it runs a list of numbered fixes (like `001-...`, `002-...`), so new migrations can be added over time.

## Example

If your config is missing a token, `moldable doctor --repair` will generate one and write it to your config file.

## Run doctor

```bash theme={null}
moldable doctor
```

## Apply fixes

```bash theme={null}
moldable doctor --repair
```

## What it checks

* Config validity (schema + required auth fields)
* State directory presence
* Gateway token generation (when using token auth)
* Team watchdog enabled (recommended for self-healing teammate workflows)
