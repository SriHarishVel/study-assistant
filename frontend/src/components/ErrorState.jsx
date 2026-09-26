function ErrorState({ message, onRetry }) {
  return (
    <section className="panel notice error" role="alert">
      <h3>Something went wrong</h3>
      <p>{message}</p>

      <button type="button" className="secondary" onClick={onRetry}>
        Try again
      </button>
    </section>
  );
}

export default ErrorState;