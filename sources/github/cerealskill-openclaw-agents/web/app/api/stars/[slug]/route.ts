import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error('Upstash Redis not configured')
  return { url, token }
}

async function redisCmd(cmd: unknown[]) {
  const { url, token } = getRedis()
  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cmd),
  })
  const data = await res.json()
  return data.result
}

async function rGet(key: string): Promise<string | null> {
  return redisCmd(['GET', key])
}

async function rSet(key: string, value: number) {
  return redisCmd(['SET', key, value])
}

async function rIncr(key: string) {
  return redisCmd(['INCR', key])
}

// GET /api/stars/[slug] — public
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()

    const totalRaw = await rGet(`stars:${slug}`)
    const countRaw = await rGet(`votes:${slug}`)
    const total = totalRaw ? Number(totalRaw) : 0
    const count = countRaw ? Number(countRaw) : 0

    let userVote = 0
    if (session?.user?.email) {
      const v = await rGet(`vote:${slug}:${session.user.email}`)
      userVote = v ? Number(v) : 0
    }

    return NextResponse.json({ total, count, userVote })
  } catch (err) {
    console.error('stars GET error:', err)
    return NextResponse.json({ total: 0, count: 0, userVote: 0 })
  }
}

// POST /api/stars/[slug] — authenticated
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await params
    const { stars } = await request.json()

    if (!stars || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Stars must be 1-5' }, { status: 400 })
    }

    const userKey = `vote:${slug}:${session.user.email}`
    const prevRaw = await rGet(userKey)
    const prevVote = prevRaw ? Number(prevRaw) : 0

    const totalRaw = await rGet(`stars:${slug}`)
    const currentTotal = totalRaw ? Number(totalRaw) : 0
    const newTotal = Math.max(0, currentTotal - prevVote + stars)

    await rSet(`stars:${slug}`, newTotal)
    await rSet(userKey, stars)

    let count = 1
    if (prevVote === 0) {
      count = Number(await rIncr(`votes:${slug}`))
    } else {
      const c = await rGet(`votes:${slug}`)
      count = c ? Number(c) : 1
    }

    return NextResponse.json({ total: newTotal, userVote: stars, count })
  } catch (err) {
    console.error('stars POST error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
