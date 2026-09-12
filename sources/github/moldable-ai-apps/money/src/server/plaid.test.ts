import { isPlaidReconnectRequired, plaidSyncErrorMessage } from './plaid'
import { describe, expect, it } from 'vitest'

describe('Plaid reconnect recovery', () => {
  it('marks Plaid NO_ACCOUNTS responses as reconnectable without exposing a raw payload to the UI', () => {
    const error = new Error(
      'Plaid returned HTTP 400 Bad Request: {"display_message":"No valid accounts were found at the financial institution.","error_code":"NO_ACCOUNTS","error_message":"no valid accounts were found for this item","error_type":"ITEM_ERROR","request_id":"request-123"}',
    )

    expect(isPlaidReconnectRequired(error)).toBe(true)
    expect(plaidSyncErrorMessage(error)).toContain('NO_ACCOUNTS')
  })

  it('keeps transient provider errors on the normal retry path', () => {
    expect(
      isPlaidReconnectRequired(
        new Error('Plaid API error (503): temporarily unavailable'),
      ),
    ).toBe(false)
  })
})
