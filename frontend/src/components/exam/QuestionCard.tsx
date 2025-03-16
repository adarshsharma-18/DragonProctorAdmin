// src/components/exam/QuestionCard.tsx
import React from 'react';

interface QuestionCardProps {
  questionNumber: number;
  question: string;
  options: string[];
  selectedAnswer: number;
  onSelectAnswer: (index: number) => void;
  type?: 'multiple-choice' | 'theoretical';
  onTextAnswerChange?: (text: string) => void;
  textAnswer?: string;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  questionNumber,
  question,
  options,
  selectedAnswer,
  onSelectAnswer,
  type = 'multiple-choice',
  onTextAnswerChange,
  textAnswer = ''
}) => {
  return (
    <div className="bg-[#1e2736]/50 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Question {questionNumber}</h2>
      <p className="text-gray-200 mb-6">{question}</p>
      
      {type === 'multiple-choice' ? (
        <div className="space-y-3">
          {options.map((option, index) => (
            <button
              key={index}
              className={`w-full text-left p-3 rounded-md border ${
                selectedAnswer === index 
                  ? 'bg-[#e6e13e]/20 border-[#e6e13e]' 
                  : 'bg-[#1a202c] border-gray-700 hover:bg-[#1a202c]/70'
              }`}
              onClick={() => onSelectAnswer(index)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <textarea
            className="w-full p-3 border border-gray-700 rounded-md min-h-[250px] bg-[#1a202c] text-white"
            placeholder="Type your answer here (approximately 200 words)..."
            value={textAnswer}
            onChange={(e) => onTextAnswerChange?.(e.target.value)}
            rows={12}
          ></textarea>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
