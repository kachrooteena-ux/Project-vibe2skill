# FocusFlow AI ⚡
> Proactive AI-Powered Productivity Companion
FocusFlow AI is a high-fidelity client-side productivity dashboard designed to solve the passive reminder problem. Instead of displaying notifications that are easy to swipe away, FocusFlow AI proactively manages your daily planning, organizes tasks via the **Eisenhower Decision Matrix**, structures your calendar using a **collision-free Auto-Scheduling Algorithm**, and features immersive **Web Audio procedural synthesizers** and **voice controls**.
It is built entirely using vanilla modern web standards: **HTML5, Vanilla CSS, and native ES Modules**. It has zero mandatory build scripts, compiles instantly, and can be hosted directly on static providers like GitHub Pages.
---
## 🌟 Core Feature Suite
### 1. Proactive AI Intervention Feed
* The app automatically scans your task deadlines, estimating durations, and habit completion stats.
* It injects alert cards to warn you of upcoming overflows (e.g., *"Your lab report is due tomorrow and requires 90 mins, but hasn't been scheduled. Do it tonight at 7 PM?"*).
### 2. Eisenhower Matrix Prioritization
* Tasks are categorized into four logical quadrants:
  * **Q1: Do Immediately** (Urgent & Important)
  * **Q2: Schedule / Decide** (Important, Not Urgent)
  * **Q3: Delegate / Automate** (Urgent, Not Important)
  * **Q4: Eliminate / Postpone** (Not Urgent & Not Important)
* Deadlines within 24 hours are automatically upgraded to **Urgent** status to prevent missed deadlines.
### 3. Collision-Free AI Auto-Scheduler
* A smart allocation algorithm scans your active tasks, computes priority indices, and maps them directly into empty slots in your calendar.
* Configures around your **Working Hours** and **Sleep cycles**, avoiding overlaps with existing events.
### 4. Synthesized Soundscape Focus Engine
* Focus Mode features a fullscreen distraction-free timer.
* Integrated **procedural Web Audio API sound generators**:
  * **Deep Rain**: Procedural pink noise rain simulation.
  * **Alpha Waves Binaural Beat**: Plays a stereophonic 10Hz pitch difference (200Hz Left, 210Hz Right) to stimulate cognitive flow.
  * **Forest Breeze**: Slow sweep low-frequency oscillator (LFO) modulating a Bandpass filter on white noise.
* *Zero internet connection or audio loading bandwidth required.*
### 5. Speech Control Center (Voice Assistant)
* Leverages native webkit speech recognition to parse user commands:
  * *"Add task study organic chemistry due tomorrow"*
  * *"Start focus mode"*
  * *"Run AI scheduler"*
  * *"Show calendar"*
* Speaks back to you with text-to-speech updates if enabled.
### 6. Client-Side Gemini LLM Integration
* Switch between a **Local Heuristic Simulator** (offline-first rule engine) and a **Live Gemini LLM**.
* Input your **Google AI Studio API key** in the Settings tab, and the app connects directly to the Gemini API (`gemini-2.5-flash`) for natural chat, dynamic planning advice, and task step decomposition.
---
## 📂 File Architecture
```
focusflow-ai/
├── index.html                  # Main markup entry point
├── package.json                # Dev-server setups
├── README.md                   # Project documentation
├── styles/
│   ├── main.css                # Base layouts, variables, reset styles, forms
│   ├── dashboard.css           # Proactive feeds, focus score progress rings
│   ├── tasks.css               # Eisenhower matrix borders, task checklists
│   ├── calendar.css            # Month days grids, weekly time block overlays
│   ├── companion.css           # Chat widgets, floating companion animations
│   └── focus.css               # Pomodoro countdowns, audio volumes, fullscreen overlays
└── js/
    ├── app.js                  # Central coordinator and DOM router
    ├── storage.js              # LocalStorage helper and mock data seeding
    ├── tasks.js                # Task CRUD and local decomposition heuristics
    ├── calendar.js             # Calendar grids and AI Auto-Scheduler algorithm
    ├── habits.js               # Habits checklists and completion streaks
    ├── focus.js                # Pomodoro states and Web Audio synthesizers
    ├── voice.js                # Web Speech recognition and commands parsing
    └── ai.js                   # Gemini API client and proactive alert scanning
```
---
## 🚀 How to Run
### Method 1: Zero-Install (Direct Browser)
Since FocusFlow is built on standard Web APIs:
1. Double-click the `index.html` file to open it in your browser!
2. *Note: Voice Recognition (Speech-to-Text) requires a secure context (`localhost` or `https`) or server environment in some browsers.*
### Method 2: Node Local Dev Server (Recommended)
To run a local server with full support for all Speech/Audio capabilities:
1. Open your terminal in the `focusflow-ai` directory.
2. Run `npm install` to set up the lightweight dev server.
3. Run `npm start` to run the server.
4. Open [http://localhost:3000](http://localhost:3000) in your browser.
---
