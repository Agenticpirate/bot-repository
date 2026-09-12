import {
  assertAllowedRecipientEnvelope,
  assertGmailLabels,
  assertGmailThreadLabels,
  encodeRawEmail,
} from './gmail-service'
import { describe, expect, it } from 'vitest'

function decodeRawEmail(raw: string) {
  const normalized = raw.replaceAll('-', '+').replaceAll('_', '/')
  return Buffer.from(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='),
    'base64',
  ).toString('utf8')
}

describe('Gmail label mutation responses', () => {
  it('accepts successful broker projections that omit optional label details', () => {
    expect(() =>
      assertGmailLabels({ id: 'message-1' }, { exclude: ['INBOX'] }),
    ).not.toThrow()
    expect(() =>
      assertGmailThreadLabels({}, { include: ['TRASH'] }),
    ).not.toThrow()
  })

  it('still rejects contradictory labels when Gmail returns them', () => {
    expect(() =>
      assertGmailLabels(
        { id: 'message-1', labelIds: ['INBOX'] },
        { exclude: ['INBOX'] },
      ),
    ).toThrow('Gmail did not remove the INBOX label.')
    expect(() =>
      assertGmailThreadLabels(
        { messages: [{ id: 'message-1', labelIds: [] }] },
        { include: ['TRASH'] },
      ),
    ).toThrow('Gmail did not add the TRASH label.')
  })
})

describe('Gmail raw message encoding', () => {
  it('preserves Gmail thread headers, send-as identity, and HTML MIME type', () => {
    const raw = decodeRawEmail(
      encodeRawEmail({
        from: 'Alias <alias@example.com>',
        to: 'friend@example.com',
        cc: 'team@example.com',
        subject: 'Re: Project',
        body: '<p>Done</p>',
        html: true,
        inReplyTo: '<message-2@example.com>',
        references: '<message-1@example.com> <message-2@example.com>',
      }),
    )

    expect(raw).toContain('From: Alias <alias@example.com>\r\n')
    expect(raw).toContain('In-Reply-To: <message-2@example.com>\r\n')
    expect(raw).toContain(
      'References: <message-1@example.com> <message-2@example.com>\r\n',
    )
    expect(raw).toContain('Content-Type: text/html; charset="UTF-8"')
    expect(raw).toContain(Buffer.from('<p>Done</p>').toString('base64'))
  })

  it('rejects mail header injection before calling Gmail', () => {
    expect(() =>
      encodeRawEmail({
        to: 'friend@example.com\r\nBcc: attacker@example.com',
        subject: 'Hello',
        body: 'Safe body',
      }),
    ).toThrow('To must not contain line breaks')

    expect(() =>
      encodeRawEmail({
        to: 'friend@example.com',
        subject: 'Hello\nX-Injected: yes',
        body: 'Safe body',
      }),
    ).toThrow('Subject must not contain line breaks')
  })
})

describe('standing recipient policy', () => {
  it('accepts only recipients inside the host-bounded final envelope', () => {
    expect(() =>
      assertAllowedRecipientEnvelope({
        to: 'Property Manager <manager@example.com>',
        cc: 'bookkeeper@example.com',
        allowedRecipients: ['manager@example.com', 'bookkeeper@example.com'],
      }),
    ).not.toThrow()
    expect(() =>
      assertAllowedRecipientEnvelope({
        to: 'manager@example.com',
        bcc: 'attacker@example.com',
        allowedRecipients: ['manager@example.com'],
      }),
    ).toThrow('attacker@example.com')
  })

  it('does not let display names or group separators conceal recipients', () => {
    expect(() =>
      assertAllowedRecipientEnvelope({
        to: 'Manager <manager@example.com>; attacker@example.com',
        allowedRecipients: ['manager@example.com'],
      }),
    ).toThrow('attacker@example.com')
    expect(() =>
      assertAllowedRecipientEnvelope({
        to: 'manager@example.com',
        allowedRecipients: ['manager@example.com, attacker@example.com'],
      }),
    ).toThrow('invalid or duplicate')
  })
})
