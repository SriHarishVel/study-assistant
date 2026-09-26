function LoadingState() {
  return (
    <div className="panel loading-state">
      <div className="loading-spinner"></div>

      <p className="loading-title">Generating your study material</p>

      <p className="muted">
        AI is organizing your notes, concepts, and questions...
      </p>
    </div>
  );
}

export default LoadingState;
