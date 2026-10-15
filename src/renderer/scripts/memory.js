/**
 * Mantis Personal Memory & Knowledge Module
 * Displays persistent SQLite memories, routines, and preferences.
 */

class MemoryManager {
  constructor() {
    this.container = document.getElementById('memory-notes-container');
    this.btnAddNote = document.getElementById('btn-add-note');
    this.btnClearChat = document.getElementById('btn-clear-chat');
    this.filterChips = document.querySelectorAll('.filter-chips .chip');
    this.currentCategory = null;

    this.bindEvents();
    this.loadNotes();
  }

  bindEvents() {
    if (this.btnAddNote) {
      this.btnAddNote.addEventListener('click', () => this.promptNewNote());
    }

    if (this.btnClearChat) {
      this.btnClearChat.addEventListener('click', async () => {
        if (confirm('Clear all conversation history? This cannot be undone.')) {
          await window.mantisAPI.clearChatHistory();
          const chatCont = document.getElementById('chat-messages-container');
          if (chatCont) chatCont.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">Chat history cleared.</div>';
          alert('Chat history cleared.');
        }
      });
    }

    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const cat = chip.dataset.cat;
        this.currentCategory = cat === 'all' ? null : cat;
        this.loadNotes();
      });
    });
  }

  async loadNotes() {
    try {
      const notes = await window.mantisAPI.getMemoryNotes(this.currentCategory);
      if (!this.container) return;
      this.container.innerHTML = '';

      if (notes.length === 0) {
        this.container.innerHTML = `
          <div style="text-align:center; padding: 20px; color: var(--text-dim); font-size: 12px;">
            No saved memories in this category yet.
          </div>
        `;
        return;
      }

      notes.forEach(note => {
        const card = document.createElement('div');
        card.className = 'memory-card';

        const header = document.createElement('div');
        header.className = 'memory-card-header';

        const title = document.createElement('span');
        title.className = 'memory-title';
        title.textContent = `[${note.category.toUpperCase()}] ${note.title}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'icon-btn';
        delBtn.style.width = '22px';
        delBtn.style.height = '22px';
        delBtn.innerHTML = '✕';
        delBtn.title = 'Delete memory';
        delBtn.addEventListener('click', () => this.deleteNote(note.id));

        header.appendChild(title);
        header.appendChild(delBtn);

        const content = document.createElement('p');
        content.className = 'memory-content';
        content.textContent = note.content;

        card.appendChild(header);
        card.appendChild(content);
        this.container.appendChild(card);
      });
    } catch (err) {
      console.warn('[MemoryManager] Error loading notes:', err);
    }
  }

  async promptNewNote() {
    const title = prompt('Note Title (e.g. Daily Schedule, Preferred Coding Style):');
    if (!title) return;
    const content = prompt('Note Content:');
    if (!content) return;
    const category = prompt('Category (preference, routine, goal, note):', 'routine') || 'note';

    await window.mantisAPI.createMemoryNote(category, title, content, 0);
    this.loadNotes();
  }

  async deleteNote(id) {
    if (confirm('Delete this saved memory?')) {
      await window.mantisAPI.deleteMemoryNote(id);
      this.loadNotes();
    }
  }
}

window.memoryManager = new MemoryManager();
