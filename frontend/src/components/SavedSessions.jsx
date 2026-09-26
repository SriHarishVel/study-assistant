function SavedSessions({ sessions, onLoad, onDelete }) {
  return (
    <section className="saved-sessions">
      <h3>Saved Sessions</h3>

      {sessions.length === 0 ? (
        <p className="saved-empty">No saved sessions yet.</p>
      ) : (
        <div className="saved-session-list">
          {sessions.map((session) => (
            <div className="saved-session-card" key={session.id}>
              <button
                type="button"
                className="saved-session-title"
                onClick={() => onLoad(session)}
              >
                {session.title}
              </button>

              <button
                type="button"
                className="saved-session-delete"
                onClick={() => onDelete(session.id)}
                aria-label={`Delete ${session.title}`}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default SavedSessions;