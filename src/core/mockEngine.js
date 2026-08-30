// Runtime fallback intentionally contains no hardcoded program.
// The backend analysis is the only source of execution steps and memory state.
// Keeping this fallback empty prevents old demo data from appearing when
// the editor is empty or before a new analysis has completed.

export const executionSteps = [];

export const initialState = {};
