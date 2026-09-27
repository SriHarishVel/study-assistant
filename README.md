# Study Assistant

## Features

- Generate study material by entering any topic.
- Review concepts using interactive flashcards and notes.
- Test knowledge with multiple-choice quizzes.
- Generate flowcharts and numerical charts when suitable.
- Refine individual sections using AI instructions.
- Save, reload, and delete study sessions.
- Responsive UI with dark mode.

## Tech Stack

- React (Hooks) and JavaScript
- Vite
- Node.js and Express
- Google Gemini API
- Server-Sent Events (SSE)

## Project Structure

```text
Study Assistant/
├── backend/
│   └── server.js
│
├── frontend/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── ChartSection.jsx
│       │   ├── ErrorState.jsx
│       │   ├── FlashcardDeck.jsx
│       │   ├── LoadingState.jsx
│       │   ├── PromptInput.jsx
│       │   ├── QuizCard.jsx
│       │   ├── QuizQuestion.jsx
│       │   ├── RefinementInput.jsx
│       │   ├── ResultView.jsx
│       │   └── SavedSessions.jsx
│       │
│       ├── lib/
│       │   ├── api.js
│       │   └── validateResult.js
│       │
│       └── App.jsx
│
├── README.md
└── .gitignore
```

## Setup and Installation

### Prerequisites

- Node.js and npm
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/SriHarishVel/study-assistant
cd study-assistant
```

### 2. Start the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Start the backend using the script defined in `backend/package.json`.

For example:

```bash
npm start
```

### 3. Start the frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite, usually `http://localhost:5173`.

Make sure the backend is running before using the AI features.

## AI Usage

Google Gemini is used to generate structured study material and refine existing content.

ChatGPT was used during development for UI styling, implementing the streaming feature, overall debugging, and creating the AI-generated logo used in the application title. Google Gemini API is used in the application to generate and refine study material.

## Error Handling

The project handles common AI and network issues, including:

- Invalid JSON and incorrect response structures.
- Empty AI responses and unavailable charts.
- Slow requests, timeouts, and cancellation.
- Failed API requests and backend connection errors.
- Stale responses to prevent older requests from overwriting newer results.

Loading, error, and empty states are provided to keep the application usable when something goes wrong.

## Known Limitations

- **Input Length:** The application supports a maximum of 10,000 characters per input.
- **Document Uploads:** Currently, users can only enter text manually. PDF, Word, and other document uploads are not supported.
- **AI Accuracy:** AI-generated content may contain inaccuracies or incomplete explanations and should be verified.
- **Chart Rendering:** Flowchart node alignment and spacing may occasionally be inconsistent due to the third-party rendering library.
- **Chart Availability:** Charts are generated only when meaningful data is available. Some topics may not produce a chart.
- **Generation Time:** AI responses may take time depending on the Gemini API, network conditions, and usage limits.
- **API Free-Tier Limits:** The Gemini 3.5 Flash Lite free tier has a limit of 15 requests per minute (RPM) and 500 requests per day (RPD). Exceeding these limits may temporarily prevent AI requests.
- **API Dependency:** AI-powered features require an internet connection, a running backend, and an available Gemini API.
- **Session Storage:** Saved sessions are managed within the application and do not currently provide cross-device synchronization.
