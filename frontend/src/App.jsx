import { useState, useRef, useEffect } from "react";

import { generateStudyMaterial } from "./lib/api";
import PromptInput from "./components/PromptInput";
import ResultView from "./components/ResultView";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import SavedSessions from "./components/SavedSessions";

const STORAGE_KEY = "flam-saved-sessions";

function getSavedSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("flashcards");
  const [darkMode, setDarkMode] = useState(false);
  const [sessions, setSessions] = useState(getSavedSessions);

  const requestId = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      console.error("Unable to save sessions.");
    }
  }, [sessions]);

  const tabs = [
    { id: "flashcards", label: "Flashcards" },
    { id: "notes", label: "Study Notes" },
    { id: "examples", label: "Examples" },
    { id: "quiz", label: "Quiz" },
  ];

  async function handleSubmit() {
    if (!input.trim()) return;

    const id = ++requestId.current;

    setLoading(true);
    setError(null);
    setResponse(null);
    setActiveTab("flashcards");

    try {
      const data = await generateStudyMaterial(input.trim());

      if (id !== requestId.current) return;

      setResponse(data);
    } catch (err) {
      if (id !== requestId.current) return;

      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }

  function handleSaveSession() {
    if (!response) return;

    const session = {
      id: crypto.randomUUID(),
      title: response.title || "Untitled Session",
      createdAt: new Date().toISOString(),
      response,
    };

    setSessions((prev) => [session, ...prev]);
  }

  function handleLoadSession(session) {
    requestId.current += 1;

    setLoading(false);
    setError(null);
    setResponse(session.response);
    setActiveTab("flashcards");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteSession(id) {
    setSessions((prev) => prev.filter((session) => session.id !== id));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Study Assistant</h1>

        <button
          type="button"
          className="theme-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      <PromptInput input={input} setInput={setInput} onSubmit={handleSubmit} />

      {response && !loading && (
        <button
          type="button"
          className="save-session-button"
          onClick={handleSaveSession}
        >
          Save Session
        </button>
      )}

      <SavedSessions
        sessions={sessions}
        onLoad={handleLoadSession}
        onDelete={handleDeleteSession}
      />

      {response && (
        <div className="study-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={
                activeTab === tab.id ? "study-tab active" : "study-tab"
              }
              onClick={() => setActiveTab(tab.id)}
              disabled={loading}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {loading && <LoadingState />}

      {error && <ErrorState message={error} onRetry={handleSubmit} />}

      {!loading && !error && response && (
        <ResultView response={response} activeTab={activeTab} />
      )}
    </div>
  );
}

export default App;