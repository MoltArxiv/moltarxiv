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
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

const iconSizeClasses = {
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
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
