import { validateResult, validateRefinedSection } from "./validateResult";

const API_URL = "https://study-assistant-xdc.onrender.com/api";

async function postStudyMaterial(
  endpoint,
  body,
  validator = validateResult,
  signal,
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000);

  const abortRequest = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortRequest, { once: true });
    }
  }

  try {
    const response = await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);

      const error = new Error(
        data?.error || "Failed to process study material.",
      );

      error.status = response.status;
      error.cause = data;

      throw error;
    }

    if (endpoint === "generate") {
      if (!response.body) {
        throw new Error("The server did not return a response stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let result = null;

      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || "";

        for (const eventText of events) {
          const lines = eventText.split(/\r?\n/);

          let eventName = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              eventData += line.slice(5).trim();
            }
          }

          if (!eventName || !eventData) continue;

          let parsedData;

          try {
            parsedData = JSON.parse(eventData);
          } catch {
            throw new Error("The server returned invalid stream data.");
          }

          if (eventName === "error") {
            throw new Error(
              parsedData.error || "Failed to generate study material.",
            );
          }

          if (eventName === "complete") {
            result = parsedData;
          }
        }
      }

      buffer += decoder.decode();

      if (buffer.trim()) {
        const lines = buffer.split(/\r?\n/);

        let eventName = "";
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            eventData += line.slice(5).trim();
          }
        }

        if (eventName === "error" && eventData) {
          const parsedData = JSON.parse(eventData);

          throw new Error(
            parsedData.error || "Failed to generate study material.",
          );
        }

        if (eventName === "complete" && eventData) {
          result = JSON.parse(eventData);
        }
      }

      if (!result) {
        throw new Error(
          "The server ended the stream without completing the response.",
        );
      }

      if (!validator(result)) {
        const error = new Error(
          "The AI returned invalid study material. Please try again.",
        );

        error.status = 502;
        error.cause = result;

        throw error;
      }

      return result;
    }

    const data = await response.json().catch(() => null);

    if (!validator(data)) {
      const error = new Error(
        "The AI returned invalid section content. Please try again.",
      );

      error.status = 502;
      error.cause = data;

      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      if (signal?.aborted) {
        throw error;
      }

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

    if (signal) {
      signal.removeEventListener("abort", abortRequest);
    }
  }
}

export function generateStudyMaterial(input, signal) {
  return postStudyMaterial("generate", { input }, validateResult, signal);
}

export function refineStudyMaterial(
  sectionContent,
  instruction,
  section,
  signal,
) {
  return postStudyMaterial(
    "refine",
    {
      section,
      content: sectionContent,
      instruction,
    },
    (data) => validateRefinedSection(data, section),
    signal,
  );
}
