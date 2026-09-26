import { useState } from "react";

function RefinementInput({ onRefine, loading, error }) {
  const [instruction, setInstruction] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!instruction.trim() || loading) return;

    onRefine(instruction.trim());
    setInstruction("");
  }

  return (
    <section className="panel refinement-section">
      <h3>Refine Your Study Material</h3>

      <p className="muted">
        Want simpler notes, more examples, or different questions? Tell AI what
        to change.
      </p>

      <form onSubmit={handleSubmit} className="refinement-form">
        <textarea
          className="input"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="E.g. Make the notes simpler and add real-world examples..."
          rows={3}
          maxLength={2000}
          disabled={loading}
          required
        />

        <div className="form-actions">
          <span className="muted">{instruction.length}/2000</span>

          <button
            type="submit"
            className="primary"
            disabled={loading || !instruction.trim()}
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Refining...
              </>
            ) : (
              "Refine"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

export default RefinementInput;
