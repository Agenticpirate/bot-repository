# Audio Player

> This component API and its examples come from the [official AI Elements docs/skill](https://github.com/vercel/ai-elements). In Customware apps, use the installation command below, React Router for the frontend, and the Customware Hono gateway backend. Ignore copied Next.js route or direct-provider backend examples.

## Installation

```bash
pnpm exec node <customware-ai-skill>/scripts/install-ai-elements.mjs audio-player --cwd .
```

Underlying non-interactive shadcn command used by the installer:

```bash
pnpm dlx shadcn@latest add @ai-elements/audio-player --yes --path .tmp/customware-ai-elements-install
```

A composable audio player component built on media-chrome, with shadcn styling and flexible controls.

The `AudioPlayer` component provides a flexible and customizable audio playback interface built on top of media-chrome. It features a composable architecture that allows you to build audio experiences with custom controls, metadata display, and seamless integration with AI-generated audio content.

See [`audio-player.tsx`](examples/audio-player.tsx) for this official example.

## Features

- Built on media-chrome for reliable audio playback
- Fully composable architecture with granular control components
- ButtonGroup integration for cohesive control layout
- Individual control components (play, seek, volume, etc.)
- Flexible layout with customizable control bars
- CSS custom properties for deep theming
- Shadcn/ui Button component styling
- Responsive design that works across devices
- Full TypeScript support with proper types for all components

## Variants

### AI SDK Speech Result

The `AudioPlayer` component can be used to play audio from an AI SDK Speech Result.

See [`audio-player.tsx`](examples/audio-player.tsx) for this official example.

### Remote Audio

The `AudioPlayer` component can be used to play remote audio files.

See [`audio-player-remote.tsx`](examples/audio-player-remote.tsx) for this official example.

## Props

### `<AudioPlayer />`

Root MediaController component. Accepts all MediaController props except `audio` (which is set to `true` by default).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `style` | `CSSProperties` | - | Custom CSS properties can be passed to override media-chrome theming variables. |
| `...props` | `Omit<React.ComponentProps<typeof MediaController>, ` | - | Any other props are spread to the MediaController component. |

### `<AudioPlayerElement />`

The audio element that contains the media source. Accepts either a remote URL or AI SDK Speech Result data.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | The URL of the audio file to play (for remote audio). |
| `data` | `SpeechResult[` | - | AI SDK Speech Result audio data with base64 encoding (for AI-generated audio). |
| `...props` | `Omit<React.ComponentProps<` | - | Any other props are spread to the audio element (excluding src when using data). |

### `<AudioPlayerControlBar />`

Container for control buttons, wraps children in a ButtonGroup.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaControlBar>` | - | Any other props are spread to the MediaControlBar component. |

### `<AudioPlayerPlayButton />`

Play/pause button wrapped in a shadcn Button component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaPlayButton>` | - | Any other props are spread to the MediaPlayButton component. |

### `<AudioPlayerSeekBackwardButton />`

Seek backward button wrapped in a shadcn Button component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `seekOffset` | `number` | `10` | The number of seconds to seek backward. |
| `...props` | `React.ComponentProps<typeof MediaSeekBackwardButton>` | - | Any other props are spread to the MediaSeekBackwardButton component. |

### `<AudioPlayerSeekForwardButton />`

Seek forward button wrapped in a shadcn Button component.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `seekOffset` | `number` | `10` | The number of seconds to seek forward. |
| `...props` | `React.ComponentProps<typeof MediaSeekForwardButton>` | - | Any other props are spread to the MediaSeekForwardButton component. |

### `<AudioPlayerTimeDisplay />`

Displays the current playback time, wrapped in ButtonGroupText.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaTimeDisplay>` | - | Any other props are spread to the MediaTimeDisplay component. |

### `<AudioPlayerTimeRange />`

Seek slider for controlling playback position, wrapped in ButtonGroupText.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaTimeRange>` | - | Any other props are spread to the MediaTimeRange component. |

### `<AudioPlayerDurationDisplay />`

Displays the total duration of the audio, wrapped in ButtonGroupText.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaDurationDisplay>` | - | Any other props are spread to the MediaDurationDisplay component. |

### `<AudioPlayerMuteButton />`

Mute/unmute button, wrapped in ButtonGroupText.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaMuteButton>` | - | Any other props are spread to the MediaMuteButton component. |

### `<AudioPlayerVolumeRange />`

Volume slider control, wrapped in ButtonGroupText.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `...props` | `React.ComponentProps<typeof MediaVolumeRange>` | - | Any other props are spread to the MediaVolumeRange component. |
