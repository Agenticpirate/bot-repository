#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const AI_ELEMENTS = new Set([
  "agent",
  "artifact",
  "attachments",
  "audio-player",
  "canvas",
  "chain-of-thought",
  "checkpoint",
  "code-block",
  "commit",
  "confirmation",
  "connection",
  "context",
  "controls",
  "conversation",
  "edge",
  "environment-variables",
  "file-tree",
  "image",
  "inline-citation",
  "jsx-preview",
  "message",
  "mic-selector",
  "model-selector",
  "node",
  "open-in-chat",
  "package-info",
  "panel",
  "persona",
  "plan",
  "prompt-input",
  "queue",
  "reasoning",
  "sandbox",
  "schema-display",
  "shimmer",
  "snippet",
  "sources",
  "speech-input",
  "stack-trace",
  "suggestion",
  "task",
  "terminal",
  "test-results",
  "tool",
  "toolbar",
  "transcription",
  "voice-selector",
  "web-preview",
]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArguments() {
  const args = process.argv.slice(2);
  const cwdIndex = args.indexOf("--cwd");
  const cwd = cwdIndex === -1 ? process.cwd() : args[cwdIndex + 1];

  if (!cwd) fail("--cwd requires a directory.");

  const components = args.filter((argument, index) => {
    if (argument === "--cwd") return false;
    if (cwdIndex !== -1 && index === cwdIndex + 1) return false;
    return true;
  });

  if (components.length === 0) fail("Pass at least one AI Element name.");

  const resolvedComponents = components.includes("all") ? [...AI_ELEMENTS] : components;
  const invalid = resolvedComponents.filter((component) => !AI_ELEMENTS.has(component));

  if (invalid.length > 0) fail(`Unknown AI Element: ${invalid.join(", ")}`);

  return { cwd, components: resolvedComponents };
}

function isolateImports(source) {
  return source
    .replaceAll('"~/components/ui/', '"~/components/ai-elements/ui/')
    .replaceAll("'~/components/ui/", "'~/components/ai-elements/ui/")
    .replaceAll('"@/components/ui/', '"@/components/ai-elements/ui/')
    .replaceAll("'@/components/ui/", "'@/components/ai-elements/ui/");
}

function ignoreVendoredElements(cwd) {
  const oxlintPath = join(cwd, ".oxlintrc.json");
  if (!existsSync(oxlintPath)) return;

  const source = readFileSync(oxlintPath, "utf8");
  if (source.includes('"app/components/ai-elements/**"')) return;

  const marker = '"node_modules/**",';
  if (!source.includes(marker)) return;

  writeFileSync(oxlintPath, source.replace(marker, `${marker}\n\t\t"app/components/ai-elements/**",`));
}

function main() {
  const { cwd, components } = parseArguments();

  if (!existsSync(join(cwd, "package.json")) || !existsSync(join(cwd, "components.json"))) {
    fail(`Expected package.json and components.json in ${cwd}.`);
  }

  const stageRoot = join(cwd, ".tmp", "customware-ai-elements-install");
  const targetRoot = join(cwd, "app", "components", "ai-elements");
  const uiTargetRoot = join(targetRoot, "ui");
  const stagePath = relative(cwd, stageRoot);

  rmSync(stageRoot, { recursive: true, force: true });

  const command = spawnSync(
    "pnpm",
    [
      "dlx",
      "shadcn@latest",
      "add",
      ...components.map((component) => `@ai-elements/${component}`),
      "--yes",
      "--path",
      stagePath,
    ],
    {
      cwd,
      env: { ...process.env, CI: "1" },
      stdio: "inherit",
    },
  );

  if (command.status !== 0) {
    rmSync(stageRoot, { recursive: true, force: true });
    fail(`shadcn exited with status ${command.status ?? "unknown"}.`);
  }

  mkdirSync(targetRoot, { recursive: true });
  mkdirSync(uiTargetRoot, { recursive: true });

  for (const fileName of readdirSync(stageRoot)) {
    if (!fileName.endsWith(".tsx")) continue;

    const componentName = basename(fileName, ".tsx");
    const destinationRoot = AI_ELEMENTS.has(componentName) ? targetRoot : uiTargetRoot;
    const source = readFileSync(join(stageRoot, fileName), "utf8");

    writeFileSync(join(destinationRoot, fileName), isolateImports(source));
  }

  rmSync(stageRoot, { recursive: true, force: true });
  ignoreVendoredElements(cwd);

  process.stdout.write(`Installed ${components.length} AI Element${components.length === 1 ? "" : "s"}.\n`);
}

main();
