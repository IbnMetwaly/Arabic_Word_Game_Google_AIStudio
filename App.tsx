
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
    const newUser = {
      userId: Math.random().toString(36).substr(2, 9),
      username,
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

  const startLevel = async (diff: Difficulty) => {
    setState(prev => ({ ...prev, gameState: 'LOADING', timer: 0, mistakeCount: 0, selectedWordIds: [] }));
    try {
      const levelData = await generateLevel(diff);
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
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
          <h1 className="text-5xl font-bold text-amber-500 mb-2">رَبْط</h1>
          <p className="text-slate-500 mb-8">لعبة ربط الكلمات العربية</p>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="اسم المستخدم"
              className="w-full px-6 py-4 rounded-2xl border-2 border-amber-100 focus:border-amber-400 outline-none text-xl text-center"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
              }}
            />
            <Button fullWidth onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              if (input.value) handleLogin(input.value);
            }}>ابدأ اللعب</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 px-4 py-4 sm:px-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-500">رَبْط</h1>
          <span className="text-xs text-slate-400 font-medium">مرحباً، {state.user.username}</span>
        </div>
        <div className="flex items-center gap-4">
          {state.gameState === 'PLAYING' && (
            <div className="bg-amber-100 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="text-xl font-mono text-amber-700">{formatTime(state.timer)}</span>
              <span className="text-xs text-amber-600 uppercase">الوقت</span>
            </div>
          )}
          <Button variant="secondary" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY', currentLevel: null }))}>الرئيسية</Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 px-4">
        {state.gameState === 'LOBBY' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map(diff => (
              <div key={diff} className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-amber-100 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl mb-4">
                  {diff === 'BEGINNER' ? '🌱' : diff === 'INTERMEDIATE' ? '🚀' : '🧠'}
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">
                  {diff === 'BEGINNER' ? 'مبتدئ' : diff === 'INTERMEDIATE' ? 'متوسط' : 'خبير'}
                </h3>
                <p className="text-slate-500 mb-6 flex-grow">
                  {diff === 'BEGINNER' ? 'كلمات بسيطة من 3-4 أحرف ومحاولات غير محدودة.' : 
                   diff === 'INTERMEDIATE' ? 'تحديات أكثر صعوبة تتعلق بالمعاني والمترادفات.' : 
                   'كلمات نادرة وأنماط صرفية متقدمة للمحترفين.'}
                </p>
                <Button fullWidth onClick={() => startLevel(Difficulty[diff])}>العب الآن</Button>
              </div>
            ))}
          </div>
        )}

        {state.gameState === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-2xl font-bold text-amber-600 animate-pulse">جاري إنشاء اللعبة...</p>
            <p className="text-slate-400 mt-2">نحن نبني لغزاً ذكياً خصيصاً لك</p>
          </div>
        )}

        {state.gameState === 'PLAYING' && state.currentLevel && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-center min-h-[44px]">
              {state.currentLevel.categories.map(cat => {
                const isSolved = state.currentLevel?.words.filter(w => w.categoryId === cat.id).every(w => w.isSolved);
                if (!isSolved) return null;
                return (
                  <div key={cat.id} className="bg-emerald-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-success-reveal">
                    <span>{cat.icon}</span>
                    <span className="font-bold">{cat.title}</span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
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

            <div className="flex justify-center gap-4 py-4">
              <div className="text-slate-500 font-medium">
                {4 - state.selectedWordIds.length} كلمات متبقية للاختيار
              </div>
            </div>
          </div>
        )}

        {state.gameState === 'COMPLETED' && (
          <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center relative overflow-hidden">
            <Confetti />
            <div className="relative z-10">
              <div className="text-7xl mb-6">🏆</div>
              <h2 className="text-4xl font-black text-emerald-600 mb-4 animate-bounce">أحسنت صنعاً!</h2>
              <p className="text-xl text-slate-600 mb-8">لقد أكملت المستوى بنجاح باهر.</p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center mb-10">
                <div className="bg-amber-50 p-6 rounded-3xl min-w-[150px] transform hover:scale-105 transition-transform">
                  <div className="text-sm text-amber-600 font-bold mb-1">الوقت المستغرق</div>
                  <div className="text-3xl font-black text-amber-900">{formatTime(state.timer)}</div>
                </div>
                <div className="bg-rose-50 p-6 rounded-3xl min-w-[150px] transform hover:scale-105 transition-transform">
                  <div className="text-sm text-rose-600 font-bold mb-1">الأخطاء</div>
                  <div className="text-3xl font-black text-rose-900">{state.mistakeCount}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="primary" onClick={() => startLevel(state.currentLevel?.difficulty || Difficulty.BEGINNER)}>إعادة المحاولة</Button>
                <Button variant="success" onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY' }))}>العودة للقائمة</Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto mt-12 px-4 text-center">
        <p className="text-slate-400 text-sm">
          تعتمد اللعبة على منطق اللغة العربية الفصحى. ركّز على الجذور، المترادفات، أو التصنيفات الدلالية.
        </p>
      </footer>
    </div>
  );
};

export default App;
