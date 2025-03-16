import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const ExamInstructions = () => {
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [nameConfirmation, setNameConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get student details from location state
  const studentName = location.state?.studentName || '';
  const studentId = location.state?.studentId || '';
  
  // Redirect to login if no student details are present
  useEffect(() => {
    if (!studentName || !studentId) {
      toast({
        title: "Access Denied",
        description: "Please login to access the exam.",
        variant: "destructive",
      });
      navigate('/');
    }
  }, [studentName, studentId, navigate]);

  const handleProceed = () => {
    if (!agreeToTerms) {
      toast({
        title: "Agreement Required",
        description: "You must agree to the terms and conditions to proceed.",
        variant: "destructive",
      });
      return;
    }

    if (nameConfirmation.trim() === '') {
      toast({
        title: "Confirmation Required",
        description: "Please type your name to confirm.",
        variant: "destructive",
      });
      return;
    }

    if (nameConfirmation.toLowerCase().trim() !== studentName.toLowerCase().trim()) {
      toast({
        title: "Name Mismatch",
        description: "The name you entered doesn't match your login name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Proceed to exam with student details
    setTimeout(() => {
      navigate('/exam', { 
        state: { 
          studentName, 
          studentId 
        } 
      });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white py-10">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#e6e13e]">Dragon Proctoring System</h1>
          <p className="text-gray-400 mt-2">Exam Instructions & Guidelines</p>
        </div>
        
        <div className="bg-[#1e2736]/50 rounded-lg p-8 backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-6">Before You Begin</h2>
          
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-medium mb-3 text-[#e6e13e]">Exam Rules</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>You must complete the exam within the allocated time.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Your webcam must remain on throughout the exam session.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>No other person should be present in your room during the exam.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>You cannot use additional devices, books, or notes.</span>
                </li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-xl font-medium mb-3 text-[#e6e13e]">Technical Requirements</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Ensure you have a stable internet connection.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Use a modern browser (Chrome, Firefox, Edge) for best experience.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Allow camera and microphone permissions when prompted.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Do not refresh the page or navigate away during the exam.</span>
                </li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-xl font-medium mb-3 text-[#e6e13e]">Exam Format</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>The exam consists of multiple-choice questions.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>You can navigate between questions using the next/previous buttons.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>You can review and change your answers before final submission.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Once submitted, you cannot retake the exam.</span>
                </li>
              </ul>
            </section>
            
            <section>
              <h3 className="text-xl font-medium mb-3 text-[#e6e13e]">Proctoring Information</h3>
              <p className="text-gray-300 mb-3">
                This exam is proctored using Dragon Proctoring System. The following will be monitored:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Your webcam video feed</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Browser activity and tab switching</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#e6e13e] mr-2">•</span>
                  <span>Suspicious movements or behaviors</span>
                </li>
              </ul>
            </section>
            
            <div className="border-t border-gray-700 pt-6 mt-8">
              <div className="flex items-start mb-5">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <label htmlFor="agreeTerms" className="text-gray-300">
                  I have read and agree to all the terms, conditions, and exam guidelines. I understand that any violation may result in disqualification.
                </label>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 mb-2">
                  Type your full name to confirm ({studentName}):
                </label>
                <input
                  type="text"
                  value={nameConfirmation}
                  onChange={(e) => setNameConfirmation(e.target.value)}
                  placeholder="Type your full name as confirmation"
                  className="w-full bg-[#1a202c] border border-gray-700 rounded p-2.5 text-white focus:border-[#e6e13e] focus:outline-none transition-all"
                />
              </div>
              
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 border border-gray-600 rounded hover:bg-gray-800 transition-colors"
                >
                  Return to Login
                </button>
                
                <button
                  onClick={handleProceed}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#e6e13e] hover:bg-[#c4c034] text-black font-medium rounded transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? 'Processing...' : 'Proceed to Exam'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructions;
