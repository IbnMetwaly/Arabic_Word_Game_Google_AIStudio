
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameLevel, AppState, Word, Category } from './types';
import { generateLevel } from './geminiService';
import { WordCard } from './components/WordCard';
import { Button } from './components/Button';
import { Confetti } from './components/Confetti';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    user: null,
    gameState: 'LOBBY',
    currentLevel: null,
    currentLevelNumber: 1,
    selectedWordIds: [],
    mistakeCount: 0,
    timer: 0,
    activeHint: null,
    hintUsedCount: 0,
  });

  const [isWrongGroup, setIsWrongGroup] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('rabt_user');
    if (savedUser) {
      setState(prev => ({ ...prev, user: JSON.parse(savedUser) }));
    }
  }, []);

  const handleLogin = (username: string) => {
    const finalUsername = username.trim() || "لاعب";
    const newUser = {
      userId: Math.random().toString(36).substr(2, 9),
      username: finalUsername,
      currentLevel: Difficulty.BEGINNER,
      bestTimes: {
        [Difficulty.BEGINNER]: 0,
        [Difficulty.INTERMEDIATE]: 0,
        [Difficulty.EXPERT]: 0,
      }
    };
    localStorage.setItem('rabt_user', JSON.stringify(newUser));
    setState(prev => ({ ...prev, user: newUser }));
  };

  const startLevel = useCallback(async (diff: Difficulty, levelNum: number) => {
    setState(prev => ({ 
      ...prev, 
      gameState: 'LOADING', 
      timer: 0, 
      mistakeCount: 0, 
      selectedWordIds: [],
      currentLevelNumber: levelNum,
      activeHint: null,
      hintUsedCount: 0
    }));
    try {
      const levelData = await generateLevel(diff, levelNum);
      setState(prev => ({ ...prev, gameState: 'PLAYING', currentLevel: levelData }));
      
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } catch (error) {
      console.error("Failed to load level", error);
      setState(prev => ({ ...prev, gameState: 'LOBBY' }));
    }
  }, []);

  const getNextLevel = (currentDiff: Difficulty, currentNum: number) => {
    if (currentNum < 3) return { diff: currentDiff, num: currentNum + 1 };
    
    if (currentDiff === Difficulty.BEGINNER) return { diff: Difficulty.INTERMEDIATE, num: 1 };
    if (currentDiff === Difficulty.INTERMEDIATE) return { diff: Difficulty.EXPERT, num: 1 };
    
    return null; // Expert 3 is the last level
  };

  const provideHint = () => {
    if (!state.currentLevel || state.hintUsedCount >= 3) return;
    
    const unsolvedCategories = state.currentLevel.categories.filter(cat => {
      return state.currentLevel?.words.some(w => w.categoryId === cat.id && !w.isSolved);
    });

    if (unsolvedCategories.length > 0) {
      const randomCat = unsolvedCategories[Math.floor(Math.random() * unsolvedCategories.length)];
      setState(prev => ({
        ...prev,
        activeHint: `تلميح: ${randomCat.title} - ${randomCat.description}`,
        hintUsedCount: prev.hintUsedCount + 1
      }));
      
      setTimeout(() => {
        setState(prev => ({ ...prev, activeHint: null }));
      }, 8000);
    }
  };

  const toggleWordSelection = (wordId: string) => {
    if (state.selectedWordIds.includes(wordId)) {
      setState(prev => ({ ...prev, selectedWordIds: prev.selectedWordIds.filter(id => id !== wordId) }));
    } else {
      if (state.selectedWordIds.length < 4) {
        setState(prev => ({ ...prev, selectedWordIds: [...prev.selectedWordIds, wordId] }));
      }
    }
  };

  useEffect(() => {
    if (state.selectedWordIds.length === 4 && state.currentLevel) {
      const words = state.currentLevel.words.filter(w => state.selectedWordIds.includes(w.id));
      const firstCatId = words[0].categoryId;
      const isMatch = words.every(w => w.categoryId === firstCatId);

      if (isMatch) {
        setTimeout(() => {
          setState(prev => {
            const newWords = prev.currentLevel!.words.map(w => 
              state.selectedWordIds.includes(w.id) ? { ...w, isSolved: true } : w
            );
            const allSolved = newWords.every(w => w.isSolved);
            
            if (allSolved && timerRef.current) clearInterval(timerRef.current);

            return {
              ...prev,
              currentLevel: { ...prev.currentLevel!, words: newWords },
              selectedWordIds: [],
              activeHint: null, 
              gameState: allSolved ? 'COMPLETED' : 'PLAYING'
            };
          });
        }, 300);
      } else {
        setIsWrongGroup(true);
        setState(prev => ({ ...prev, mistakeCount: prev.mistakeCount + 1 }));
        setTimeout(() => {
          setIsWrongGroup(false);
          setState(prev => ({ ...prev, selectedWordIds: [] }));
        }, 1000);
      }
    }
  }, [state.selectedWordIds, state.currentLevel]);

  useEffect(() => {
    if (state.gameState === 'COMPLETED' && state.currentLevel) {
      const next = getNextLevel(state.currentLevel.difficulty, state.currentLevelNumber);
      if (next) {
        const timer = setTimeout(() => {
          startLevel(next.diff, next.num);
        }, 4000);
        return () => clearTimeout(timer);
      }
    }
  }, [state.gameState, state.currentLevel, state.currentLevelNumber, startLevel]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const shareResult = async () => {
    const text = `أنهيت المستوى ${state.currentLevelNumber} في لعبة رَبْط خلال ${formatTime(state.timer)}! جربها الآن.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'رَبْط', text: text, url: window.location.href });
      } catch (e) { console.error(e); }
    } else {
      navigator.clipboard.writeText(text);
      alert('تم نسخ النتيجة للمشاركة!');
    }
  };

  if (!state.user) {
    return (
      <div className="h-[100dvh] flex items-center justify-center p-4 bg-amber-50">
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center border-b-[10px] border-amber-100 flex flex-col gap-4">
          <div>
            <h1 className="text-5xl sm:text-6xl font-black text-amber-500 mb-1 drop-shadow-sm">رَبْط</h1>
            <p className="text-slate-400 text-sm font-medium">لعبة ترتيب الكلمات العربية</p>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="اسم المستخدم (اختياري)"
              className="w-full px-5 py-3 rounded-2xl border-2 border-amber-100 focus:border-amber-400 outline-none text-lg text-center bg-amber-50/30 transition-all placeholder:text-slate-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
              }}
            />
            <Button fullWidth onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              handleLogin(input.value);
            }}>ابدأ اللعب</Button>
            <p className="text-[10px] text-slate-400">نسخة مراجعة عامة v1.0</p>
          </div>
        </div>
      </div>
    );
  }

  const isFullView = state.gameState === 'PLAYING' || state.gameState === 'LOBBY';

  const nextLevelInfo = state.currentLevel && state.gameState === 'COMPLETED' 
    ? getNextLevel(state.currentLevel.difficulty, state.currentLevelNumber) 
    : null;

  return (
    <div className="h-[100dvh] flex flex-col bg-amber-50/30 overflow-hidden">
      <header className="bg-white shadow-sm z-40 px-4 py-2 sm:px-8 flex justify-between items-center border-b border-amber-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-amber-500 leading-tight">رَبْط</h1>
              <span className="bg-amber-100 text-amber-700 text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-black border border-amber-200">مراجعة</span>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400 font-bold block leading-none">مرحباً، {state.user.username}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {state.gameState === 'PLAYING' && (
            <div className="bg-amber-100 px-3 py-1 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 border-b-2 border-amber-200">
              <span className="text-lg sm:text-xl font-black text-amber-700">{formatTime(state.timer)}</span>
              <span className="text-[8px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider hidden sm:inline">الوقت</span>
            </div>
          )}
          {state.gameState !== 'LOBBY' && (
            <Button variant="secondary" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm shadow-none border-b-2 border-sky-600" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY', currentLevel: null }))}>الرئيسية</Button>
          )}
        </div>
      </header>

      <main className={`flex-grow w-full max-w-4xl mx-auto px-4 overflow-hidden flex flex-col ${isFullView ? 'py-2' : 'py-8'}`}>
        {state.gameState === 'LOBBY' && (
          <div className="flex-grow flex flex-col justify-center gap-2 sm:gap-4 py-1 overflow-hidden">
            
            <div 
              className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-amber-100 mx-1 sm:mx-0 cursor-pointer transition-all hover:shadow-md select-none"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
            >
               <div className="flex items-center justify-between text-amber-600">
                 <div className="flex items-center gap-2">
                   <span className="text-xl">💡</span>
                   <h3 className="font-black text-sm sm:text-base">كيف تلعب؟</h3>
                 </div>
                 <svg 
                   className={`w-5 h-5 transform transition-transform duration-300 ${isGuideOpen ? 'rotate-180' : ''} text-amber-400`} 
                   fill="none" 
                   viewBox="0 0 24 24" 
                   stroke="currentColor"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                 </svg>
               </div>
               
               <div className={`grid transition-all duration-300 ease-in-out ${isGuideOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                 <div className="overflow-hidden">
                   <ul className="space-y-2">
                     <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium bg-amber-50/50 p-2 rounded-lg">
                       <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs border border-amber-200">١</span>
                       <span>ابحث عن <strong>رابط مشترك</strong> يجمع بين الكلمات.</span>
                     </li>
                     <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium bg-amber-50/50 p-2 rounded-lg">
                       <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs border border-amber-200">٢</span>
                       <span>اضغط على <strong>٤ كلمات</strong> لتكوين مجموعة.</span>
                     </li>
                     <li className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 font-medium bg-amber-50/50 p-2 rounded-lg">
                       <span className="bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-xs border border-amber-200">٣</span>
                       <span>لديك <strong>محاولات محدودة</strong>، كن حذراً!</span>
                     </li>
                   </ul>
                 </div>
               </div>
            </div>

            <h2 className="text-center text-xl sm:text-2xl font-black text-slate-700 mt-2">اختر المستوى</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 pb-4 overflow-y-auto no-scrollbar">
              {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map(diff => (
                <div key={diff} className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg border-b-4 sm:border-b-8 border-amber-100 flex flex-col items-center text-center group transition-transform flex-shrink-0">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-amber-50 rounded-full flex items-center justify-center text-xl sm:text-3xl mb-2 group-hover:bg-amber-100 transition-colors border-2 border-dashed border-amber-200">
                    {diff === 'BEGINNER' ? '🌱' : diff === 'INTERMEDIATE' ? '🚀' : '🧠'}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1">
                    {diff === 'BEGINNER' ? 'مبتدئ' : diff === 'INTERMEDIATE' ? 'متوسط' : 'خبير'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-3 line-clamp-2 leading-tight px-2">
                    {diff === 'BEGINNER' ? 'كلمات بسيطة وتصنيفات واضحة جداً.' : 
                     diff === 'INTERMEDIATE' ? 'تحديات لغوية تتطلب دقة في المعاني.' : 
                     'مستوى متقدم يشمل البلاغة والصرف النادر.'}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 w-full mt-auto">
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        onClick={() => startLevel(Difficulty[diff], num)}
                        className="bg-amber-50 hover:bg-amber-400 hover:text-white text-amber-700 font-bold py-2 rounded-xl text-xs sm:text-sm border-b-2 border-amber-200 transition-all active:scale-95"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {state.gameState === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-20 flex-grow">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-2xl font-bold text-amber-600 animate-pulse">جاري تحضير اللغز...</p>
            <p className="text-slate-400 mt-2">نحن ننشئ مستوىً ذكياً باستخدام Gemini</p>
          </div>
        )}

        {state.gameState === 'PLAYING' && state.currentLevel && (
          <div className="flex-grow flex flex-col gap-2 sm:gap-4 overflow-hidden pb-4">
            {state.activeHint && (
              <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-center font-bold text-xs sm:text-sm shadow-sm animate-success-reveal border border-amber-200">
                💡 {state.activeHint}
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-center min-h-[32px] sm:min-h-[48px] flex-shrink-0">
              {state.currentLevel.categories.map(cat => {
                const isSolved = state.currentLevel?.words.filter(w => w.categoryId === cat.id).every(w => w.isSolved);
                if (!isSolved) return null;
                return (
                  <div key={cat.id} 
                       className="text-white px-3 py-1 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-lg animate-success-reveal border-b-2 sm:border-b-4"
                       style={{ backgroundColor: cat.color, borderBottomColor: `${cat.color}99` }}>
                    <span className="text-sm sm:text-xl">{cat.icon}</span>
                    <span className="font-black text-[10px] sm:text-base whitespace-nowrap">{cat.title}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex-grow grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 md:gap-4 content-stretch overflow-hidden" style={{ gridAutoRows: '1fr' }}>
              {state.currentLevel.words.map((word) => {
                const category = state.currentLevel?.categories.find(c => c.id === word.categoryId);
                const shouldShowHint = state.currentLevel?.difficulty === Difficulty.BEGINNER || word.isSolved;
                return (
                  <WordCard
                    key={word.id}
                    word={word}
                    category={shouldShowHint ? category : undefined}
                    isSelected={state.selectedWordIds.includes(word.id)}
                    isWrong={isWrongGroup && state.selectedWordIds.includes(word.id)}
                    onClick={() => toggleWordSelection(word.id)}
                  />
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-1 sm:gap-2 pt-2 flex-shrink-0">
              <div className="text-[10px] sm:text-sm text-slate-400 font-bold bg-white px-4 py-1 sm:px-6 sm:py-2 rounded-full border border-amber-100 shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                مستوى {state.currentLevelNumber} • {4 - state.selectedWordIds.length} كلمات مطلوبة
              </div>
              
              <div className="flex gap-4 items-center">
                <button 
                  onClick={provideHint}
                  disabled={!!state.activeHint || state.hintUsedCount >= 3}
                  className="text-emerald-600 font-black text-[10px] sm:text-xs hover:underline uppercase tracking-tighter flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  💡 مساعدة ({3 - state.hintUsedCount} متبقي)
                </button>
                {state.selectedWordIds.length > 0 && (
                  <button 
                    onClick={() => setState(prev => ({...prev, selectedWordIds: []}))}
                    className="text-amber-600 font-black text-[10px] sm:text-xs hover:underline uppercase tracking-tighter"
                  >
                    إلغاء التحديد
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {state.gameState === 'COMPLETED' && (
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl text-center relative overflow-hidden border-b-[8px] sm:border-b-[15px] border-amber-100 flex-grow flex flex-col justify-center overflow-y-auto no-scrollbar">
            <Confetti />
            <div className="relative z-10 py-4">
              <div className="text-6xl sm:text-8xl mb-4 sm:mb-6 animate-bounce">🥇</div>
              <h2 className="text-3xl sm:text-5xl font-black text-emerald-600 mb-2 sm:mb-4">إنجاز رائع!</h2>
              <p className="text-base sm:text-xl text-slate-600 mb-6 sm:mb-8 font-medium px-4">لقد أتممت الربط بنجاح في وقت قياسي.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 sm:mb-10">
                <div className="bg-amber-50 p-4 sm:p-6 rounded-3xl min-w-[120px] sm:min-w-[180px] border-b-4 border-amber-200">
                  <div className="text-[8px] sm:text-xs text-amber-600 font-black mb-1 uppercase">الوقت النهائي</div>
                  <div className="text-2xl sm:text-4xl font-black text-amber-900">{formatTime(state.timer)}</div>
                </div>
                <div className="bg-rose-50 p-4 sm:p-6 rounded-3xl min-w-[120px] sm:min-w-[180px] border-b-4 border-rose-200">
                  <div className="text-[8px] sm:text-xs text-rose-600 font-black mb-1 uppercase">المحاولات الخاطئة</div>
                  <div className="text-2xl sm:text-4xl font-black text-rose-900">{state.mistakeCount}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                {nextLevelInfo ? (
                  <>
                     <Button variant="primary" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => startLevel(nextLevelInfo.diff, nextLevelInfo.num)}>
                       التالي فوراً
                       <span className="block text-[10px] font-normal opacity-70">الانتقال التلقائي...</span>
                     </Button>
                     <Button variant="secondary" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY' }))}>القائمة</Button>
                  </>
                ) : (
                  <>
                    <Button variant="primary" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => startLevel(Difficulty.BEGINNER, 1)}>العب مجدداً</Button>
                    <Button variant="secondary" className="text-lg sm:text-xl px-6 sm:px-10" onClick={shareResult}>مشاركة</Button>
                    <Button variant="success" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY' }))}>القائمة الرئيسية</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {!isFullView && (
        <footer className="max-w-4xl mx-auto mt-auto px-4 py-6 text-center flex-shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent mb-4"></div>
          <p className="text-slate-400 text-[10px] sm:text-xs leading-relaxed font-medium">
            لعبة رَبْط التعليمية تهدف لتعزيز المفردات العربية.<br/>
            تم تطوير هذه النسخة لأغراض المراجعة والتقييم.
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
