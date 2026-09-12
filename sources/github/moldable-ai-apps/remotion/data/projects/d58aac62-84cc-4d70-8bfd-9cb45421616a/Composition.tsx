import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion'

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame()

  // Entrance animations
  const textOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  })
  const textBlur = interpolate(frame, [0, 15], [15, 0], {
    extrapolateRight: 'clamp',
  })
  const textY = interpolate(frame, [0, 15], [15, 0], {
    extrapolateRight: 'clamp',
  })

  const logoOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: 'clamp',
  })
  const logoBlur = interpolate(frame, [15, 30], [10, 0], {
    extrapolateRight: 'clamp',
  })
  const logoY = interpolate(frame, [15, 30], [10, 0], {
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'oklch(0.235 0 0)',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: 'white',
            letterSpacing: -2,
            opacity: textOpacity,
            filter: `blur(${textBlur}px)`,
            transform: `translateY(${textY}px)`,
            marginBottom: 32,
            lineHeight: 1,
          }}
        >
          Now introducing
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            opacity: logoOpacity,
            filter: `blur(${logoBlur}px)`,
            transform: `translateY(${logoY}px)`,
          }}
        >
          <Img
            src="https://moldable.sh/logo.svg"
            style={{ width: 100, height: 100 }}
          />
          <Img
            src="https://moldable.sh/logo-text.svg"
            style={{ height: 60, filter: 'invert(1)' }}
          />
        </div>
      </div>
    </AbsoluteFill>
  )
}
