import Link from 'next/link'

export default function Navigation() {
  return (
    <nav className="bg-gray-900 p-4 border-b border-gray-700">
      <div className="container mx-auto flex gap-6">
        <Link href="/" className="hover:text-blue-400">Home</Link>
        <Link href="/about" className="hover:text-blue-400">About</Link>
      </div>
    </nav>
  )
}