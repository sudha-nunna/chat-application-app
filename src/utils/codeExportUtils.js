/**
 * Utility functions for extracting, sandboxing, and exporting AI-generated web/React code.
 * Supports single-file HTML/React and multi-file / multi-component React projects.
 */

/**
 * Parses markdown to detect if multiple files/components are present.
 * Detects filenames from headers (### Navbar.jsx), code fence params (```jsx filename="App.jsx"),
 * or top-line comments (// Navbar.jsx).
 */
export function extractProjectFiles(markdownText) {
  if (!markdownText || typeof markdownText !== "string") return null;

  const codeBlockRegex = /```([a-zA-Z0-9_.-]*)\s*([\s\S]*?)```/gi;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(markdownText)) !== null) {
    const info = (match[1] || "").trim();
    const rawCode = (match[2] || "").trim();
    const matchIndex = match.index;

    // Detect language
    let lang = "html";
    let filenameFromInfo = null;

    const fnMatch = info.match(/(?:filename=|file=)?["']?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)["']?/i);
    if (fnMatch) {
      filenameFromInfo = fnMatch[1];
      lang = filenameFromInfo.split(".").pop().toLowerCase();
    } else {
      const firstToken = info.split(/\s+/)[0].toLowerCase();
      lang = firstToken || "html";
    }

    // Inspect preceding markdown text (up to 150 chars) for filename headers like `### Navbar.jsx`
    const precedingText = markdownText.slice(Math.max(0, matchIndex - 150), matchIndex);
    const headerMatch = precedingText.match(/(?:^|\n)(?:###|##|#|\*\*)\s*(?:File:\s*)?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i);

    // Inspect first line of code for `// Navbar.jsx` or `/* Navbar.jsx */`
    const firstLineMatch = rawCode.match(/^(?:\/\/|\/\*|<!--)\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/i);

    let detectedName = filenameFromInfo || (headerMatch ? headerMatch[1].trim() : null) || (firstLineMatch ? firstLineMatch[1].trim() : null);

    // Component name fallback for React
    const componentMatch = rawCode.match(/(?:export\s+default\s+function|function|const)\s+([A-Z][A-Za-z0-9_]*)/);
    const componentName = componentMatch ? componentMatch[1] : null;

    if (!detectedName && componentName) {
      detectedName = `${componentName}.jsx`;
    }

    const hasHtmlTags = /<(!DOCTYPE|html|div|main|section|header|nav|body|h[1-6]|p|button|form|input|script|style)/i.test(rawCode);
    const hasReactComponent = /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*\(|return\s*\(\s*<)/.test(rawCode);

    if (lang === "html" || lang === "jsx" || lang === "tsx" || lang === "css" || hasHtmlTags || hasReactComponent || (rawCode.length > 40 && /<[\s\S]+>/.test(rawCode))) {
      blocks.push({
        name: detectedName || (blocks.length === 0 ? "App.jsx" : `Component${blocks.length + 1}.jsx`),
        code: rawCode,
        language: lang === "css" ? "css" : lang === "html" ? "html" : "jsx",
        componentName: componentName,
      });
    }
  }

  if (blocks.length === 0) return null;

  // Build files map
  const files = {};
  const fileNames = [];
  let entryFile = null;

  blocks.forEach((b, idx) => {
    let finalName = b.name;
    if (files[finalName]) {
      finalName = `${finalName.replace(/\.[^/.]+$/, "")}_${idx + 1}.${b.language}`;
    }

    const isEntry = /app\.(jsx|tsx|js|html)$/i.test(finalName) || (!entryFile && idx === 0);
    if (isEntry && !entryFile) {
      entryFile = finalName;
    }

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
    files,
    fileNames,
    activeFile: entryFile || fileNames[0],
    entryFile: entryFile || fileNames[0],
  };
}

/**
 * Extracts previewable code blocks (HTML, JSX, TSX, React) from assistant markdown messages.
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
    const title = titleMatch ? titleMatch[1].replace(/[*_`]/g, "").trim() : project.isMultiFile ? "React Multi-Component Project" : "Interactive Web Preview";

    return {
      code: entry.code,
      language: entry.language,
      title: title.slice(0, 45),
      isStreaming: false,
      isMultiFile: project.isMultiFile,
      files: project.files,
      fileNames: project.fileNames,
      activeFile: project.activeFile,
      entryFile: project.entryFile,
    };
  }

  // 2. Check for active STREAMING code block (unclosed ``` at the end of markdownText)
  const streamingMatch = markdownText.match(/```([a-zA-Z0-9_.-]*)\s*([\s\S]+)$/i);
  if (streamingMatch) {
    const lang = (streamingMatch[1] || "").toLowerCase();
    const rawCode = (streamingMatch[2] || "").trim();
    const hasHtmlTags = /<(!DOCTYPE|html|div|main|section|header|nav|body|h[1-6]|p|button|form|input|script|style)/i.test(rawCode);
    const hasReactComponent = /(export\s+default\s+function|function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=\s*\(|return\s*\(\s*<)/.test(rawCode);

    if (lang === "html" || lang === "jsx" || lang === "tsx" || hasHtmlTags || hasReactComponent || rawCode.length > 25) {
      const fileName = lang === "html" ? "index.html" : "App.jsx";
      return {
        code: rawCode,
        language: lang === "html" ? "html" : hasReactComponent || lang === "jsx" || lang === "tsx" ? "jsx" : "html",
        title: "Live Code Preview",
        isStreaming: true,
        isMultiFile: false,
        files: {
          [fileName]: {
            name: fileName,
            code: rawCode,
            language: lang === "html" ? "html" : "jsx",
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
  let entryFile = "App.jsx";

  if (typeof codeOrArtifact === "object" && codeOrArtifact !== null) {
    code = codeOrArtifact.code || "";
    language = codeOrArtifact.language || defaultLanguage;
    files = codeOrArtifact.files || null;
    isMultiFile = Boolean(codeOrArtifact.isMultiFile && files);
    entryFile = codeOrArtifact.entryFile || "App.jsx";
  } else {
    code = String(codeOrArtifact || "");
  }

  const isReact =
    isMultiFile ||
    language === "jsx" ||
    language === "tsx" ||
    /(export\s+default\s+function|function\s+[A-Z]\w*|return\s*\(\s*<)/.test(code);

  if (!isReact) {
    // If it's already a full HTML document
    if (/<html[\s\S]*<\/html>/i.test(code)) {
      if (!code.includes("cdn.tailwindcss.com")) {
        return code.replace(
          /<head>/i,
          `<head><script src="https://cdn.tailwindcss.com"></script><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>`
        );
      }
      return code;
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
  </style>
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

  if (isMultiFile && files) {
    // 1. Extract CSS and prepare component declarations
    const fileEntries = Object.values(files);

    // Collect CSS
    fileEntries.forEach((file) => {
      if (file.language === "css" || file.name.endsWith(".css")) {
        combinedCss += `\n/* ${file.name} */\n${file.code}\n`;
      }
    });

    // 2. Process Child Components first, and Entry component (App) last
    const nonEntryComponents = fileEntries.filter(
      (f) => f.language !== "css" && !f.name.endsWith(".css") && !f.isEntry
    );
    const entryComponents = fileEntries.filter(
      (f) => f.language !== "css" && !f.name.endsWith(".css") && f.isEntry
    );

    const orderedComponents = [...nonEntryComponents, ...(entryComponents.length > 0 ? entryComponents : nonEntryComponents.splice(-1))];

    orderedComponents.forEach((file) => {
      let compCode = file.code;

      // Extract component name
      let compName = file.componentName;
      const expMatch = compCode.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
      if (expMatch) {
        compName = expMatch[1];
        compCode = compCode.replace(/export\s+default\s+function/, "function");
      } else {
        const fnMatch = compCode.match(/function\s+([A-Z][A-Za-z0-9_]*)/);
        if (fnMatch) compName = fnMatch[1];
        else {
          const constMatch = compCode.match(/const\s+([A-Za-z0-9_]+)\s*=\s*\(/);
          if (constMatch) compName = constMatch[1];
        }
      }

      if (!compName) {
        compName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "");
      }

      // Remove local relative imports (e.g. `import Navbar from './Navbar'`)
      compCode = compCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "");
      // Remove any standalone exports
      compCode = compCode.replace(/export\s+default\s+[A-Za-z0-9_]+;?/g, "");

      if (file.isEntry || /app\.(jsx|tsx|js)$/i.test(file.name)) {
        rootComponentName = compName || "App";
      }

      // Expose to window so any other component can use it without import errors
      const safeExpose = compName ? `\nif (typeof ${compName} !== 'undefined') { window.${compName} = ${compName}; }\n` : "";

      componentScripts.push(`
        // --- File: ${file.name} ---
        ${compCode}
        ${safeExpose}
      `);
    });
  } else {
    // Single Component
    let compCode = code;
    const exportMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
    if (exportMatch) {
      rootComponentName = exportMatch[1];
      compCode = code.replace(/export\s+default\s+function/, "function");
    } else {
      const constMatch = code.match(/const\s+([A-Za-z0-9_]+)\s*=\s*\(/);
      if (constMatch) {
        rootComponentName = constMatch[1];
      }
    }

    compCode = compCode.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "");
    compCode = compCode.replace(/export\s+default\s+[A-Za-z0-9_]+;?/g, "");
    componentScripts.push(compCode);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 4px; }
    ${combinedCss}
  </style>
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    try {
      ${componentScripts.join("\n\n")}

      const RootComp = typeof ${rootComponentName} !== 'undefined'
        ? ${rootComponentName}
        : (typeof App !== 'undefined' ? App : () => React.createElement('div', { className: 'p-6 text-slate-700' }, 'React components ready'));

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(RootComp));
    } catch (err) {
      console.error('React compilation error:', err);
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
