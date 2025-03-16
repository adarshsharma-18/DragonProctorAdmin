import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface ExamCompletionCardProps {
  totalQuestions: number;
  answeredQuestions: number;
  onReturnHome: () => void;
  onSubmitExam: () => void;
}

const ExamCompletionCard: React.FC<ExamCompletionCardProps> = ({
  totalQuestions,
  answeredQuestions,
  onReturnHome,
  onSubmitExam
}) => {
  const percentageCompleted = (answeredQuestions / totalQuestions) * 100;
  
  return (
    <Card className="bg-[#1e2736]/80 border-[#2a3749] backdrop-blur-sm rounded-xl max-w-2xl mx-auto mt-12">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold text-white">Exam Completed</CardTitle>
      </CardHeader>
      <CardContent className="text-center px-8 pb-4">
        <p className="text-gray-300 mb-6">Thank you for completing your exam.</p>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-gray-400">{percentageCompleted.toFixed(0)}%</span>
          </div>
          <Progress value={percentageCompleted} className="h-2 bg-gray-700" />
        </div>
        
        <p className="text-xl mb-4 text-white">
          You answered <span className="text-[#e6e13e]">{answeredQuestions}</span> out of <span className="text-[#e6e13e]">{totalQuestions}</span> questions.
        </p>
      </CardContent>
      <CardFooter className="justify-center pb-8">
        <Button 
          onClick={onSubmitExam}
          className="bg-green-500 hover:bg-green-700 text-white font-medium py-2.5 px-8 rounded-md mr-4"
        >
          Submit Exam
        </Button>
        <Button 
          onClick={onReturnHome} 
          className="bg-[#e6e13e] hover:bg-[#c4c034] text-black font-medium py-2.5 px-8 rounded-md"
        >
          Return to Home
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ExamCompletionCard;
