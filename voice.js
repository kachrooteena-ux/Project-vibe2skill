/* -------------------------------------------------------------
 * VOICE ASSISTANT MODULE - FocusFlow AI
 * Interfaces with browser Web Speech APIs to perform speech-to-text
 * voice command matching and synthesizes audio responses.
 * ------------------------------------------------------------- */
// Browser recognition object
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isSupported = false;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  isSupported = true;
}
export const VoiceService = {
  isSupported() {
    return isSupported;
  },
  speak(text) {
    if (!('speechSynthesis' in window)) return;
    
    // Stop any active spoken sentences
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Select a premium English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }
    window.speechSynthesis.speak(utterance);
  },
  startListening(onStart, onResult, onError, onEnd) {
    if (!isSupported) {
      onError("Speech recognition not supported in this browser.");
      return;
    }
    recognition.onstart = () => {
      onStart();
    };
    recognition.onresult = (event) => {
      const resultText = event.results[0][0].transcript;
      onResult(resultText);
    };
    recognition.onerror = (event) => {
      onError(event.error);
    };
    recognition.onend = () => {
      onEnd();
    };
    try {
      recognition.start();
    } catch (e) {
      console.warn("Speech recognition already active.", e);
    }
  },
  stopListening() {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {}
    }
  },
  // Parse voice commands
  parseVoiceCommand(transcript) {
    const text = transcript.toLowerCase().trim();
    
    // 1. Navigation Commands
    if (text.includes("dashboard") || text.includes("home")) {
      return { action: "navigate", view: "dashboard", text: "Opening your dashboard." };
    }
    if (text.includes("task") && (text.includes("show") || text.includes("open") || text.includes("view"))) {
      return { action: "navigate", view: "tasks", text: "Here are your tasks and priorities." };
    }
    if (text.includes("calendar") || text.includes("schedule")) {
      return { action: "navigate", view: "calendar", text: "Switching to your calendar and auto-scheduler." };
    }
    if (text.includes("habit") || text.includes("goal")) {
      return { action: "navigate", view: "habits", text: "Opening your habits and goals dashboard." };
    }
    if (text.includes("focus mode") || text.includes("pomodoro") || text.includes("timer")) {
      return { action: "navigate", view: "focus", text: "Welcome to Focus Mode. Let's block out distractions." };
    }
    if (text.includes("settings")) {
      return { action: "navigate", view: "settings", text: "Opening settings page." };
    }
    // 2. Control Commands
    if (text === "start focus" || text === "start timer" || text === "play timer") {
      return { action: "control-timer", command: "start", text: "Starting your Pomodoro timer. Stay focused." };
    }
    if (text === "pause focus" || text === "pause timer" || text === "stop timer") {
      return { action: "control-timer", command: "pause", text: "Pausing the timer." };
    }
    if (text === "reset focus" || text === "reset timer") {
      return { action: "control-timer", command: "reset", text: "Resetting Pomodoro timer." };
    }
    if (text.includes("auto schedule") || text.includes("run scheduler")) {
      return { action: "run-scheduler", text: "Running AI auto scheduler now. Hang tight." };
    }
    // 3. Add Task Command (Heuristics)
    // Format options: "Add task study chemistry", "add task study chemistry due tomorrow"
    if (text.startsWith("add task") || text.startsWith("create task")) {
      let rawTask = text.replace("add task", "").replace("create task", "").trim();
      let dueDate = "";
      
      // Parse tomorrow keyword
      if (rawTask.includes("due tomorrow")) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0);
        dueDate = tomorrow.toISOString().substring(0, 16);
        rawTask = rawTask.replace("due tomorrow", "").trim();
      } else if (rawTask.includes("due today")) {
        const today = new Date();
        today.setHours(17, 0, 0, 0); // 5pm today
        dueDate = today.toISOString().substring(0, 16);
        rawTask = rawTask.replace("due today", "").trim();
      }
      // Title capitalization
      const title = rawTask.charAt(0).toUpperCase() + rawTask.slice(1);
      
      if (title.length > 0) {
        return {
          action: "add-task",
          task: {
            title: title,
            dueDate: dueDate || new Date(Date.now() + 86400000).toISOString().substring(0, 16), // Default tomorrow
            category: title.toLowerCase().includes("code") || title.toLowerCase().includes("work") ? "work" : "study"
          },
          text: `Added task: "${title}".`
        };
      }
    }
    // No command matched - treat as standard chat request to AI Companion
    return { action: "chat", text: transcript };
  }
};
