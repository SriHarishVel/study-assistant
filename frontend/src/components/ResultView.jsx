import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import FlashcardDeck from "./FlashcardDeck";
import QuizSection from "./QuizSection";

function ResultView({ response, activeTab }) {
  if (!response || !Array.isArray(response.blocks)) {
    return null;
  }

  const concepts = response.blocks.filter((block) => block.type === "concept");

  const examples = response.blocks.filter((block) => block.type === "example");

  const flashcards = response.blocks.filter(
    (block) => block.type === "flashcard",
  );

  const quizzes = response.blocks.filter((block) => block.type === "quiz");

  return (
    <div className="result-view">
      <h2>{response.title}</h2>

      {activeTab === "flashcards" && (
        <section className="study-material">
          <h3>Flashcards</h3>

          {flashcards.length > 0 ? (
            <FlashcardDeck key={response.title} blocks={flashcards} />
          ) : (
            <p>No flashcards available.</p>
          )}
        </section>
      )}

      {activeTab === "notes" && (
        <>
          <section className="summary-section">
            <h3>Summary</h3>

            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {response.summary}
            </ReactMarkdown>
          </section>

          <section className="study-material">
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
              <p>No concepts available.</p>
            )}
          </section>
        </>
      )}

      {activeTab === "examples" && (
        <section className="study-material">
          <h3>Examples</h3>

          {examples.length > 0 ? (
            examples.map((block, index) => (
              <div key={index} className="example-card">
                <h4>{block.title}</h4>

                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {block.content}
                </ReactMarkdown>
              </div>
            ))
          ) : (
            <p>No examples available.</p>
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
