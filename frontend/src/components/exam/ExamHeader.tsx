
import React from 'react';
import Camera from '@/components/Camera';

interface ExamHeaderProps {
  studentName: string;
  studentId: string;
  onCameraError: (error: string) => void;
}

const ExamHeader: React.FC<ExamHeaderProps> = ({
  studentName,
  studentId,
  onCameraError
}) => {
  return (
    <header className="bg-[#0f1623] py-4 px-6 flex items-center justify-between border-b border-gray-800">
      <div className="flex items-center">
        <h1 className="text-3xl font-bold mr-3 text-[#e6e13e]">Dragon</h1>
        <span className="bg-[#1e2736] text-sm px-3 py-1 rounded-md">Proctor</span>
      </div>
      <div className="flex items-center">
        <div className="mr-8 text-right">
          <p className="font-medium">{studentName}</p>
          <p className="text-xs text-gray-400">ID: {studentId}</p>
        </div>
        <div className="relative border-2 border-[#1e2736] rounded-lg w-20 h-20 overflow-hidden">
          <Camera 
            onError={onCameraError} 
            className="h-full w-full object-cover" 
          />
        </div>
      </div>
    </header>
  );
};

export default ExamHeader;
