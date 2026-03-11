export function extractToolBlocks(rawText: string) {
  const jsonBlocks: { start: number; end: number; content: string }[] = [];
  const startRegex = /\{[\s\r\n]*"tool"/g;
  let startMatch;

  while ((startMatch = startRegex.exec(rawText)) !== null) {
    const actualStart = startMatch.index;
    let braceCount = 0;
    let foundEnd = false;
    for (let i = actualStart; i < rawText.length; i++) {
      if (rawText[i] === '{') braceCount++;
      if (rawText[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonBlocks.push({ start: actualStart, end: i + 1, content: rawText.substring(actualStart, i + 1) });
        startRegex.lastIndex = i + 1;
        foundEnd = true;
        break;
      }
    }
    if (!foundEnd) break;
  }

  return jsonBlocks;
}
