'use client'

import { usePathname } from 'next/navigation'
import { MainNav } from './main-nav'

export function ConditionalMainNav() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return <MainNav />
}
