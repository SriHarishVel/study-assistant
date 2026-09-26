import { useState, useRef, useEffect } from "react";

import { generateStudyMaterial, refineStudyMaterial } from "./lib/api";

import PromptInput from "./components/PromptInput";
import ResultView from "./components/ResultView";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import SavedSessions from "./components/SavedSessions";
import RefinementInput from "./components/RefinementInput";

const STORAGE_KEY = "saved-sessions";

const tabs = [
  { id: "flashcards", label: "Flashcards" },
  { id: "notes", label: "Study Notes" },
  { id: "examples", label: "Examples" },
  { id: "quiz", label: "Quiz" },
];

const sectionTypes = {
  flashcards: ["flashcard"],
  notes: ["concept", "note"],
  examples: ["example"],
  quiz: ["quiz"],
};

function getSavedSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getSectionContent(material, tab) {
  const types = sectionTypes[tab] || [];

  return material.blocks.filter((block) => types.includes(block.type));
}

function mergeRefinedSection(material, refinedBlocks, tab) {
  const types = sectionTypes[tab] || [];

  const originalBlocks = material.blocks;

  const firstIndex = originalBlocks.findIndex((block) =>
    types.includes(block.type),
  );

  const updatedBlocks = originalBlocks.filter(
    (block) => !types.includes(block.type),
  );

  const insertIndex =
    firstIndex < 0
      ? updatedBlocks.length
      : originalBlocks
          .slice(0, firstIndex)
          .filter((block) => !types.includes(block.type)).length;

  updatedBlocks.splice(insertIndex, 0, ...refinedBlocks);

  return {
    ...material,
    blocks: updatedBlocks,
  };
}

function App() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [refining, setRefining] = useState(false);
  const [refinementError, setRefinementError] = useState(null);

  const [activeTab, setActiveTab] = useState("flashcards");
  const [darkMode, setDarkMode] = useState(true);
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

  async function handleSubmit() {
    if (!input.trim() || loading || refining) return;

    const id = ++requestId.current;

    setLoading(true);
    setRefining(false);
    setError(null);
    setRefinementError(null);
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

  async function handleRefine(instruction) {
    if (!response || !instruction.trim() || refining || loading) return;

    const id = ++requestId.current;
    const selectedTab = activeTab;

    const sectionContent = getSectionContent(response, selectedTab);

    if (sectionContent.length === 0) {
      setRefinementError("No content found in this section to refine.");
      return;
    }

    setRefining(true);
    setRefinementError(null);
    setError(null);

    try {
      const refinedSection = await refineStudyMaterial(
        sectionContent,
        instruction.trim(),
        selectedTab,
      );

      if (id !== requestId.current) return;

      if (!refinedSection || !Array.isArray(refinedSection.blocks)) {
        throw new Error(
          "The AI returned an invalid section. Please try again.",
        );
      }

      const allowedTypes = sectionTypes[selectedTab] || [];

      const validBlocks = refinedSection.blocks.every((block) =>
        allowedTypes.includes(block.type),
      );

      if (refinedSection.blocks.length === 0 || !validBlocks) {
        throw new Error("The AI returned invalid content for this tab.");
      }

      setResponse((prev) => {
        if (!prev) return prev;

        return mergeRefinedSection(prev, refinedSection.blocks, selectedTab);
      });

      setActiveTab(selectedTab);
    } catch (err) {
      if (id !== requestId.current) return;

      setRefinementError(
        err.message || "Unable to refine this section. Please try again.",
      );
    } finally {
      if (id === requestId.current) {
        setRefining(false);
      }
    }
  }

  function handleSaveSession() {
    if (!response || loading) return;

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
    setRefining(false);
    setError(null);
    setRefinementError(null);
    setResponse(session.response);
    setActiveTab("flashcards");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
          className="secondary theme-toggle"
          onClick={() => setDarkMode((prev) => !prev)}
        >
          {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </header>

      <PromptInput input={input} setInput={setInput} onSubmit={handleSubmit} />

      <SavedSessions
        sessions={sessions}
        onLoad={handleLoadSession}
        onDelete={handleDeleteSession}
        onSave={handleSaveSession}
        canSave={Boolean(response && !loading)}
      />

      {response && (
        <nav className="study-tabs" aria-label="Study material sections">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={
                activeTab === tab.id ? "study-tab active" : "study-tab"
              }
              onClick={() => {
                setActiveTab(tab.id);
                setRefinementError(null);
              }}
              disabled={loading || refining}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}

      {loading && <LoadingState />}

      {error && <ErrorState message={error} onRetry={handleSubmit} />}

      {!loading && !error && response && (
        <div className="study-workspace">
          <main className="study-main">
            <ResultView response={response} activeTab={activeTab} />
          </main>

          <aside className="study-sidebar">
            <div className="refinement-sticky">
              <RefinementInput
                onRefine={handleRefine}
                loading={refining}
                error={refinementError}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;