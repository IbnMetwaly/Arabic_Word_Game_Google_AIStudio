
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
  });

  const [isWrongGroup, setIsWrongGroup] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Authentication Mock
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

  const startLevel = async (diff: Difficulty, levelNum: number) => {
    setState(prev => ({ 
      ...prev, 
      gameState: 'LOADING', 
      timer: 0, 
      mistakeCount: 0, 
      selectedWordIds: [],
      currentLevelNumber: levelNum
    }));
    try {
      const levelData = await generateLevel(diff, levelNum);
      setState(prev => ({ ...prev, gameState: 'PLAYING', currentLevel: levelData }));
      
      // Start timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } catch (error) {
      console.error("Failed to load level", error);
      setState(prev => ({ ...prev, gameState: 'LOBBY' }));
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

  // Check for solved set
  useEffect(() => {
    if (state.selectedWordIds.length === 4 && state.currentLevel) {
      const words = state.currentLevel.words.filter(w => state.selectedWordIds.includes(w.id));
      const firstCatId = words[0].categoryId;
      const isMatch = words.every(w => w.categoryId === firstCatId);

      if (isMatch) {
        // Correct match
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
              gameState: allSolved ? 'COMPLETED' : 'PLAYING'
            };
          });
        }, 300);
      } else {
        // Wrong match
        setIsWrongGroup(true);
        setState(prev => ({ ...prev, mistakeCount: prev.mistakeCount + 1 }));
        setTimeout(() => {
          setIsWrongGroup(false);
          setState(prev => ({ ...prev, selectedWordIds: [] }));
        }, 1000);
      }
    }
  }, [state.selectedWordIds, state.currentLevel]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!state.user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-amber-50">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-b-8 border-amber-100">
          <h1 className="text-6xl font-black text-amber-500 mb-2 drop-shadow-sm">رَبْط</h1>
          <p className="text-slate-500 mb-8 font-medium">لعبة ترتيب الكلمات العربية</p>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="اسم المستخدم (اختياري)"
              className="w-full px-6 py-4 rounded-2xl border-2 border-amber-100 focus:border-amber-400 outline-none text-xl text-center bg-amber-50/30 transition-all placeholder:text-slate-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
              }}
            />
            <Button fullWidth onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              handleLogin(input.value);
            }}>ابدأ اللعب</Button>
            <p className="text-xs text-slate-400">يمكنك اللعب مباشرة كضيف بالضغط على الزر</p>
          </div>
        </div>
      </div>
    );
  }

  const isFullView = state.gameState === 'PLAYING' || state.gameState === 'LOBBY';

  return (
    <div className={`min-h-screen flex flex-col ${isFullView ? 'max-h-screen overflow-hidden' : 'pb-12'}`}>
      {/* Header */}
      <header className={`bg-white shadow-sm z-40 px-4 py-2 sm:px-8 flex justify-between items-center border-b border-amber-50 flex-shrink-0`}>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-amber-500 leading-tight">رَبْط</h1>
          <span className="text-[10px] sm:text-xs text-slate-400 font-bold block leading-none">مرحباً، {state.user.username}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {state.gameState === 'PLAYING' && (
            <div className="bg-amber-100 px-3 py-1 sm:px-4 sm:py-2 rounded-xl flex items-center gap-2 border-b-2 border-amber-200">
              <span className="text-lg sm:text-xl font-black text-amber-700">{formatTime(state.timer)}</span>
              <span className="text-[8px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider hidden sm:inline">الوقت</span>
            </div>
          )}
          {state.gameState !== 'LOBBY' && (
            <Button variant="secondary" className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY', currentLevel: null }))}>الرئيسية</Button>
          )}
        </div>
      </header>

      <main className={`flex-grow w-full max-w-4xl mx-auto px-4 ${isFullView ? 'py-2 flex flex-col' : 'mt-8'}`}>
        {state.gameState === 'LOBBY' && (
          <div className="flex-grow flex flex-col justify-center gap-2 sm:gap-4 py-1 overflow-hidden">
            <h2 className="text-center text-xl sm:text-2xl font-black text-slate-700">اختر المستوى</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 max-h-[80vh] overflow-y-auto sm:overflow-visible pb-4">
              {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map(diff => (
                <div key={diff} className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg border-b-4 sm:border-b-8 border-amber-100 flex flex-col items-center text-center group transition-transform">
                  <div className="w-10 h-10 sm:w-16 sm:h-16 bg-amber-100 rounded-full flex items-center justify-center text-xl sm:text-3xl mb-2 group-hover:bg-amber-200 transition-colors">
                    {diff === 'BEGINNER' ? '🌱' : diff === 'INTERMEDIATE' ? '🚀' : '🧠'}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1">
                    {diff === 'BEGINNER' ? 'مبتدئ' : diff === 'INTERMEDIATE' ? 'متوسط' : 'خبير'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-3 line-clamp-2 leading-tight">
                    {diff === 'BEGINNER' ? 'كلمات بسيطة وتصنيفات واضحة.' : 
                     diff === 'INTERMEDIATE' ? 'تحديات أكثر صعوبة تتعلق بالمعاني.' : 
                     'كلمات نادرة وأنماط صرفية متقدمة.'}
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
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-2xl font-bold text-amber-600 animate-pulse">جاري إنشاء المستوى {state.currentLevelNumber}...</p>
            <p className="text-slate-400 mt-2">نحن نبني لغزاً ذكياً خصيصاً لك</p>
          </div>
        )}

        {state.gameState === 'PLAYING' && state.currentLevel && (
          <div className="flex-grow flex flex-col gap-2 sm:gap-4 overflow-hidden">
            {/* Categories Banner with animate-success-reveal */}
            <div className="flex flex-wrap gap-2 justify-center min-h-[32px] sm:min-h-[48px] flex-shrink-0">
              {state.currentLevel.categories.map(cat => {
                const isSolved = state.currentLevel?.words.filter(w => w.categoryId === cat.id).every(w => w.isSolved);
                if (!isSolved) return null;
                return (
                  <div key={cat.id} className="bg-emerald-500 text-white px-3 py-1 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-lg animate-success-reveal border-b-2 sm:border-b-4 border-emerald-700">
                    <span className="text-sm sm:text-xl">{cat.icon}</span>
                    <span className="font-black text-[10px] sm:text-base whitespace-nowrap">{cat.title}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid Container */}
            <div className="flex-grow overflow-y-auto sm:overflow-hidden grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 content-start">
              {state.currentLevel.words.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  isSelected={state.selectedWordIds.includes(word.id)}
                  isWrong={isWrongGroup && state.selectedWordIds.includes(word.id)}
                  onClick={() => toggleWordSelection(word.id)}
                />
              ))}
            </div>

            {/* Selection Counter */}
            <div className="flex flex-col items-center gap-1 sm:gap-2 py-2 flex-shrink-0">
              <div className="text-[10px] sm:text-sm text-slate-400 font-bold bg-white px-4 py-1 sm:px-6 sm:py-2 rounded-full border border-amber-50 shadow-sm">
                المستوى {state.currentLevelNumber} • {4 - state.selectedWordIds.length} كلمات متبقية
              </div>
              {state.selectedWordIds.length > 0 && (
                <button 
                  onClick={() => setState(prev => ({...prev, selectedWordIds: []}))}
                  className="text-amber-600 font-bold text-[10px] sm:text-sm hover:underline"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>
          </div>
        )}

        {state.gameState === 'COMPLETED' && (
          <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] shadow-2xl text-center relative overflow-hidden border-b-[8px] sm:border-b-[12px] border-amber-100">
            <Confetti />
            <div className="relative z-10">
              <div className="text-5xl sm:text-7xl mb-4 sm:mb-6 animate-bounce">🏆</div>
              <h2 className="text-3xl sm:text-5xl font-black text-emerald-600 mb-2 sm:mb-4">أحسنت صنعاً!</h2>
              <p className="text-base sm:text-xl text-slate-600 mb-6 sm:mb-8 font-medium">لقد أكملت المستوى {state.currentLevelNumber} بنجاح باهر.</p>
              
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mb-8 sm:mb-10">
                <div className="bg-amber-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl min-w-[120px] sm:min-w-[160px] transform hover:scale-105 transition-transform border-b-4 border-amber-200">
                  <div className="text-[8px] sm:text-xs text-amber-600 font-black mb-1 uppercase tracking-widest">الوقت المستغرق</div>
                  <div className="text-2xl sm:text-4xl font-black text-amber-900">{formatTime(state.timer)}</div>
                </div>
                <div className="bg-rose-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl min-w-[120px] sm:min-w-[160px] transform hover:scale-105 transition-transform border-b-4 border-rose-200">
                  <div className="text-[8px] sm:text-xs text-rose-600 font-black mb-1 uppercase tracking-widest">الأخطاء</div>
                  <div className="text-2xl sm:text-4xl font-black text-rose-900">{state.mistakeCount}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button variant="primary" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => startLevel(state.currentLevel?.difficulty || Difficulty.BEGINNER, state.currentLevelNumber)}>العب مجدداً</Button>
                <Button variant="success" className="text-lg sm:text-xl px-6 sm:px-10" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY' }))}>القائمة الرئيسية</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {!isFullView && (
        <footer className="max-w-4xl mx-auto mt-auto px-4 py-8 text-center flex-shrink-0">
          <div className="h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent mb-6"></div>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            تعتمد اللعبة على منطق اللغة العربية الفصحى. ركّز على الجذور، المترادفات، أو التصنيفات الدلالية.<br/>
            جميع الألغاز يتم إنشاؤها بذكاء لضمان تجربة فريدة في كل مرة.
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
