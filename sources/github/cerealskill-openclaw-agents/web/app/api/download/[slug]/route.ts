import { NextRequest, NextResponse } from 'next/server'
import { getAgentBySlug, BUNDLE_FILES } from '@/lib/agents'
import * as tar from 'tar-stream'
import { createGzip } from 'zlib'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const agent = getAgentBySlug(slug)

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  const pack = tar.pack()

  // Add each bundle file
  for (const filename of BUNDLE_FILES) {
    const content = agent.files[filename] ?? ''
    pack.entry({ name: `${slug}/${filename}` }, content)
  }

  pack.finalize()

  // Gzip the tar stream
  const gzip = createGzip()
  pack.pipe(gzip)

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    gzip.on('data', (chunk: Buffer) => chunks.push(chunk))
    gzip.on('end', resolve)
    gzip.on('error', reject)
  })

  const buffer = Buffer.concat(chunks)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${slug}.tar.gz"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
