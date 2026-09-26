import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import FlashcardDeck from "./FlashcardDeck";
import QuizSection from "./QuizSection";
import ChartSection from "./ChartSection";

function ResultView({ response, activeTab }) {
  if (!response || !Array.isArray(response.blocks)) {
    return null;
  }

  const concepts = response.blocks.filter((block) => block.type === "concept");

  const flashcards = response.blocks.filter(
    (block) => block.type === "flashcard",
  );

  const quizzes = response.blocks.filter((block) => block.type === "quiz");

  const charts = response.blocks.filter((block) => block.type === "chart");

  return (
    <div className="result-view">
      {activeTab === "flashcards" && (
        <section className="panel study-material">
          <h3>Flashcards</h3>

          {flashcards.length > 0 ? (
            <FlashcardDeck key={response.title} blocks={flashcards} />
          ) : (
            <p className="muted">No flashcards available.</p>
          )}
        </section>
      )}

      {activeTab === "notes" && (
        <>
          <section className="panel summary-section">
            <h3>Summary</h3>

            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.summary}
            </ReactMarkdown>
          </section>

          <section className="panel study-material">
            <h3>Concepts</h3>

            {concepts.length > 0 ? (
              concepts.map((block, index) => (
                <div key={index} className="study-block">
                  <div className="concept-card">
                    <h4>{block.term}</h4>

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {block.definition}
                    </ReactMarkdown>

                    <div className="key-point">
                      <strong>Key Point:</strong>

                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {block.keyPoint}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">No concepts available.</p>
            )}
          </section>
        </>
      )}

      {activeTab === "chart" && (
        <section className="panel study-material">
          <h3>Charts</h3>

          {charts.length > 0 ? (
            charts.map((block, index) => (
              <ChartSection key={block.id || index} block={block} />
            ))
          ) : (
            <p className="muted">No charts available for this topic.</p>
          )}
        </section>
      )}

      {activeTab === "quiz" && (
        <QuizSection
          key={`${response.title}-${response.summary}`}
          quizzes={quizzes}
        />
      )}
    </div>
  );
}

export default ResultView;