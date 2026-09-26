import { validateResult } from "./validateResult";

export async function generateStudyMaterial(input) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 90000);

  try {
    const response = await fetch("http://localhost:5000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        data?.error || "Failed to generate study material.",
      );

      error.status = response.status;
      error.cause = data;

      throw error;
    }

    if (!validateResult(data)) {
      const error = new Error(
        "The AI returned invalid study material. Please try again.",
      );

      error.status = 502;
      error.cause = data;

      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        "The request took too long. Please try again.",
      );

      timeoutError.status = 408;
      throw timeoutError;
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        "Unable to connect to the server. Please check that the backend is running.",
      );

      networkError.status = 0;
      throw networkError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}