import { useState } from "react";
import QuizCard from "./QuizCard";

function QuizSection({ quizzes }) {
  const [quizResults, setQuizResults] = useState({});
  const [resetVersion, setResetVersion] = useState(0);

  const answeredCount = Object.keys(quizResults).length;

  const correctCount = Object.values(quizResults).filter(
    (correct) => correct === true,
  ).length;

  const quizCompleted = quizzes.length > 0 && answeredCount === quizzes.length;

  function handleAnswer(index, isCorrect) {
    setQuizResults((previous) => {
      const updated = { ...previous };

      if (isCorrect === null) {
        delete updated[index];
      } else {
        updated[index] = isCorrect;
      }

      return updated;
    });
  }

  function handleRetake() {
    setQuizResults({});
    setResetVersion((previous) => previous + 1);
  }

  return (
    <section className="study-material">
      <h3>Practice Quiz</h3>

      {quizzes.length > 0 ? (
        <>
          <div className="quiz-progress">
            <p>
              Questions answered: {answeredCount} / {quizzes.length}
            </p>

            <p>
              Correct answers: {correctCount} / {answeredCount}
            </p>
          </div>

          {quizCompleted && (
            <div className="quiz-feedback success" role="status">
              <h3>Quiz completed!</h3>

              <p>
                You scored {correctCount} out of {quizzes.length}.
              </p>

              <p>
                {Math.round((correctCount / quizzes.length) * 100)}% correct
              </p>

              <button
                type="button"
                className="quiz-action"
                onClick={handleRetake}
              >
                Retake quiz
              </button>
            </div>
          )}

          {quizzes.map((block, index) => (
            <QuizCard
              key={`${resetVersion}-${index}`}
              block={block}
              questionIndex={index}
              onAnswer={handleAnswer}
            />
          ))}
        </>
      ) : (
        <p>No quiz questions available.</p>
      )}
    </section>
  );
}

export default QuizSection;