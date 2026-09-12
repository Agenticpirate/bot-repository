import { getAllAgents } from '@/lib/agents'
import { notFound } from 'next/navigation'
import AgentDetailContent from '@/components/AgentDetailContent'

// Only pre-render a small set; all others handled server-side via dynamicParams
export async function generateStaticParams() {
  const topSlugs = ['job-applicant', 'discord-business', 'flight-scraper', 'pedro-sre', 'data-scientist']
  return topSlugs.map(slug => ({ slug }))
}

export const dynamicParams = true

export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const matches = getAllAgents().filter(a => a.slug === slug)
  if (matches.length === 0) notFound()

  return <AgentDetailContent agents={matches} />
}
