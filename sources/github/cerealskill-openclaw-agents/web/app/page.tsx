import { getAllAgentsMeta } from '@/lib/agents'
import { getAllWorkflows } from '@/lib/workflows'
import { getAllTeams } from '@/lib/teams'
import HomeContent from '@/components/HomeContent'

async function getStars(): Promise<number | null> {
  try {
    const res = await fetch('https://api.github.com/repos/cerealskill/openclaw-agents', {
      next: { revalidate: 300 },
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.stargazers_count ?? null
  } catch {
    return null
  }
}

export default async function Home() {
  const agents = getAllAgentsMeta()
  const workflows = getAllWorkflows()
  const teams = getAllTeams()
  const stars = await getStars()

  return <HomeContent agents={agents} workflows={workflows} teams={teams} stars={stars} />
}
