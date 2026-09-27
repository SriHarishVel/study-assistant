function PromptInput({ input, setInput, onSubmit }) {
  return (
    <form
      className="panel prompt-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="label" htmlFor="study-topic">
        What do you want to study?
      </label>

      <div className="prompt-input">
        <input
          id="study-topic"
          type="text"
          className="input"
          value={input}
          maxLength={10000}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Enter a topic to start learning..."
        />

        <button type="submit" className="primary" disabled={!input.trim()}>
          Generate
        </button>
      </div>

      <p className="muted prompt-hint">
        Flashcards, notes, examples and quizzes in one place.
      </p>
    </form>
  );
}

export default PromptInput;
