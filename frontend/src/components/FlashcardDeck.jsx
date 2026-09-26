import { useState } from "react";

function FlashcardDeck({ blocks = [] }) {
  const cards = Array.isArray(blocks) ? blocks : [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (cards.length === 0) {
    return <p className="muted">No flashcards available.</p>;
  }

  const currentCard = cards[currentIndex];

  function nextCard() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      setShowAnswer(false);
    }
  }

  function previousCard() {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
      setShowAnswer(false);
    }
  }

  return (
    <div className="flashcard-deck">
      <div className="flashcard-progress">
        <span>
          Card {currentIndex + 1} of {cards.length}
        </span>

        <div className="flashcard-progress-track">
          <div
            className="flashcard-progress-fill"
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="flashcard">
        <span className="flashcard-label">
          {showAnswer ? "ANSWER" : "QUESTION"}
        </span>

        <p className="flashcard-content">
          {showAnswer ? currentCard.answer : currentCard.question}
        </p>

        <button
          type="button"
          className="secondary"
          onClick={() => setShowAnswer((previous) => !previous)}
        >
          {showAnswer ? "Show Question" : "Reveal Answer"}
        </button>
      </div>

      <div className="flashcard-controls">
        <button
          type="button"
          className="secondary"
          onClick={previousCard}
          disabled={currentIndex === 0}
        >
          Previous
        </button>

        <button
          type="button"
          className="secondary"
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
        >
          Next Question
        </button>
      </div>
    </div>
  );
}

export default FlashcardDeck;