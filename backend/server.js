const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();

const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(express.json({ limit: "100kb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const blockTypes = {
  CONCEPT: "concept",
  CHART: "chart",
  FLASHCARD: "flashcard",
  QUIZ: "quiz",
};

const sectionTypes = {
  flashcards: blockTypes.FLASHCARD,
  notes: blockTypes.CONCEPT,
  chart: blockTypes.CHART,
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

  if (block.type === blockTypes.CHART) {
    if (
      typeof block.title !== "string" ||
      !block.title.trim() ||
      typeof block.description !== "string" ||
      !block.description.trim()
    ) {
      return false;
    }

    if (block.chartType === "flowchart") {
      if (
        !Array.isArray(block.nodes) ||
        block.nodes.length < 2 ||
        !block.nodes.every(
          (node) =>
            node &&
            typeof node.id === "string" &&
            !!node.id.trim() &&
            typeof node.label === "string" &&
            !!node.label.trim(),
        ) ||
        new Set(block.nodes.map((node) => node.id)).size !==
          block.nodes.length ||
        !Array.isArray(block.connections) ||
        block.connections.length < 1
      ) {
        return false;
      }

      const nodeIds = new Set(block.nodes.map((node) => node.id));

      return block.connections.every(
        (connection) =>
          connection &&
          typeof connection.from === "string" &&
          typeof connection.to === "string" &&
          nodeIds.has(connection.from) &&
          nodeIds.has(connection.to) &&
          (connection.label === undefined ||
            typeof connection.label === "string"),
      );
    }

    return (
      ["bar", "line", "pie"].includes(block.chartType) &&
      Array.isArray(block.data) &&
      block.data.length >= 2 &&
      block.data.every(
        (item) =>
          item &&
          typeof item.label === "string" &&
          !!item.label.trim() &&
          typeof item.value === "number" &&
          Number.isFinite(item.value),
      )
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
    data.blocks.length < 14 ||
    data.blocks.length > 16
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
    typeCounts[blockTypes.CHART] >= 0 &&
    typeCounts[blockTypes.CHART] <= 2 &&
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
    !Array.isArray(data.blocks)
  ) {
    return false;
  }

  if (section === "chart") {
    if (data.blocks.length > 2) {
      return false;
    }
  } else if (data.blocks.length === 0) {
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

async function streamAndValidate(prompt, validator, res) {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error(
      "The AI service is not configured. Please try again later.",
    );
    error.status = 500;
    throw error;
  }

  const stream = await ai.models.generateContentStream({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  let text = "";

  for await (const chunk of stream) {
    if (res.destroyed) {
      return null;
    }

    if (chunk.text) {
      text += chunk.text;

      res.write(`event: chunk\ndata: ${JSON.stringify(chunk.text)}\n\n`);
    }
  }

  if (!text.trim()) {
    const error = new Error(
      "The AI returned an empty response. Please try again.",
    );
    error.status = 502;
    throw error;
  }

  let data;

  try {
    data = JSON.parse(text);
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

  let status = 500;
  let message = "Unable to process study material. Please try again.";

  if (error.status === 429) {
    status = 429;
    message = "AI request limit reached. Please wait before trying again.";
  } else if (error.status === 400) {
    status = 400;
    message = "The AI could not process this request. Please try again.";
  } else if (error.status === 403) {
    message = "The AI service is not authorized. Please try again later.";
  } else if (error.status === 502) {
    status = 502;
    message = error.message;
  } else if (error.status === 500 && error.message) {
    message = error.message;
  }

  if (res.headersSent) {
    if (!res.destroyed && !res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ error: message })}\n\n`,
      );
      res.end();
    }

    return;
  }

  return res.status(status).json({ error: message });
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

Generate study material based only on the user's
provided study material.

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
      "type": "chart",
      "title": "Visualization title",
      "description": "Brief explanation",
      "chartType": "AI-selected chart type",
      "data": [
        {
          "label": "Category",
          "value": 10
        }
      ],
      "nodes": [
        {
          "id": "node1",
          "label": "First step or concept"
        },
        {
          "id": "node2",
          "label": "Second step or concept"
        }
      ],
      "connections": [
        {
          "from": "node1",
          "to": "node2",
          "label": "Optional relationship"
        }
      ]
    },
    {
      "type": "quiz",
      "question": "Question",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": 0
    }
  ]
}

The chart structure illustrates available fields.
It is not a fixed chart type or a requirement
to include every field.

For numerical charts, return "data" and omit
"nodes" and "connections".

For flowcharts, return "nodes" and "connections"
and omit "data".


GENERAL REQUIREMENTS:

- Generate exactly 5 flashcards.
- Generate exactly 4 concepts.
- Generate exactly 5 quiz questions.
- Generate 0 to 2 chart blocks.
- Include a chart block only when it provides meaningful educational value.
- Do not generate charts simply to fill space.
- If no useful visualization exists, omit chart blocks entirely.
- The blocks array must contain only the generated flashcards, concepts, charts, and quizzes.
- Keep the summary under 60 words.
- Keep each flashcard answer under 30 words.
- Keep each concept definition under 40 words.
- Keep each keyPoint under 20 words.

VISUALIZATION SELECTION:

For each chart, independently select the most
appropriate chart type based on the actual
educational content and available information.

Supported chart types:

- "bar"
- "line"
- "pie"
- "flowchart"

The AI must decide which chart type to use.

Do not default to flowchart.
Do not default to any particular chart type.
Do not force the same chart type for both charts.
Do not force different chart types merely for variety.

Do not create a numerical chart without meaningful
numerical information.

Do not create a flowchart when a numerical chart
communicates the content more accurately.

Do not create charts merely to fill space.
Do not invent numerical values, statistics,
percentages, measurements, or facts.

NUMERICAL CHARTS:

Use "bar" for meaningful numerical comparisons
across categories.

Use "line" for actual trends or changes over
an ordered sequence, such as time.

Use "pie" for meaningful proportions or
distributions representing parts of a whole.

For numerical charts:

- Use only numerical values explicitly supported
  by the user's study material.
- Every numerical chart must contain at least
  2 data points.
- Every data point must have a non-empty string
  label and a finite numeric value.
- Return a "data" array.
- Do not include "nodes" or "connections".
- Do not invent, estimate, assume, or fabricate
  numerical values.
- Do not convert conceptual steps into arbitrary
  numbers to create a numerical chart.
- Do not create misleading or unsupported
  numerical comparisons.
- Never generate numerical charts using estimated, invented, or unsupported values. Only create numerical charts when reliable numerical data with a clear unit and source is provided in the study material. Otherwise, generate a meaningful flowchart if appropriate, or return an empty chart array.

FLOWCHARTS:

Use "flowchart" when processes, sequences,
architectures, relationships, or operational
steps are best represented visually.

Examples include:

- Program execution and algorithms.
- Workflows and decision processes.
- System architecture and component relationships.
- Data flow and operational pipelines.
- Relationships between concepts when explicitly
  supported by the study material.

For flowcharts:

- Return "chartType": "flowchart".
- Include "nodes" and "connections".
- Do not include "data".
- Every node must have a unique string ID.
- Every node must have a concise descriptive label.
- Every connection must reference existing node IDs
  using "from" and "to".
- Connection labels are optional.
- Include at least 2 nodes and 1 connection.
- Represent only supported steps and relationships.
- Preserve the actual order of steps when applicable.
- Do not invent unsupported steps, decisions,
  relationships, or dependencies.
- Keep flowcharts simple and easy to understand.
- Avoid unnecessary nodes and complicated diagrams.

CHART QUALITY REQUIREMENTS:

- A chart must communicate meaningful information that is
  difficult to understand as ordinary text alone.
- Do not create charts for simple definitions, word meanings,
  term breakdowns, or isolated concepts.
- Do not split a single term into multiple nodes just to
  create a flowchart.
- Do not repeat the same concept in multiple nodes.
- Do not create artificial relationships between unrelated
  concepts.
- Do not create a chart if a short paragraph or bullet list
  explains the information equally well.
- Prefer meaningful comparisons, actual trends, proportions,
  system architectures, algorithms, and multi-step processes
  when supported by the source material.
- If no useful visualization exists, return no chart.

CHART CONTENT AND ACCURACY:

- Both charts must be educationally useful.
- Prefer different perspectives when the source
  material supports them.
- Do not force a second chart type if the same
  visualization is genuinely more appropriate.
- Do not force a flowchart as a fallback for
  missing numerical data.
- If numerical data is insufficient, use a
  flowchart only when the source contains a
  meaningful process or relationship.
- If no meaningful visualization is possible,
  represent the most useful supported concepts
  or relationships without inventing information.
- Choose the chart type based on the content,
  not on the example JSON structure.

QUIZ REQUIREMENTS:

- Each quiz must have exactly 4 short options.
- The answer must be the zero-based index
  of the correct option.
- The correct answer must match one of
  the provided options.

GENERAL CONTENT:

- Use clear and simple language.
- Avoid repeated questions and unnecessary explanations.
- Include short code snippets only when relevant.
- Do not invent facts that are not supported
  by the provided material.
- Include flashcard, concept, and quiz blocks.
- Include chart blocks only when meaningful visualizations
  are supported by the study material.
- Return no Markdown fences or text outside JSON.

User's study material:
${input.trim()}
`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const data = await streamAndValidate(prompt, validateStudyMaterial, res);

      if (data === null || res.destroyed) {
        return;
      }

      res.write(`event: complete\ndata: ${JSON.stringify(data)}\n\n`);

      res.end();
    } catch (error) {
      handleGeminiError(error, res);
    }
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

    if ( !Array.isArray(content) || (content.length === 0 && section !== "chart") ) {
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
      chart: {
        type: "chart",
        chartType: "bar | line | pie | flowchart",
        title: "Visualization title",
        description: "Brief explanation",
        data: [
          {
            label: "Category",
            value: 10,
          },
        ],
        nodes: [
          {
            id: "node1",
            label: "First step or concept",
          },
          {
            id: "node2",
            label: "Second step or concept",
          },
        ],
        connections: [
          {
            from: "node1",
            to: "node2",
            label: "",
          },
        ],
      },
      quiz: {
        type: "quiz",
        question: "Question",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: 0,
      },
    };

    const schema = schemas[section];

    const prompt = `
You are an AI study assistant for Flam.

Your task is to refine the user's existing study material based on their instructions.

Return ONLY valid JSON with this exact structure:

{
  "blocks": [
    ${JSON.stringify(schema, null, 2)}
  ]
}

The example above illustrates the structure of a single block. Return an array of blocks, not an array containing the example as a string.

General rules:

1. Follow the user's refinement instructions carefully.
2. Preserve correct information from the existing study material.
3. Improve clarity, accuracy, organization, and educational value.
4. Do not introduce irrelevant information.
5. Return only blocks relevant to the requested section.
6. Every returned block must use the exact schema for the selected section.
7. Do not return a title, summary, or any additional properties outside the blocks array.
8. Do not include Markdown fences or additional text.
9. Return valid JSON that can be parsed directly.

Section-specific rules:

For flashcards:
- Return only flashcard blocks.
- Each block must contain type, question, and answer.
- Keep questions clear and answers concise.

For notes:
- Return only concept blocks.
- Each block must contain type, term, definition, and keyPoint.
- Explain concepts clearly and accurately.

For quizzes:
- Return only quiz blocks.
- Each block must contain type, question, options, and answer.
- Provide exactly four options.
- The answer must be a zero-based integer from 0 to 3 indicating the correct option.
- Ensure the correct answer matches the corresponding option.
- Do not use correctAnswer or explanation fields.

For charts:
- Return zero to two chart blocks.
- Charts are optional.
- Return an empty blocks array if no meaningful visualization is useful.
- Never create charts just to fill space or meet a minimum count.
- Choose the chart type based on the subject and available information.

Supported chart types:

- bar: Compare meaningful numerical categories.
- line: Show meaningful numerical trends over time or ordered intervals.
- pie: Show meaningful proportions that add up to a whole.
- flowchart: Explain processes, workflows, sequences, or relationships.

Numerical chart rules:

1. Use bar, line, and pie charts only when meaningful numerical data exists.
2. Never invent statistics, percentages, measurements, or numerical data.
3. Do not turn ordinary definitions or paragraphs into numerical charts.
4. Numerical chart data must use objects containing label and value.
5. Each numerical chart must contain at least two data items.
6. Every value must be a finite number.
7. Do not use name instead of label.
8. Do not include nodes or connections in numerical charts.
9. Never generate numerical charts using estimated, invented, or unsupported values. Only create numerical charts when reliable numerical data with a clear unit and source is provided in the study material. Otherwise, generate a meaningful flowchart if appropriate, or return an empty chart array.

Flowchart rules:

1. Use flowcharts for meaningful processes, workflows, sequences, or relationships.
2. Each flowchart must contain at least two meaningful nodes.
3. Each node must have a unique id and a meaningful label.
4. Each connection must reference existing node IDs using from and to.
5. Include a label for a connection only when it adds useful information.
6. Do not create duplicate or meaningless nodes.
7. Do not include numerical chart data in flowcharts.
8. Organize nodes and connections to represent the actual process or relationship.
9. Do not repeat the same concept unnecessarily.

Chart output structures:

Numerical chart:

{
  "type": "chart",
  "chartType": "bar",
  "title": "Chart title",
  "description": "Chart description",
  "data": [
    {
      "label": "Category A",
      "value": 10
    },
    {
      "label": "Category B",
      "value": 20
    }
  ]
}

Flowchart:

{
  "type": "chart",
  "chartType": "flowchart",
  "title": "Chart title",
  "description": "Chart description",
  "nodes": [
    {
      "id": "node1",
      "label": "First step"
    },
    {
      "id": "node2",
      "label": "Second step"
    }
  ],
  "connections": [
    {
      "from": "node1",
      "to": "node2",
      "label": ""
    }
  ]
}

Do not include fields that are irrelevant to the selected chart type.

Existing study material:
${JSON.stringify(content)}

Selected section:
${section}

User instructions:
${instruction.trim()}

Return only valid JSON in this structure:

{
  "blocks": []
}

The blocks array must contain only valid blocks for the selected section.

Do not include Markdown fences, explanations, or additional text.
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
