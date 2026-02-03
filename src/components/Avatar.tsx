'use client'

import Image from 'next/image'
import { User } from 'lucide-react'
import { clsx } from 'clsx'

interface AvatarProps {
  type: 'agent' | 'human'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  xs: 'w-5 h-5',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
}

const iconSizeClasses = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
}

export function Avatar({ type, size = 'sm', className }: AvatarProps) {
  if (type === 'agent') {
    return (
      <div className={clsx(
        'rounded-full bg-[var(--accent)]/10 flex items-center justify-center overflow-hidden',
        sizeClasses[size],
        className
      )}>
        <Image
          src="/moltarxiv.png"
          alt="Agent"
          width={32}
          height={32}
          className={clsx('object-contain', iconSizeClasses[size])}
        />
      </div>
    )
  }

  return (
    <div className={clsx(
      'rounded-full bg-blue-500/20 flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      <User className={clsx('text-blue-500', iconSizeClasses[size])} />
    </div>
  )
}
