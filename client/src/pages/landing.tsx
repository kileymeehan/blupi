import { Button } from "@/components/ui/button";

export default function LandingPage() {
  // Configure the app domain, defaulting to the current domain in development
  // In production, this would be "my.blupi.io"
  const isProduction = import.meta.env.PROD;
  const isDevelopment = !isProduction;
  const appDomain = isProduction ? "my.blupi.io" : window.location.host;
  
  // For development, create app links that will work locally
  const getAppUrl = (path: string) => {
    if (isProduction) {
      return `https://${appDomain}${path}`;
    } else {
      // In development, we just use the path directly
      return path;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Development Mode Banner */}
      {isDevelopment && (
        <div className="bg-amber-500 text-white py-2 text-center font-semibold">
          Development Mode - Landing Page Preview 
          <span className="ml-2 px-2 py-1 bg-amber-700 rounded text-xs">
            ?landing=true
          </span>
        </div>
      )}
      
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              Design Better Customer Journeys Together
            </h1>
            <p className="mt-6 text-xl sm:text-2xl max-w-3xl mx-auto text-blue-100">
              Blupi helps teams work together to create and share customer journey maps. Map out how customers interact with your product, making it easy for everyone to contribute and stay aligned.
            </p>
            <div className="mt-10 flex gap-4 justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <a href={getAppUrl('/auth/register')}>
                  Get Started Free
                </a>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
              >
                <a href={getAppUrl('/auth/login')}>
                  Sign In
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything You Need for Customer Journey Mapping
            </h2>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                ✨
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Smart Organization</h3>
              <p className="mt-2 text-gray-600 text-center">
                Break down customer journeys into clear phases and steps
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                🤝
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Real-time Collaboration</h3>
              <p className="mt-2 text-gray-600 text-center">
                Work together in real-time, just like Google Docs
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
                🎯
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">Easy Sharing</h3>
              <p className="mt-2 text-gray-600 text-center">
                Share your blueprints with a simple link - no login required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to improve your customer experience?
            </h2>
            <div className="mt-8 flex justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                <a href={getAppUrl('/auth/register')}>
                  Start Mapping Now
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; {new Date().getFullYear()} Blupi. All rights reserved.</p>
            {isDevelopment && (
              <p className="mt-2 text-xs">
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded">Development Mode</span>
                <span className="ml-2">Domain Separation: blupi.io (landing) | my.blupi.io (app)</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}