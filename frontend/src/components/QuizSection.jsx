import { useState } from "react";
import QuizCard from "./QuizCard";

function QuizSection({ quizzes = [] }) {
  const [quizResults, setQuizResults] = useState({});
  const [resetVersion, setResetVersion] = useState(0);
  const [wrongQuestionIndices, setWrongQuestionIndices] = useState(null);

  const questions = Array.isArray(quizzes) ? quizzes : [];

  const displayedQuestions =
    wrongQuestionIndices === null
      ? questions.map((block, index) => ({
          block,
          originalIndex: index,
        }))
      : wrongQuestionIndices
          .map((index) => ({
            block: questions[index],
            originalIndex: index,
          }))
          .filter(({ block }) => block);

  const answeredCount = Object.keys(quizResults).length;

  const correctCount = Object.values(quizResults).filter(
    (correct) => correct === true,
  ).length;

  const quizCompleted =
    displayedQuestions.length > 0 &&
    answeredCount === displayedQuestions.length;

  const incorrectQuestions = displayedQuestions
    .filter(({ originalIndex }) => quizResults[originalIndex] === false)
    .map(({ originalIndex }) => originalIndex);

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

  function handleRetakeWrong() {
    if (incorrectQuestions.length === 0) return;

    setWrongQuestionIndices([...incorrectQuestions]);
    setQuizResults({});
    setResetVersion((previous) => previous + 1);
  }

  function handleRetakeAll() {
    setWrongQuestionIndices(null);
    setQuizResults({});
    setResetVersion((previous) => previous + 1);
  }

  if (questions.length === 0) {
    return (
      <section className="panel study-material">
        <h3>Practice Quiz</h3>
        <p className="muted">No quiz questions available.</p>
      </section>
    );
  }

  return (
    <section className="panel study-material">
      <h3>
        {wrongQuestionIndices === null
          ? "Practice Quiz"
          : "Retake Wrong Answers"}
      </h3>

      <div className="quiz-progress">
        <p>
          Questions answered: {answeredCount} / {displayedQuestions.length}
        </p>

        <p>
          Correct answers: {correctCount} / {answeredCount}
        </p>
      </div>

      {quizCompleted && (
        <div className="notice success" role="status">
          <h3>
            {incorrectQuestions.length === 0
              ? "All answers correct!"
              : "Quiz completed!"}
          </h3>

          <p>
            You scored {correctCount} out of {displayedQuestions.length}.
          </p>

          <p>
            {Math.round((correctCount / displayedQuestions.length) * 100)}%
            correct
          </p>

          {incorrectQuestions.length > 0 && (
            <button
              type="button"
              className="secondary"
              onClick={handleRetakeWrong}
            >
              Retake wrong answers ({incorrectQuestions.length})
            </button>
          )}

          <button type="button" className="secondary" onClick={handleRetakeAll}>
            Retake full quiz
          </button>
        </div>
      )}

      {displayedQuestions.map(({ block, originalIndex }) => (
        <QuizCard
          key={`${resetVersion}-${originalIndex}`}
          block={block}
          questionIndex={originalIndex}
          onAnswer={handleAnswer}
        />
      ))}
    </section>
  );
}

export default QuizSection;