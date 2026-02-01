
import React from 'react';
import { Word, Category } from '../types';

interface WordCardProps {
  word: Word;
  category?: Category;
  isSelected: boolean;
  isWrong: boolean;
  onClick: () => void;
}

export const WordCard: React.FC<WordCardProps> = ({ word, category, isSelected, isWrong, onClick }) => {
  const getStyles = () => {
    if (word.isSolved && category) {
      return "opacity-90 cursor-default shadow-sm animate-solve-pop z-0";
    }
    if (isWrong) {
      return "bg-rose-500 border-rose-700 text-white animate-shake glossy-3d z-20";
    }
    if (isSelected) {
      return "bg-amber-400 border-amber-600 text-amber-900 shadow-xl animate-selection-bounce glossy-3d z-10 ring-4 ring-amber-200/50";
    }
    return "bg-white border-amber-100 text-slate-700 hover:border-amber-300 hover:shadow-md cursor-pointer glossy-3d active:scale-95";
  };

  const solvedStyle = word.isSolved && category ? {
    backgroundColor: `${category.color}20`,
    borderColor: category.color,
    color: category.color,
    borderBottomWidth: '4px'
  } : {};

  // Strip Tashkeel for length calculation
  const visualLength = word.text.replace(/[\u064B-\u065F\u0670]/g, '').length;

  const getFontSizeClass = (len: number) => {
    // Aggressive mobile fitting
    if (len <= 3) return "text-xl sm:text-2xl md:text-3xl";
    if (len <= 5) return "text-lg sm:text-xl md:text-2xl";
    if (len <= 7) return "text-base sm:text-lg md:text-xl";
    return "text-[12px] sm:text-base md:text-lg";
  };

  return (
    <div
      onClick={!word.isSolved ? onClick : undefined}
      style={solvedStyle}
      className={`
        relative ${getStyles()}
        h-full w-full flex items-center justify-center p-1.5
        border-b-4 rounded-2xl select-none
        transform transition-all duration-150 ease-out
      `}
    >
      {/* Beginner Category Dot */}
      {!word.isSolved && category && (
        <div 
          className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full shadow-sm ring-1 ring-white/50"
          style={{ backgroundColor: category.color }}
        />
      )}

      {/* Solved Icon */}
      {word.isSolved && category && (
        <div 
          className="absolute top-1 right-1 w-5 h-5 rounded-lg bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-[10px] border border-black/5"
        >
          {category.icon}
        </div>
      )}

      {/* Selection Tick */}
      {isSelected && !word.isSolved && (
        <div className="absolute top-1.5 right-1.5 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-sm">
          <div className="w-1.5 h-1.5 bg-amber-600 rounded-full" />
        </div>
      )}
      
      <span className={`
        font-black 
        leading-tight
        whitespace-nowrap
        text-center
        w-full
        ${getFontSizeClass(visualLength)}
        ${word.isSolved ? 'scale-90 opacity-70' : ''}
      `}>
        {word.text}
      </span>
    </div>
  );
};
