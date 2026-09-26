import { blockTypes } from "../types/result";

const validTypes = Object.values(blockTypes);

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
    !validTypes.includes(block.type)
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

export function validateResult(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  if (
    typeof data.title !== "string" ||
    !data.title.trim() ||
    typeof data.summary !== "string" ||
    !data.summary.trim()
  ) {
    return false;
  }

  if (
    !Array.isArray(data.blocks) ||
    data.blocks.length < 14 ||
    data.blocks.length > 16
  ) {
    return false;
  }

  const typeCounts = Object.fromEntries(validTypes.map((type) => [type, 0]));

  for (const block of data.blocks) {
    if (!validateBlock(block)) {
      return false;
    }

    typeCounts[block.type]++;
  }

  return (
    typeCounts[blockTypes.FLASHCARD] === 5 &&
    typeCounts[blockTypes.CONCEPT] === 4 &&
    typeCounts[blockTypes.CHART] <= 2 &&
    typeCounts[blockTypes.QUIZ] === 5
  );
}

export function validateRefinedSection(data, section) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.blocks)
  ) {
    return false;
  }

  const allowedType = sectionTypes[section];

  if (!allowedType) {
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