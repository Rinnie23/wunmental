// ============================================================================
// WUNMENTAL - Mental Health Support Platform
// Main Application Module
// ============================================================================

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const MOOD_VALUES = { отлично: 5, хорошо: 4, нормально: 3, плохо: 2, тревожно: 1 };
const DAYS_OF_WEEK = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const STORAGE_KEY = 'wm_mood';

// Message variations for each mood selection
const MOOD_MESSAGES = {
  отлично: (emoji) => `${emoji} Отлично — держи этот настрой!`,
  хорошо: (emoji) => `${emoji} Хорошо — уже неплохо`,
  нормально: (emoji) => `${emoji} Нормально — проверь как ты на самом деле`,
  плохо: (emoji) => `${emoji} Плохой день — это временно`,
  тревожно: (emoji) => `${emoji} Тревога — разберёмся что происходит`
};

// Self-help techniques dictionary
const SELF_HELP_TECHNIQUES = {
  breath: `<strong>Квадратное дыхание</strong><br><br>1. Вдох — 4 секунды<br>2. Задержка — 4 секунды<br>3. Выдох — 4 секунды<br>4. Задержка — 4 секунды<br><br>Повтори 4–6 раз. Снижает кортизол и замедляет сердцебиение.`,
  ground: `<strong>Техника 5-4-3-2-1</strong><br><br>👁 5 вещей которые видишь<br>👂 4 звука которые слышишь<br>✋ 3 вещи которые чувствуешь телом<br>👃 2 запаха<br>👅 1 вкус<br><br>Возвращает в «здесь и сейчас», убирает тревогу.`,
  body: `<strong>Сброс напряжения через тело</strong><br><br>1. Потряси руками 10 секунд<br>2. Подними плечи к ушам — задержи 5 сек — резко отпусти<br>3. Сожми кулаки изо всех сил — 5 сек — разожми<br>4. Сделай 5 глубоких вдохов<br><br>Тело хранит стресс — движение его высвобождает.`
};

// ============================================================================
// 2. STATE MANAGEMENT
// ============================================================================

const AppState = {
  selectedMood: '',
  selectedMoodEmoji: '',
  currentQuizKey: null,
  currentQuestionIndex: 0,
  quizScore: 0,
  chatMessages: [],
  currentWinTask: null,

  setMood: function(moodKey, emoji) {
    this.selectedMood = moodKey;
    this.selectedMoodEmoji = emoji;
  },

  resetQuiz: function() {
    this.currentQuestionIndex = 0;
    this.quizScore = 0;
  }
};

// ============================================================================
// 3. STORAGE OPERATIONS
// ============================================================================

const StorageManager = {
  // Retrieve mood history from LocalStorage
  getMoodHistory: function() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  },

  // Save mood history to LocalStorage
  saveMoodHistory: function(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      console.error('Failed to save mood history');
    }
  }
};

// ============================================================================
// 4. MOOD GATE - Initial Mood Selection
// ============================================================================

function pickMood(element, moodKey, emoji) {
  // Remove selection from all mood buttons
  document.querySelectorAll('.gate-mood').forEach(btn => btn.classList.remove('sel'));
  
  // Mark clicked button as selected
  element.classList.add('sel');
  
  // Update app state
  AppState.setMood(moodKey, emoji);
  
  // Enable the "Enter" button
  document.getElementById('gateBtn').classList.add('on');
}

function enterApp() {
  // Prevent entry without mood selection
  if (!AppState.selectedMood) return;

  // Save mood to history
  const history = StorageManager.getMoodHistory();
  const today = new Date().toISOString().slice(0, 10);
  history[today] = MOOD_VALUES[AppState.selectedMood] || 3;
  StorageManager.saveMoodHistory(history);

  // Hide gate, show app
  document.getElementById('mood-gate').classList.add('hide');
  document.getElementById('app').classList.add('on');

  // Display personalized greeting
  const greeting = MOOD_MESSAGES[AppState.selectedMood](AppState.selectedMoodEmoji);
  document.getElementById('moodBadge').textContent = greeting;

  // Render mood graph after transition
  setTimeout(() => renderMoodGraph(), 300);
}

// ============================================================================
// 5. MOOD TRACKING & VISUALIZATION
// ============================================================================

function renderMoodGraph() {
  const history = StorageManager.getMoodHistory();
  const trackerDaysEl = document.getElementById('trackerDays');
  const svgEl = document.getElementById('moodGraph');

  const dayLabels = [];
  const moodValues = [];

  // Collect last 7 days of mood data
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().slice(0, 10);
    
    dayLabels.push(DAYS_OF_WEEK[date.getDay()]);
    moodValues.push(history[dateKey] !== undefined ? history[dateKey] : null);
  }

  // Render day labels
  trackerDaysEl.innerHTML = dayLabels
    .map(day => `<div class="tracker-day">${day}</div>`)
    .join('');

  // Show placeholder if insufficient data
  const validMoods = moodValues.filter(v => v !== null);
  if (validMoods.length < 2) {
    svgEl.innerHTML = `<text x="150" y="45" text-anchor="middle" fill="#555" font-size="12" font-family="Inter">Заходи каждый день — появится график</text>`;
    return;
  }

  // Calculate graph points
  const graphPoints = moodValues
    .map((mood, index) => 
      mood === null ? null : { x: (index / 6) * 300, y: 70 - ((mood - 1) / 4) * 60 }
    )
    .filter(Boolean);

  const polylinePoints = graphPoints.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${graphPoints[0].x},75 ` + 
                     graphPoints.map(p => `${p.x},${p.y}`).join(' ') + 
                     ` ${graphPoints[graphPoints.length - 1].x},75`;

  // Draw SVG graph
  svgEl.innerHTML = `
    <defs><linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff6b35" stop-opacity=".3"/>
      <stop offset="100%" stop-color="#ff6b35" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${areaPoints}" fill="url(#grd)"/>
    <polyline points="${polylinePoints}" fill="none" stroke="#ff6b35" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${graphPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#ff6b35"/>`).join('')}
  `;

  // Check for declining mood trend and alert user
  const recentMoods = moodValues.slice(-5).filter(v => v !== null);
  if (recentMoods.length >= 4 && recentMoods.every((v, i) => i === 0 || v <= recentMoods[i - 1])) {
    setTimeout(() => showMoodWarning(), 500);
  }
}

function showMoodWarning() {
  const warningEl = document.createElement('div');
  warningEl.style.cssText = 'margin-top:.8rem;padding:.7rem 1rem;background:rgba(255,60,60,.1);border:1px solid rgba(255,60,60,.2);border-radius:10px;font-size:.82rem;color:#ff9090;';
  warningEl.innerHTML = '📉 Последние дни тебе непросто. <span onclick="navigatePage(\'chat\')" style="cursor:pointer;color:#ff6b35;font-weight:600;">→ Чат-бот</span> или <span onclick="navigatePage(\'help\')" style="cursor:pointer;color:#ff6b35;font-weight:600;">телефон доверия</span>';
  document.querySelector('.tracker-card').appendChild(warningEl);
}

// ============================================================================
// 6. NAVIGATION
// ============================================================================

function navigatePage(pageId) {
  // Hide all pages and deselect nav items
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.nl').forEach(l => l.classList.remove('on'));

  // Show selected page
  document.getElementById('page-' + pageId).classList.add('on');

  // Highlight active nav item
  document.querySelectorAll('.nl').forEach(navLink => {
    if (navLink.getAttribute('onclick').includes(`'${pageId}'`)) {
      navLink.classList.add('on');
    }
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

// Keep original function name for HTML compatibility
function pg(id) {
  navigatePage(id);
}

// ============================================================================
// 7. SELF-HELP PANEL
// ============================================================================

function switchSelfHelpTab(element, techniqueKey) {
  // Deselect all tabs
  document.querySelectorAll('.sh-tab').forEach(tab => tab.classList.remove('on'));
  
  // Select clicked tab
  element.classList.add('on');
  
  // Display technique content
  document.getElementById('shContent').innerHTML = SELF_HELP_TECHNIQUES[techniqueKey];
}

// Keep original function name for HTML compatibility
function shTab(el, key) {
  switchSelfHelpTab(el, key);
}

// ============================================================================
// 8. SOS EMERGENCY FEATURES
// ============================================================================

function toggleSOSOverlay() {
  document.getElementById('sos-overlay').classList.toggle('active');
}

function stealthMode() {
  // Quick escape - redirect to Google
  window.location.href = 'https://www.google.com';
}

// Keep original names for HTML compatibility
function toggleSOS() {
  toggleSOSOverlay();
}

function stealth() {
  stealthMode();
}

// Add keyboard shortcut for stealth mode (Esc key)
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') stealthMode();
});

// ============================================================================
// 9. QUIZ SYSTEM
// ============================================================================

const QuizManager = {
  // Score functions for each quiz type
  scorers: {
    beck: function(score) {
      if (score <= 9) {
        return {
          emoji: '😌',
          title: 'Минимальная депрессия',
          text: 'Признаков депрессии нет или они минимальны.',
          level: 'low',
          causes: [],
          solutions: ['Продолжай следить за своим состоянием', 'Физическая активность и сон — лучшая профилактика']
        };
      }
      if (score <= 18) {
        return {
          emoji: '😐',
          title: 'Лёгкая депрессия',
          text: 'Есть некоторые признаки депрессивного состояния.',
          level: 'mid',
          causes: ['Сниженный фон может быть реакцией на стресс'],
          solutions: ['Поговори с кем-то кому доверяешь', 'Попробуй техники самопомощи — дыхание, прогулки']
        };
      }
      if (score <= 29) {
        return {
          emoji: '😟',
          title: 'Умеренная депрессия',
          text: 'Не оставайся с этим один.',
          level: 'high',
          causes: ['Умеренная депрессия влияет на качество жизни', 'Без помощи может ухудшиться'],
          solutions: ['Обратись к школьному психологу', '8-800-2000-122 — бесплатно и конфиденциально']
        };
      }
      return {
        emoji: '🆘',
        title: 'Выраженная депрессия',
        text: 'Пожалуйста, обратись за помощью прямо сейчас.',
        level: 'urgent',
        causes: ['Ты не виноват в том что чувствуешь'],
        solutions: ['Позвони прямо сейчас: 8-800-2000-122', 'Скажи взрослому которому доверяешь']
      };
    },

    spielberger: function(score) {
      if (score <= 15) {
        return {
          emoji: '😌',
          title: 'Низкая тревожность',
          text: 'Уровень тревоги сейчас низкий. Ты в спокойном состоянии.',
          level: 'low',
          causes: [],
          solutions: ['Продолжай поддерживать этот баланс']
        };
      }
      if (score <= 30) {
        return {
          emoji: '😐',
          title: 'Умеренная тревожность',
          text: 'Тревога есть, но в пределах нормы.',
          level: 'mid',
          causes: ['Умеренная тревога — нормальная реакция на стресс'],
          solutions: ['Попробуй квадратное дыхание', 'Физическая активность снижает тревогу']
        };
      }
      return {
        emoji: '😟',
        title: 'Высокая тревожность',
        text: 'Уровень тревоги повышен. Это влияет на самочувствие и сон.',
        level: 'high',
        causes: ['Хроническая тревога без помощи усиливается'],
        solutions: ['8-800-2000-122', 'Техники дыхания и заземления помогут прямо сейчас']
      };
    }
  },

  // Start a quiz session
  startQuiz: function(quizKey) {
    AppState.currentQuizKey = quizKey;
    AppState.resetQuiz();
    this.renderQuestion();
  },

  // Render current quiz question
  renderQuestion: function() {
    const quiz = tests[AppState.currentQuizKey];
    const currentQuestion = quiz.questions[AppState.currentQuestionIndex];
    const totalQuestions = quiz.questions.length;

    // Update progress bar
    const progressPercent = ((AppState.currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('qProg').innerHTML = 
      `<div style="height:3px;background:#333;border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${progressPercent}%;background:#ff6b35;transition:width .3s;"></div>
      </div>`;

    // Render question and options
    let optionsHTML = currentQuestion.opts
      .map((opt, idx) => `<button class="qopt" onclick="selectQuizAnswer(${idx})">${opt}</button>`)
      .join('');

    document.getElementById('qContent').innerHTML = `
      <div class="quiz-card">
        <div class="qtext">${AppState.currentQuestionIndex + 1}. ${currentQuestion.q}</div>
        <div class="qopts">${optionsHTML}</div>
      </div>
    `;
  },

  // Process answer and move to next question
  selectAnswer: function(optionIndex) {
    AppState.quizScore += optionIndex;
    AppState.currentQuestionIndex++;

    const quiz = tests[AppState.currentQuizKey];
    if (AppState.currentQuestionIndex < quiz.questions.length) {
      this.renderQuestion();
    } else {
      this.showResults();
    }
  },

  // Display quiz results
  showResults: function() {
    const quiz = tests[AppState.currentQuizKey];
    const result = this.scorers[AppState.currentQuizKey](AppState.quizScore);

    document.getElementById('qContent').innerHTML = `
      <div class="quiz-result">
        <div style="font-size:3rem;margin-bottom:1rem;">${result.emoji}</div>
        <div class="result-title">${result.title}</div>
        <div class="result-text">${result.text}</div>
        <div class="result-solutions">
          <h4>Что делать?</h4>
          <ul>${result.solutions.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <button class="btn btn-o" onclick="backToTests()">← вернуться к тестам</button>
      </div>
    `;
  }
};

// Start a test quiz
function startTest(testKey) {
  document.getElementById('tests-grid').style.display = 'none';
  document.getElementById('quiz-wrap').style.display = 'block';
  QuizManager.startQuiz(testKey);
}

// Go back from quiz to tests list
function backToTests() {
  document.getElementById('tests-grid').style.display = 'grid';
  document.getElementById('quiz-wrap').style.display = 'none';
  AppState.resetQuiz();
}

// Select quiz answer (compatibility wrapper)
function selectQuizAnswer(optionIndex) {
  QuizManager.selectAnswer(optionIndex);
}

// ============================================================================
// 10. CHAT SYSTEM
// ============================================================================

const ChatBot = {
  // Set of common responses for the chatbot
  responses: {
    stress: 'Стресс выбивает из колеи. Давай разберёмся что его вызывает. Это школа, семья, социальное давление?',
    sleep: 'Сон — супер важен для психики. Без сна все становится хуже в 10 раз. Попробуй лечь раньше на 1 час.',
    bullying: 'К сожалению, буллинг реальная проблема. Ты не виноват. Поговори с кем-то кому доверяешь.',
    feeling_bad: 'Мне жаль что тебе плохо. Это временно. Давай думать что может помочь прямо сейчас.',
    lonely: 'Одиночество болит. Но ты не один. Даже если кажется что все против, есть люди которые готовы помочь.',
    default: 'Спасибо что рассказал. Я слушаю. Что ещё беспокоит?'
  },

  // Generate response based on user input
  generateResponse: function(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    if (msg.includes('стресс') || msg.includes('тест')) return this.responses.stress;
    if (msg.includes('сон') || msg.includes('спать')) return this.responses.sleep;
    if (msg.includes('буллинг') || msg.includes('травля')) return this.responses.bullying;
    if (msg.includes('плохо') || msg.includes('грустно')) return this.responses.feeling_bad;
    if (msg.includes('одино')) return this.responses.lonely;

    return this.responses.default;
  },

  // Add message to chat
  addMessage: function(text, isBot = false) {
    const messagesContainer = document.getElementById('chatMsgs');
    const msgClass = isBot ? 'bot' : 'user';
    
    const messageEl = document.createElement('div');
    messageEl.className = `msg ${msgClass}`;
    messageEl.textContent = text;
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // Show typing indicator
  showTyping: function() {
    const messagesContainer = document.getElementById('chatMsgs');
    const typingEl = document.createElement('div');
    typingEl.className = 'typing';
    typingEl.innerHTML = '<span></span><span></span><span></span>';
    typingEl.id = 'typing-indicator';
    
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // Remove typing indicator
  removeTyping: function() {
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) typingEl.remove();
  }
};

// Send message in chat
function sendMessage() {
  const inputEl = document.getElementById('chatIn');
  const userMessage = inputEl.value.trim();

  if (!userMessage) return;

  // Add user message to chat
  ChatBot.addMessage(userMessage, false);
  inputEl.value = '';

  // Show bot is typing
  ChatBot.showTyping();

  // Generate and display bot response
  setTimeout(() => {
    ChatBot.removeTyping();
    const botResponse = ChatBot.generateResponse(userMessage);
    ChatBot.addMessage(botResponse, true);
  }, 300);
}

// Send message on Enter key
function sendM() {
  sendMessage();
}

// Handle quick reply buttons
function quickReply(text) {
  document.getElementById('chatIn').value = '';
  ChatBot.addMessage(text, false);
  ChatBot.showTyping();

  setTimeout(() => {
    ChatBot.removeTyping();
    const response = ChatBot.generateResponse(text);
    ChatBot.addMessage(response, true);
  }, 300);
}

// Quick reply wrapper
function qr(text) {
  quickReply(text);
}

// ============================================================================
// 11. MINI TASKS (WINS)
// ============================================================================

const WinsManager = {
  tasks: [
    '🚶 Выйди на улицу на 5 минут. Просто погулять.',
    '💧 Выпей стакан воды. Почувствуй как это просто.',
    '🎵 Послушай одну песню которая тебе нравится.',
    '📝 Напиши одно слово о сегодняшнем дне.',
    '🤝 Напиши сообщение кому-то кому ты рад видеть.',
    '🪟 Откройся к окну. Посмотри на небо.',
    '⏰ Не трогай телефон 5 минут.',
    '🫂 Обними себя. Звучит странно? Это работает.',
    '📱 Поставь телефон подальше от себя.',
    '🧘 Сделай 3 глубоких вдоха. Только это.',
    '✍️ Напиши одну вещь за которую ты благодарен.',
    '🚿 Умойся холодной водой. Пробудит.',
    '🍎 Съешь что-то полезное.',
    '💪 Сделай 10 приседаний или прыжков.',
    '🎯 Напиши одно маленькое дело которое ты можешь сделать сейчас.',
    '🌈 Найди одну красивую вещь вокруг себя.',
    '🎨 Рисуй что угодно. 2 минуты.',
    '📞 Пошли голосовое сообщение вместо текста.'
  ],

  // Get random task
  getRandomTask: function() {
    const randomIndex = Math.floor(Math.random() * this.tasks.length);
    return this.tasks[randomIndex];
  },

  // Display task
  displayTask: function(task) {
    AppState.currentWinTask = task;
    document.getElementById('winsTask').textContent = task;
    document.getElementById('winsSub').textContent = 'Маленькие действия меняют состояние';
    document.getElementById('winsDone').style.display = 'flex';
  }
};

// Get new mini task
function getWin() {
  const task = WinsManager.getRandomTask();
  WinsManager.displayTask(task);
}

// Mark task as done
function doneWin() {
  document.getElementById('winsAch').style.display = 'block';
  document.getElementById('winsDone').style.display = 'none';
  
  setTimeout(() => {
    document.getElementById('winsAch').style.display = 'none';
    document.getElementById('winsTask').textContent = 'Нажми кнопку — получи задание';
    document.getElementById('winsSub').textContent = 'Каждое маленькое действие меняет состояние';
  }, 2500);
}

// ============================================================================
// 12. INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the app when DOM is ready
  renderMoodGraph();
});
