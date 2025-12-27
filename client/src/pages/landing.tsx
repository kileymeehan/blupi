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
    <div className="min-h-screen bg-[#0A0A0F]">
      {isDevelopment && (
        <div className="bg-[#FFD600] text-[#0A0A0F] py-2 text-center font-bold uppercase tracking-wider text-sm">
          Development Mode - Landing Page Preview 
          <span className="ml-2 px-2 py-1 bg-[#0A0A0F] text-[#FFD600] rounded text-xs">
            ?landing=true
          </span>
        </div>
      )}
      
      {/* Navigation Header - High Contrast */}
      <nav className="bg-[#0A0A0F] border-b-4 border-[#E53935]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img src="/blupi-logomark-outlined.png" alt="Blupi" className="h-10" />
              
              <div className="hidden md:flex ml-12 space-x-8">
                <a href="#features" className="text-white hover:text-[#FFD600] font-semibold uppercase tracking-wider text-sm transition-colors">Features</a>
                <a href="#how-it-works" className="text-white hover:text-[#FFD600] font-semibold uppercase tracking-wider text-sm transition-colors">How It Works</a>
                <a href="#pricing" className="text-white hover:text-[#FFD600] font-semibold uppercase tracking-wider text-sm transition-colors">Pricing</a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href={getAppUrl('/auth/login')} className="hidden md:block text-white hover:text-[#FFD600] font-semibold uppercase tracking-wider text-sm transition-colors">
                Sign In
              </a>
              <Button
                asChild
                className="bg-[#E53935] text-white hover:bg-[#C62828] font-bold px-6 py-3 uppercase tracking-wider border-2 border-[#E53935] hover:border-[#C62828] transition-all"
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
      <header className="bg-[#0A0A0F] relative overflow-hidden">
        {/* Geometric Decorations */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#E53935] rounded-full opacity-20" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-[#FFD600] opacity-10" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border-4 border-[#1976D2] opacity-30" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
              <div className="inline-block bg-[#FFD600] text-[#0A0A0F] px-4 py-2 font-bold uppercase tracking-widest text-sm mb-6">
                Journey Mapping Platform
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Design Better
                <span className="block text-[#E53935]">Customer</span>
                <span className="block">Journeys</span>
              </h1>
              <p className="mt-8 text-xl sm:text-2xl max-w-3xl mx-auto lg:mx-0 text-gray-300 leading-relaxed">
                Blupi helps teams collaborate to create and share customer journey maps. Map out how customers interact with your product.
              </p>
              <div className="mt-10 flex gap-4 justify-center lg:justify-start">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-[#E53935] text-white hover:bg-[#C62828] font-bold text-lg px-10 py-6 uppercase tracking-wider border-4 border-[#E53935] hover:border-[#C62828] transition-all shadow-2xl"
                >
                  <a href={getAppUrl('/auth/register')}>
                    Start Free
                  </a>
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  variant="outline" 
                  className="border-4 border-white text-white hover:bg-white hover:text-[#0A0A0F] font-bold uppercase tracking-wider transition-all"
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
                <div className="w-80 h-80 border-4 border-[#FFD600] rotate-12 opacity-50" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-[#1976D2] rounded-full opacity-20" />
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
            <div className="inline-block bg-[#0A0A0F] text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Features
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-[#0A0A0F] sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Everything You Need
            </h2>
            <div className="w-24 h-1 bg-[#E53935] mx-auto mt-6" />
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-white border-4 border-[#0A0A0F] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-[#FFD600] flex items-center justify-center text-3xl mb-6">
                ✨
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0F] uppercase tracking-wide">Smart Organization</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Break down customer journeys into clear phases and steps with intuitive tools
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white border-4 border-[#0A0A0F] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-[#E53935] flex items-center justify-center text-3xl mb-6">
                🤝
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0F] uppercase tracking-wide">Real-time Collaboration</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Work together in real-time with your entire team from anywhere
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white border-4 border-[#0A0A0F] p-8 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className="h-16 w-16 bg-[#1976D2] flex items-center justify-center text-3xl mb-6">
                🎯
              </div>
              <h3 className="text-xl font-bold text-[#0A0A0F] uppercase tracking-wide">Easy Sharing</h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Share your blueprints with a simple link - no login required for stakeholders
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-[#0A0A0F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-[#E53935] text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Process
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              How Blupi Works
            </h2>
            <div className="w-24 h-1 bg-[#FFD600] mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0A0A0F] border-4 border-[#FFD600] p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#FFD600] text-[#0A0A0F] flex items-center justify-center text-2xl font-black">
                1
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-4 mb-4">Create Your Project</h3>
              <p className="text-gray-400">Start with a blank canvas or choose from our template library</p>
            </div>
            
            <div className="bg-[#0A0A0F] border-4 border-[#E53935] p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#E53935] text-white flex items-center justify-center text-2xl font-black">
                2
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide mt-4 mb-4">Invite Your Team</h3>
              <p className="text-gray-400">Collaborate in real-time with your entire team to build journey maps</p>
            </div>
            
            <div className="bg-[#0A0A0F] border-4 border-[#1976D2] p-8 text-center relative">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-[#1976D2] text-white flex items-center justify-center text-2xl font-black">
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
            <div className="inline-block bg-[#0A0A0F] text-white px-6 py-2 font-bold uppercase tracking-widest text-sm mb-6">
              Pricing
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-[#0A0A0F] sm:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Beta Access
            </h2>
            <div className="w-24 h-1 bg-[#E53935] mx-auto mt-6" />
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              We're currently in beta - try Blupi for free
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white border-4 border-[#0A0A0F] p-8 text-center relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#FFD600] text-[#0A0A0F] px-6 py-2 font-bold uppercase tracking-widest text-sm">
                Limited Time
              </div>
              <div className="mb-6 mt-4">
                <span className="text-6xl font-black text-[#0A0A0F]">FREE</span>
                <span className="text-xl text-gray-600 ml-2">during beta</span>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00E676] flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Unlimited customer journey maps</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00E676] flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Real-time team collaboration</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00E676] flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Shareable public links</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00E676] flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">AI-powered blueprint import</span>
                </li>
                <li className="flex items-center">
                  <span className="w-6 h-6 bg-[#00E676] flex items-center justify-center text-white text-sm font-bold mr-3">✓</span>
                  <span className="text-gray-700">Priority support during beta</span>
                </li>
              </ul>

              <Button 
                asChild
                className="w-full bg-[#E53935] text-white hover:bg-[#C62828] font-bold py-4 text-lg uppercase tracking-wider"
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
      <section className="bg-[#FFD600] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E53935] opacity-20" style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0A0A0F] opacity-10 rounded-full" />
        
        <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="text-4xl font-black tracking-tight text-[#0A0A0F] sm:text-5xl uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Ready to Start?
            </h2>
            <p className="mt-6 text-xl text-[#0A0A0F]/80 max-w-3xl mx-auto font-medium">
              Join teams that use Blupi to create exceptional customer journeys
            </p>
            <div className="mt-8 flex justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-[#0A0A0F] text-white hover:bg-[#1a1a1f] font-bold uppercase tracking-wider shadow-xl px-10 py-6 text-lg border-4 border-[#0A0A0F]"
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
      <footer className="bg-[#0A0A0F] text-white border-t-4 border-[#E53935]">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-12 bg-white p-2" />
              <p className="mt-4 text-gray-400">
                Helping teams create better customer experiences through collaborative journey mapping.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">
                  <FaTwitter size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">
                  <FaLinkedin size={24} />
                </a>
                <a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">
                  <FaGithub size={24} />
                </a>
              </div>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Product</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Templates</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Enterprise</a></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div className="col-span-1">
              <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Community</a></li>
                <li><a href="#" className="text-gray-400 hover:text-[#FFD600] transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Blupi. All rights reserved.</p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <a href="#" className="text-gray-500 hover:text-[#FFD600] text-sm transition-colors">Terms</a>
                <a href="#" className="text-gray-500 hover:text-[#FFD600] text-sm transition-colors">Privacy</a>
                <a href="#" className="text-gray-500 hover:text-[#FFD600] text-sm transition-colors">Cookies</a>
              </div>
            </div>
            
            {isDevelopment && (
              <p className="mt-4 text-xs text-center text-gray-600">
                <span className="bg-[#FFD600] text-[#0A0A0F] font-bold px-2 py-1">DEV</span>
                <span className="ml-2">blupi.io (landing) | my.blupi.io (app)</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
