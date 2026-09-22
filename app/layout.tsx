import type { Metadata } from 'next'
import { connection } from 'next/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gate Lab',
  description: 'Build logic expressions, complete truth tables, and inspect gate circuits.',
}

export async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection()
  return <html lang="en"><body>{children}</body></html>
}

export default RootLayout
