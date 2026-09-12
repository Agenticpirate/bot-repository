"use client";

import {
  Snippet,
  SnippetAddon,
  SnippetCopyButton,
  SnippetInput,
  SnippetText,
} from "~/components/ai-elements/snippet";

const Example = () => (
  <div className="flex size-full items-center justify-center p-4">
    <Snippet className="max-w-sm" code="pnpm dlx shadcn@latest add @ai-elements/snippet --yes">
      <SnippetAddon className="pl-1">
        <SnippetText>$</SnippetText>
      </SnippetAddon>
      <SnippetInput />
      <SnippetAddon align="inline-end" className="pr-2">
        <SnippetCopyButton />
      </SnippetAddon>
    </Snippet>
  </div>
);

export default Example;
