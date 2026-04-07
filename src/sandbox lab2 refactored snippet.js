// ORING LOGIC ONLY 
class BaseQuestionHandler { 
  execute(questionData, userResponse) { return this.evaluate(questionData, 
userResponse); } 
  calculateScore(isCorrect, points) { return isCorrect ? points : 0; } 
} 
 
class MCQHandler extends BaseQuestionHandler { 
  evaluate({ correctAnswer, points }, userResponse) { 
    const isCorrect = correctAnswer === userResponse; 
    return { score: this.calculateScore(isCorrect, points), isCorrect }; 
  } 
} 
 
class TFHandler extends BaseQuestionHandler { 
  evaluate({ correctAnswer, points }, userResponse) { 
    // FIX: .trim() prevents failures from accidental whitespace 
    const normalized = String(userResponse).trim().toLowerCase(); 
    const isCorrect  = normalized === String(correctAnswer).trim().toLowerCase(); 
    return { score: this.calculateScore(isCorrect, points), isCorrect }; 
  } 
} 
 
class DragDropHandler extends BaseQuestionHandler { 
  evaluate({ correctOrder, points }, userResponse) { 
    if (!Array.isArray(userResponse)) return { score: 0, isCorrect: false }; 
    const matches   = userResponse.filter((item, i) => item === 
correctOrder[i]).length; 
    const isCorrect = matches === correctOrder.length; 
    const score     = isCorrect ? points : Math.round((matches / 
correctOrder.length) * points); 
    return { score, isCorrect }; 
  } 
} 
 
class ShortAnswerHandler extends BaseQuestionHandler { 
  evaluate({ acceptedAnswers, points }, userResponse) { 
    if (typeof userResponse !== 'string') return { score: 0, isCorrect: false }; 
    const isCorrect = acceptedAnswers.includes(userResponse.trim().toLowerCase()); 
    return { score: this.calculateScore(isCorrect, points), isCorrect }; 
  } 
} 
 
// STORAGE ADAPTERS — ENVIRONMENT-AGNOSTIC (FIX APPLIED) 
// Adapter interface — swap this to support any environment 
class LocalStorageAdapter { 
  setItem(key, value) { localStorage.setItem(key, value); } 
} 
 
class InMemoryAdapter { 
  constructor() { this._store = {}; } 
  setItem(key, value) { this._store[key] = value; } 
} 
 
class QuizStorageService { 
  // FIX: accepts any adapter — no hard localStorage dependency 
  constructor(telemetry, storageAdapter = new LocalStorageAdapter()) { 
    this.telemetry = telemetry; 
    this.adapter   = storageAdapter; 
  } 
  saveScore(score) { 
    try { 
      this.adapter.setItem('last_score', String(score)); 
      this.telemetry.logInfo('Score saved', { score }); 
    } catch (error) { 
      this.telemetry.logError('Storage failure', { score, error: error.message }); 
    } 
  } 
} 
 
// UI LAYER 
class DOMRenderer { 
  render({ text, color }) { 
    const el = document.getElementById('feedback-box'); 
    if (el) { el.innerText = text; el.style.color = color; } 
  } 
} 
 
class QuizUIService { 
  constructor(renderer, themeConfig) { 
    this.renderer = renderer; 
    this.theme    = themeConfig; 
  } 
  updateFeedback(isCorrect) { 
    this.renderer.render({ 
      text:  isCorrect ? 'Correct! Well done.' : 'Try again.', 
      color: isCorrect ? this.theme.colors.success : this.theme.colors.error 
    }); 
  } 
} 
 
// APPLICATION SERVICE — PRIVATE REGISTRY + OPEN/CLOSED PRINCIPLE 
class QuizService { 
  #handlers = new Map();  // private — never exposed directly 
 
  constructor({ uiService, storageService, telemetry }) { 
    this.uiService      = uiService; 
    this.storageService = storageService; 
    this.telemetry      = telemetry; 
  } 
 
  registerHandler(type, handler) { 
    this.#handlers.set(type, handler); 
    return this;  // fluent API 
  } 
 
  handleQuizAnswer(questionData, userResponse) { 
    const timestamp = new Date().toISOString(); 
    try { 
      const handler = this.#handlers.get(questionData.type); 
      if (!handler) throw new Error(`No handler for: ${questionData.type}`); 
      const result = handler.execute(questionData, userResponse); 
      this.uiService.updateFeedback(result.isCorrect); 
      this.storageService.saveScore(result.score); 
      return { questionId: questionData.id, score: result.score, 
               status: result.isCorrect ? 'completed' : 'failed', 
               error: false, timestamp }; 
    } catch (error) { 
      this.telemetry.logError('QuizService failure', 
        { id: questionData?.id, msg: error.message }); 
      return { questionId: questionData?.id || null, score: 0, 
               status: 'error', error: true, 
               message: error.message, timestamp }; 
    } 
  } 
} 
 
// BOOTSTRAP — COMPOSITION ROOT 
const telemetry = new TelemetryService(); 
 
const quizService = new QuizService({ 
  uiService:      new QuizUIService(new DOMRenderer(), ThemeConfig), 
  storageService: new QuizStorageService(telemetry, new LocalStorageAdapter()), 
  // swap to InMemoryAdapter() for Node/React Native — zero engine changes 
telemetry 
}); 
quizService 
.registerHandler('MULTIPLE_CHOICE', new MCQHandler()) 
.registerHandler('TRUE_FALSE',      
new TFHandler()) 
.registerHandler('DRAG_AND_DROP',   
new DragDropHandler()) 
.registerHandler('SHORT_ANSWER',    
new ShortAnswerHandler()); 