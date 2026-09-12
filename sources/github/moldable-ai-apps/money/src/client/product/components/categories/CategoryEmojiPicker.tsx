import { Loader2, Search } from 'lucide-react'
import { type ComponentProps, useState } from 'react'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@moldable-ai/ui'
import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from 'frimousse'

const COMMON_CATEGORY_EMOJIS = [
  '❔',
  '💵',
  '📥',
  '📤',
  '🧾',
  '🏦',
  '🥬',
  '🍝',
  '☕',
  '🍔',
  '🛍️',
  '📦',
  '🛒',
  '👕',
  '💻',
  '🚕',
  '⛽',
  '✈️',
  '🏨',
  '🏠',
  '🔑',
  '💡',
  '📱',
  '🎬',
  '🎵',
  '🎮',
  '🧴',
  '🏋️',
  '🩺',
  '💊',
  '🧰',
  '🏛️',
] as const

function EmojiPickerRoot({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        'bg-popover text-popover-foreground isolate flex h-[382px] w-fit flex-col overflow-hidden rounded-md',
        className,
      )}
      columns={8}
      {...props}
    />
  )
}

function EmojiPickerSearch({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className={cn('flex h-9 items-center gap-2 border-b px-3', className)}>
      <Search className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        className="placeholder:text-muted-foreground h-9 w-full bg-transparent text-sm outline-none"
        {...props}
      />
    </div>
  )
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div {...props} className="scroll-my-1 px-1">
      {children}
    </div>
  )
}

function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      type="button"
      className={cn(
        'data-[active]:bg-accent hover:bg-accent flex size-7 cursor-pointer items-center justify-center rounded-sm text-base transition-colors',
        className,
      )}
    >
      {emoji.emoji}
    </button>
  )
}

function EmojiPickerCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className="bg-popover text-muted-foreground px-3 pb-2 pt-3.5 text-xs leading-none"
    >
      {category.label}
    </div>
  )
}

function EmojiPickerContent({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
      className={cn('relative flex-1 outline-none', className)}
      {...props}
    >
      <EmojiPickerPrimitive.Loading className="text-muted-foreground absolute inset-0 flex items-center justify-center">
        <Loader2 className="size-4 animate-spin" />
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
        No emoji found.
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none pb-1"
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
      />
    </EmojiPickerPrimitive.Viewport>
  )
}

function CommonEmojiStrip({
  value,
  onPick,
}: {
  value?: string
  onPick: (emoji: string) => void
}) {
  return (
    <div className="border-b px-3 py-2">
      <div className="text-muted-foreground mb-1.5 text-[11px] font-medium uppercase tracking-wide">
        Common
      </div>
      <div className="grid grid-cols-8 gap-1">
        {COMMON_CATEGORY_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`Use ${emoji}`}
            className={cn(
              'hover:bg-accent focus-visible:ring-ring flex size-7 cursor-pointer items-center justify-center rounded-sm text-base transition-colors focus-visible:outline-none focus-visible:ring-2',
              value === emoji && 'bg-accent',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

function EmojiPickerFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex h-11 w-full min-w-0 items-center gap-1 border-t p-2',
        className,
      )}
      {...props}
    >
      <EmojiPickerPrimitive.ActiveEmoji>
        {({ emoji }) =>
          emoji ? (
            <>
              <div className="flex size-7 flex-none items-center justify-center text-lg">
                {emoji.emoji}
              </div>
              <span className="text-secondary-foreground truncate text-xs">
                {emoji.label}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground ml-1.5 flex h-7 items-center truncate text-xs">
              Select an emoji…
            </span>
          )
        }
      </EmojiPickerPrimitive.ActiveEmoji>
    </div>
  )
}

export function CategoryEmojiPicker({
  value,
  onChange,
  className,
  ariaLabel = 'Choose category emoji',
  placeholder = '❔',
}: {
  value?: string
  onChange: (emoji: string) => void
  className?: string
  /** Override the trigger's accessible label (e.g. for dashboards). */
  ariaLabel?: string
  /** Glyph shown when no emoji is set. */
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const pickEmoji = (emoji: string) => {
    onChange(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={ariaLabel}
          className={cn(
            'hover:bg-muted size-9 cursor-pointer rounded-lg text-lg',
            className,
          )}
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" side="bottom" align="start">
        <EmojiPickerRoot
          onEmojiSelect={({ emoji }: { emoji: string }) => pickEmoji(emoji)}
        >
          <EmojiPickerSearch />
          <CommonEmojiStrip value={value} onPick={pickEmoji} />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPickerRoot>
      </PopoverContent>
    </Popover>
  )
}
