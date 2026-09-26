const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function validateStudyMaterial(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.title !== "string" ||
    !data.title.trim() ||
    typeof data.summary !== "string" ||
    !Array.isArray(data.blocks)
  ) {
    return false;
  }

  const flashcards = data.blocks.filter((block) => block?.type === "flashcard");

  const concepts = data.blocks.filter((block) => block?.type === "concept");

  const examples = data.blocks.filter((block) => block?.type === "example");

  const quizzes = data.blocks.filter((block) => block?.type === "quiz");

  if (
    data.blocks.length !== 16 ||
    flashcards.length !== 5 ||
    concepts.length !== 4 ||
    examples.length !== 2 ||
    quizzes.length !== 5
  ) {
    return false;
  }

  const validFlashcards = flashcards.every(
    (block) =>
      typeof block.question === "string" &&
      block.question.trim().length > 0 &&
      typeof block.answer === "string" &&
      block.answer.trim().length > 0,
  );

  const validConcepts = concepts.every(
    (block) =>
      typeof block.term === "string" &&
      block.term.trim().length > 0 &&
      typeof block.definition === "string" &&
      block.definition.trim().length > 0 &&
      typeof block.keyPoint === "string" &&
      block.keyPoint.trim().length > 0,
  );

  const validExamples = examples.every(
    (block) =>
      typeof block.title === "string" &&
      block.title.trim().length > 0 &&
      typeof block.content === "string" &&
      block.content.trim().length > 0,
  );

  const validQuizzes = quizzes.every(
    (block) =>
      typeof block.question === "string" &&
      block.question.trim().length > 0 &&
      Array.isArray(block.options) &&
      block.options.length === 4 &&
      block.options.every(
        (option) => typeof option === "string" && option.trim().length > 0,
      ) &&
      Number.isInteger(block.answer) &&
      block.answer >= 0 &&
      block.answer <= 3,
  );

  return validFlashcards && validConcepts && validExamples && validQuizzes;
}

app.post("/api/generate", async (req, res) => {
  try {
    const { input } = req.body || {};

    if (typeof input !== "string" || !input.trim()) {
      return res.status(400).json({
        error: "Please enter some study material.",
      });
    }

    if (input.trim().length > 10000) {
      return res.status(400).json({
        error: "Please keep your study material under 10,000 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "The AI service is not configured. Please try again later.",
      });
    }

    const prompt = `
You are a concise study assistant.

Generate study material based only on the user's provided study material.

Return ONLY valid JSON using this exact structure:
{
  "title": "Topic title",
  "summary": "A concise summary",
  "blocks": [
    {
      "type": "flashcard",
      "question": "Short question",
      "answer": "Short answer"
    },
    {
      "type": "concept",
      "term": "Concept name",
      "definition": "Short explanation",
      "keyPoint": "Important takeaway"
    },
    {
      "type": "example",
      "title": "Example title",
      "content": "Short example and explanation"
    },
    {
      "type": "quiz",
      "question": "Question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0
    }
  ]
}

Requirements:
- Generate exactly 5 flashcards.
- Generate exactly 4 concepts.
- Generate exactly 2 examples.
- Generate exactly 5 quiz questions.
- Keep the summary under 60 words.
- Keep each flashcard answer under 30 words.
- Keep each concept definition under 40 words.
- Keep each keyPoint under 20 words.
- Keep each example under 80 words.
- Each quiz must have exactly 4 short options.
- The quiz answer must be the zero-based index of the correct option.
- Use clear and simple language.
- Avoid repeated questions and unnecessary explanations.
- Include short code snippets only when relevant.
- Do not invent facts that are not supported by the provided material.
- Include all four block types in the blocks array.
- Return no Markdown fences or text outside the JSON.

User's study material:
${input.trim()}
`;

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!result.text) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again.",
      });
    }

    let data;

    try {
      data = JSON.parse(result.text);
    } catch {
      return res.status(502).json({
        error: "The AI returned an invalid response. Please try again.",
      });
    }

    if (!validateStudyMaterial(data)) {
      return res.status(502).json({
        error: "The AI returned incomplete study material. Please try again.",
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("Gemini error:", error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "AI request limit reached. Please wait before trying again.",
      });
    }

    if (error.status === 400) {
      return res.status(400).json({
        error:
          "The AI could not process this request. Please try another topic.",
      });
    }

    if (error.status === 403) {
      return res.status(500).json({
        error: "The AI service is not authorized. Please try again later.",
      });
    }

    return res.status(500).json({
      error: "Unable to generate study material. Please try again.",
    });
  }
});

app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      error: "The request is too large. Please shorten your study material.",
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "Invalid request format.",
    });
  }

  console.error("Server error:", err);

  return res.status(500).json({
    error: "An unexpected server error occurred.",
  });
});

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});