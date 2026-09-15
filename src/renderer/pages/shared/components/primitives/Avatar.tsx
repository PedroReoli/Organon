import React, { forwardRef } from 'react'
import * as RadixAvatar from '@radix-ui/react-avatar'
import './primitives-radix.css'

/**
 * Avatar wrapper sobre Radix Avatar.
 *
 * Uso simples:
 *   <Avatar src="..." alt="Joao" fallback="JS" size="md" />
 *
 * Uso composto:
 *   <Avatar.Root>
 *     <Avatar.Image src="..." alt="..." />
 *     <Avatar.Fallback>JS</Avatar.Fallback>
 *   </Avatar.Root>
 *
 * Definido no upgrade 20.
 */

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

const Root = forwardRef<
  React.ElementRef<typeof RadixAvatar.Root>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Root> & { size?: AvatarSize }
>(function AvatarRoot({ className = '', size = 'md', ...props }, ref) {
  return (
    <RadixAvatar.Root
      ref={ref}
      className={`ds-avatar ds-avatar--${size} ${className}`.trim()}
      {...props}
    />
  )
})

const Image = forwardRef<
  React.ElementRef<typeof RadixAvatar.Image>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Image>
>(function AvatarImage({ className = '', ...props }, ref) {
  return <RadixAvatar.Image ref={ref} className={`ds-avatar-image ${className}`.trim()} {...props} />
})

const Fallback = forwardRef<
  React.ElementRef<typeof RadixAvatar.Fallback>,
  React.ComponentPropsWithoutRef<typeof RadixAvatar.Fallback>
>(function AvatarFallback({ className = '', ...props }, ref) {
  return <RadixAvatar.Fallback ref={ref} className={`ds-avatar-fallback ${className}`.trim()} {...props} />
})

interface SimpleAvatarProps {
  src?: string
  alt?: string
  fallback: string
  size?: AvatarSize
  className?: string
}

function SimpleAvatar({ src, alt, fallback, size = 'md', className = '' }: SimpleAvatarProps) {
  return (
    <Root size={size} className={className}>
      {src && <Image src={src} alt={alt ?? fallback} />}
      <Fallback>{fallback}</Fallback>
    </Root>
  )
}

export const Avatar = Object.assign(SimpleAvatar, { Root, Image, Fallback })
