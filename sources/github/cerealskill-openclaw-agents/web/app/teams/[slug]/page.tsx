import { getAllTeams } from '@/lib/teams'
import { notFound } from 'next/navigation'
import TeamDetailContent from '@/components/TeamDetailContent'

// Only pre-render a small set; all others handled server-side via dynamicParams
export async function generateStaticParams() {
  const topSlugs = ['customer-success-team', 'full-stack-dev-team', 'growth-team']
  return topSlugs.map(slug => ({ slug }))
}

export const dynamicParams = true

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const hit = getAllTeams().find(t => t.slug === slug)
  if (!hit) notFound()

  const matches = getAllTeams().filter(t => t.groupId === hit.groupId)

  return <TeamDetailContent teams={matches} />
}
