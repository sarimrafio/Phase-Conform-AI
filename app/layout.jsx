import './globals.css'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Phase-Conform AI',
  description: 'AI-Driven Geometry & Energy Engine',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#141423',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
