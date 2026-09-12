// Mobile build entry for the shared UI package.
// The public package barrel also evaluates Markdown/CodeBlock, which asks Vite
// to emit every Shiki grammar. Mobile apps do not use those surfaces, so this
// entry keeps the same ordinary app primitives without shipping that payload.
export * from '../../node_modules/@moldable-ai/ui/dist/components/ui/index.js'
export * from '../../node_modules/@moldable-ai/ui/dist/components/native-capabilities/index.js'
export * from '../../node_modules/@moldable-ai/ui/dist/lib/native-capabilities/index.js'
export * from '../../node_modules/@moldable-ai/ui/dist/lib/commands.js'
export { AppErrorBoundary } from '../../node_modules/@moldable-ai/ui/dist/components/app-error-boundary.js'
export { installMoldableFrameLifecycle } from '../../node_modules/@moldable-ai/ui/dist/lib/frame-lifecycle.js'
export {
  ThemeProvider,
  useTheme,
} from '../../node_modules/@moldable-ai/ui/dist/lib/theme.js'
export {
  WorkspaceProvider,
  useWorkspace,
} from '../../node_modules/@moldable-ai/ui/dist/lib/workspace.js'
export { useIsMobile } from '../../node_modules/@moldable-ai/ui/dist/hooks/use-mobile.js'
export { cn } from '../../node_modules/@moldable-ai/ui/dist/lib/utils.js'
export { RichMediaPlayer } from '../../node_modules/@moldable-ai/ui/dist/components/rich-media-player.js'
