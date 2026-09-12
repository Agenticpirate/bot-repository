# Phone Calls

## What it does

Makes and receives phone calls via Twilio with real-time voice conversation. Your assistant can act as a receptionist, make calls on your behalf, and pull up past call transcripts.

## Setup required

Twilio account required. Say “Set up phone calls.” Your assistant walks you through provisioning a phone number.

## Permissions

- Twilio Account SID + Auth Token
- No macOS permissions needed (calls happen server-side)

## Common prompts

| You say...                                   | What happens                        |
| -------------------------------------------- | ----------------------------------- |
| “Call this number: 555-0123”                 | Initiates an outbound call          |
| “Set up a receptionist for my business line” | Configures inbound call handling    |
| “What calls came in today?”                  | Lists recent call history           |
| “Get me the transcript from my last call”    | Retrieves call recording transcript |

## Configuration

- Voice powered by ElevenLabs text-to-speech
- Supports inbound and outbound calls
- Call transcripts are stored as conversation history

## Tips & gotchas

- **Guardian consultation.** Your assistant can consult with you (the guardian) during a call if it's unsure how to handle something.
- **Automatic transcription.** Calls are transcribed automatically.
- **Voice customization.** Voice style is configurable through ElevenLabs settings.
- **DTMF support.** Keypad tones are supported for automated phone menus.
