/**
 * Mantis YouTube & Learning Assistant Module
 * Handles study generation, structured notes, flashcard carousel,
 * active recall quizzes, and assignment conversion to tasks.
 */

class LearningManager {
  constructor() {
    this.form = document.getElementById('learn-generate-form');
    this.inputUrl = document.getElementById('learn-input-url');
    this.btnGenerate = document.getElementById('btn-generate-study');
    this.lessonViewContainer = document.getElementById('active-lesson-container');
    this.savedLessonsContainer = document.getElementById('lessons-history-container');
    this.lessonViewTitle = document.getElementById('lesson-view-title');
    this.btnCloseLesson = document.getElementById('btn-close-lesson');

    // Sub tabs
    this.notesContent = document.getElementById('lesson-notes-content');
    this.flashcardEl = document.getElementById('flashcard-element');
    this.cardQuestion = document.getElementById('card-question-text');
    this.cardAnswer = document.getElementById('card-answer-text');
    this.cardCounter = document.getElementById('card-counter');
    this.btnCardPrev = document.getElementById('btn-card-prev');
    this.btnCardNext = document.getElementById('btn-card-next');
    this.quizContainer = document.getElementById('quiz-container');
    this.assignmentsList = document.getElementById('assignments-list');

    this.currentLesson = null;
    this.currentCardIndex = 0;
    this.flashcards = [];

    this.bindEvents();
    this.loadSavedLessons();
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGenerate();
      });
    }

    if (this.btnCloseLesson) {
      this.btnCloseLesson.addEventListener('click', () => {
        this.lessonViewContainer.classList.add('hidden');
      });
    }

    // Sub tab switching
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sub-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.dataset.subtab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    // Flashcard interaction
    if (this.flashcardEl) {
      this.flashcardEl.addEventListener('click', () => {
        this.flashcardEl.classList.toggle('flipped');
      });
    }

    if (this.btnCardPrev) {
      this.btnCardPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevCard();
      });
    }

    if (this.btnCardNext) {
      this.btnCardNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextCard();
      });
    }
  }

  async loadSavedLessons() {
    try {
      const lessons = await window.mantisAPI.getLessons();
      if (!this.savedLessonsContainer) return;
      this.savedLessonsContainer.innerHTML = '';

      if (lessons.length === 0) {
        this.savedLessonsContainer.innerHTML = '<p style="color:var(--text-dim); font-size:12px;">No saved lessons yet. Enter a topic or video above.</p>';
        return;
      }

      lessons.forEach(l => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.style.cursor = 'pointer';

        item.innerHTML = `
          <div class="task-info">
            <span class="task-title">${l.title}</span>
            <span class="task-meta">${l.source_url ? 'YouTube Video' : 'Study Concept'} • ${new Date(l.created_at).toLocaleDateString()}</span>
          </div>
          <button class="pill-btn secondary-pill" style="font-size:10px;">Study</button>
        `;

        item.addEventListener('click', () => this.displayLesson(l));
        this.savedLessonsContainer.appendChild(item);
      });
    } catch (err) {
      console.warn('[LearningManager] Error loading lessons:', err);
    }
  }

  async handleGenerate() {
    const raw = (this.inputUrl.value || '').trim();
    if (!raw) return;

    this.btnGenerate.textContent = 'Analyzing...';
    this.btnGenerate.disabled = true;
    window.companionOrb.setState('thinking', 'Studying...');

    try {
      const isUrl = raw.startsWith('http://') || raw.startsWith('https://');
      const lesson = await window.mantisAPI.generateLesson({
        url: isUrl ? raw : '',
        topic: isUrl ? '' : raw,
        title: isUrl ? '' : raw
      });

      window.companionOrb.setState('idle');
      this.btnGenerate.textContent = '✨ Study Lesson';
      this.btnGenerate.disabled = false;
      this.inputUrl.value = '';

      this.displayLesson(lesson);
      this.loadSavedLessons();
    } catch (err) {
      window.companionOrb.setState('idle');
      this.btnGenerate.textContent = '✨ Study Lesson';
      this.btnGenerate.disabled = false;
      alert(`Could not process lesson: ${err.message}`);
    }
  }

  displayLesson(lesson) {
    this.currentLesson = lesson;
    this.lessonViewTitle.textContent = lesson.title;
    this.lessonViewContainer.classList.remove('hidden');

    // Notes
    this.notesContent.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; font-size: 12px; color: var(--text-main);">${lesson.structured_notes || lesson.summary}</pre>`;

    // Flashcards
    try {
      this.flashcards = typeof lesson.flashcards_json === 'string' ? JSON.parse(lesson.flashcards_json) : (lesson.flashcards_json || []);
    } catch {
      this.flashcards = [];
    }
    this.currentCardIndex = 0;
    this.renderCurrentCard();

    // Quiz
    this.renderQuiz(lesson.quiz_json);

    // Assignments
    this.renderAssignments(lesson.assignments_json, lesson.title);
  }

  renderCurrentCard() {
    if (!this.flashcards || this.flashcards.length === 0) {
      this.cardQuestion.textContent = 'No flashcards available for this lesson.';
      this.cardAnswer.textContent = '';
      this.cardCounter.textContent = '0 / 0';
      return;
    }

    if (this.flashcardEl) this.flashcardEl.classList.remove('flipped');
    const card = this.flashcards[this.currentCardIndex];
    this.cardQuestion.textContent = card.question;
    this.cardAnswer.textContent = card.answer;
    this.cardCounter.textContent = `${this.currentCardIndex + 1} / ${this.flashcards.length}`;
  }

  prevCard() {
    if (this.flashcards.length === 0) return;
    this.currentCardIndex = (this.currentCardIndex - 1 + this.flashcards.length) % this.flashcards.length;
    this.renderCurrentCard();
  }

  nextCard() {
    if (this.flashcards.length === 0) return;
    this.currentCardIndex = (this.currentCardIndex + 1) % this.flashcards.length;
    this.renderCurrentCard();
  }

  renderQuiz(quizData) {
    if (!this.quizContainer) return;
    this.quizContainer.innerHTML = '';

    let questions = [];
    try {
      questions = typeof quizData === 'string' ? JSON.parse(quizData) : (quizData || []);
    } catch {
      questions = [];
    }

    if (questions.length === 0) {
      this.quizContainer.innerHTML = '<p style="color:var(--text-dim);">No active recall questions available.</p>';
      return;
    }

    questions.forEach((q, qIndex) => {
      const qCard = document.createElement('div');
      qCard.className = 'quiz-card';

      const qTitle = document.createElement('div');
      qTitle.className = 'quiz-question';
      qTitle.textContent = `${qIndex + 1}. ${q.question}`;
      qCard.appendChild(qTitle);

      const optsBox = document.createElement('div');
      optsBox.className = 'quiz-options';

      const explEl = document.createElement('div');
      explEl.className = 'quiz-expl hidden';
      explEl.textContent = `Explanation: ${q.explanation || 'Correct!'}`;

      (q.options || []).forEach((opt, optIndex) => {
        const optBtn = document.createElement('button');
        optBtn.className = 'quiz-opt-btn';
        optBtn.textContent = opt;

        optBtn.addEventListener('click', () => {
          optsBox.querySelectorAll('.quiz-opt-btn').forEach(b => b.disabled = true);
          if (optIndex === q.answerIndex) {
            optBtn.classList.add('correct');
          } else {
            optBtn.classList.add('wrong');
            optsBox.children[q.answerIndex]?.classList.add('correct');
          }
          explEl.classList.remove('hidden');
        });

        optsBox.appendChild(optBtn);
      });

      qCard.appendChild(optsBox);
      qCard.appendChild(explEl);
      this.quizContainer.appendChild(qCard);
    });
  }

  renderAssignments(assignmentsData, lessonTitle) {
    if (!this.assignmentsList) return;
    this.assignmentsList.innerHTML = '';

    let items = [];
    try {
      items = typeof assignmentsData === 'string' ? JSON.parse(assignmentsData) : (assignmentsData || []);
    } catch {
      items = [];
    }

    if (items.length === 0) {
      this.assignmentsList.innerHTML = '<p style="color:var(--text-dim);">No practical assignments defined.</p>';
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'task-item';

      const info = document.createElement('div');
      info.className = 'task-info';
      info.innerHTML = `
        <span class="task-title">${item.task}</span>
        <span class="task-meta">Practical Assignment</span>
      `;

      const addBtn = document.createElement('button');
      addBtn.className = 'pill-btn primary-pill';
      addBtn.textContent = '+ Add to Planner';
      addBtn.addEventListener('click', async () => {
        await window.mantisAPI.convertAssignmentToTask(lessonTitle, item.task);
        addBtn.textContent = '✓ Added';
        addBtn.disabled = true;
        if (window.plannerManager) window.plannerManager.loadTasks();
      });

      row.appendChild(info);
      row.appendChild(addBtn);
      this.assignmentsList.appendChild(row);
    });
  }
}

window.learningManager = new LearningManager();
