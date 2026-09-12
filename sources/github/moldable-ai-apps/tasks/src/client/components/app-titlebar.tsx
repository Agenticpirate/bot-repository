import { type LucideIcon, MoreHorizontal } from 'lucide-react'
import type { ComponentProps } from 'react'
import {
  AppHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Toolbar,
  ToolbarActions,
  ToolbarBackButton,
  ToolbarButton,
  ToolbarContent,
  ToolbarDescription,
  ToolbarIconButton,
  ToolbarTitle,
} from '@moldable-ai/ui'

type HeaderProps = ComponentProps<typeof AppHeader>
type TitlebarAction = Omit<
  NonNullable<HeaderProps['actions']>[number],
  'icon'
> & {
  icon: LucideIcon
}

type AppTitlebarProps = Omit<HeaderProps, 'desktop' | 'actions'> & {
  actions?: TitlebarAction[]
}

/** One action configuration feeds desktop glass chrome and the mobile web host. */
export function AppTitlebar({
  title,
  description,
  back,
  backLabel = 'Back',
  actions = [],
  ...props
}: AppTitlebarProps) {
  const overflow = actions.filter((action) => action.placement === 'overflow')

  return (
    <AppHeader
      {...props}
      title={title}
      description={description}
      back={back}
      backLabel={backLabel}
      actions={actions}
      desktop={
        <Toolbar position="top" variant="plain" material="none">
          {back ? <ToolbarBackButton label={backLabel} onClick={back} /> : null}
          <ToolbarContent>
            <ToolbarTitle>{title}</ToolbarTitle>
            {description ? (
              <ToolbarDescription>{description}</ToolbarDescription>
            ) : null}
          </ToolbarContent>
          <ToolbarActions>
            {actions
              .filter((action) => action.placement !== 'overflow')
              .map((action) => (
                <ToolbarButton
                  key={action.id ?? action.label}
                  material="ultra-thin"
                  className="cursor-pointer"
                  aria-label={action.label}
                  disabled={action.disabled}
                  onClick={action.onPress}
                >
                  <action.icon className="size-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                </ToolbarButton>
              ))}
            {overflow.length ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ToolbarIconButton label="More actions">
                    <MoreHorizontal />
                  </ToolbarIconButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {overflow.map((action) => (
                    <DropdownMenuItem
                      key={action.id ?? action.label}
                      disabled={action.disabled}
                      onSelect={action.onPress}
                      className="cursor-pointer"
                    >
                      <action.icon className="size-4" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </ToolbarActions>
        </Toolbar>
      }
    />
  )
}
