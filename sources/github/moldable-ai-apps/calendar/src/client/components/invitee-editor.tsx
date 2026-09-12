import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, Repeat2, UserPlus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, Button, useWorkspace } from '@moldable-ai/ui'
import { cn } from '@/lib/utils'
import { z } from 'zod'

export interface CalendarInvitee {
  email?: string | null
  displayName?: string | null
  responseStatus?: string | null
  optional?: boolean | null
  organizer?: boolean | null
  self?: boolean | null
}

type InviteeEvent = {
  id: string
  accountId?: string
  accountEmailAddress?: string
  organizer?: {
    email?: string | null
    self?: boolean | null
  } | null
  attendees?: CalendarInvitee[]
  recurrence?: string[] | null
  recurringEventId?: string | null
}

type InviteeDraft = {
  key: string
  originalEmail?: string
  email: string
  optional: boolean
}

type InviteeMutationPayload = {
  accountId?: string
  eventId: string
  scope?: 'event' | 'series'
  add?: Array<{ email: string; optional?: boolean }>
  update?: Array<{
    email: string
    newEmail?: string
    optional?: boolean
  }>
  remove?: string[]
  sendUpdates: 'all'
}

const emailSchema = z.string().trim().email()

function normalizedEmail(email?: string | null) {
  return email?.trim().toLocaleLowerCase() ?? ''
}

function inviteeName(invitee: CalendarInvitee) {
  return invitee.displayName || invitee.email || 'Guest'
}

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split('@')[0] || ''
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function InviteeEditor({ event }: { event: InviteeEvent }) {
  const { workspaceId, fetchWithWorkspace } = useWorkspace()
  const queryClient = useQueryClient()
  const attendees = useMemo(() => event.attendees ?? [], [event.attendees])
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<InviteeDraft[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editScope, setEditScope] = useState<'event' | 'series'>('event')

  const organizerEmail = normalizedEmail(event.organizer?.email)
  const accountEmail = normalizedEmail(event.accountEmailAddress)
  const canEdit =
    event.organizer?.self === true ||
    Boolean(organizerEmail && accountEmail && organizerEmail === accountEmail)
  const recurring = Boolean(event.recurringEventId || event.recurrence?.length)
  const mutableAttendees = useMemo(
    () =>
      attendees.filter(
        (attendee) => attendee.email && !attendee.self && !attendee.organizer,
      ),
    [attendees],
  )
  const accepted = attendees.filter(
    (attendee) => attendee.responseStatus === 'accepted',
  ).length
  const declined = attendees.filter(
    (attendee) => attendee.responseStatus === 'declined',
  ).length

  const mutation = useMutation({
    mutationFn: async (payload: InviteeMutationPayload) => {
      const response = await fetchWithWorkspace('/api/events/invitees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: { message?: string }
      } | null
      if (!response.ok || !body?.ok) {
        throw new Error(
          body?.error?.message ?? 'Calendar could not update invitees.',
        )
      }
    },
    onSuccess: async () => {
      setEditing(false)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['events', workspaceId] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Calendar could not update invitees.',
      )
    },
  })

  const beginEditing = () => {
    setDrafts(
      mutableAttendees.map((attendee, index) => ({
        key: `${attendee.email}-${index}`,
        originalEmail: attendee.email ?? undefined,
        email: attendee.email ?? '',
        optional: attendee.optional === true,
      })),
    )
    setNewEmail('')
    setEditScope('event')
    setError(null)
    setEditing(true)
  }

  const addDraft = () => {
    const parsed = emailSchema.safeParse(newEmail)
    if (!parsed.success) {
      setError('Enter a valid email address.')
      return
    }

    const email = parsed.data
    const duplicate = [
      ...attendees.map((attendee) => attendee.email ?? ''),
      ...drafts.map((draft) => draft.email),
    ].some((candidate) => normalizedEmail(candidate) === normalizedEmail(email))
    if (duplicate) {
      setError(`${email} is already on this event.`)
      return
    }

    setDrafts((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${email}`,
        email,
        optional: false,
      },
    ])
    setNewEmail('')
    setError(null)
  }

  const save = () => {
    const invalid = drafts.find(
      (draft) => !emailSchema.safeParse(draft.email).success,
    )
    if (invalid) {
      setError(
        `Enter a valid email address for ${invalid.email || 'the guest'}.`,
      )
      return
    }

    const uniqueEmails = new Set<string>()
    for (const draft of drafts) {
      const key = normalizedEmail(draft.email)
      if (uniqueEmails.has(key)) {
        setError(`${draft.email} appears more than once.`)
        return
      }
      uniqueEmails.add(key)
    }

    const originals = new Map(
      mutableAttendees.map((attendee) => [
        normalizedEmail(attendee.email),
        attendee,
      ]),
    )
    const retainedOriginals = new Set(
      drafts
        .map((draft) => normalizedEmail(draft.originalEmail))
        .filter(Boolean),
    )
    const remove = [...originals.values()]
      .filter(
        (attendee) => !retainedOriginals.has(normalizedEmail(attendee.email)),
      )
      .map((attendee) => attendee.email!)
    const add = drafts
      .filter((draft) => !draft.originalEmail)
      .map((draft) => ({
        email: draft.email.trim(),
        ...(draft.optional ? { optional: true } : {}),
      }))
    const update = drafts.flatMap((draft) => {
      if (!draft.originalEmail) return []
      const original = originals.get(normalizedEmail(draft.originalEmail))
      if (!original) return []

      const emailChanged =
        normalizedEmail(draft.email) !== normalizedEmail(draft.originalEmail)
      const optionalChanged = draft.optional !== (original.optional === true)
      if (!emailChanged && !optionalChanged) return []
      return [
        {
          email: draft.originalEmail,
          ...(emailChanged ? { newEmail: draft.email.trim() } : {}),
          ...(optionalChanged ? { optional: draft.optional } : {}),
        },
      ]
    })

    if (add.length === 0 && update.length === 0 && remove.length === 0) {
      setEditing(false)
      return
    }

    mutation.mutate({
      accountId: event.accountId,
      eventId: event.id,
      ...(recurring ? { scope: editScope } : {}),
      ...(add.length ? { add } : {}),
      ...(update.length ? { update } : {}),
      ...(remove.length ? { remove } : {}),
      sendUpdates: 'all',
    })
  }

  if (attendees.length === 0 && !canEdit) return null

  return (
    <div className="border-border/60 space-y-2.5 border-t pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <UserPlus className="size-3.5" />
          {attendees.length} {attendees.length === 1 ? 'guest' : 'guests'}
        </p>
        <p className="text-muted-foreground text-[11px] tabular-nums">
          {accepted} yes · {declined} no
        </p>
      </div>

      {!editing ? (
        <div className="space-y-1">
          {attendees.map((attendee, index) => (
            <div
              key={`${attendee.email ?? 'guest'}-${index}`}
              className="flex min-h-8 items-center gap-2 rounded-md px-1.5 py-1"
            >
              <Avatar size="sm" className="size-6 shrink-0">
                <AvatarFallback
                  className={cn(
                    'text-[9px] font-semibold',
                    attendee.responseStatus === 'accepted'
                      ? 'bg-success/15 text-success'
                      : attendee.responseStatus === 'declined'
                        ? 'bg-destructive/15 text-destructive'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {initials(attendee.displayName, attendee.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {inviteeName(attendee)}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {attendee.organizer
                    ? 'Organizer'
                    : attendee.optional
                      ? 'Optional'
                      : attendee.email}
                </p>
              </div>
              {attendee.responseStatus === 'accepted' ? (
                <Check className="text-success size-3.5 shrink-0" />
              ) : null}
            </div>
          ))}

          {canEdit ? (
            <button
              type="button"
              onClick={beginEditing}
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-xs transition-colors"
            >
              <UserPlus className="size-3.5" />
              Add or edit invitees
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {recurring ? (
            <div className="bg-muted/35 border-border/60 flex items-center gap-1 rounded-md border p-1">
              <Repeat2 className="text-muted-foreground ml-1 size-3.5 shrink-0" />
              {(['event', 'series'] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setEditScope(scope)}
                  aria-pressed={editScope === scope}
                  className={cn(
                    'flex h-7 flex-1 cursor-pointer items-center justify-center rounded-[5px] px-2 text-[11px] font-medium transition-colors',
                    editScope === scope
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {scope === 'event' ? 'This event' : 'Entire series'}
                </button>
              ))}
            </div>
          ) : null}
          <div className="space-y-1.5">
            {drafts.map((draft) => (
              <div key={draft.key} className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(inputEvent) =>
                    setDrafts((current) =>
                      current.map((candidate) =>
                        candidate.key === draft.key
                          ? { ...candidate, email: inputEvent.target.value }
                          : candidate,
                      ),
                    )
                  }
                  aria-label="Invitee email"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-8 min-w-0 flex-1 rounded-md border px-2 text-xs outline-none focus-visible:ring-2"
                />
                <label className="text-muted-foreground flex cursor-pointer items-center gap-1 text-[11px]">
                  <input
                    type="checkbox"
                    checked={draft.optional}
                    onChange={(inputEvent) =>
                      setDrafts((current) =>
                        current.map((candidate) =>
                          candidate.key === draft.key
                            ? {
                                ...candidate,
                                optional: inputEvent.target.checked,
                              }
                            : candidate,
                        ),
                      )
                    }
                    className="accent-primary size-3.5"
                  />
                  Optional
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDrafts((current) =>
                      current.filter(
                        (candidate) => candidate.key !== draft.key,
                      ),
                    )
                  }
                  className="text-muted-foreground hover:text-destructive size-7 cursor-pointer"
                  aria-label={`Remove ${draft.email}`}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="email"
              value={newEmail}
              onChange={(inputEvent) => setNewEmail(inputEvent.target.value)}
              onKeyDown={(keyboardEvent) => {
                if (keyboardEvent.key === 'Enter') {
                  keyboardEvent.preventDefault()
                  addDraft()
                }
              }}
              placeholder="Add participant by email"
              aria-label="New invitee email"
              className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-8 min-w-0 flex-1 rounded-md border px-2 text-xs outline-none focus-visible:ring-2"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDraft}
              className="h-8 cursor-pointer px-2.5 text-xs"
            >
              Add
            </Button>
          </div>

          {error ? (
            <p className="text-destructive text-[11px] leading-4">{error}</p>
          ) : (
            <p className="text-muted-foreground text-[11px] leading-4">
              Saving sends Google Calendar updates to affected invitees.
            </p>
          )}

          <div className="flex justify-end gap-1.5 pt-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              className="h-8 cursor-pointer text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={mutation.isPending}
              onClick={save}
              className="h-8 cursor-pointer gap-1.5 text-xs"
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Save & send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
