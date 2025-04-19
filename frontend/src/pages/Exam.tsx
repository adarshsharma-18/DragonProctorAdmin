import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import ExamHeader from '@/components/exam/ExamHeader';
import ExamProgressBar from '@/components/exam/ExamProgressBar';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNavigation from '@/components/exam/QuestionNavigation';
import ExamCompletionCard from '@/components/exam/ExamCompletionCard';
import { Question } from '@/types/exam';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

// Sample questions data
const questions: Question[] = [
  {
    id: 1,
    question: "Which of the following is a characteristic of a secure proctoring system?",
    options: [
      "Recording the screen without student's consent",
      "Continuous identity verification during the exam",
      "Allowing unlimited access to external resources",
      "Disabling computer functionality completely"
    ],
    correctAnswer: 1,
    type: "multiple-choice"
  },
  {
    id: 2,
    question: "Which of the following is a benefit of online proctoring?",
    options: [
      "Reduced accessibility",
      "Increased exam costs",
      "Remote exam supervision",
      "Slower grading process"
    ],
    correctAnswer: 2,
    type: "multiple-choice"
  },
  {
    id: 3,
    question: "What does 'Dragon' represent in this system?",
    options: [
      "The mascot of the institution",
      "The password for access",
      "The developer's name",
      "The security protocol used"
    ],
    correctAnswer: 3,
    type: "multiple-choice"
  },
  {
    id: 4,
    question: "What does 'Dragon' represent in this system?",
    options: [
      "The mascot of the institution",
      "The password for access",
      "The developer's name",
      "The security protocol used"
    ],
    correctAnswer: 3,
    type: "multiple-choice"
  },
  {
    id: 5,
    question: "What does 'Dragon' represent in this system?",
    options: [
      "The mascot of the institution",
      "The password for access",
      "The developer's name",
      "The security protocol used"
    ],
    correctAnswer: 3,
    type: "multiple-choice"
  },
  {
    id: 6,
    question: "Describe three key security features of the Dragon proctoring system and explain how they prevent academic dishonesty.",
    options: ["", "", "", ""],
    correctAnswer: 0,
    type: "theoretical"
  }  
];

const fetchExamStatus = async () => {
  const response = await fetch('/api/exam_status');
  if (!response.ok) throw new Error('Failed to fetch exam status');
  return response.json();
};

const fetchCameraStatus = async () => {
  const response = await fetch('/api/camera_status');
  if (!response.ok) throw new Error('Failed to fetch camera status');
  return response.json();
};

const Exam = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [textAnswers, setTextAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
  const [isExamPaused, setIsExamPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState<string[]>([]);
  const [cameraStatus, setCameraStatus] = useState<any>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
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

  // Start camera detection when component mounts
  useEffect(() => {
    const startCameraDetection = async () => {
      try {
        const response = await fetch('/api/start_camera', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to start camera detection');
        }
        console.log('Camera detection started');
      } catch (error) {
        console.error('Error starting camera detection:', error);
      }
    };

    startCameraDetection();

    // Cleanup function to stop camera detection
    return () => {
      const stopCameraDetection = async () => {
        try {
          await fetch('/api/stop_camera', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Error stopping camera detection:', error);
        }
      };
      stopCameraDetection();
    };
  }, []);

  const { data: examStatus } = useQuery({
    queryKey: ['examStatus'],
    queryFn: fetchExamStatus,
    refetchInterval: 1000, // Check status every second
  });

  const { data: cameraData } = useQuery({
    queryKey: ['cameraStatus'],
    queryFn: fetchCameraStatus,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (examStatus) {
      setIsExamPaused(examStatus.is_paused);
      setPauseReason(examStatus.pause_reason || []);
    }
  }, [examStatus]);

  useEffect(() => {
    if (cameraData) {
      setCameraStatus(cameraData);
    }
  }, [cameraData]);

  // Enhanced warning effect
  useEffect(() => {
    if (cameraStatus) {
      const warnings = [];
      if (cameraStatus.voice_detected) {
        warnings.push('Voice detected! Please stop talking during the exam.');
      }
      if (cameraStatus.phone_detected) {
        warnings.push('Mobile device detected! Please put away your phone.');
      }
      if (cameraStatus.looking_away) {
        warnings.push('Please maintain eye contact with the screen.');
      }
      if (cameraStatus.face_detected === false) {
        warnings.push('Face not detected! Please ensure you are visible to the camera.');
      }

      if (warnings.length > 0) {
        setWarningMessage(warnings.join('\n'));
        setShowWarning(true);
        
        // Show toast notification
        toast({
          title: "Warning",
          description: warnings.join('\n'),
          variant: "destructive",
          duration: 5000,
        });
      } else {
        setShowWarning(false);
      }
    }
  }, [cameraStatus]);

  // Calculate if current question is the last one
  const isLastQuestion = currentQuestion === questions.length - 1;

  useEffect(() => {
    // Timer countdown effect
    if (timeLeft > 0 && !isExamSubmitted) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isExamSubmitted) {
      handleSubmitExam();
    }
  }, [timeLeft, isExamSubmitted]);

  const handleAnswerSelect = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleTextAnswerChange = (questionIndex: number, text: string) => {
    const newTextAnswers = [...textAnswers];
    newTextAnswers[questionIndex] = text;
    setTextAnswers(newTextAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitExam = () => {
    // Calculate score for multiple choice questions
    const correctAnswers = selectedAnswers.filter(
      (answer, index) => questions[index].type === "multiple-choice" && answer === questions[index].correctAnswer
    ).length;
    
    setIsExamSubmitted(true);
    
    toast({
      title: "Exam Submitted",
      description: `You scored ${correctAnswers} out of ${questions.filter(q => q.type === "multiple-choice").length} multiple-choice questions correctly.`,
    });
  };

  const handleFinalSubmit = () => {
    // This function is for the final submission from ExamCompletionCard
    toast({
      title: "Final Submission Complete",
      description: "Your exam has been successfully submitted to the server.",
    });
    
    // Additional logic for final submission (e.g., API call)
    // You could send both selectedAnswers and textAnswers to your backend
    
    // Navigate to home or results page
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleCameraError = (error: string) => {
    toast({
      title: "Proctoring Error",
      description: error,
      variant: "destructive",
    });
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const isQuestionAnswered = (index: number) => {
    if (questions[index].type === "multiple-choice") {
      return selectedAnswers[index] !== -1;
    } else {
      return textAnswers[index].trim() !== '';
    }
  };

  if (isExamPaused) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Exam Paused</h2>
          <p className="text-gray-700 mb-4">
            Your exam has been paused due to suspicious activity. Please wait for the administrator to review the situation.
          </p>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Reasons for pausing:</h3>
            <ul className="list-disc list-inside">
              {pauseReason.map((reason, index) => (
                <li key={index} className="text-gray-600">{reason}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-gray-500">
            The exam will resume once the administrator approves. Please remain in your seat and wait for further instructions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Warning Banner */}
        {showWarning && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow-lg">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">Warning!</h3>
                <p className="whitespace-pre-line">{warningMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Camera Status Banner */}
        {cameraStatus && (
          <div className="mb-4 p-4 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="mr-2">Face Detection:</span>
                  <Badge variant={cameraStatus.face_detected ? 'default' : 'destructive'}>
                    {cameraStatus.face_detected ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">Eye Contact:</span>
                  <Badge variant={cameraStatus.looking_away ? 'destructive' : 'default'}>
                    {cameraStatus.looking_away ? 'Looking Away' : 'Maintained'}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">Voice Detection:</span>
                  <Badge variant={cameraStatus.voice_detected ? 'destructive' : 'default'}>
                    {cameraStatus.voice_detected ? 'Voice Detected' : 'No Voice'}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">Phone Detection:</span>
                  <Badge variant={cameraStatus.phone_detected ? 'destructive' : 'default'}>
                    {cameraStatus.phone_detected ? 'Phone Detected' : 'No Phone'}
                  </Badge>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {cameraStatus.suspicious_events_count} suspicious events detected
              </div>
            </div>
          </div>
        )}

        <ExamHeader 
          studentName={studentName}
          studentId={studentId}
          onCameraError={handleCameraError}
        />
        
        <ExamProgressBar 
          currentQuestion={currentQuestion}
          totalQuestions={questions.length}
          timeLeft={timeLeft}
        />

        {isExamSubmitted ? (
          <ExamCompletionCard 
            totalQuestions={questions.length}
            answeredQuestions={questions.map((_, index) => isQuestionAnswered(index)).filter(Boolean).length}
            onReturnHome={handleReturnHome}
            onSubmitExam={handleFinalSubmit}
          />
        ) : (
          <div className="fade-in">
            <QuestionCard 
              questionNumber={currentQuestion + 1}
              question={questions[currentQuestion].question}
              options={questions[currentQuestion].options}
              selectedAnswer={selectedAnswers[currentQuestion]}
              onSelectAnswer={handleAnswerSelect}
              type={questions[currentQuestion].type || "multiple-choice"}
              onTextAnswerChange={(text) => handleTextAnswerChange(currentQuestion, text)}
              textAnswer={textAnswers[currentQuestion]}
            />
            
            <QuestionNavigation 
              onPrevQuestion={handlePrevQuestion}
              onNextQuestion={handleNextQuestion}
              isLastQuestion={isLastQuestion}
              onSubmitExam={handleSubmitExam}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Exam;
