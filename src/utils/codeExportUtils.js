import { VirtualFileSystem } from "./virtualFileSystem";
import { jsonrepair } from "jsonrepair";
import Ajv from "ajv";
import { diff_match_patch as DiffMatchPatch } from "diff-match-patch";

const ajv = new Ajv();
const actionSchema = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["create", "update", "delete", "rename", "patch"] },
          path: { type: "string" },
          content: { type: "string" },
          patch: { type: "string" },
          newPath: { type: "string" }
        },
        required: ["type", "path"]
      }
    }
  },
  required: ["actions"]
};
const validateActions = ajv.compile(actionSchema);
const dmp = new DiffMatchPatch();

/**
 * Utility functions for extracting, sandboxing, and exporting AI-generated web/React code.
 * Supports single-file HTML/React and multi-file / multi-component React and Web projects.
 */

/**
 * Checks if a code block is non-UI backend code or an isolated inline fragment
 */
function isIgnoredOrBackendBlock(rawCode, lang) {
  const lower = (rawCode || "").toLowerCase();
  const lLang = (lang || "").toLowerCase();

  // Skip shell/terminal
  if (lLang === "bash" || lLang === "sh" || lLang === "shell" || lLang === "terminal" || lLang === "cmd" || lLang === "powershell") {
    return true;
  }

  // Skip backend server scripts, Express, Node.js files, API route handlers or DB connections
  const isBackendCode =
    lower.includes("require('express')") ||
    lower.includes("require(\"express\")") ||
    lower.includes("import express") ||
    lower.includes("app.listen(") ||
    lower.includes("server.listen(") ||
    lower.includes("express()") ||
    lower.includes("res.status(") ||
    lower.includes("res.json(") ||
    lower.includes("res.send(") ||
    lower.includes("@vercel/node") ||
    lower.includes("req: vercelrequest") ||
    lower.includes("res: vercelresponse") ||
    lower.includes("mongoose.connect") ||
    lower.includes("prismaclient") ||
    lower.includes("http.createserver") ||
    (lower.includes("export default {") && lower.includes("name: \"article\""));

  if (isBackendCode) {
    return true;
  }

  // If it's CSS or full HTML document, it's valid UI
  if (lLang === "css" || rawCode.includes("<!DOCTYPE") || rawCode.includes("<html")) {
    return false;
  }

  // Must declare a function, class, arrow component, or export
  const hasComponentDeclaration =
    /\b(function|class)\b/.test(rawCode) ||
    /\bconst\s+[A-Za-z0-9_$]+\s*(?::\s*[^=]+)?=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+|\(\s*\))\s*=>/.test(rawCode) ||
    /\bexport\s+default\b/.test(rawCode) ||
    /\bexport\s+(const|let|var|function|class|interface|type|enum)\b/.test(rawCode) ||
    /\b(interface|type)\s+[A-Z]/.test(rawCode) ||
    /<[a-zA-Z][\s\S]*>/.test(rawCode);

  if (!hasComponentDeclaration) {
    return true;
  }

  return false;
}

/**
 * Robustly extracts the component name from code (supports function, class, arrow component, export default)
 */
export function extractComponentName(code, fallbackName = "App") {
  if (!code) return fallbackName;
  // 1. export default function Name
  let m = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (m) return m[1];
  // 2. export default Name;
  m = code.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)\b/);
  if (m && m[1] !== "function" && m[1] !== "class") return m[1];
  // 3. const Name: ... = ... => or const Name = ... =>
  m = code.match(/(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)(?:\s*:\s*[^=]+)?\s*=\s*(?:(?:\([^)]*\)|[a-zA-Z0-9_$]+|\(\s*\))\s*=>|function)/);
  if (m) return m[1];
  // 4. function Name(
  m = code.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);
  if (m) return m[1];
  return fallbackName;
}

/**
 * Parses markdown to detect if multiple files/components are present.
 * Detects filenames from headers (### Navbar.jsx), code fence params (```jsx filename="App.jsx"),
 * or top-line comments (// Navbar.jsx).
 */
export function extractProjectFiles(markdownText) {
  if (!markdownText || typeof markdownText !== "string") return null;

  const codeBlockRegex = /```([a-zA-Z0-9_.-]*)[^\n]*\n([\s\S]*?)```/gi;
  const blocks = [];
  let match;
  let lastMatchEnd = 0;

  while ((match = codeBlockRegex.exec(markdownText)) !== null) {
    const info = (match[1] || "").trim();
    const rawCode = (match[2] || "").trim();
    const matchIndex = match.index;
    lastMatchEnd = matchIndex + match[0].length;

    // Detect language
    let lang = info.toLowerCase();
    let filenameFromInfo = null;

    const fnMatch = info.match(/(?:filename=|file=)?["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
    if (fnMatch) {
      filenameFromInfo = fnMatch[1];
      lang = filenameFromInfo.split(".").pop().toLowerCase();
    } else {
      const firstToken = info.split(/\s+/)[0].toLowerCase();
      lang = firstToken || "html";
    }

    // Skip non-UI backend code or isolated fragments
    if (isIgnoredOrBackendBlock(rawCode, lang)) {
      continue;
    }

    // Inspect preceding markdown text strictly between the previous block and this block
    const precedingText = markdownText.slice(Math.max(lastMatchEnd, matchIndex - 250), matchIndex);
    const headerMatches = Array.from(precedingText.matchAll(/(?:^|\n)(?:###|##|#|\*\*)\s*(?:`?File:\s*)?`?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/gi));
    const headerMatch = headerMatches.length > 0 ? headerMatches[headerMatches.length - 1] : null;

    // Inspect first line of code for `// Navbar.jsx` or `/* Navbar.jsx */`
    const firstLineMatch = rawCode.match(/^(?:\/\/|\/\*|<!--)\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i);

    let detectedName = filenameFromInfo || (headerMatch ? headerMatch[1].trim() : null) || (firstLineMatch ? firstLineMatch[1].trim() : null);

    // Preserve full path to maintain directory structure!
    let baseFileName = detectedName ? detectedName.trim() : null;

    // Component name extraction
    const componentName = extractComponentName(rawCode, null);

    if (!baseFileName && componentName) {
      baseFileName = `${componentName}.${lang === "tsx" || lang === "ts" ? "tsx" : "jsx"}`;
    }

    // If there is already at least one component, secondary blocks without explicit filename
    // and without a component declaration (e.g. usage snippets `<Component />` or instructions)
    // must not be treated as separate project files!
    if (blocks.length > 0 && !detectedName && !componentName && lang !== "css" && lang !== "html" && lang !== "js" && lang !== "javascript") {
      continue;
    }

    const isHtmlBlock = lang === "html" || lang === "htm" || /<(!DOCTYPE|html|div|main|section|header|nav|body|h[1-6]|p|button|form|input)/i.test(rawCode);
    const hasReactComponent = /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*|return\s*\(\s*<)/.test(rawCode) && /<[a-zA-Z][\s\S]*>/.test(rawCode);
    const isCssBlock = lang === "css" || (!isHtmlBlock && !hasReactComponent && rawCode.includes("{") && rawCode.includes(":") && (rawCode.includes("margin") || rawCode.includes("color") || rawCode.includes("display")));
    const isJsBlock = !isHtmlBlock && !isCssBlock && !hasReactComponent && (lang === "javascript" || lang === "js" || rawCode.includes("document.") || rawCode.includes("window."));

    let blockLang = isCssBlock ? "css" : isHtmlBlock ? "html" : (lang.includes("ts") ? "tsx" : (hasReactComponent || lang === "jsx" || lang === "react") ? "jsx" : isJsBlock ? "js" : "jsx");

    let fallbackBaseName;
    if (blockLang === "html") {
      fallbackBaseName = blocks.length === 0 ? "index.html" : `page_${blocks.length + 1}.html`;
    } else if (blockLang === "css") {
      fallbackBaseName = "styles.css";
    } else if (blockLang === "js") {
      fallbackBaseName = "script.js";
    } else {
      fallbackBaseName = blocks.length === 0 ? "App.jsx" : `Component${blocks.length + 1}.jsx`;
    }

    blocks.push({
      name: baseFileName || fallbackBaseName,
      code: rawCode,
      language: blockLang,
      componentName: componentName,
      hasReactComponent: hasReactComponent,
    });
  }

  // Also check for trailing active streaming block in multi-file responses
  let isActivelyStreamingTrailing = false;
  const trailingRemaining = markdownText.slice(lastMatchEnd);
  const trailingMatch = trailingRemaining.match(/```([a-zA-Z0-9_.-]*)[^\n]*\n?([\s\S]+)$/i);
  if (trailingMatch) {
    const tLang = (trailingMatch[1] || "").toLowerCase();
    const tRawCode = (trailingMatch[2] || "").trim();
    const tIsWeb = /^(html|htm|jsx|tsx|react|javascript|js|typescript|ts|css)$/i.test(tLang);
    if (tIsWeb && tRawCode.length > 10 && !isIgnoredOrBackendBlock(tRawCode, tLang)) {
      const compName = extractComponentName(tRawCode, null);
      const ext = tLang.includes("ts") ? "tsx" : tLang === "html" ? "html" : tLang === "css" ? "css" : tLang === "js" ? "js" : "jsx";
      const name = compName ? `${compName}.${ext}` : `StreamingComponent_${blocks.length + 1}.${ext}`;
      blocks.push({
        name,
        code: tRawCode,
        language: tLang === "css" ? "css" : tLang === "html" ? "html" : tLang.includes("ts") ? "tsx" : tLang === "js" ? "js" : "jsx",
        componentName: compName,
        hasReactComponent: Boolean(compName),
      });
      isActivelyStreamingTrailing = true;
    }
  }

  if (blocks.length === 0) return null;

  // ---------------------------------------------------------------------------
  // Path Re-alignment Pass:
  // Inspect import statements across all blocks to re-align flat filenames or fallback names
  // (e.g. NavBar.jsx, script_6.js, styles_11.css) to their exact requested relative paths
  // (e.g. components/NavBar.jsx, services/countryService.js, components/NavBar.css)
  // ---------------------------------------------------------------------------
  const requestedPathsMap = new Map();
  const importRegex = /(?:from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

  blocks.forEach((b) => {
    if (!b.code) return;
    let normName = b.name.replace(/^src\//, "").replace(/^\/+/, "");
    let blockDir = normName.includes("/") ? normName.substring(0, normName.lastIndexOf("/")) : "";

    let match;
    while ((match = importRegex.exec(b.code)) !== null) {
      const specifier = match[1] || match[2] || match[3];
      if (!specifier) continue;
      if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("@/")) {
        let cleanSpec = specifier.replace(/^@\//, "").replace(/^\.\//, "").replace(/^\//, "");
        if (cleanSpec.startsWith("src/")) cleanSpec = cleanSpec.substring(4);

        if (specifier.startsWith("./") && blockDir) {
          cleanSpec = `${blockDir}/${cleanSpec}`;
        } else if (specifier.startsWith("../") && blockDir) {
          const parts = blockDir.split("/");
          const specParts = specifier.split("/");
          for (const p of specParts) {
            if (p === ".") continue;
            if (p === "..") {
              if (parts.length > 0) parts.pop();
            } else {
              parts.push(p);
            }
          }
          cleanSpec = parts.join("/");
        }

        cleanSpec = cleanSpec.replace(/\/+/g, "/").replace(/^\/+/, "");

        const basename = cleanSpec.split("/").pop();
        if (basename) {
          if (!requestedPathsMap.has(basename)) requestedPathsMap.set(basename, new Set());
          requestedPathsMap.get(basename).add(cleanSpec);

          const nameNoExt = basename.replace(/\.[^/.]+$/, "");
          if (!requestedPathsMap.has(nameNoExt)) requestedPathsMap.set(nameNoExt, new Set());
          requestedPathsMap.get(nameNoExt).add(cleanSpec);
        }
      }
    }
  });

  // Re-align block names based on requested import paths
  blocks.forEach((b) => {
    let currentName = b.name.replace(/^src\//, "").replace(/^\/+/, "");
    const currentBasename = currentName.split("/").pop();
    const currentNoExt = currentBasename.replace(/\.[^/.]+$/, "");

    // If block name is flat or fallback (e.g. "NavBar.jsx", "script_6.js", "styles_11.css")
    if (!currentName.includes("/") || /^styles_\d+\.css$/i.test(currentName) || /^script_\d+\.js$/i.test(currentName)) {
      let matchedPath = null;

      if (requestedPathsMap.has(currentBasename)) {
        matchedPath = Array.from(requestedPathsMap.get(currentBasename))[0];
      } else if (requestedPathsMap.has(currentNoExt)) {
        matchedPath = Array.from(requestedPathsMap.get(currentNoExt))[0];
        if (!matchedPath.endsWith(`.${b.language}`)) {
          matchedPath = `${matchedPath}.${b.language}`;
        }
      }

      if (matchedPath) {
        b.name = matchedPath;
      }
    }
  });

  // Build files map
  const files = {};
  const fileNames = [];
  let entryFile = null;

  // Check if this is an HTML+CSS+JS Web Project (not a React project)
  const hasHtmlFile = blocks.some((b) => b.language === "html" || b.name.endsWith(".html"));
  const hasReactFile = blocks.some((b) => b.hasReactComponent || b.language === "jsx" || b.language === "tsx");
  const isWebProject = hasHtmlFile && !hasReactFile;

  if (isWebProject) {
    const htmlBlock = blocks.find((b) => b.language === "html" || b.name.endsWith(".html"));
    if (htmlBlock) entryFile = htmlBlock.name;
  }

  // Priority order for entry file in React: App > Admin > Dashboard > Portal > Home > Layout > Main > Index > Pricing > Page > first component with JSX
  if (!entryFile) {
    for (const b of blocks) {
      if (/^app\.(jsx|tsx|js|html)$/i.test(b.name)) {
        entryFile = b.name;
        break;
      }
    }
  }
  if (!entryFile) {
    for (const b of blocks) {
      if (/^(admin|dashboard|portal|home|layout|main|index|pricing|page|landing)\.(jsx|tsx|js|html)$/i.test(b.name)) {
        entryFile = b.name;
        break;
      }
    }
  }
  if (!entryFile) {
    for (const b of blocks) {
      if (b.hasReactComponent && /<[a-zA-Z][\s\S]*>/.test(b.code)) {
        entryFile = b.name;
        break;
      }
    }
  }
  if (!entryFile) {
    for (const b of blocks) {
      if (b.hasReactComponent) {
        entryFile = b.name;
        break;
      }
    }
  }

  blocks.forEach((b, idx) => {
    let finalName = b.name;
    if (files[finalName]) {
      finalName = `${finalName.replace(/\.[^/.]+$/, "")}_${idx + 1}.${b.language}`;
    }

    const isEntry = (entryFile ? finalName === entryFile : idx === 0);

    files[finalName] = {
      name: finalName,
      code: b.code,
      language: b.language,
      componentName: b.componentName,
      isEntry: isEntry,
    };
    fileNames.push(finalName);
  });

  const vfs = VirtualFileSystem.fromObject(files);
  if (entryFile) vfs.setEntryPath(entryFile);

  return {
    isMultiFile: fileNames.length > 1,
    isWebProject: isWebProject,
    isStreaming: isActivelyStreamingTrailing,
    vfs,
    files,
    fileNames,
    activeFile: entryFile || fileNames[0],
    entryFile: entryFile || fileNames[0],
  };
}

/**
 * Extracts previewable code blocks (HTML, JSX, TSX, React, Web Project) from assistant markdown messages.
 * Supports single-file and multi-file projects.
 * @param {string} markdownText - Raw message content from the AI.
 * @returns {object | null}
 */
export function extractPreviewableCode(markdownText, currentArtifact = null) {
  if (!markdownText || typeof markdownText !== "string") return null;

  // 0. Check for JSON Action Protocol for incremental updates
  const jsonMatch = markdownText.match(/```json\s*([\s\S]*?)```/i) || markdownText.match(/(\{[\s\S]*"actions"[\s\S]*\})/i);
  if (jsonMatch && currentArtifact?.vfs) {
    try {
      const repaired = jsonrepair(jsonMatch[1]);
      const data = JSON.parse(repaired);
      if (data && Array.isArray(data.actions)) {
        // Run Schema Validation (we only log errors during streaming, but strictly apply if possible)
        const isValid = validateActions(data);
        if (!isValid) {
          console.warn("JSON Action Schema Validation Failed:", validateActions.errors);
        }

        const vfs = VirtualFileSystem.fromObject(currentArtifact.vfs.toObject());
        let updated = false;
        for (const action of data.actions) {
          if (!action.type || !action.path) continue;
          
          if (action.type === "create" || action.type === "update") {
            if (action.content !== undefined) {
              vfs.updateFile(action.path, action.content);
              updated = true;
            }
          } else if (action.type === "patch") {
            if (action.patch) {
              const file = vfs.getFile(action.path);
              if (file) {
                const patches = dmp.patch_fromText(action.patch);
                const [newText, results] = dmp.patch_apply(patches, file.content);
                if (results.every(r => r === true)) {
                  vfs.updateFile(action.path, newText);
                  updated = true;
                } else {
                  console.error("Patch application failed partially for", action.path);
                  vfs.updateFile(action.path, newText); // Apply best effort
                  updated = true;
                }
              }
            }
          } else if (action.type === "delete") {
            vfs.deleteFile(action.path);
            updated = true;
          } else if (action.type === "rename" && action.newPath) {
            vfs.renameFile(action.path, action.newPath);
            updated = true;
          }
        }
        if (updated) {
          return {
            ...currentArtifact,
            vfs,
            files: vfs.toObject().files, // Adjusted for new toObject() structure
            fileNames: vfs.listFiles()
          };
        }
      }
    } catch (e) {
      // Partial JSON while streaming is expected to fail jsonrepair if extremely truncated, silently continue
    }
  }

  // 1. Check for complete multi-file or single-file projects
  const project = extractProjectFiles(markdownText);
  if (project && project.fileNames.length > 0) {
    const entry = project.files[project.entryFile] || project.files[project.fileNames[0]];
    const titleMatch = markdownText.match(/#+\s+(.+)/);
    const title = titleMatch
      ? titleMatch[1].replace(/[*_`]/g, "").trim()
      : project.isWebProject
      ? "Interactive Web Project"
      : project.isMultiFile
      ? "React Multi-Component Project"
      : "Interactive Code Preview";

    return {
      code: entry.code,
      language: entry.language,
      title: title.slice(0, 45),
      isStreaming: Boolean(project.isStreaming),
      isMultiFile: project.isMultiFile,
      isWebProject: Boolean(project.isWebProject),
      vfs: project.vfs,
      files: project.files,
      fileNames: project.fileNames,
      activeFile: project.activeFile,
      entryFile: project.entryFile,
    };
  }

  // 2. Check for active STREAMING single code block (unclosed ``` at the end of markdownText)
  const streamingMatch = markdownText.match(/```([a-zA-Z0-9_.-]*)[^\n]*\n?([\s\S]*)$/i);
  if (streamingMatch) {
    const lang = (streamingMatch[1] || "").toLowerCase();
    const rawCode = (streamingMatch[2] || "").trim();

    const isWebLang = /^(html|htm|jsx|tsx|react|javascript|js|typescript|ts)$/i.test(lang);
    const hasHtmlTags = /<(!DOCTYPE|html|div|main|section|header|nav|body|h[1-6]|p|button|form|input|script|style)/i.test(rawCode);
    const hasReactComponent = /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*|return\s*\(\s*<)/.test(rawCode);

    if (isWebLang || hasHtmlTags || hasReactComponent || (rawCode.length > 20 && /<[a-zA-Z][\s\S]*>/.test(rawCode))) {
      const isHtml = lang === "html" || lang === "htm" || hasHtmlTags;
      const isJs = !isHtml && !hasReactComponent && (lang === "javascript" || lang === "js");
      const fileName = isHtml ? "index.html" : isJs ? "script.js" : (lang.includes("ts") ? "App.tsx" : "App.jsx");
      const detectedCompName = (isHtml || isJs) ? null : extractComponentName(rawCode, "App");

      const singleFiles = {
        [fileName]: {
          name: fileName,
          code: rawCode,
          language: isHtml ? "html" : isJs ? "js" : "jsx",
          componentName: detectedCompName,
          isEntry: true,
        },
      };

      const singleVfs = VirtualFileSystem.fromObject(singleFiles);

      return {
        code: rawCode,
        language: isHtml ? "html" : isJs ? "js" : (lang.includes("ts") ? "tsx" : "jsx"),
        title: "Live Code Preview",
        isStreaming: true,
        isMultiFile: false,
        isWebProject: isHtml || isJs,
        vfs: singleVfs,
        files: singleFiles,
        fileNames: [fileName],
        activeFile: fileName,
        entryFile: fileName,
      };
    }
  }

  return null;
}

/**
 * Helper to collect all imported identifiers and uppercase JSX tags across source codes
 */
function collectImportedNames(codeString) {
  const names = new Set();
  if (!codeString) return names;

  // Named imports: import { A, B as C } from '...'
  const namedMatches = codeString.matchAll(/import\s*\{([^}]+)\}\s*from/g);
  for (const m of namedMatches) {
    m[1].split(",").forEach((item) => {
      const parts = item.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
        names.add(name);
      }
    });
  }

  // Default imports: import Foo from '...'
  const defaultMatches = codeString.matchAll(/import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:,\s*\{[^}]*\})?\s+from/g);
  for (const m of defaultMatches) {
    const name = m[1].trim();
    if (name && name !== "type" && name !== "React") {
      names.add(name);
    }
  }

  // Automatically detect all capitalized component & icon tags used in JSX: <Tag or <Tag.Sub
  const tagMatches = codeString.matchAll(/<([A-Z][A-Za-z0-9_]*)/g);
  for (const tm of tagMatches) {
    if (tm[1] && tm[1] !== "React" && tm[1] !== "Fragment") {
      names.add(tm[1]);
    }
  }

  return names;
}

/**
 * Helper to clean module-level imports and exports so Babel can execute scripts inside a browser context
 */
function cleanModuleSyntax(code) {
  if (!code) return "";
  let res = code;
  // Replace import.meta.env
  res = res.replace(/\bimport\.meta\.env\b/g, "(window.env || {})");
  // Remove import type and import statements
  res = res.replace(/import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"];?/g, "");
  // Remove bare asset/css imports e.g. import './App.css';
  res = res.replace(/import\s+['"][^'"]+['"];?/g, "");
  // Convert `export default function Name` to `function Name` and attach to window
  res = res.replace(/export\s+default\s+function\s+([A-Za-z0-9_$]+)/g, "function $1");
  // Convert anonymous `export default function (` to `function App(`
  res = res.replace(/export\s+default\s+function\s*\(/g, "function App(");
  // Convert `export default () =>` to `const App = () =>`
  res = res.replace(/export\s+default\s+(?:\(\s*\)|[a-zA-Z0-9_$]+|\([^)]*\))\s*=>/g, "const App = () =>");
  // Convert `export default class` to `class` FIRST
  res = res.replace(/export\s+default\s+class/g, "class");
  // Remove standalone default exports e.g. export default App;
  res = res.replace(/export\s+default\s+(?!function|class\b)[A-Za-z0-9_$]+;?/g, "");
  // Remove named exports e.g. export { App, Nav };
  res = res.replace(/export\s*\{[^}]*\};?/g, "");
  // Strip `export` modifier from const/let/var/function/class/interface/type/async
  res = res.replace(/export\s+(async\s+)?(const|let|var|function|class|interface|type)\b/g, "$1$2");
  // Strip any remaining leading `export ` keyword
  res = res.replace(/^\s*export\s+/gm, "");
  return res;
}

/**
 * Modern Base CSS for Web Projects & Sandboxes
 */
export const SANDBOX_BASE_CSS = `
  *, ::before, ::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; line-height: 1.6; color: #1f2937; }
  h1:not([class*="text-"]) { font-size: 2.25rem; font-weight: 800; line-height: 1.2; margin-top: 1.5rem; margin-bottom: 1rem; color: #111827; }
  h2:not([class*="text-"]) { font-size: 1.75rem; font-weight: 700; line-height: 1.3; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #1f2937; }
  h3:not([class*="text-"]) { font-size: 1.35rem; font-weight: 600; line-height: 1.4; margin-top: 1rem; margin-bottom: 0.5rem; color: #374151; }
  p:not([class*="text-"]) { margin-top: 0; margin-bottom: 1rem; color: #4b5563; }
  a:not([class*="text-"]):not([class*="btn"]) { color: #4f46e5; text-decoration: underline; }
  nav:not([class*="flex"]) { display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #e5e7eb; margin-bottom: 1.5rem; }
  nav:not([class*="flex"]) a { text-decoration: none; font-weight: 500; color: #4b5563; }
  nav:not([class*="flex"]) a:hover { color: #111827; text-decoration: underline; }
  ul:not([class*="list-"]) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
  ol:not([class*="list-"]) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; color: #374151; }
  li:not([class*="mb-"]) { margin-bottom: 0.35rem; }
  table:not([class*="border"]) { width: 100%; border-collapse: collapse; margin-top: 1.25rem; margin-bottom: 1.25rem; border-radius: 8px; overflow: hidden; }
  th:not([class*="border"]) { border: 1px solid #e5e7eb; padding: 0.65rem 0.9rem; text-align: left; font-weight: 600; background-color: #f9fafb; font-size: 0.875rem; color: #111827; }
  td:not([class*="border"]) { border: 1px solid #e5e7eb; padding: 0.65rem 0.9rem; text-align: left; font-size: 0.875rem; color: #374151; }
  tr:not([class*="bg-"]):nth-child(even) td { background-color: #fbfbfb; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  button:not([class*="bg-"]):not([class*="btn"]) { padding: 0.5rem 1rem; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; cursor: pointer; font-weight: 500; }
  button:not([class*="bg-"]):not([class*="btn"]):hover { background: #f3f4f6; }
`;

/**
 * Intelligent image healer for landing pages and web apps
 */
export const SANDBOX_IMAGE_HEALER_SCRIPT = `
<script>
(function() {
  function getSmartImageFallback(hint) {
    var text = (hint || '').toLowerCase();
    if (text.includes('coffee') || text.includes('cafe') || text.includes('espresso') || text.includes('cappuccino') || text.includes('brew') || text.includes('latte')) {
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80';
    }
    if (text.includes('food') || text.includes('pastry') || text.includes('bakery') || text.includes('restaurant') || text.includes('dish') || text.includes('cake') || text.includes('breakfast') || text.includes('pizza') || text.includes('burger')) {
      return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80';
    }
    if (text.includes('interior') || text.includes('table') || text.includes('room') || text.includes('decor') || text.includes('cozy') || text.includes('shop') || text.includes('store') || text.includes('cafe')) {
      return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80';
    }
    if (text.includes('avatar') || text.includes('user') || text.includes('profile') || text.includes('person') || text.includes('member') || text.includes('team') || text.includes('founder') || text.includes('author') || text.includes('face')) {
      return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
    }
    if (text.includes('laptop') || text.includes('tech') || text.includes('code') || text.includes('developer') || text.includes('software') || text.includes('app') || text.includes('computer')) {
      return 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80';
    }
    if (text.includes('nature') || text.includes('mountain') || text.includes('landscape') || text.includes('travel') || text.includes('forest') || text.includes('ocean')) {
      return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80';
  }

  function healAllImages() {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.dataset.healerProcessed) continue;

      var rawSrc = (img.getAttribute('src') || '').trim();
      var isRelativeOrMissing = !rawSrc || (!rawSrc.startsWith('http://') && !rawSrc.startsWith('https://') && !rawSrc.startsWith('data:') && !rawSrc.startsWith('blob:'));

      var contextHint = [
        img.getAttribute('alt'),
        img.getAttribute('title'),
        rawSrc,
        img.parentElement ? img.parentElement.textContent : '',
        document.title
      ].filter(Boolean).join(' ');

      if (isRelativeOrMissing) {
        img.dataset.healerProcessed = 'true';
        img.src = getSmartImageFallback(contextHint);
      }

      img.addEventListener('error', function() {
        if (!this.dataset.fallbackFired) {
          this.dataset.fallbackFired = 'true';
          this.src = getSmartImageFallback(this.alt || this.title || 'image');
        }
      });

      if (!img.style.maxWidth) img.style.maxWidth = '100%';
      if (!img.style.height) img.style.height = 'auto';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', healAllImages);
  } else {
    healAllImages();
  }
  setInterval(healAllImages, 800);
})();
</script>
`;

/**
 * Generates an isolated, complete HTML document containing Tailwind CSS, React 18,
 * Babel Standalone, and Lucide/FontAwesome icons.
 * Automatically bundles and links multi-component React projects into #root!
 *
 * @param {string | object} codeOrArtifact - The raw code string or artifact object with files.
 * @param {string} defaultLanguage - 'html' or 'jsx'/'tsx'.
 * @returns {string} - Full HTML string to inject into iframe srcDoc.
 */
export function generateSandboxHtml(codeOrArtifact, defaultLanguage = "html") {
  const codeStr = typeof codeOrArtifact === "string" ? codeOrArtifact : codeOrArtifact?.code || "";
  const isWebProject = typeof codeOrArtifact === "object" ? codeOrArtifact?.isWebProject : defaultLanguage === "html";
  if (isWebProject) {
    return codeStr;
  }
  return `<!DOCTYPE html><html><body><h2>Code export for React/Vite projects is available via Download Source Code in the editor.</h2></body></html>`;
}

/**
 * Downloads a string as an offline-runnable .html or .jsx file.
 * @param {string} filename - e.g. "my-website.html"
 * @param {string} content - file content
 * @param {string} mimeType - e.g. "text/html"
 */
export function downloadFile(filename, content, mimeType = "text/html") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
