import { createMailReaderNavigation } from './mail-reader-navigation'
import { describe, expect, it, vi } from 'vitest'

// Both hosts consume the same semantic stack. iOS additionally maps it to
// WebKit history; opening a reader must never create a second app history entry.
describe('Shared desktop and iOS Mail reader navigation', () => {
  function setup() {
    const stack: string[] = []
    const host = {
      push: vi.fn(({ id }: { id: string; title: string }) => {
        stack.push(id)
        return id
      }),
      pop: vi.fn(() => {
        stack.pop()
      }),
    }
    return { stack, host, navigation: createMailReaderNavigation(host) }
  }

  it('one back removes the reader, including after next/previous message navigation', () => {
    const { stack, host, navigation } = setup()
    navigation.open({ id: 'first', subject: 'First' })
    navigation.open({ id: 'second', subject: 'Second' })
    expect(stack).toHaveLength(1)
    // Native back has already popped history before notifying the app.
    stack.pop()
    navigation.close(false)
    expect(navigation.isOpen()).toBe(false)
    expect(stack).toHaveLength(0)
    expect(host.pop).not.toHaveBeenCalled()
    // Reopening starts a fresh reader, not the stale reader we just popped.
    navigation.open({ id: 'third', subject: 'Third' })
    expect(stack).toHaveLength(1)
    expect(host.push).toHaveBeenCalledTimes(2)
  })

  it('the in-app back control pops once and ignores an echoed host notification', () => {
    const { stack, host, navigation } = setup()
    navigation.open({ id: 'first', subject: 'First' })
    navigation.close(true)
    navigation.close(false)
    navigation.close(true)
    expect(stack).toHaveLength(0)
    expect(host.pop).toHaveBeenCalledTimes(1)
    expect(navigation.isOpen()).toBe(false)
  })
})
