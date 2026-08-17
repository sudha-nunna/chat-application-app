/**
 * AvatarStateMachine.js
 * Robust, interrupt-safe finite state machine for AI Avatar states.
 * States: IDLE, LISTENING, THINKING, SPEAKING, ERROR
 */

export const AVATAR_STATES = {
  IDLE: "IDLE",
  LISTENING: "LISTENING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
  ERROR: "ERROR"
};

export class AvatarStateMachine {
  constructor(initialState = AVATAR_STATES.IDLE, onStateChange = null) {
    this.currentState = initialState;
    this.onStateChange = onStateChange;
    this.listeners = new Set();
  }

  getState() {
    return this.currentState;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  transitionTo(newState, payload = {}) {
    if (this.currentState === newState) return false;

    // Allow interrupt transitions safely
    const oldState = this.currentState;
    this.currentState = newState;

    if (this.onStateChange) {
      this.onStateChange(newState, oldState, payload);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(newState, oldState, payload);
      } catch (err) {
        console.error("AvatarStateMachine listener error:", err);
      }
    });

    return true;
  }

  isIdle() {
    return this.currentState === AVATAR_STATES.IDLE;
  }

  isListening() {
    return this.currentState === AVATAR_STATES.LISTENING;
  }

  isThinking() {
    return this.currentState === AVATAR_STATES.THINKING;
  }

  isSpeaking() {
    return this.currentState === AVATAR_STATES.SPEAKING;
  }

  isError() {
    return this.currentState === AVATAR_STATES.ERROR;
  }

  reset() {
    this.transitionTo(AVATAR_STATES.IDLE);
  }
}

export default AvatarStateMachine;
