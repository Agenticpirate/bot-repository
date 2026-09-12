import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export interface ContributePayload {
  slug: string
  name: string
  description: string
  lang: string
  category: string
  subcategory: string
  tags: string[]
  model: string
  soul: string
  identity: string
  user: string
  agents: string
  heartbeat: string
  tools: string
  bootstrap: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: ContributePayload = await req.json()
  const { slug } = body

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug (lowercase letters, numbers, hyphens only)' }, { status: 400 })
  }

  const token = process.env.GITHUB_TOKEN
  const repo = 'cerealskill/openclaw-agents'
  const branch = `contrib/${slug}-${Date.now()}`
  const lang = /^(EN|ES)$/.test(body.lang ?? '') ? body.lang : 'EN'
  const basePath = `agents/${lang}/${body.category}/${body.subcategory}/${slug}`

  // Get base SHA for main
  const mainRef = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/main`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  }).then(r => r.json())
  const baseSha = mainRef.object.sha

  // Create branch
  await fetch(`https://api.github.com/repos/${repo}/git/refs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  })

  const metaYaml = `name: "${body.name}"
slug: "${slug}"
description: "${body.description}"
category: "${body.category}"
subcategory: "${body.subcategory}"
tags: [${body.tags.map(t => `"${t}"`).join(', ')}]
model: "${body.model}"
author: "${session.user.email}"
version: "1.0.0"
`

  const files: Record<string, string> = {
    'meta.yaml': metaYaml,
    'SOUL.md': body.soul,
    'IDENTITY.md': body.identity,
    'USER.md': body.user,
    'AGENTS.md': body.agents,
    'HEARTBEAT.md': body.heartbeat,
    'TOOLS.md': body.tools,
    'BOOTSTRAP.md': body.bootstrap,
  }

  // Create/update each file
  for (const [filename, content] of Object.entries(files)) {
    await fetch(`https://api.github.com/repos/${repo}/contents/${basePath}/${filename}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `feat: add agent ${slug} (${filename})`,
        content: Buffer.from(content).toString('base64'),
        branch,
      }),
    })
  }

  // Open PR
  const pr = await fetch(`https://api.github.com/repos/${repo}/pulls`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `New agent: ${body.name} (${slug})`,
      head: branch,
      base: 'main',
      body: `## New agent contribution\n\n**Name:** ${body.name}\n**Language:** ${lang}\n**Category:** ${body.category}/${body.subcategory}\n**Description:** ${body.description}\n**Tags:** ${body.tags.join(', ')}\n\n**Contributed by:** ${session.user.name} (${session.user.email})`,
    }),
  }).then(r => r.json())

  return NextResponse.json({ pr: pr.html_url, branch })
}
