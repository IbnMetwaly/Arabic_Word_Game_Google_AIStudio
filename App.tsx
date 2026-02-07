
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Difficulty, GameLevel, AppState, Word, Category } from './types';
import { generateLevel } from './geminiService';
import { WordCard } from './components/WordCard';
import { Button } from './components/Button';
import { Confetti } from './components/Confetti';
import { audioService } from './audioService';

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
    isMuted: false,
  });

  const [isWrongGroup, setIsWrongGroup] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Audio and User
  useEffect(() => {
    const savedUser = localStorage.getItem('rabt_user');
    const savedMute = localStorage.getItem('rabt_muted');
    
    const isMuted = savedMute === 'true';
    audioService.setMute(isMuted);

    if (savedUser) {
      setState(prev => ({ 
        ...prev, 
        user: JSON.parse(savedUser),
        isMuted
      }));
    } else {
      setState(prev => ({ ...prev, isMuted }));
    }
  }, []);

  const toggleMute = () => {
    const newMutedState = !state.isMuted;
    setState(prev => ({ ...prev, isMuted: newMutedState }));
    audioService.setMute(newMutedState);
    localStorage.setItem('rabt_muted', String(newMutedState));
  };

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
    
    return null;
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
      audioService.play('pop');
      
      setTimeout(() => {
        setState(prev => ({ ...prev, activeHint: null }));
      }, 8000);
    }
  };

  const toggleWordSelection = (wordId: string) => {
    if (state.selectedWordIds.includes(wordId)) {
      audioService.play('pop');
      setState(prev => ({ ...prev, selectedWordIds: prev.selectedWordIds.filter(id => id !== wordId) }));
    } else {
      if (state.selectedWordIds.length < 4) {
        audioService.play('pop');
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
        audioService.play('correct');
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
        audioService.play('wrong');
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
      audioService.play('win');
      const next = getNextLevel(state.currentLevel.difficulty, state.currentLevelNumber);
      if (next) {
        const timer = setTimeout(() => {
          startLevel(next.diff, next.num);
        }, 5000);
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
      <div className="h-[100dvh] flex items-center justify-center p-6 bg-amber-50">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border-b-[8px] border-amber-100 flex flex-col gap-6">
          <div>
            <h1 className="text-6xl font-black text-amber-500 mb-2 drop-shadow-sm">رَبْط</h1>
            <p className="text-slate-400 text-sm font-bold">لعبة ترتيب الكلمات العربية</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="اسم المستخدم"
              className="w-full px-6 py-4 rounded-2xl border-2 border-amber-100 focus:border-amber-400 outline-none text-lg text-center bg-amber-50/30 transition-all placeholder:text-slate-300"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLogin((e.target as HTMLInputElement).value);
              }}
            />
            <Button fullWidth className="py-4 text-xl" onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement);
              handleLogin(input.value);
            }}>ابدأ اللعب</Button>
          </div>
        </div>
      </div>
    );
  }

  const isLobby = state.gameState === 'LOBBY';
  const isPlaying = state.gameState === 'PLAYING';
  const isLoading = state.gameState === 'LOADING';
  const isCompleted = state.gameState === 'COMPLETED';

  return (
    <div className="h-[100dvh] flex flex-col bg-amber-50/20 overflow-hidden safe-paddings">
      <header className="bg-white/80 backdrop-blur-md shadow-sm z-50 px-4 py-3 sm:px-8 flex justify-between items-center border-b border-amber-100 flex-shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-amber-500 leading-none">رَبْط</h1>
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">بـيـتا</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold leading-none mt-1">المستخدم: {state.user.username}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isPlaying && (
            <div className="bg-amber-100/50 px-3 py-1.5 rounded-xl flex items-center gap-2 border border-amber-200 shadow-inner">
              <span className="text-base font-black text-amber-700 font-mono">{formatTime(state.timer)}</span>
            </div>
          )}
          
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-colors ${state.isMuted ? 'text-slate-400 bg-slate-100' : 'text-amber-500 bg-amber-50'}`}
            title={state.isMuted ? "تشغيل الصوت" : "كتم الصوت"}
          >
             {state.isMuted ? (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
               </svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
               </svg>
             )}
          </button>

          {!isLobby && (
            <button 
              className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
              onClick={() => setState(prev => ({ ...prev, gameState: 'LOBBY', currentLevel: null }))}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow w-full max-w-2xl mx-auto flex flex-col overflow-hidden relative">
        {isLobby && (
          <div className="flex-grow flex flex-col p-4 gap-4 overflow-y-auto no-scrollbar">
            <div 
              className="bg-white p-4 rounded-3xl shadow-sm border border-amber-100 cursor-pointer transition-all active:scale-98"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
            >
              <div className="flex items-center justify-between text-amber-600">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📖</span>
                  <h3 className="font-black text-base">دليل اللعب السريع</h3>
                </div>
                <svg 
                  className={`w-5 h-5 transform transition-transform duration-300 ${isGuideOpen ? 'rotate-180' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className={`grid transition-all duration-300 ${isGuideOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden space-y-3">
                  {[
                    { n: '١', t: 'اربط ٤ كلمات يجمعها معنى واحد.' },
                    { n: '٢', t: 'هناك ٤ إلى ٦ مجموعات في كل لغز.' },
                    { n: '٣', t: 'كل مستوى يزيد من غموض الروابط.' }
                  ].map(item => (
                    <div key={item.n} className="flex gap-3 items-center text-sm text-slate-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50">
                      <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">{item.n}</span>
                      <p className="font-medium">{item.t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 pb-8">
              <h2 className="text-xl font-black text-slate-800 text-right px-1">اختر التحدي</h2>
              <div className="grid grid-cols-1 gap-4">
                {(Object.keys(Difficulty) as Array<keyof typeof Difficulty>).map(diff => (
                  <div key={diff} className="bg-white p-5 rounded-[2rem] shadow-sm border border-amber-100 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl border border-amber-100">
                        {diff === 'BEGINNER' ? '🌱' : diff === 'INTERMEDIATE' ? '🔥' : '👑'}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-800">
                          {diff === 'BEGINNER' ? 'مستوى الأشبال' : diff === 'INTERMEDIATE' ? 'مستوى الفرسان' : 'مستوى العباقرة'}
                        </h3>
                        <p className="text-xs text-slate-400 font-bold">
                          {diff === 'BEGINNER' ? 'سهل وواضح' : diff === 'INTERMEDIATE' ? 'تفكير منطقي' : 'بلاغة وعمق'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map(num => (
                        <button
                          key={num}
                          onClick={() => startLevel(Difficulty[diff], num)}
                          className="bg-amber-50 hover:bg-amber-400 hover:text-white text-amber-700 font-black py-3 rounded-2xl border-b-4 border-amber-200 active:translate-y-1 active:border-b-0 transition-all text-sm"
                        >
                          لغز {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-8 border-amber-100 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-2xl font-black text-amber-600 animate-pulse mb-2">جاري التفكير...</h2>
            <p className="text-slate-400 font-bold max-w-[200px]">الذكاء الاصطناعي يصيغ لك لغزاً فريداً الآن</p>
          </div>
        )}

        {isPlaying && state.currentLevel && (
          <div className="flex-grow flex flex-col p-3 sm:p-4 gap-3 overflow-hidden">
            {/* Solved Categories (Horizontal Scroll if many) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 shrink-0">
              {state.currentLevel.categories.map(cat => {
                const isSolved = state.currentLevel?.words.filter(w => w.categoryId === cat.id).every(w => w.isSolved);
                if (!isSolved) return null;
                return (
                  <div 
                    key={cat.id} 
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-white shadow-sm border-b-2 shrink-0 animate-success-reveal"
                    style={{ backgroundColor: cat.color, borderBottomColor: 'rgba(0,0,0,0.2)' }}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-[10px] font-black whitespace-nowrap">{cat.title}</span>
                  </div>
                );
              })}
            </div>

            {/* Hint Box */}
            <div className={`transition-all duration-300 overflow-hidden shrink-0 ${state.activeHint ? 'max-h-20 mb-2' : 'max-h-0'}`}>
              <div className="bg-emerald-100 text-emerald-800 p-3 rounded-2xl text-center font-bold text-xs border border-emerald-200 shadow-sm">
                💡 {state.activeHint}
              </div>
            </div>

            {/* Main Word Grid */}
            <div className="flex-grow grid grid-cols-4 gap-2 content-start overflow-y-auto no-scrollbar py-2">
              {state.currentLevel.words.map((word) => {
                const category = state.currentLevel?.categories.find(c => c.id === word.categoryId);
                const shouldShowHint = state.currentLevel?.difficulty === Difficulty.BEGINNER || word.isSolved;
                return (
                  <div key={word.id} className="aspect-[4/5] sm:aspect-square">
                    <WordCard
                      word={word}
                      category={shouldShowHint ? category : undefined}
                      isSelected={state.selectedWordIds.includes(word.id)}
                      isWrong={isWrongGroup && state.selectedWordIds.includes(word.id)}
                      onClick={() => toggleWordSelection(word.id)}
                    />
                  </div>
                );
              })}
            </div>

            {/* Game Controls Footer */}
            <div className="bg-white/50 backdrop-blur-sm p-3 rounded-3xl border border-white/50 flex flex-col items-center gap-3 shrink-0 shadow-lg">
              <div className="flex items-center justify-between w-full px-2">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  الأخطاء: {state.mistakeCount}
                </div>
                <div className="text-[11px] font-black text-amber-700">
                   اخترت {state.selectedWordIds.length} من ٤
                </div>
              </div>
              
              <div className="flex gap-2 w-full">
                <button 
                  onClick={provideHint}
                  disabled={!!state.activeHint || state.hintUsedCount >= 3}
                  className="flex-1 bg-emerald-50 text-emerald-700 py-3 rounded-2xl font-black text-xs border-b-2 border-emerald-200 active:translate-y-0.5 active:border-b-0 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  💡 مساعدة ({3 - state.hintUsedCount})
                </button>
                <button 
                  onClick={() => setState(prev => ({...prev, selectedWordIds: []}))}
                  disabled={state.selectedWordIds.length === 0}
                  className="flex-1 bg-amber-50 text-amber-700 py-3 rounded-2xl font-black text-xs border-b-2 border-amber-200 active:translate-y-0.5 active:border-b-0 transition-all disabled:opacity-30"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="flex-grow flex flex-col p-6 items-center justify-center text-center">
            <Confetti />
            <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-b-[12px] border-amber-100 w-full animate-success-reveal relative z-10">
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="text-4xl font-black text-amber-600 mb-2">رائع جداً!</h2>
              <p className="text-slate-500 font-bold mb-8 italic">"خير الكلام ما قلّ ودلّ"</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100">
                  <div className="text-[10px] text-amber-600 font-black mb-1">الزمن المستغرق</div>
                  <div className="text-2xl font-black text-amber-900 font-mono">{formatTime(state.timer)}</div>
                </div>
                <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100">
                  <div className="text-[10px] text-rose-600 font-black mb-1">المحاولات</div>
                  <div className="text-2xl font-black text-rose-900 font-mono">{state.mistakeCount}</div>
                </div>
              </div>

              <div className="space-y-3">
                {getNextLevel(state.currentLevel!.difficulty, state.currentLevelNumber) ? (
                  <Button fullWidth className="py-4 text-lg" onClick={() => {
                    const next = getNextLevel(state.currentLevel!.difficulty, state.currentLevelNumber);
                    if (next) startLevel(next.diff, next.num);
                  }}>
                    اللغز التالي
                  </Button>
                ) : (
                  <Button variant="success" fullWidth className="py-4 text-lg" onClick={() => setState(prev => ({...prev, gameState: 'LOBBY'}))}>
                    تمت اللعبة! عودة للقائمة
                  </Button>
                )}
                <button 
                  onClick={shareResult}
                  className="text-amber-600 font-black text-sm hover:underline py-2"
                >
                  تحدّ أصدقاءك بالنتيجة
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {isLobby && (
        <footer className="p-4 text-center border-t border-amber-100/50 flex-shrink-0">
          <p className="text-[10px] text-slate-400 font-bold tracking-tight">
            رَبْط © ٢٠٢٤ • صُنِع بشغف للغة الضاد
          </p>
        </footer>
      )}
    </div>
  );
};

export default App;
