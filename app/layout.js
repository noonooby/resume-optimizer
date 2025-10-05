import './globals.css'

export const metadata = {
  title: 'AI Resume Optimizer',
  description: 'Optimize your resume for any job',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
