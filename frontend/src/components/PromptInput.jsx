function PromptInput({ input, setInput, onSubmit }) {
  return (
    <form
      className="prompt-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="prompt-label" htmlFor="study-topic">
        What do you want to study?
      </label>

      <div className="prompt-input">
        <input
          id="study-topic"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter a topic to start learning..."
        />

        <button type="submit" disabled={!input.trim()}>
          Generate <span>→</span>
        </button>
      </div>

      <p className="prompt-hint">
        Flashcards, notes, examples and quizzes in one place.
      </p>
    </form>
  );
}

export default PromptInput;