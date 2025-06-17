import { Button } from "@/components/ui/button";
import { FaTwitter, FaLinkedin, FaGithub } from "react-icons/fa";

export default function LandingPage() {
  // Configure the app domain based on environment and current hostname
  const isProduction = import.meta.env.PROD;
  const isDevelopment = !isProduction;
  const currentHostname = window.location.hostname;
  
  // Generate proper application URLs based on environment
  const getAppUrl = (path: string) => {
    if (isProduction && (currentHostname === 'www.blupi.io' || currentHostname === 'blupi.io')) {
      // On marketing domain, link to app domain
      return `https://my.blupi.io${path}`;
    } else {
      // In development or already on app domain, use relative path
      return path;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Development Mode Banner */}
      {isDevelopment && (
        <div className="bg-[#F2918C] text-[#302E87] py-2 text-center font-semibold">
          Development Mode - Landing Page Preview 
          <span className="ml-2 px-2 py-1 bg-[#302E87] text-white rounded text-xs font-bold">
            ?landing=true
          </span>
        </div>
      )}
      
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <img src="/blupi-logomark-outlined.png" alt="Blupi" className="h-8" />
              </div>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex ml-10 space-x-6">
                <a href="#features" className="text-[#302E87]/90 hover:text-[#302E87] font-medium">Features</a>
                <a href="#how-it-works" className="text-[#302E87]/90 hover:text-[#302E87] font-medium">How It Works</a>
                <a href="#" className="text-[#302E87]/90 hover:text-[#302E87] font-medium">Pricing</a>
                <a href="#" className="text-[#302E87]/90 hover:text-[#302E87] font-medium">Templates</a>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <a href={getAppUrl('/auth/login')} className="hidden md:block text-[#302E87] hover:text-[#302E87]/80 font-medium">
                Sign In
              </a>
              <Button
                asChild
                className="bg-[#302E87] text-white hover:bg-[#302E87]/90 font-bold px-6 py-3 text-lg shadow-lg"
              >
                <a href={getAppUrl('/auth/register')}>
                  Sign Up for Free
                </a>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <header className="bg-[#302E87] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
                Design Better Customer Journeys Together
              </h1>
              <p className="mt-6 text-xl sm:text-2xl max-w-3xl mx-auto lg:mx-0 text-[#A1D9F5]">
                Blupi helps teams work together to create and share customer journey maps. Map out how customers interact with your product, making it easy for everyone to stay aligned.
              </p>
              <div className="mt-10 flex gap-4 justify-center lg:justify-start">
                <Button 
                  asChild
                  size="lg" 
                  className="bg-white text-[#302E87] hover:bg-gray-100 font-bold text-xl px-8 py-4 shadow-xl border-2 border-white"
                >
                  <a href={getAppUrl('/auth/register')}>
                    Get Started Free
                  </a>
                </Button>
                <Button 
                  asChild
                  size="lg" 
                  variant="outline" 
                  className="border-white bg-white/10 text-white hover:bg-white/20 font-medium"
                >
                  <a href={getAppUrl('/auth/login')}>
                    Sign In
                  </a>
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <img 
                  src="/blupi-pufferfish-new.png" 
                  alt="Blupi Mascot" 
                  className="max-w-full h-auto"
                  style={{ maxWidth: '400px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#FFE8D6]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#302E87] sm:text-4xl" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
              Everything You Need for Customer Journey Mapping
            </h2>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#A1D9F5] flex items-center justify-center text-3xl shadow-md">
                ✨
              </div>
              <h3 className="mt-6 text-xl font-semibold text-[#302E87]">Smart Organization</h3>
              <p className="mt-2 text-[#6B6B97] text-center">
                Break down customer journeys into clear phases and steps with intuitive tools
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#A1D9F5] flex items-center justify-center text-3xl shadow-md">
                🤝
              </div>
              <h3 className="mt-6 text-xl font-semibold text-[#302E87]">Real-time Collaboration</h3>
              <p className="mt-2 text-[#6B6B97] text-center">
                Work together in real-time with your entire team from anywhere
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#A1D9F5] flex items-center justify-center text-3xl shadow-md">
                🎯
              </div>
              <h3 className="mt-6 text-xl font-semibold text-[#302E87]">Easy Sharing</h3>
              <p className="mt-2 text-[#6B6B97] text-center">
                Share your blueprints with a simple link - no login required for stakeholders
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#302E87] sm:text-4xl" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
              How Blupi Works
            </h2>
            <p className="mt-4 text-xl text-[#6B6B97] max-w-3xl mx-auto">
              Create, collaborate, and share customer journey maps in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#FFE8D6]/30 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-[#302E87] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold text-[#302E87] mb-2">Create Your Project</h3>
              <p className="text-[#6B6B97]">Start with a blank canvas or choose from our template library to kickstart your journey mapping</p>
            </div>
            
            <div className="bg-[#FFE8D6]/30 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-[#302E87] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold text-[#302E87] mb-2">Invite Your Team</h3>
              <p className="text-[#6B6B97]">Collaborate in real-time with your entire team to build comprehensive customer journey maps</p>
            </div>
            
            <div className="bg-[#FFE8D6]/30 p-8 rounded-lg text-center">
              <div className="w-16 h-16 bg-[#302E87] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold text-[#302E87] mb-2">Share & Iterate</h3>
              <p className="text-[#6B6B97]">Share your blueprints with stakeholders and continuously improve based on feedback</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-[#FFE8D6]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#302E87] sm:text-4xl" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
              Pricing
            </h2>
            <p className="mt-4 text-xl text-[#6B6B97] max-w-3xl mx-auto">
              We're currently in beta and looking for customers to try Blupi for free
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg shadow-lg border-2 border-[#302E87] p-8 text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#302E87]" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
                  Beta Access
                </h3>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-[#302E87]">Free</span>
                  <span className="text-xl text-[#6B6B97] ml-2">during beta</span>
                </div>
              </div>
              
              <ul className="space-y-4 mb-8 text-left">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-[#6B6B97]">Unlimited customer journey maps</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-[#6B6B97]">Real-time team collaboration</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-[#6B6B97]">Shareable public links</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-[#6B6B97]">AI-powered blueprint import</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-[#6B6B97]">Priority support during beta</span>
                </li>
              </ul>

              <Button 
                asChild
                className="w-full bg-[#302E87] text-white hover:bg-[#302E87]/90 font-bold py-3 text-lg"
              >
                <a href={getAppUrl('/auth/register')}>
                  Get Free Beta Access
                </a>
              </Button>
              
              <p className="text-sm text-[#6B6B97] mt-4">
                Full pricing will be announced soon. Beta users will receive exclusive early-bird pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F2918C]">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#302E87] sm:text-4xl" style={{ fontFamily: 'Young Serif, Georgia, Times New Roman, serif' }}>
              Ready to improve your customer experience?
            </h2>
            <p className="mt-4 text-xl text-[#302E87]/90 max-w-3xl mx-auto">
              Join thousands of teams that use Blupi to create exceptional customer journeys
            </p>
            <div className="mt-8 flex justify-center">
              <Button 
                asChild
                size="lg" 
                className="bg-[#302E87] text-white hover:bg-[#252270] font-medium shadow-md"
              >
                <a href={getAppUrl('/auth/register')}>
                  Start Mapping Now — It's Free
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#302E87] text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1">
              <img src="/Blupi-logomark-blue.png" alt="Blupi" className="h-10 bg-white p-1 rounded" />
              <p className="mt-4 text-[#A1D9F5]">
                Helping teams create better customer experiences through collaborative journey mapping.
              </p>
              <div className="mt-6 flex space-x-4">
                <a href="#" className="text-[#A1D9F5] hover:text-white">
                  <FaTwitter size={20} />
                </a>
                <a href="#" className="text-[#A1D9F5] hover:text-white">
                  <FaLinkedin size={20} />
                </a>
                <a href="#" className="text-[#A1D9F5] hover:text-white">
                  <FaGithub size={20} />
                </a>
              </div>
            </div>
            
            {/* Product */}
            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Features</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Templates</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Integrations</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Enterprise</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Security</a></li>
              </ul>
            </div>
            
            {/* Company */}
            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">About Us</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Careers</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Blog</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Press</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Contact</a></li>
              </ul>
            </div>
            
            {/* Resources */}
            <div className="col-span-1">
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Community</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Webinars</a></li>
                <li><a href="#" className="text-[#A1D9F5] hover:text-white">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-[#A1D9F5]/30">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-[#A1D9F5] text-sm">&copy; {new Date().getFullYear()} Blupi. All rights reserved.</p>
              <div className="mt-4 md:mt-0 flex space-x-6">
                <a href="#" className="text-[#A1D9F5] hover:text-white text-sm">Terms of Service</a>
                <a href="#" className="text-[#A1D9F5] hover:text-white text-sm">Privacy Policy</a>
                <a href="#" className="text-[#A1D9F5] hover:text-white text-sm">Cookie Policy</a>
              </div>
            </div>
            
            {isDevelopment && (
              <p className="mt-4 text-xs text-center text-[#A1D9F5]">
                <span className="bg-[#F2918C] text-[#302E87] font-medium px-2 py-1 rounded">Development Mode</span>
                <span className="ml-2">Domain Separation: blupi.io (landing) | my.blupi.io (app)</span>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}