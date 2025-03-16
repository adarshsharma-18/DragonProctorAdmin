export interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  type?: 'multiple-choice' | 'theoretical';
}
