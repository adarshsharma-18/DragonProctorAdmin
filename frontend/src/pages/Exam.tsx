import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import ExamHeader from '@/components/exam/ExamHeader';
import ExamProgressBar from '@/components/exam/ExamProgressBar';
import QuestionCard from '@/components/exam/QuestionCard';
import QuestionNavigation from '@/components/exam/QuestionNavigation';
import ExamCompletionCard from '@/components/exam/ExamCompletionCard';
import { Question } from '@/types/exam';

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

const Exam = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [textAnswers, setTextAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [isExamSubmitted, setIsExamSubmitted] = useState(false);
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

  return (
    <div className="min-h-screen bg-[#111827] text-white">
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

      <div className="container mx-auto px-4 py-8">
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
