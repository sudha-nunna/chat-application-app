/**
 * Code RAG (Retrieval-Augmented Generation) Engine
 * Intelligently retrieves and prunes relevant files for multi-file React/Web projects
 * to optimize LLM context window usage and generation accuracy.
 */

import { normalizePath } from "./virtualFileSystem";

// Stopwords for code identifier tokenization
const CODE_STOPWORDS = new Set([
  "import", "export", "default", "from", "const", "let", "var", "function", "class",
  "return", "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
  "try", "catch", "throw", "finally", "async", "await", "yield", "new", "this", "super",
  "extends", "implements", "interface", "type", "enum", "null", "undefined", "true", "false",
  "react", "useState", "useEffect", "useRef", "useMemo", "useCallback", "div", "span", "p"
]);

/**
 * Tokenizes prompt text and code identifiers into distinct lowercased query terms
 */
export function tokenizeCodeQuery(queryText) {
  if (!queryText || typeof queryText !== "string") return [];
  const rawTokens = queryText
    .toLowerCase()
    .replace(/[^a-z0-9_$]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !CODE_STOPWORDS.has(t));
  return Array.from(new Set(rawTokens));
}

/**
 * Client & Server Code RAG Engine
 */
export class CodeRAGEngine {
  /**
   * Scores files based on keyword matches, file path relevance, and 1-2 hop dependency graph expansion.
   * Returns prioritized list of files fitting within token limit.
   *
   * @param {VirtualFileSystem} vfs - The virtual file system workspace.
   * @param {string} promptQuery - User query prompt describing requested changes.
   * @param {number} maxTokenBudget - Maximum allowed token budget (approx ~4 chars = 1 token). Default 16000 tokens.
   */
  static selectRelevantFiles(vfs, promptQuery, maxTokenBudget = 16000) {
    const allPaths = vfs.listFiles();
    if (allPaths.length <= 1) {
      return allPaths.map((p) => vfs.getFile(p)).filter(Boolean);
    }

    const queryTokens = tokenizeCodeQuery(promptQuery);
    const fileScores = new Map();

    allPaths.forEach((path) => {
      let score = 0;
      const normPath = normalizePath(path).toLowerCase();
      const file = vfs.getFile(path);
      if (!file) return;

      const fileContentLower = (file.content || "").toLowerCase();

      // 1. Entry files always get baseline boost
      if (path === vfs.entryPath || /app\.(tsx|jsx|js)/i.test(path) || /index\.(html|tsx|jsx|js)/i.test(path) || path === "package.json") {
        score += 5.0;
      }

      // 2. Direct filename & path match
      queryTokens.forEach((token) => {
        if (normPath.includes(token)) {
          score += 10.0;
        }
      });

      // 3. Symbol / Token occurrences in file content
      queryTokens.forEach((token) => {
        const regex = new RegExp(`\\b${token}\\b`, "g");
        const matches = (fileContentLower.match(regex) || []).length;
        score += Math.min(matches * 1.5, 15.0);
      });

      fileScores.set(path, score);
    });

    // 4. Dependency Graph 1-hop expansion: if a file has a high score, boost files it imports and files that import it
    const graph = vfs.graph;
    const sortedInitial = Array.from(fileScores.entries()).sort((a, b) => b[1] - a[1]);
    const topScorers = sortedInitial.slice(0, 5).map(([path]) => path);

    topScorers.forEach((topPath) => {
      const deps = graph.getDependencies(topPath);
      deps.forEach((depPath) => {
        const currentScore = fileScores.get(depPath) || 0;
        fileScores.set(depPath, currentScore + 4.0);
      });
      const dependents = graph.getDependents(topPath);
      dependents.forEach((depPath) => {
        const currentScore = fileScores.get(depPath) || 0;
        fileScores.set(depPath, currentScore + 3.0);
      });
    });

    // 5. Select files while respecting token limit
    const finalRanked = Array.from(fileScores.entries()).sort((a, b) => b[1] - a[1]);

    const selectedFiles = [];
    let currentEstimatedTokens = 0;

    for (const [path] of finalRanked) {
      const file = vfs.getFile(path);
      if (!file) continue;

      const fileTokens = Math.ceil((file.content || "").length / 4);

      if (currentEstimatedTokens + fileTokens <= maxTokenBudget || selectedFiles.length === 0) {
        selectedFiles.push(file);
        currentEstimatedTokens += fileTokens;
      }
    }

    return selectedFiles;
  }

  /**
   * Formats VFS files into structured LLM context prompt
   */
  static formatFilesForContext(files) {
    return files
      .map((f) => `### File: ${f.path}\n\`\`\`${f.language || "text"}\n${f.content}\n\`\`\``)
      .join("\n\n");
  }
}
