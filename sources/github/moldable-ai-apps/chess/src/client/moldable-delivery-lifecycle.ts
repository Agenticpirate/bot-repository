const DELIVERY_TYPE = 'moldable:app-delivery'
const DELIVERY_ACK_TYPE = 'moldable:app-delivery-ack'
const CAPABILITY_TYPE = 'moldable:app-delivery-capability'
const CAPABILITY_REQUEST_TYPE = 'moldable:app-delivery-capability-request'
const RECEIPTS_KEY = '__moldableAppDeliveryReceiptsV1'
const MAX_RECEIPTS = 256
const OPAQUE_ID = /^[A-Za-z0-9_-]{1,128}$/

function readReceipts(): string[] {
  try {
    const state = history.state as unknown
    const value =
      typeof state === 'object' &&
      state !== null &&
      !Array.isArray(state) &&
      RECEIPTS_KEY in state
        ? state[RECEIPTS_KEY]
        : []
    return Array.isArray(value)
      ? value
          .filter(
            (item): item is string =>
              typeof item === 'string' && OPAQUE_ID.test(item),
          )
          .slice(-MAX_RECEIPTS)
      : []
  } catch {
    return []
  }
}

function persistReceipts(receipts: string[]) {
  try {
    const state =
      typeof history.state === 'object' &&
      history.state !== null &&
      !Array.isArray(history.state)
        ? history.state
        : {}
    history.replaceState(
      { ...state, [RECEIPTS_KEY]: receipts.slice(-MAX_RECEIPTS) },
      '',
    )
  } catch {
    // The bounded in-memory cache remains available if history is unavailable.
  }
}

export function installMoldableDeliveryLifecycle() {
  if (window.parent === window) return
  const lifecycleWindow = window as Window & {
    __moldableAppDeliveryLifecycleV1?: boolean
  }
  if (lifecycleWindow.__moldableAppDeliveryLifecycleV1) return
  lifecycleWindow.__moldableAppDeliveryLifecycleV1 = true
  const receiptOrder = readReceipts()
  const receipts = new Set(receiptOrder)
  let redispatching = false
  const announce = () => {
    window.parent.postMessage({ type: CAPABILITY_TYPE, version: 1 }, '*')
  }

  window.addEventListener(
    'message',
    (event: MessageEvent<unknown>) => {
      if (redispatching || event.source !== window.parent) return
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        'type' in event.data &&
        event.data.type === CAPABILITY_REQUEST_TYPE &&
        'version' in event.data &&
        event.data.version === 1
      ) {
        event.stopImmediatePropagation()
        announce()
        return
      }
      if (
        typeof event.data !== 'object' ||
        event.data === null ||
        !('type' in event.data) ||
        event.data.type !== DELIVERY_TYPE ||
        !('version' in event.data) ||
        event.data.version !== 1 ||
        !('deliveryId' in event.data) ||
        typeof event.data.deliveryId !== 'string' ||
        !OPAQUE_ID.test(event.data.deliveryId) ||
        !('leaseId' in event.data) ||
        typeof event.data.leaseId !== 'string' ||
        !OPAQUE_ID.test(event.data.leaseId) ||
        !('payload' in event.data)
      ) {
        return
      }
      event.stopImmediatePropagation()
      const { deliveryId, leaseId, payload } = event.data
      if (!receipts.has(deliveryId)) {
        redispatching = true
        try {
          window.dispatchEvent(
            new MessageEvent('message', {
              data: payload,
              origin: event.origin,
              source: event.source,
            }),
          )
        } finally {
          redispatching = false
        }
        receipts.add(deliveryId)
        receiptOrder.push(deliveryId)
        while (receiptOrder.length > MAX_RECEIPTS) {
          const oldest = receiptOrder.shift()
          if (oldest) receipts.delete(oldest)
        }
        persistReceipts(receiptOrder)
      }
      window.parent.postMessage(
        { type: DELIVERY_ACK_TYPE, version: 1, deliveryId, leaseId },
        '*',
      )
    },
    true,
  )
  announce()
}
