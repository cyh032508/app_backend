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
