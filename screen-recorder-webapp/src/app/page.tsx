import ScreenRecorder from '../components/ScreenRecorder'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧪 UI Test Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Record your screen interactions and automatically generate detailed UI test scripts. 
            Perfect for QA automation, test documentation, and regression testing.
          </p>
        </header>
        
        <ScreenRecorder />
        
        <footer className="text-center mt-12 text-gray-500">
          <p>Powered by OpenAI GPT-4 Vision & Next.js</p>
        </footer>
      </div>
    </main>
  )
}
