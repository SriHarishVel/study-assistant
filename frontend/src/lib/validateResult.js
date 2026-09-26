import { blockTypes } from "../types/result";

export function validateResult(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  if (typeof data.title !== "string" || !data.title.trim()) {
    return false;
  }

  if (typeof data.summary !== "string" || !data.summary.trim()) {
    return false;
  }

  if (!Array.isArray(data.blocks) || data.blocks.length === 0) {
    return false;
  }

  const validTypes = Object.values(blockTypes);

  const typeCounts = {
    [blockTypes.CONCEPT]: 0,
    [blockTypes.EXAMPLE]: 0,
    [blockTypes.FLASHCARD]: 0,
    [blockTypes.QUIZ]: 0,
  };

  for (const block of data.blocks) {
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      return false;
    }

    if (!validTypes.includes(block.type)) {
      return false;
    }

    typeCounts[block.type]++;

    if (block.type === blockTypes.CONCEPT) {
      if (
        typeof block.term !== "string" ||
        !block.term.trim() ||
        typeof block.definition !== "string" ||
        !block.definition.trim() ||
        typeof block.keyPoint !== "string" ||
        !block.keyPoint.trim()
      ) {
        return false;
      }
    }

    if (block.type === blockTypes.EXAMPLE) {
      if (
        typeof block.title !== "string" ||
        !block.title.trim() ||
        typeof block.content !== "string" ||
        !block.content.trim()
      ) {
        return false;
      }
    }

    if (block.type === blockTypes.FLASHCARD) {
      if (
        typeof block.question !== "string" ||
        !block.question.trim() ||
        typeof block.answer !== "string" ||
        !block.answer.trim()
      ) {
        return false;
      }
    }

    if (block.type === blockTypes.QUIZ) {
      if (
        typeof block.question !== "string" ||
        !block.question.trim() ||
        !Array.isArray(block.options) ||
        block.options.length !== 4 ||
        !block.options.every(
          (option) => typeof option === "string" && option.trim(),
        ) ||
        !Number.isInteger(block.answer) ||
        block.answer < 0 ||
        block.answer >= block.options.length
      ) {
        return false;
      }
    }
  }

  if (
    typeCounts[blockTypes.FLASHCARD] === 0 ||
    typeCounts[blockTypes.CONCEPT] === 0 ||
    typeCounts[blockTypes.EXAMPLE] === 0 ||
    typeCounts[blockTypes.QUIZ] === 0
  ) {
    return false;
  }

  return true;
}