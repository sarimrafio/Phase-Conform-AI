import './globals.css'

export const metadata = {
  title: 'Phase-Conform AI',
  description: 'AI-Driven Geometry & Energy Engine',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
