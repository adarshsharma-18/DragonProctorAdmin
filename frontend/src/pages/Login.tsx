import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import Camera from '@/components/Camera';

const Login = () => {
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Clear previous errors
    setError('');
    
    // Validate inputs
    if (!fullName.trim()) {
      setError('Please enter your full name');
      setIsLoading(false);
      return;
    }
    
    if (!registrationNumber.trim()) {
      setError('Please enter your registration number');
      setIsLoading(false);
      return;
    }
    
    // Validate registration number format
    const regNumRegex = /^RA\d{13}$/;
    if (!regNumRegex.test(registrationNumber)) {
      setError('Registration number must start with RA followed by 13 digits (e.g., RA2211003011638)');
      setIsLoading(false);
      return;
    }
    
    // Simulate API call with timeout
    setTimeout(() => {
      if (password === 'Dragon') {
        toast({
          title: "Login successful",
          description: "Welcome to Dragon Proctoring System"
        });
        // Navigate to instructions page instead of exam
        navigate('/instructions', { 
          state: { 
            studentName: fullName, 
            studentId: registrationNumber 
          } 
        });
      } else {
        setError('Invalid password. Please try again.');
        toast({
          title: "Login Failed",
          description: "Invalid password. Please try again.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 800);
  };

  const handleCameraError = (error: string) => {
    setError(error);
  };

  return (
    <div className="min-h-screen flex bg-[#111827] text-white">
      {/* Left Section - Login Form */}
      <div className="w-full lg:w-1/2 p-8 flex flex-col">
        <div className="text-center my-8">
          <h1 className="text-4xl font-bold text-[#e6e13e]">Dragon</h1>
        </div>
        
        <div className="max-w-md mx-auto w-full mt-12">
          <h2 className="text-2xl font-semibold mb-2">Exam Proctoring System</h2>
          <p className="text-gray-400 mb-8">Enter your details to continue</p>
          
          <div className="bg-[#1e2736]/50 rounded-lg p-6 backdrop-blur-sm">
            <h3 className="text-xl font-medium mb-1">Login</h3>
            <p className="text-sm text-gray-400 mb-6">Access your examination portal</p>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label htmlFor="fullName" className="text-sm">
                  Your Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#1a202c] border border-gray-700 rounded p-2.5 text-white focus:border-[#e6e13e] focus:outline-none transition-all"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-1">
                <label htmlFor="registrationNumber" className="text-sm">
                  Registration Number
                </label>
                <input
                  id="registrationNumber"
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  className="w-full bg-[#1a202c] border border-gray-700 rounded p-2.5 text-white focus:border-[#e6e13e] focus:outline-none transition-all"
                  placeholder="Format: RA2211003011638"
                />
                <p className="text-xs text-gray-400">Must start with RA followed by 13 digits</p>
              </div>
              
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a202c] border border-gray-700 rounded p-2.5 text-white focus:border-[#e6e13e] focus:outline-none transition-all"
                  placeholder="Enter your password"
                />
              </div>
              
              {error && <p className="text-sm text-red-400">{error}</p>}
              
              <button 
                type="submit" 
                className="w-full bg-[#e6e13e] hover:bg-[#c4c034] text-black font-medium py-2.5 px-4 rounded transition-colors duration-200"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Continue to Exam'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Right Section - Camera & Instructions */}
      <div className="hidden lg:block w-1/2 bg-[#0f1623] p-10">
        <div className="h-full flex flex-col">
          <h3 className="text-xl font-medium mb-4">Camera Instructions</h3>
          <p className="text-gray-400 mb-6">
            Ensure your camera is working properly before starting the exam. Your session will be monitored.
          </p>
          
          <div className="mb-8 relative border-4 border-[#1e2736] rounded-lg overflow-hidden">
            <Camera 
              onError={handleCameraError} 
              className="h-[320px] w-full" 
            />
            <div className="absolute top-2 right-2 flex items-center">
              <span className="inline-flex items-center text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                inactive
              </span>
            </div>
          </div>
          
          <div className="mt-auto">
            <h3 className="text-lg font-medium mb-4">Exam Guidelines</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <span className="text-[#e6e13e] mr-2">•</span>
                <span>Ensure you're in a well-lit, quiet environment</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#e6e13e] mr-2">•</span>
                <span>Keep your face visible in the camera throughout</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#e6e13e] mr-2">•</span>
                <span>Avoid bright backlight (e.g., sitting against a window)</span>
              </li>
              <li className="flex items-start">
                <span className="text-[#e6e13e] mr-2">•</span>
                <span>Use Google Chrome or Mozilla Firefox for the best experience</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
