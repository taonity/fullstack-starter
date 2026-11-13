import './globals.css'
import type { Metadata, Viewport } from 'next'
import { connection } from 'next/server'
import { getAppIdentity } from '@/lib/appIdentity'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import { cn } from '@/lib/utils'
import { ThemeProvider, themeInitScript } from '@/components/theme/ThemeProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { DevToolsPanel } from '@/features/console/DevToolsPanel'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export async function generateMetadata(): Promise<Metadata> {
  await connection()
  const identity = getAppIdentity()
  return {
    title: identity.name, applicationName: identity.name, manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: identity.favicon, sizes: '16x16 32x32 48x48' }],
      apple: [{ url: `${identity.iconPrefix}-180.png`, sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: { capable: true, title: identity.name, statusBarStyle: 'default' },
  }
}

export const viewport: Viewport = { themeColor: '#0a0a0a' }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', geist.variable)}>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <ThemeProvider>
          <ThemeToggle className="absolute right-3 top-2 z-50 min-h-11 min-w-11 sm:top-3 sm:min-h-0 sm:min-w-0" />
          {children}
          <DevToolsPanel />
        </ThemeProvider>
      </body>
    </html>
  )
}
