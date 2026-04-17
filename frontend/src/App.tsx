import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SupplyChainDashboard from './components/SupplyChainDashboard';
function App() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    // make a route for the dashboard and the login page
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage isLogin={isLogin} setIsLogin={setIsLogin} />} />
        <Route path="/dashboard" element={<SupplyChainDashboard />} />
      </Routes>
    </Router>
  );
}

const LoginPage = ({ isLogin, setIsLogin }: { isLogin: boolean; setIsLogin: React.Dispatch<React.SetStateAction<boolean>> }) => {
  return (

    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row font-sans selection:bg-neutral-800 selection:text-white">
      
      
      {/* Left Pane - Branding & Tagline */}
      <div className="flex-1 flex flex-col justify-between px-8 py-12 md:px-20 lg:px-32 bg-neutral-950">
        
        {/* Top Navbar / Decorative Links */}
        <div className="flex items-center space-x-8 text-sm font-medium text-neutral-400">
          <a href="#" className="hover:text-white transition-colors">About Us</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Help & Support</a>
        </div>

        {/* Main Branding */}
        <div className="max-w-2xl my-auto py-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-8">
            ESGAudit
          </h1>
          <p className="text-lg md:text-xl text-neutral-300 leading-relaxed font-normal mb-8">
            A robust, backend-driven platform empowering corporates to track, control, and reduce Scope 1, 2, and 3 carbon emissions for a sustainable future.
          </p>
          <div className="flex items-center space-x-3 text-sm text-neutral-400 mt-12">
            <span className="w-2 h-2 bg-emerald-500 rounded-lg"></span>
            <span className="tracking-wide uppercase font-semibold text-xs text-neutral-300">Enterprise Sustainability Infrastructure</span>
          </div>
        </div>

        {/* Footer (Decorative) */}
        <div className="text-xs text-neutral-500 font-medium pb-4">
          &copy; {new Date().getFullYear()} ESGAudit Systems. All rights reserved.
        </div>
      </div>

      {/* Right Pane - Form */}
      <div className="w-full md:w-[480px] lg:w-[560px] bg-neutral-900 flex flex-col justify-center px-8 py-16 md:px-16 shadow-2xl">
        <div className="w-full max-w-sm mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-tight">
              {isLogin ? 'Sign In' : 'Register Corporate'}
            </h2>
            <p className="text-neutral-400 text-sm font-medium">
              Enter your corporate credentials to continue accessing the audit portal.
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            {!isLogin && (
              <div className="space-y-2.5">
                <label className="text-xs uppercase tracking-wider font-semibold text-neutral-400">Company Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3.5 bg-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder-neutral-500 transition-colors" 
                  placeholder="E.g. Acme Corporation" 
                />
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-neutral-400">Corporate Email</label>
              <input 
                type="email" 
                className="w-full px-4 py-3.5 bg-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder-neutral-500 transition-colors" 
                placeholder="name@company.com" 
              />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider font-semibold text-neutral-400">Password</label>
                {isLogin && <a href="#" className="text-xs text-neutral-400 hover:text-white transition-colors font-medium">Forgot Password?</a>}
              </div>
              <input 
                type="password" 
                className="w-full px-4 py-3.5 bg-neutral-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-700 placeholder-neutral-500 transition-colors" 
                placeholder="••••••••" 
              />
            </div>

            <button type="submit" className="w-full py-4 px-4 mt-8 bg-white hover:bg-neutral-200 text-neutral-950 font-bold rounded-lg transition-colors tracking-wide">
              {isLogin ? 'Access Dashboard' : 'Initialize Account'}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-neutral-400 font-medium">
            {isLogin ? "No corporate account yet? " : "Already partnered with us? "}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="text-white hover:text-neutral-300 transition-colors font-bold ml-1"
            >
              {isLogin ? 'Apply for access' : 'Sign in instead'}
            </button>
          </p>
        </div>
      </div>
      
    </div>
  );
}

export default App;
