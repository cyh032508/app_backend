// 在應用啟動時抑制 deprecation warnings
import '@/lib/utils/suppress-warnings';

export const metadata = {
  title: 'AI Essay Grader',
  description: 'AI Essay Grader Backend',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
