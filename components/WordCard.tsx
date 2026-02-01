
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
      return "bg-amber-500 border-amber-700 text-white shadow-xl animate-selection-bounce glossy-3d z-10 ring-4 ring-amber-200/50";
    }
    return "bg-white border-amber-200 text-slate-700 hover:border-amber-400 hover:shadow-md cursor-pointer glossy-3d active:scale-95";
  };

  const solvedStyle = word.isSolved && category ? {
    backgroundColor: `${category.color}15`, // Very light version for background
    borderColor: category.color,
    color: category.color,
    borderBottomWidth: '4px'
  } : {};

  // Calculate visual length by stripping Arabic diacritics (Tashkeel)
  // This ensures short words with many vowels get the large font size they deserve
  const visualLength = word.text.replace(/[\u064B-\u065F\u0670]/g, '').length;

  const getFontSizeClass = (len: number) => {
    // Mobile sizes are slightly conservative to prevent overflow
    // sm/md sizes scale up aggressively to fill the box
    if (len <= 3) return "text-xl sm:text-3xl md:text-4xl";
    if (len <= 5) return "text-lg sm:text-2xl md:text-3xl";
    if (len <= 7) return "text-base sm:text-xl md:text-2xl";
    // Fallback for long words
    return "text-[11px] sm:text-lg md:text-xl";
  };

  return (
    <div
      onClick={!word.isSolved ? onClick : undefined}
      style={solvedStyle}
      className={`
        relative ${getStyles()}
        h-full w-full flex items-center justify-center p-0.5 sm:p-2
        border-b-4 rounded-xl select-none
        transform transition-all duration-200 ease-out
        min-h-[60px] sm:min-h-[80px]
      `}
    >
      {/* Subtle Category Dot (Visual Indicator) */}
      {!word.isSolved && category && (
        <div 
          className="absolute bottom-2 left-2 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm ring-1 sm:ring-2 ring-white"
          style={{ backgroundColor: category.color }}
          title="Category Indicator"
        />
      )}

      {/* Category Icon Badge (Only when solved) */}
      {word.isSolved && category && (
        <div 
          className="absolute top-1 right-1 sm:top-2 sm:right-2 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] sm:text-lg border-2"
          style={{ borderColor: category.color }}
        >
          {category.icon}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && !word.isSolved && (
        <div className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center animate-bounce shadow-sm sm:w-4 sm:h-4">
          <div className="w-1.5 h-1.5 bg-amber-600 rounded-full sm:w-2 sm:h-2" />
        </div>
      )}
      
      <span className={`
        font-bold 
        leading-none
        whitespace-nowrap
        text-center
        w-full
        ${getFontSizeClass(visualLength)}
        ${word.isSolved ? 'opacity-80 scale-90 transition-transform' : ''}
      `}>
        {word.text}
      </span>
    </div>
  );
};
