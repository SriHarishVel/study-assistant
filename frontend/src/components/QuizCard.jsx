import { useState } from "react";

function QuizCard({ block, onAnswer, questionIndex }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const options = Array.isArray(block.options) ? block.options : [];
  const isCorrect = selectedAnswer === block.answer;

  function handleSubmit() {
    if (selectedAnswer === null || submitted) return;

    setSubmitted(true);
    onAnswer(questionIndex, isCorrect);
  }

  return (
    <section className="panel quiz-card">
      <div className="quiz-header">
        <span className="badge">QUICK QUIZ</span>
        <span className="muted">{options.length} options</span>
      </div>

      <h3 className="quiz-question">{block.question}</h3>

      <div className="quiz-options">
        {options.map((option, index) => {
          const selected = selectedAnswer === index;
          const correct = submitted && index === block.answer;
          const incorrect = submitted && selected && !isCorrect;

          let optionClass = "quiz-option";

          if (selected) optionClass += " selected";
          if (correct) optionClass += " correct";
          if (incorrect) optionClass += " incorrect";

          return (
            <button
              type="button"
              key={index}
              className={optionClass}
              onClick={() => {
                if (submitted) return;
                setSelectedAnswer(index);
              }}
              disabled={submitted}
            >
              <span className="quiz-option-letter">{index + 1}</span>

              <span className="quiz-option-text">{option}</span>

              {correct && <span className="quiz-option-status">Correct</span>}

              {incorrect && (
                <span className="quiz-option-status">Your answer</span>
              )}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div
          className={`notice ${isCorrect ? "success" : "error"}`}
          role="status"
        >
          <strong>{isCorrect ? "Correct!" : "Not quite."}</strong>

          <p>
            {isCorrect
              ? "You've got it right."
              : `The correct answer is ${options[block.answer]}.`}
          </p>
        </div>
      )}

      <div className="quiz-footer">
        {!submitted && (
          <button
            type="button"
            className="primary"
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
          >
            Check answer
          </button>
        )}
      </div>
    </section>
  );
}

export default QuizCard;