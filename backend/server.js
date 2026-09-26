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

const blockTypes = {
  CONCEPT: "concept",
  EXAMPLE: "example",
  FLASHCARD: "flashcard",
  QUIZ: "quiz",
};

const sectionTypes = {
  flashcards: blockTypes.FLASHCARD,
  notes: blockTypes.CONCEPT,
  examples: blockTypes.EXAMPLE,
  quiz: blockTypes.QUIZ,
};

function validateBlock(block) {
  if (
    !block ||
    typeof block !== "object" ||
    Array.isArray(block) ||
    !Object.values(blockTypes).includes(block.type)
  ) {
    return false;
  }

  if (block.type === blockTypes.CONCEPT) {
    return (
      typeof block.term === "string" &&
      !!block.term.trim() &&
      typeof block.definition === "string" &&
      !!block.definition.trim() &&
      typeof block.keyPoint === "string" &&
      !!block.keyPoint.trim()
    );
  }

  if (block.type === blockTypes.EXAMPLE) {
    return (
      typeof block.title === "string" &&
      !!block.title.trim() &&
      typeof block.content === "string" &&
      !!block.content.trim()
    );
  }

  if (block.type === blockTypes.FLASHCARD) {
    return (
      typeof block.question === "string" &&
      !!block.question.trim() &&
      typeof block.answer === "string" &&
      !!block.answer.trim()
    );
  }

  if (block.type === blockTypes.QUIZ) {
    return (
      typeof block.question === "string" &&
      !!block.question.trim() &&
      Array.isArray(block.options) &&
      block.options.length === 4 &&
      block.options.every(
        (option) => typeof option === "string" && !!option.trim(),
      ) &&
      Number.isInteger(block.answer) &&
      block.answer >= 0 &&
      block.answer < block.options.length
    );
  }

  return false;
}

function validateStudyMaterial(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.title !== "string" ||
    !data.title.trim() ||
    typeof data.summary !== "string" ||
    !data.summary.trim() ||
    !Array.isArray(data.blocks) ||
    data.blocks.length !== 16
  ) {
    return false;
  }

  const typeCounts = Object.fromEntries(
    Object.values(blockTypes).map((type) => [type, 0]),
  );

  for (const block of data.blocks) {
    if (!validateBlock(block)) {
      return false;
    }

    typeCounts[block.type]++;
  }

  return (
    typeCounts[blockTypes.FLASHCARD] === 5 &&
    typeCounts[blockTypes.CONCEPT] === 4 &&
    typeCounts[blockTypes.EXAMPLE] === 2 &&
    typeCounts[blockTypes.QUIZ] === 5
  );
}

function validateRefinedSection(data, section) {
  const allowedType = sectionTypes[section];

  if (
    !allowedType ||
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.blocks) ||
    data.blocks.length === 0
  ) {
    return false;
  }

  return data.blocks.every(
    (block) => block?.type === allowedType && validateBlock(block),
  );
}

async function generateAndValidate(prompt, validator) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error(
      "The AI service is not configured. Please try again later.",
    );
    error.status = 500;
    throw error;
  }

  const result = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  if (!result.text) {
    const error = new Error(
      "The AI returned an empty response. Please try again.",
    );
    error.status = 502;
    throw error;
  }

  let data;

  try {
    data = JSON.parse(result.text);
  } catch {
    const error = new Error(
      "The AI returned an invalid response. Please try again.",
    );
    error.status = 502;
    throw error;
  }

  if (!validator(data)) {
    const error = new Error(
      "The AI returned invalid study material. Please try again.",
    );
    error.status = 502;
    throw error;
  }

  return data;
}

function handleGeminiError(error, res) {
  console.error("Gemini error:", error);

  if (error.status === 429) {
    return res.status(429).json({
      error: "AI request limit reached. Please wait before trying again.",
    });
  }

  if (error.status === 400) {
    return res.status(400).json({
      error: "The AI could not process this request. Please try again.",
    });
  }

  if (error.status === 403) {
    return res.status(500).json({
      error: "The AI service is not authorized. Please try again later.",
    });
  }

  if (error.status === 502) {
    return res.status(502).json({
      error: error.message,
    });
  }

  if (error.status === 500 && error.message) {
    return res.status(500).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: "Unable to process study material. Please try again.",
  });
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

    const data = await generateAndValidate(prompt, validateStudyMaterial);

    return res.json(data);
  } catch (error) {
    return handleGeminiError(error, res);
  }
});

app.post("/api/refine", async (req, res) => {
  try {
    const { section, content, instruction } = req.body || {};

    if (!sectionTypes[section]) {
      return res.status(400).json({
        error: "Please select a valid section to refine.",
      });
    }

    if (!Array.isArray(content) || content.length === 0) {
      return res.status(400).json({
        error: "The selected section has no content to refine.",
      });
    }

    if (
      !content.every(
        (block) =>
          block?.type === sectionTypes[section] && validateBlock(block),
      )
    ) {
      return res.status(400).json({
        error: "The existing section content is invalid.",
      });
    }

    if (typeof instruction !== "string" || !instruction.trim()) {
      return res.status(400).json({
        error: "Please enter a refinement instruction.",
      });
    }

    if (instruction.trim().length > 2000) {
      return res.status(400).json({
        error: "Please keep your instruction under 2,000 characters.",
      });
    }

    const schemas = {
      flashcards: {
        type: "flashcard",
        question: "Short question",
        answer: "Short answer",
      },
      notes: {
        type: "concept",
        term: "Concept name",
        definition: "Short explanation",
        keyPoint: "Important takeaway",
      },
      examples: {
        type: "example",
        title: "Example title",
        content: "Short example and explanation",
      },
      quiz: {
        type: "quiz",
        question: "Question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: 0,
      },
    };

    const sectionNames = {
      flashcards: "flashcards",
      notes: "concepts",
      examples: "examples",
      quiz: "quiz questions",
    };

    const prompt = `
You are a study material refinement assistant.

The user wants to refine ONLY the ${sectionNames[section]} section.

Refine the provided content according to the user's instruction.

Return ONLY valid JSON using this exact structure:
{
  "blocks": [
    ${JSON.stringify(schemas[section])}
  ]
}

Requirements:
- Return only the ${sectionNames[section]} section.
- Every returned block must have the type "${sectionTypes[section]}".
- Follow the user's refinement instruction.
- Preserve the original topic and learning objectives.
- Preserve useful information unless the instruction asks to change it.
- Return the same number of blocks as the original content unless the instruction explicitly asks to add or remove items.
- Keep language clear, concise, and easy to understand.
- Do not invent facts that are not supported by the existing content.
- For quizzes, provide exactly 4 options and use the zero-based index of the correct answer.
- Do not include title, summary, or other section types.
- Return no Markdown fences or text outside the JSON.

Existing section content:
${JSON.stringify(content)}

User's refinement instruction:
${instruction.trim()}
`;

    const data = await generateAndValidate(prompt, (data) =>
      validateRefinedSection(data, section),
    );

    return res.json(data);
  } catch (error) {
    return handleGeminiError(error, res);
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