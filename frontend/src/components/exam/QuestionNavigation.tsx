// QuestionNavigation.jsx
import React from "react";
import { Button } from "@/components/ui/button";

const QuestionNavigation = ({ onNextQuestion, onPrevQuestion, isLastQuestion, onSubmitExam }) => {
  return (
    <div className="relative w-full">
      <div className="flex justify-between mt-4 w-3/4 mx-auto">
        <Button onClick={onPrevQuestion} className="bg-gray-600 text-white px-4 py-2">
          Previous
        </Button>

        {isLastQuestion ? (
          <Button onClick={onSubmitExam} className="bg-red-500 text-white font-bold px-4 py-2">
            Submit
          </Button>
        ) : (
          <Button onClick={onNextQuestion} className="bg-yellow-500 text-black font-bold px-4 py-2">
            Next
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuestionNavigation;
