import { validateResult, validateRefinedSection } from "./validateResult";

async function postStudyMaterial(endpoint, body, validator = validateResult) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 90000);

  try {
    const response = await fetch(`http://localhost:5000/api/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(
        data?.error || "Failed to process study material.",
      );

      error.status = response.status;
      error.cause = data;

      throw error;
    }

    if (!validator(data)) {
      const error = new Error(
        endpoint === "refine"
          ? "The AI returned invalid section content. Please try again."
          : "The AI returned invalid study material. Please try again.",
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

export function generateStudyMaterial(input) {
  return postStudyMaterial("generate", { input });
}

export function refineStudyMaterial(sectionContent, instruction, section) {
  return postStudyMaterial(
    "refine",
    {
      section,
      content: sectionContent,
      instruction,
    },
    (data) => validateRefinedSection(data, section),
  );
}