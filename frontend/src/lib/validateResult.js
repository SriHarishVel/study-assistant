import { blockTypes } from "../types/result";

const validTypes = Object.values(blockTypes);

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

  if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
    return false;
  }

  const typeCounts = Object.fromEntries(validTypes.map((type) => [type, 0]));

  for (const block of data.blocks) {
    if (!validateBlock(block)) {
      return false;
    }

    typeCounts[block.type]++;
  }

  return validTypes.every((type) => typeCounts[type] > 0);
}

export function validateRefinedSection(data, section) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    !Array.isArray(data.blocks) ||
    data.blocks.length === 0
  ) {
    return false;
  }

  const allowedType = sectionTypes[section];

  if (!allowedType) {
    return false;
  }

  return data.blocks.every(
    (block) => block?.type === allowedType && validateBlock(block),
  );
}