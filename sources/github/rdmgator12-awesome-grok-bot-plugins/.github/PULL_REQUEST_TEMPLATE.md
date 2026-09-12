<!--
Thanks for contributing! Please confirm the checklist below before submitting.
Entries that don't follow the format will be closed.
-->

## What you're adding

<!-- One line summary -->

## Entry format

Entries live in `data/plugins.json` -- the README is generated from it (see CONTRIBUTING.md). Add an object like:

```json
{
  "name": "Name",
  "url": "https://example.com",
  "marker": null,
  "category": "Existing Category",
  "description": "One-sentence description ending with a period.",
  "use_case": "A concrete scenario or 2-3 comma-separated scenarios that do not restate the description; no \"your\"/\"our\"."
}
```

Then run `python3 scripts/generate_readme.py` and commit the JSON and README together. Sorting is automatic; dedupe and format are validated for you.

## Checklist

- [ ] Plugin is publicly listed in the Grok Bot in-app marketplace (Settings, Plugins)
- [ ] Entry added to `data/plugins.json` with the correct existing catalog category
- [ ] Description is one sentence, no marketing language, ends with a period
- [ ] `use_case`: one sentence, 1-3 concrete comma-separated scenarios, not a restatement of the description
- [ ] Link uses HTTPS and points to the vendor product page (marketplace only if none exists)
- [ ] `python3 scripts/generate_readme.py` run, `README.md` committed with the data
- [ ] `awesome-lint` passes locally (`npx awesome-lint@2.3.0`)

## Notes

<!-- Anything reviewers should know -->
