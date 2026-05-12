// Quick script to reset JARVIS settings to Gemini defaults
const Store = require('electron-store');
const store = new Store();

console.log('Current settings:', store.store);

// Reset to Gemini defaults
store.set('model', 'gemini-2.5-flash');
store.delete('provider');
store.delete('openaiKey');

console.log('\n✅ Settings reset to Gemini defaults');
console.log('New settings:', store.store);
console.log('\nYou can now restart JARVIS');
