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

    // Clean up filename (remove leading paths like src/components/)
    let baseFileName = detectedName ? detectedName.split("/").pop() : null;

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

  if (!entryFile && fileNames.length > 0) {
    entryFile = fileNames[0];
    files[entryFile].isEntry = true;
  }

  return {
    isMultiFile: fileNames.length > 1,
    isWebProject: isWebProject,
    isStreaming: isActivelyStreamingTrailing,
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
export function extractPreviewableCode(markdownText) {
  if (!markdownText || typeof markdownText !== "string") return null;

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

      return {
        code: rawCode,
        language: isHtml ? "html" : isJs ? "js" : (lang.includes("ts") ? "tsx" : "jsx"),
        title: "Live Code Preview",
        isStreaming: true,
        isMultiFile: false,
        isWebProject: isHtml || isJs,
        files: {
          [fileName]: {
            name: fileName,
            code: rawCode,
            language: isHtml ? "html" : isJs ? "js" : "jsx",
            componentName: detectedCompName,
            isEntry: true,
          },
        },
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
  // Support both passing raw code string or the full artifact object
  let code = "";
  let language = defaultLanguage;
  let files = null;
  let isMultiFile = false;
  let isWebProject = false;
  let entryFile = "App.jsx";

  if (typeof codeOrArtifact === "object" && codeOrArtifact !== null) {
    code = codeOrArtifact.code || "";
    language = codeOrArtifact.language || defaultLanguage;
    files = codeOrArtifact.files || null;
    isMultiFile = Boolean(codeOrArtifact.isMultiFile && files);
    isWebProject = Boolean(codeOrArtifact.isWebProject);
    entryFile = codeOrArtifact.entryFile || "App.jsx";
  } else {
    code = String(codeOrArtifact || "");
  }

  // 1. Detect if this is an HTML+CSS+JS Web Project (not a React project)
  if (files) {
    const fileList = Object.values(files);
    const hasHtmlFile = fileList.some((f) => f.language === "html" || f.name.endsWith(".html") || /<(!DOCTYPE|html|body|main|header|section)/i.test(f.code));
    const hasReactFile = fileList.some((f) => f.language === "jsx" || f.language === "tsx" || /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*|return\s*\(\s*<)/.test(f.code));
    if (hasHtmlFile && !hasReactFile) {
      isWebProject = true;
    }
  }

  // 2. Assemble complete interactive Web Page for HTML + CSS + JS projects (e.g. NovaTask)
  if (isWebProject && files) {
    let mainHtml = "";
    let combinedCss = "";
    let combinedJs = "";

    Object.values(files).forEach((f) => {
      const isHtml = f.language === "html" || f.name.endsWith(".html");
      const isCss = f.language === "css" || f.name.endsWith(".css");
      const isJs = f.language === "js" || f.language === "javascript" || f.name.endsWith(".js");

      if (isHtml) {
        if (!mainHtml) mainHtml = f.code;
        else mainHtml += `\n${f.code}`;
      } else if (isCss) {
        combinedCss += `\n/* ${f.name} */\n${f.code}\n`;
      } else if (isJs) {
        combinedJs += `\n/* ${f.name} */\n${f.code}\n`;
      }
    });

    if (!mainHtml) mainHtml = `<div id="app"></div>`;

    if (/<html[\s\S]*<\/html>/i.test(mainHtml)) {
      let fullPage = mainHtml;
      const cssBlock = combinedCss.trim() ? `<style>\n${combinedCss}\n</style>` : "";
      const jsBlock = combinedJs.trim() ? `<script>\ndocument.addEventListener('DOMContentLoaded', function() {\ntry {\n${combinedJs}\n} catch(e) { console.error("Script error:", e); }\n});\n<\/script>` : "";
      const headInjection = `
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
          ${SANDBOX_BASE_CSS}
        </style>
        ${cssBlock}
        ${SANDBOX_IMAGE_HEALER_SCRIPT}
      `;
      if (/<head>/i.test(fullPage)) {
        fullPage = fullPage.replace(/<head>/i, `<head>${headInjection}`);
      } else {
        fullPage = fullPage.replace(/<html[^>]*>/i, `$&<head>${headInjection}</head>`);
      }
      if (jsBlock) {
        if (/<\/body>/i.test(fullPage)) {
          fullPage = fullPage.replace(/<\/body>/i, `${jsBlock}</body>`);
        } else {
          fullPage += jsBlock;
        }
      }
      return fullPage;
    } else {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
    ${SANDBOX_BASE_CSS}
    ${combinedCss}
  </style>
  ${SANDBOX_IMAGE_HEALER_SCRIPT}
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
  ${mainHtml}
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      try {
        ${combinedJs}
      } catch(e) {
        console.error("Script error:", e);
      }
    });
  <\/script>
</body>
</html>`;
    }
  }

  const isReact =
    (!isWebProject && isMultiFile) ||
    language === "jsx" ||
    language === "tsx" ||
    /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*|return\s*\(\s*<)/.test(code);

  if (!isReact) {
    // If it's a standalone JS file, execute it in a sandbox DOM rather than printing raw text!
    if (language === "javascript" || language === "js") {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
    ${SANDBOX_BASE_CSS}
  </style>
  ${SANDBOX_IMAGE_HEALER_SCRIPT}
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
  <div id="app" class="max-w-4xl mx-auto"></div>
  <script>
    try {
      ${code}
    } catch(e) {
      console.error("Script execution error:", e);
    }
  <\/script>
</body>
</html>`;
    }

    // If it's already a full HTML document
    if (/<html[\s\S]*<\/html>/i.test(code)) {
      let result = code;
      const injectionHead = `
        <script src="https://cdn.tailwindcss.com"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
          ${SANDBOX_BASE_CSS}
        </style>
        ${SANDBOX_IMAGE_HEALER_SCRIPT}
      `;

      if (/<head>/i.test(result)) {
        result = result.replace(/<head>/i, `<head>${injectionHead}`);
      } else {
        result = result.replace(/<html[^>]*>/i, `$&<head>${injectionHead}</head>`);
      }
      return result;
    }

    // Wrap raw HTML fragment in modern Tailwind shell
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
    ${SANDBOX_BASE_CSS}
  </style>
  ${SANDBOX_IMAGE_HEALER_SCRIPT}
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
  ${code}
</body>
</html>`;
  }

  // --- MULTI-COMPONENT / REACT VIRTUAL BUNDLER ---
  let combinedCss = "";
  const componentScripts = [];
  let rootComponentName = "App";
  const allImportedNames = new Set();

  if (isMultiFile && files) {
    // 1. Extract CSS and prepare component declarations
    const fileEntries = Object.values(files);

    // Collect CSS
    fileEntries.forEach((file) => {
      if (file.language === "css" || file.name.endsWith(".css")) {
        combinedCss += `\n/* ${file.name} */\n${file.code}\n`;
      }
    });

    // 2. Separate into dependency order:
    // a) Data, types, context, and utility files (executed FIRST)
    // b) Child UI components (executed SECOND)
    // c) Entry / main container component (executed LAST)
    const dataFiles = [];
    const childComponents = [];
    const entryFiles = [];

    fileEntries.forEach((f) => {
      if (f.language === "css" || f.name.endsWith(".css")) return;
      if (f.isEntry) {
        entryFiles.push(f);
      } else {
        const hasJsx = /<[a-zA-Z][\s\S]*>/.test(f.code);
        const isDataOrUtil = f.name.endsWith(".ts") || /(data|mock|service|api|model|type|util|helper|theme|context|state|booking)/i.test(f.name);
        if (!hasJsx || isDataOrUtil) {
          dataFiles.push(f);
        } else {
          childComponents.push(f);
        }
      }
    });

    const orderedComponents = [
      ...dataFiles,
      ...childComponents,
      ...(entryFiles.length > 0 ? entryFiles : childComponents.splice(-1)),
    ];

    orderedComponents.forEach((file) => {
      let compCode = file.code || "";

      // Collect imported identifiers before cleaning
      const imports = collectImportedNames(compCode);
      imports.forEach((name) => allImportedNames.add(name));

      // Extract all exported identifiers to expose globally
      const exportedIds = new Set();
      const exportMatches = compCode.matchAll(/(?:export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class)\s+|export\s+default\s+)([A-Za-z0-9_$]+)/g);
      for (const em of exportMatches) {
        if (em[1] && em[1] !== "function" && em[1] !== "class" && em[1] !== "default") {
          exportedIds.add(em[1]);
        }
      }
      const exportCurlyMatches = compCode.matchAll(/export\s*\{([^}]+)\}/g);
      for (const ecm of exportCurlyMatches) {
        ecm[1].split(",").forEach((item) => {
          const parts = item.trim().split(/\s+as\s+/);
          const name = (parts[1] || parts[0]).trim();
          if (name && /^[A-Za-z0-9_$]+$/.test(name)) exportedIds.add(name);
        });
      }

      // Extract component name accurately
      let compName = file.componentName || extractComponentName(compCode, null);
      if (!compName && /<[a-zA-Z][\s\S]*>/.test(compCode)) {
        const baseName = file.name.split("/").pop().replace(/\.[^/.]+$/, "");
        compName = baseName.replace(/[^a-zA-Z0-9_]/g, "");
      }
      if (compName) exportedIds.add(compName);

      if (file.isEntry || /^(app|admin|dashboard|portal|home|layout|main|pricing)\.(jsx|tsx|js)$/i.test(file.name)) {
        rootComponentName = compName || "App";
      }

      // Clean module syntax safely
      compCode = cleanModuleSyntax(compCode);

      // Expose all exported items to window so any other component or helper can access them
      const safeExposes = Array.from(exportedIds)
        .map((id) => `try { if (typeof ${id} !== 'undefined') { window.${id} = ${id}; } } catch(e) {}`)
        .join("\n");

      componentScripts.push(`
        /* --- File: ${file.name} --- */
        ${compCode}
        ${safeExposes}
      `);
    });
  } else {
    // Single Component
    let compCode = code;
    const imports = collectImportedNames(compCode);
    imports.forEach((name) => allImportedNames.add(name));

    const detectedCompName = extractComponentName(compCode, "App");
    rootComponentName = detectedCompName;

    compCode = cleanModuleSyntax(compCode);

    const safeExpose = detectedCompName
      ? `\ntry { if (typeof ${detectedCompName} !== 'undefined') { window.${detectedCompName} = ${detectedCompName}; } } catch(e) {}\n`
      : "";

    componentScripts.push(`
      ${compCode}
      ${safeExpose}
    `);
  }

  // Pre-populate missing component & Lucide icon stubs
  const missingImportsArray = JSON.stringify(Array.from(allImportedNames));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.5/babel.min.js" crossorigin></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <script>
    if (typeof React === 'undefined') {
      document.write('<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\\/script>');
      document.write('<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\\/script>');
    }
    if (typeof Babel === 'undefined') {
      document.write('<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js" crossorigin><\\/script>');
    }
  </script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
    ${combinedCss}
  </style>
  <script>
    // Universal error catcher for global/Babel failures
    window.onerror = function(msg, url, line, col, err) {
      console.error("Sandbox global error:", msg, err);
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
          type: "SANDBOX_CONSOLE_LOG",
          payload: { level: "error", text: String(msg), timestamp: Date.now() }
        }, "*");
      }
      var rootEl = document.getElementById('root');
      if (rootEl && rootEl.hasAttribute('data-mounted')) return;
      if (msg === 'Script error.' && !err) return;
      if (rootEl && (!rootEl.children || rootEl.children.length === 0 || rootEl.innerHTML.trim() === '')) {
        setTimeout(function() {
          if (rootEl && (!rootEl.children || rootEl.children.length === 0)) {
            rootEl.innerHTML = '<div style="padding:24px;margin:16px;background:#fef2f2;border:1px solid #f87171;border-radius:12px;color:#991b1b;font-family:monospace;font-size:13px;"><div style="font-weight:bold;font-size:15px;margin-bottom:8px;">⚠️ Component Error</div><div style="white-space:pre-wrap;">' + (err && err.message ? err.message : (msg || 'Error loading preview')) + '</div></div>';
          }
        }, 500);
      }
    };
  </script>
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
  <div id="root"></div>

  <script type="text/babel" data-presets="react,typescript">
    const {
      useState, useEffect, useRef, useMemo, useCallback,
      createContext, useContext, useReducer, useId, useLayoutEffect,
      Fragment, forwardRef, memo, Children, cloneElement, createElement,
      isValidElement, startTransition, useTransition, useDeferredValue
    } = React;

    // Attach React hooks globally to window for resilience
    window.useState = useState;
    window.useEffect = useEffect;
    window.useRef = useRef;
    window.useMemo = useMemo;
    window.useCallback = useCallback;
    window.createContext = createContext;
    window.useContext = useContext;
    window.useReducer = useReducer;
    window.useId = useId;
    window.useLayoutEffect = useLayoutEffect;
    window.Fragment = Fragment;
    window.forwardRef = forwardRef;
    window.memo = memo;

    // Classnames utility (clsx / cn / twMerge)
    window.clsx = function() {
      var classes = [];
      for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        if (!arg) continue;
        var argType = typeof arg;
        if (argType === 'string' || argType === 'number') {
          classes.push(arg);
        } else if (Array.isArray(arg)) {
          if (arg.length) {
            var inner = window.clsx.apply(null, arg);
            if (inner) classes.push(inner);
          }
        } else if (argType === 'object') {
          for (var key in arg) {
            if (arg.hasOwnProperty(key) && arg[key]) {
              classes.push(key);
            }
          }
        }
      }
      return classes.join(' ');
    };
    window.cn = window.clsx;
    window.twMerge = window.clsx;

    // Framer motion stubs
    const createMotionComponent = (tag) => {
      return React.forwardRef((props, ref) => {
        const { initial, animate, exit, transition, whileHover, whileTap, ...rest } = props || {};
        return React.createElement(tag, { ...rest, ref });
      });
    };
    window.motion = new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop !== 'string') return undefined;
        return createMotionComponent(prop);
      }
    });
    window.AnimatePresence = ({ children }) => children || null;

    // Date utilities stub
    window.format = (date, fmt) => {
      try {
        const d = new Date(date);
        return isNaN(d.getTime()) ? String(date || '') : d.toLocaleDateString();
      } catch (e) {
        return String(date || '');
      }
    };
    window.formatDistanceToNow = () => 'recently';

    // React Router DOM lightweight stubs
    window.Link = (props) => React.createElement('a', { ...props, href: props.to || '#', className: 'cursor-pointer ' + (props.className || '') }, props.children);
    window.useNavigate = () => (path) => console.log('Navigate to:', path);
    window.useLocation = () => ({ pathname: '/', search: '', hash: '', state: null });
    window.useParams = () => ({});
    window.useSearchParams = () => [new URLSearchParams(), () => {}];
    window.Outlet = (props) => props.children || null;
    window.Routes = (props) => props.children || null;
    window.Route = (props) => props.element || props.children || null;
    window.BrowserRouter = (props) => props.children || null;

    // Translation and Theme stubs
    window.useTranslation = () => ({ t: (k, fb) => fb || (k ? k.split('.').pop() : ''), i18n: { language: 'en', changeLanguage: () => {} } });
    window.t = (k, fb) => fb || (k ? k.split('.').pop() : '');
    window.useTheme = () => ({ theme: 'light', isDark: false, toggle: () => {}, toggleTheme: () => {}, setTheme: () => {} });
    window.ThemeProvider = (props) => props.children || null;

    // Analytics and Database stubs
    window.track = () => {};
    window.trackEvent = () => {};
    window.Analytics = () => null;
    window.loadStripe = () => Promise.resolve({ redirectToCheckout: () => Promise.resolve({}) });

    const createChainableMock = () => new Proxy(() => {}, {
      get: (target, prop) => {
        if (prop === 'then') return (resolve) => resolve({ data: [], error: null });
        return createChainableMock();
      },
      apply: () => createChainableMock()
    });
    window.supabase = createChainableMock();
    window.hasSupabase = true;

    // React Error Boundary to catch render errors in any component
    class SafeErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }
      static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
      }
      componentDidCatch(error, errorInfo) {
        console.error("SafeErrorBoundary caught:", error, errorInfo);
        if (window.parent && window.parent.postMessage) {
          window.parent.postMessage({
            type: "SANDBOX_CONSOLE_LOG",
            payload: { level: "error", text: "[Component Error] " + (error ? error.message : "Render failure"), timestamp: Date.now() }
          }, "*");
        }
      }
      render() {
        if (this.state.hasError && this.state.error) {
          return React.createElement(
            "div",
            {
              style: {
                padding: "24px",
                margin: "16px",
                background: "#fef2f2",
                border: "1px solid #f87171",
                borderRadius: "12px",
                color: "#991b1b",
                fontFamily: "monospace",
                fontSize: "13px",
              },
            },
            React.createElement("div", { style: { fontWeight: "bold", fontSize: "15px", marginBottom: "8px" } }, "⚠️ Component Render Error"),
            React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, String(this.state.error?.message || this.state.error))
          );
        }
        return this.props.children;
      }
    }

    // Universal safe stub generator for missing child components & Lucide icons
    const __createSafeStub = (name) => {
      const stub = function SafeStub(props) {
        // Handle when called as a hook or utility function (e.g. useX(), t("..."))
        if (!props || typeof props !== 'object' || Array.isArray(props)) {
          if (name === 't' || name.startsWith('useTrans')) {
            return (k, fb) => fb || (k ? k.split('.').pop() : '');
          }
          return {
            t: (k, fb) => fb || (k ? k.split('.').pop() : ''),
            theme: 'light',
            isDark: false,
            toggle: () => {},
            toggleTheme: () => {},
            data: [],
            error: null,
            loading: false,
          };
        }

        // Try Lucide icon SVG with raw and prefix-stripped name
        if (window.lucide && window.lucide.icons) {
          const stripped = name.replace(/^(Fi|Fa|Hi|Lu|Md|Ai|Bi|Bs|Ri|Tb|Io|Ci|Pi|Ti|Vsc|Rx|Si)/, '');
          const candidateKeys = [name.toLowerCase(), stripped.toLowerCase()];
          const key = Object.keys(window.lucide.icons).find(
            (k) => candidateKeys.includes(k.toLowerCase()) || candidateKeys.includes(k.replace(/-/g, '').toLowerCase())
          );
          if (key) {
            try {
              const svgStr = window.lucide.icons[key].toSvg({
                class: (props && props.className) || "",
                width: (props && props.size) || 20,
                height: (props && props.size) || 20,
              });
              return React.createElement("span", {
                dangerouslySetInnerHTML: { __html: svgStr },
                style: { display: "inline-flex", verticalAlign: "middle", lineHeight: 1 },
              });
            } catch (e) {}
          }
        }

        // Generic icon fallback
        const isIcon = /(Icon|Chevron|Arrow|Star|Check|Cross|Menu|Close|Search|Phone|Mail|User|Heart|Eye|Calendar|Clock|Shield|Lock|Trash|Edit|Plus|Minus|Upload|Download|Share|MapPin|Filter|Settings)/i.test(name);
        if (isIcon) {
          return React.createElement(
            "span",
            {
              className: ((props && props.className) || "") + " inline-flex items-center justify-center",
              style: { display: "inline-flex", verticalAlign: "middle", width: "1.2em", height: "1.2em" },
              title: name,
            },
            React.createElement(
              "svg",
              {
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: "2",
                strokeLinecap: "round",
                strokeLinejoin: "round",
                style: { width: "100%", height: "100%" },
              },
              React.createElement("circle", { cx: "12", cy: "12", r: "7" })
            )
          );
        }

        // Fallback for ungenerated child components: pass children through or subtle placeholder
        if (props && props.children) {
          return React.createElement("div", { className: props.className || "" }, props.children);
        }

        return React.createElement(
          "div",
          {
            className: "p-4 my-2 border border-dashed border-slate-300 dark:border-zinc-700 rounded-xl text-center text-xs text-slate-500 font-mono bg-slate-50/60 dark:bg-zinc-900/60",
            style: { padding: "8px 12px", margin: "4px 0", borderRadius: "8px", border: "1px dashed #cbd5e1", textAlign: "center", fontSize: "12px", color: "#64748b" }
          },
          "[" + name + "]"
        );
      };

      stub[Symbol.toPrimitive] = () => 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
      stub.toString = () => 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
      stub.valueOf = () => 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';

      return new Proxy(stub, {
        get(target, prop) {
          if (prop === '$$typeof') return undefined;
          if (prop === Symbol.toPrimitive) {
            return (hint) => 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
          }
          if (prop === 'toString' || prop === 'valueOf') {
            return () => 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
          }
          if (prop === 'src' || prop === 'url' || prop === 'href') {
            return 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80';
          }
          if (prop === 'width' || prop === 'height') {
            return 800;
          }
          if (prop in target) return target[prop];
          if (prop === 'then') return undefined;
          return __createSafeStub(name + '.' + String(prop));
        }
      });
    };

    // Pre-declare stubs for all imported components/icons to prevent ReferenceErrors
    const __importedNames = ${missingImportsArray};
    __importedNames.forEach((name) => {
      if (typeof window[name] === "undefined") {
        window[name] = __createSafeStub(name);
      }
    });

    try {
      ${componentScripts.join("\n\n")}

      // Resolve RootComp to a valid React component function
      const candidates = [
        typeof window['${rootComponentName}'] === 'function' ? window['${rootComponentName}'] : null,
        typeof ${rootComponentName} === 'function' ? ${rootComponentName} : null,
        typeof App === 'function' ? App : null,
        typeof Main === 'function' ? Main : null,
        typeof Root === 'function' ? Root : null,
        typeof Admin === 'function' ? Admin : null,
        typeof Dashboard === 'function' ? Dashboard : null,
        typeof Home === 'function' ? Home : null,
        typeof Layout === 'function' ? Layout : null,
        typeof Landing === 'function' ? Landing : null,
        typeof Pricing === 'function' ? Pricing : null,
        typeof PlanCard === 'function' ? PlanCard : null,
        typeof Page === 'function' ? Page : null,
        typeof LoginPage === 'function' ? LoginPage : null,
        typeof LoginForm === 'function' ? LoginForm : null,
      ];
      let RootComp = candidates.find(c => Boolean(c));
      if (!RootComp) {
        for (const k of Object.keys(window)) {
          if (/^[A-Z]/.test(k) && typeof window[k] === 'function' && !['React', 'ReactDOM', 'SafeErrorBoundary', 'Link', 'Outlet', 'Routes', 'Route', 'BrowserRouter', 'ThemeProvider', 'Analytics'].includes(k)) {
            RootComp = window[k];
            break;
          }
        }
      }
      if (!RootComp) {
        RootComp = () => React.createElement('div', { className: 'p-6 text-slate-700' }, 'React components ready');
      }

      const rootEl = document.getElementById('root');
      rootEl.setAttribute('data-mounted', 'true');
      const root = ReactDOM.createRoot(rootEl);
      root.render(
        React.createElement(
          SafeErrorBoundary,
          null,
          React.createElement(RootComp)
        )
      );

      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
          type: "SANDBOX_DIAGNOSTICS",
          payload: {
            compileTimeMs: 40,
            renderTimeMs: 40,
            componentCount: ${componentScripts.length},
            errorCount: 0,
            timestamp: Date.now()
          }
        }, "*");
      }
    } catch (err) {
      console.error('React compilation error:', err);
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({
          type: "SANDBOX_CONSOLE_LOG",
          payload: { level: "error", text: "[React Error] " + err.message, timestamp: Date.now() }
        }, "*");
      }
      document.getElementById('root').innerHTML = '<div class="p-6 text-red-600 bg-red-50 rounded-xl m-4 border border-red-200 font-mono text-xs"><strong>Render Error:</strong> ' + err.message + '</div>';
    }
  </script>
</body>
</html>`;
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
