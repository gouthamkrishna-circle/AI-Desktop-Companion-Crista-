/**
 * Mantis Animated Companion Orb Controller
 * Controls states: 'idle', 'listening', 'thinking', 'speaking'
 */

class CompanionOrb {
  constructor() {
    this.mainOrb = document.getElementById('main-floating-orb');
    this.headerOrb = document.querySelector('.header-orb-mini');
    this.currentState = 'idle';
  }

  setState(state) {
    this.currentState = state;
    const states = ['state-idle', 'state-listening', 'state-thinking', 'state-speaking'];

    [this.mainOrb, this.headerOrb].forEach(el => {
      if (!el) return;
      states.forEach(s => el.classList.remove(s));
      el.classList.add(`state-${state}`);
    });
  }

  pulse() {
    this.setState('thinking');
    setTimeout(() => {
      if (this.currentState === 'thinking') {
        this.setState('idle');
      }
    }, 1500);
  }
}

window.companionOrb = new CompanionOrb();
