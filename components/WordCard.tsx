import React from 'react';
import { Word } from '../types';

interface WordCardProps {
  word: Word;
  isSelected: boolean;
  isWrong: boolean;
  onClick: () => void;
}

export const WordCard: React.FC<WordCardProps> = ({ word, isSelected, isWrong, onClick }) => {
  const getStyles = () => {
    if (word.isSolved) {
      return "bg-emerald-50 border-emerald-500 text-emerald-800 opacity-60 cursor-default shadow-none animate-solve-pop";
    }
    if (isWrong) {
      return "bg-rose-500 border-rose-700 text-white animate-shake glossy-3d";
    }
    if (isSelected) {
      return "bg-amber-500 border-amber-700 text-white shadow-xl animate-selection-bounce animate-pulse-ring glossy-3d z-10 scale-105";
    }
    return "bg-white border-amber-200 text-slate-700 hover:border-amber-400 hover:shadow-md cursor-pointer glossy-3d";
  };

  return (
    <div
      onClick={!word.isSolved ? onClick : undefined}
      className={`
        relative ${getStyles()}
        h-20 sm:h-24 flex items-center justify-center p-2 text-center
        border-b-4 rounded-2xl transition-all duration-200 select-none
        font-bold text-lg sm:text-xl md:text-2xl
      `}
    >
      {isSelected && !word.isSolved && (
        <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center animate-bounce shadow-sm">
          <div className="w-2 h-2 bg-amber-600 rounded-full" />
        </div>
      )}
      {word.text}
    </div>
  );
};