import { Button } from "@/components/ui/button";
import { FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

export default function LandingPage() {
  const isProduction = import.meta.env.PROD;
  const isDevelopment = !isProduction;
  const currentHostname = window.location.hostname;
  
  const getAppUrl = (path: string) => {
    if (isProduction && (currentHostname === 'www.blupi.io' || currentHostname === 'blupi.io')) {
      return `https://my.blupi.io${path}`;
    } else {
      return path;
    }
  };

  return (
    <div className="min-h-screen bg-ds-chrome">
      {isDevelopment && (
        <div className="bg-ds-pop text-ds-ink py-2 text-center font-bold uppercase tracking-wider text-sm">
          Development Mode - Landing Page Preview 
          <span className="ml-2 px-2 py-1 bg-ds-chrome text-ds-pop rounded text-xs">
            ?landing=true
          </span>
        </div>
      )}
      
      {/* Navigation Header - High Contrast */}
      <nav className="bg-ds-chrome border-b-2 border-ds-danger">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img src="/blupi-logomark-outlined.png" alt="Blupi" className="h-10" />
              
              <div className="hidden md:flex ml-12 space-x-8">
                <a href="#features" className="text-white hover:text-ds-pop font-semibold uppercase tracking-wider text-sm transition-colors">Features</a>
                <a href="#how-it-works" className="text-white hover:text-ds-pop font-semibold uppercase tracking-wider text-sm transition-colors">How It Works</a>
                <a href="#pricing" className="text-white hover:text-ds-pop font-semibold uppercase tracking-wider text-sm transition-colors">Pricing</a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href={getAppUrl('/auth/login')} className="hidden md:block text-white hover:text-ds-pop font-semibold uppercase tracking-wider text-sm transition-colors">
                Sign In
              </a>
              <Button
                asChild
                className="bauhaus-btn-blue h-12 px-8"
              >
                <a href={getAppUrl('/auth/register')}>
                  Get Started
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section - Bold Geometric */}
      <header className="bg-ds-chrome relative overflow-hidden">
        {/* Geometric Decorations */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-ds-danger rounded-full opacity-20" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-ds-pop opacity-10" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border-4 border-ds-accent opacity-30" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
              <div className="inline-block bg-ds-pop text-ds-ink px-4 py-2 font-bold uppercase tracking-widest text-sm mb-6">
                Journey Mapping Platform
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Design Better
                <span className="block text-ds-danger">Customer</span>
                <span className="block">Journeys</span>
              </h1>
              <p className="mt-8 text-xl sm:text-2xl max-w-3xl mx-auto lg:mx-0 text-gray-300 leading-relaxed">
                Blupi helps teams collaborate to create and share customer journey maps. Map out how customers interact with your product.
              </p>
              <div className="mt-10 flex gap-4 justify-center lg:justify-start">
                <Button 
                  asChild
                  size="lg" 
                  className="bauhaus-btn-blue text-lg h-16 px-10"
                >
                  <a href={getAppUrl('/auth/register')}>
                    Start Free
                  </a>
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  variant="outline" 
                  className="bauhaus-btn text-lg h-16 px-10"
                >
                  <a href={getAppUrl('/auth/login')}>
                    Sign In
                  </a>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center relative">
              {/* Geometric frame around mascot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-80 h-80 border-4 border-ds-pop rotate-12 opacity-50" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-ds-accent rounded-full opacity-20" />
              </div>
              <img 
                src="/images/Blowfish-bubbles-transparent.png" 
                alt="Blupi Mascot" 
                className="max-w-full h-auto relative z-10 drop-shadow-2xl"
                style={{ maxWidth: '420px' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Features Section - Geometric Cards */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-block bg-ds-chrome text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Features
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Everything You Need
            </h2>
            <div className="w-24 h-1 bg-ds-danger mx-auto mt-6" />
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded bg-white border-2 border-[color:var(--card-border)] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-ds-pop flex items-center justify-center text-3xl mb-6">
                ✨
              </div>
              <h3 className="text-xl font-bold text-ds-ink uppercase tracking-wide">Smart Organization</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Break down customer journeys into clear phases and steps with intuitive tools
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded bg-white border-2 border-[color:var(--card-border)] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-ds-danger flex items-center justify-center text-3xl mb-6">
                🤝
              </div>
              <h3 className="text-xl font-bold text-ds-ink uppercase tracking-wide">Real-time Collaboration</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Work together in real-time with your entire team from anywhere
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded bg-white border-2 border-[color:var(--card-border)] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-ds-accent flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h3 className="text-xl font-bold text-ds-ink uppercase tracking-wide">Easy Sharing</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Share your blueprints with a simple link - no login required for stakeholders
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-ds-chrome">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-ds-danger text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Process
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              How Blupi Works
            </h2>
            <div className="w-24 h-1 bg-ds-pop mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-ds-chrome border-2 border-ds-pop p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-ds-pop text-ds-ink flex items-center justify-center text-2xl font-black">
                1
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-4 mb-4">Create Your Project</h3>
              <p className="text-gray-400">Start with a blank canvas or choose from our template library</p>
            </div>
            
            <div className="bg-ds-chrome border-2 border-ds-danger p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-ds-danger text-white flex items-center justify-center text-2xl font-black">
                2
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-4 mb-4">Invite Your Team</h3>
              <p className="text-gray-400">Collaborate in real-time with your entire team to build journey maps</p>
            </div>
            
            <div className="bg-ds-chrome border-2 border-ds-accent p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-ds-accent text-white flex items-center justify-center text-2xl font-black">
                3
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-4 mb-4">Share & Iterate</h3>
              <p className="text-gray-400">Share blueprints with stakeholders and continuously improve</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-ds-chrome text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Pricing
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-ds-ink sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Beta Access
            </h2>
            <div className="w-24 h-1 bg-ds-danger mx-auto mt-6" />
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              We're currently in beta - try Blupi for free
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="rounded bg-white border-2 border-[color:var(--card-border)] p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-ds-pop text-ds-ink px-6 py-2 font-bold uppercase tracking-widest text-sm">
                Limited Time
              </div>
              <div className="mb-6 mt-4">
                <span className="text-6xl font-black text-ds-ink">FREE</span>
                <span className="text-xl text-gray-600 ml-2">during beta</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-ds-success flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Unlimited customer journey maps</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-ds-success flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Real-time team collaboration</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-ds-success flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Shareable public links</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-ds-success flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">AI-powered blueprint import</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-ds-success flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Priority support during beta</span>
                </li>
              </ul>

              <Button 
                asChild
                className="w-full bg-ds-danger text-white hover:bg-ds-danger font-bold py-4 text-lg uppercase tracking-wider"
              >
                <a href={getAppUrl('/auth/register')}>
                  Get Free Beta Access
                </a>
              </Button>
              
              <p className="text-sm text-gray-500 mt-4">
                Beta users receive exclusive early-bird pricing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-ds-pop relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-ds-danger opacity-20" style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-ds-chrome opacity-10 rounded-full" />
        
        <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight text-ds-ink sm:text-5xl uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Ready to Start?
            </h2>
            <p className="mt-6 text-xl text-[color-mix(in_srgb,var(--ds-ink)_80%,transparent)] max-w-3xl mx-auto font-medium">
              Join teams that use Blupi to create exceptional customer journeys
            </p>
            <div className="mt-8 flex justify-center">
              <Button 
                asChild
                size="lg" 
                className="rounded bg-ds-chrome text-white hover:bg-ds-surface font-bold uppercase tracking-wider shadow-xl px-10 py-6 text-lg border-2 border-[color:var(--card-border)]"
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
      <footer className="bg-ds-chrome text-white border-t-2 border-ds-danger">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-12 bg-white p-2" />
              <p className="mt-4 text-gray-400">
                Helping teams create better customer experiences through collaborative journey mapping.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">
                  <FaTwitter size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">
                  <FaLinkedin size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">
                  <FaGithub size={24} />
                </a>
              </div>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Product</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Enterprise</a></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Community</a></li>
                <li><a href="#" className="text-gray-400 hover:text-ds-pop transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Blupi. All rights reserved.</p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <a href="#" className="text-gray-500 hover:text-ds-pop text-sm transition-colors">Terms</a>
                <a href="#" className="text-gray-500 hover:text-ds-pop text-sm transition-colors">Privacy</a>
                <a href="#" className="text-gray-500 hover:text-ds-pop text-sm transition-colors">Cookies</a>
              </div>
            </div>
            
            {isDevelopment && (
              <p className="mt-4 text-xs text-center text-gray-600">
                <span className="bg-ds-pop text-ds-ink font-bold px-2 py-1">DEV</span>
                <span className="ml-2">blupi.io (landing) | my.blupi.io (app)</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
