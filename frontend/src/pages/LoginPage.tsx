import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage({ isLogin, setIsLogin }: { isLogin: boolean; setIsLogin: React.Dispatch<React.SetStateAction<boolean>> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      if (email === 'editor@in' && password === 'New12345') {
        navigate('/dashboard');
      } else {
        setError('Invalid corporate credentials.');
      }
    } else {
      setIsLogin(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcf9f4] font-sans text-[#553a34] flex selection:bg-[#ffdea0] selection:text-[#261900] overflow-hidden">

      {/* Grid Layout mimicking Editorial Margins */}
      <div className="grid grid-cols-1 md:grid-cols-12 w-full max-w-[1600px] mx-auto min-h-screen">

        {/* Left Pane - Story & Context (cols 2 through 6) */}
        <div className="hidden md:flex flex-col justify-between col-span-5 col-start-2 py-20 pr-12">
          {/* Top navigation - Tactical / Notated feel */}
          <div className="flex space-x-8 text-xs font-bold text-[#974726]">
            <a href="#" className="border-b-2 border-transparent hover:border-[#974726] pb-1 transition-all">About Us</a>
            <a href="#" className="border-b-2 border-transparent hover:border-[#974726] pb-1 transition-all">Documentation</a>
            <a href="#" className="border-b-2 border-transparent hover:border-[#974726] pb-1 transition-all">Help & Support</a>
          </div>

          <div className="my-auto">
            {/* Archival Tag */}
            <div className="inline-block px-3 py-1 bg-[#ffdea0] text-[#261900] text-[10px] font-bold rounded-full mb-8">
              Enterprise Sustainability Infrastructure
            </div>

            <h1 className="text-6xl lg:text-8xl font-bold text-[#553a34] leading-[0.85] mb-8">
              ESGAudit
            </h1>
            <p className="text-xl text-[#553a34] font-medium leading-relaxed max-w-sm">
              A robust, architecture-driven platform empowering corporates to track, control, and reduce Scope 1, 2, and 3 carbon emissions for a sustainable enterprise future.
            </p>
          </div>

          <div className="text-xs font-semibold text-[#877369]">
            &copy; {new Date().getFullYear()} ESGAudit Systems. All rights reserved.
          </div>
        </div>

        {/* Right Pane - Action & Data (cols 8 through 11) */}
        <div className="col-span-1 md:col-span-4 md:col-start-8 flex flex-col justify-center px-6 py-12 md:px-0">

          {/* Mobile Heading */}
          <div className="md:hidden mb-12">
            <h1 className="text-5xl font-bold tracking-tight text-[#553a34] leading-[0.9] mb-4">ESGAudit</h1>
            <p className="text-[#877369] text-sm font-medium">Enterprise Sustainability Infrastructure</p>
          </div>

          {/* Paper-on-Table Form Container */}
          <div className="bg-white p-10 md:p-14 shadow-[0_20px_40px_-5px_rgba(85,58,52,0.04),0_8px_16px_-4px_rgba(85,58,52,0.08)] border border-[#dac2b6] border-opacity-30 flex flex-col">
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-[#553a34] mb-2">
                {isLogin ? 'Sign In' : 'Register Corporate'}
              </h2>
              <p className="text-[#877369] font-medium text-sm">
                Enter your corporate credentials to continue accessing the audit portal.
              </p>
            </div>

            {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}

            <form className="space-y-8" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#553a34]">Company Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-[#ebe8e3] text-[#553a34] border-b border-[#dac2b6] focus:outline-none focus:border-b-2 placeholder-[#a3948e] transition-all font-medium"
                    placeholder="E.g. Acme Corporation"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#553a34]">Corporate Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#ebe8e3] text-[#553a34] border-b border-[#dac2b6] focus:outline-none focus:border-b-2 placeholder-[#a3948e] transition-all font-medium"
                  placeholder="name@company.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#553a34]">Password</label>
                  {isLogin && <a href="#" className="text-xs font-bold text-[#974726] border-b border-transparent hover:border-[#974726] transition-all">Forgot Password?</a>}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#ebe8e3] text-[#553a34] border-b border-[#dac2b6] focus:outline-none focus:border-b-2 placeholder-[#a3948e] transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="w-full py-4 mt-4 bg-[#553a34] hover:bg-[#3a2824] text-white font-bold rounded-md transition-colors text-sm">
                {isLogin ? 'Access Dashboard' : 'Initialize Account'}
              </button>
            </form>

            <div className="mt-12 flex flex-col items-start gap-2 text-sm text-[#877369] font-medium">
              <span>{isLogin ? "No corporate account yet? " : "Already partnered with us? "}</span>
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-[#974726] font-bold border-b-[2px] border-[#974726] hover:text-[#553a34] hover:border-[#553a34] transition-all pb-0.5 text-xs"
              >
                {isLogin ? 'Apply for access' : 'Sign in instead'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
