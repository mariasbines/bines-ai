export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="flex flex-col items-center text-center sm:text-left sm:items-start">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4">
            Maria Bines
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-6 sm:mb-8">
            CEO, SynapseDx
          </p>
          <div className="max-w-full sm:max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">
              Transforming Healthcare with AI
            </h2>
            <p className="text-sm sm:text-base text-gray-400 mb-3 sm:mb-4 leading-relaxed">
              Leading the revolution in AI-powered diagnostics to make 
              healthcare more accessible, accurate, and affordable.
            </p>
            <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
              Welcome to my personal site. More coming soon...
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}