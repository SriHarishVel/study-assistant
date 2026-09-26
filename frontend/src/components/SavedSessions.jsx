function SavedSessions({ sessions, onLoad, onDelete, onSave }) {
  return (
    <section className="panel saved-sessions">
      <div className="saved-sessions-header">
        <h3>Saved Sessions</h3>

        <button
          type="button"
          className="primary save-session-button"
          onClick={onSave}
          disabled={!onSave}
        >
          + Save Session
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="muted">No saved sessions yet.</p>
      ) : (
        <div className="saved-session-list">
          {sessions.map((session) => (
            <div className="saved-session-card" key={session.id}>
              <button
                type="button"
                className="secondary saved-session-title"
                onClick={() => onLoad(session)}
              >
                {session.title}
              </button>

              <button
                type="button"
                className="danger saved-session-delete"
                onClick={() => onDelete(session.id)}
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