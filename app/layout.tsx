import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gate Lab',
  description: 'Build logic expressions, complete truth tables, and inspect gate circuits.',
}

export function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}

export default RootLayout
