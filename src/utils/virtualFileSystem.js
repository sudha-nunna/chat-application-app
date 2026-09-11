/**
 * Virtual File System (VFS) and Dependency Graph Resolver
 * Powers multi-file code execution, path resolution, and import relationship mapping
 * for modern React and Web projects (JSX, TSX, JS, TS, CSS, SCSS, HTML, JSON, package.json).
 */

/**
 * Normalizes file paths to POSIX-style relative paths without leading slashes.
 * e.g. "./src/components/Header.tsx" -> "src/components/Header.tsx"
 * e.g. "/App.jsx" -> "App.jsx"
 */
export function normalizePath(path) {
  if (!path || typeof path !== "string") return "";
  let clean = path.trim().replace(/\\/g, "/");
  clean = clean.replace(/^\.\//, "");
  clean = clean.replace(/^\/+/, "");
  return clean;
}

/**
 * Infers language from file path extension
 */
export function getLanguageFromPath(filePath) {
  const norm = normalizePath(filePath).toLowerCase();
  if (norm.endsWith(".tsx")) return "tsx";
  if (norm.endsWith(".ts")) return "ts";
  if (norm.endsWith(".jsx")) return "jsx";
  if (norm.endsWith(".js") || norm.endsWith(".mjs") || norm.endsWith(".cjs")) return "js";
  if (norm.endsWith(".scss") || norm.endsWith(".sass")) return "scss";
  if (norm.endsWith(".css")) return "css";
  if (norm.endsWith(".html") || norm.endsWith(".htm")) return "html";
  if (norm.endsWith(".json")) return "json";
  if (norm.endsWith(".md")) return "markdown";
  return "plaintext";
}

/**
 * Class representing a single Virtual File in the workspace
 */
export class VirtualFile {
  constructor(path, content = "", language = null) {
    this.path = normalizePath(path);
    this.content = content;
    this.language = language || getLanguageFromPath(this.path);
    this.updatedAt = Date.now();
    this.history = [];
  }

  updateContent(newContent) {
    if (this.content !== newContent) {
      this.history.push({
        content: this.content,
        timestamp: this.updatedAt
      });
      this.content = newContent;
      this.updatedAt = Date.now();
    }
  }

  rollback(versionIndex) {
    if (versionIndex >= 0 && versionIndex < this.history.length) {
      const state = this.history[versionIndex];
      this.history.push({
        content: this.content,
        timestamp: this.updatedAt
      });
      this.content = state.content;
      this.updatedAt = Date.now();
      return true;
    }
    return false;
  }
}

/**
 * Dependency Graph Node & Edge manager
 */
export class DependencyGraph {
  constructor() {
    this.nodes = new Set(); // Set of file paths
    this.edges = new Map(); // Map of filePath -> Set of imported filePaths
    this.reverseEdges = new Map(); // Map of filePath -> Set of dependent filePaths
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.reverseEdges.clear();
  }

  addNode(path) {
    const norm = normalizePath(path);
    this.nodes.add(norm);
    if (!this.edges.has(norm)) this.edges.set(norm, new Set());
    if (!this.reverseEdges.has(norm)) this.reverseEdges.set(norm, new Set());
  }

  addEdge(fromPath, toPath) {
    const from = normalizePath(fromPath);
    const to = normalizePath(toPath);
    this.addNode(from);
    this.addNode(to);
    this.edges.get(from).add(to);
    this.reverseEdges.get(to).add(from);
  }

  getDependencies(path) {
    const norm = normalizePath(path);
    return Array.from(this.edges.get(norm) || []);
  }

  getDependents(path) {
    const norm = normalizePath(path);
    return Array.from(this.reverseEdges.get(norm) || []);
  }

  /**
   * Resolves relative import path (e.g., "./Header" or "../utils/api") against importing file path (e.g. "src/components/App.tsx")
   */
  resolveImportPath(importingPath, importSpecifier, availablePaths = []) {
    let spec = importSpecifier.trim();

    // Alias `@/` -> `src/`
    if (spec.startsWith("@/")) {
      spec = "src/" + spec.slice(2);
    } else if (spec.startsWith("./") || spec.startsWith("../")) {
      // Resolve relative path
      const parts = importingPath.split("/");
      parts.pop(); // remove filename
      const importParts = spec.split("/");
      for (const p of importParts) {
        if (p === ".") continue;
        if (p === "..") {
          if (parts.length > 0) parts.pop();
        } else {
          parts.push(p);
        }
      }
      spec = parts.join("/");
    }

    spec = normalizePath(spec);

    // Exact match
    if (availablePaths.includes(spec)) return spec;

    // Try extensions: .tsx, .jsx, .ts, .js, .json, .css, .scss
    const extensions = [".tsx", ".jsx", ".ts", ".js", ".json", ".css", ".scss"];
    for (const ext of extensions) {
      if (availablePaths.includes(spec + ext)) return spec + ext;
    }

    // Try index files: /index.tsx, /index.jsx, /index.ts, /index.js
    const indexFiles = ["/index.tsx", "/index.jsx", "/index.ts", "/index.js"];
    for (const idx of indexFiles) {
      if (availablePaths.includes(spec + idx)) return spec + idx;
    }

    return null; // Package or unresolvable
  }

  /**
   * Builds full dependency graph from Virtual File System
   */
  buildGraph(vfs) {
    this.clear();
    const allPaths = vfs.listFiles();
    allPaths.forEach((p) => this.addNode(p));

    allPaths.forEach((path) => {
      const file = vfs.getFile(path);
      if (!file || !file.content) return;
      const lang = file.language;

      if (["jsx", "tsx", "js", "ts", "html"].includes(lang)) {
        // Extract imports
        const importRegex = /(?:import\s+(?:[\s\S]*?from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
        let match;
        while ((match = importRegex.exec(file.content)) !== null) {
          const specifier = match[1] || match[2];
          if (specifier && (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("@/"))) {
            const resolved = this.resolveImportPath(path, specifier, allPaths);
            if (resolved) {
              this.addEdge(path, resolved);
            }
          }
        }
      } else if (["css", "scss"].includes(lang)) {
        // Extract SCSS/CSS @import statements
        const cssImportRegex = /@import\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = cssImportRegex.exec(file.content)) !== null) {
          const specifier = match[1];
          if (specifier) {
            const resolved = this.resolveImportPath(path, specifier, allPaths);
            if (resolved) {
              this.addEdge(path, resolved);
            }
          }
        }
      }
    });
  }

  /**
   * Topological sort for correct execution order (leaves first, entry last)
   */
  getExecutionOrder(entryPath = null) {
    const visited = new Set();
    const order = [];

    const visit = (node) => {
      if (visited.has(node)) return;
      visited.add(node);
      const deps = this.edges.get(node) || new Set();
      deps.forEach((dep) => visit(dep));
      order.push(node);
    };

    if (entryPath && this.nodes.has(normalizePath(entryPath))) {
      visit(normalizePath(entryPath));
    }

    // Visit remaining nodes
    this.nodes.forEach((node) => {
      if (!visited.has(node)) {
        visit(node);
      }
    });

    return order;
  }
}

/**
 * Virtual File System (VFS) Workspace
 */
export class VirtualFileSystem {
  constructor() {
    this.files = new Map(); // path -> VirtualFile
    this.graph = new DependencyGraph();
    this.entryPath = "src/App.jsx";
    this.manifest = {
      framework: "react",
      bundler: "vite",
      language: "javascript"
    };
  }

  createFile(path, content = "", language = null) {
    const norm = normalizePath(path);
    if (!norm) return null;
    const file = new VirtualFile(norm, content, language);
    this.files.set(norm, file);
    this.rebuildGraph();
    return file;
  }

  updateFile(path, content) {
    const norm = normalizePath(path);
    const file = this.files.get(norm);
    if (!file) {
      return this.createFile(norm, content);
    }
    file.updateContent(content);
    this.rebuildGraph();
    return file;
  }

  deleteFile(path) {
    const norm = normalizePath(path);
    const result = this.files.delete(norm);
    if (result) {
      if (this.entryPath === norm) {
        const remaining = this.listFiles();
        this.entryPath = remaining[0] || "src/App.jsx";
      }
      this.rebuildGraph();
    }
    return result;
  }

  renameFile(oldPath, newPath) {
    const normOld = normalizePath(oldPath);
    const normNew = normalizePath(newPath);
    if (!normOld || !normNew || !this.files.has(normOld)) return false;

    const oldFile = this.files.get(normOld);
    const newFile = new VirtualFile(normNew, oldFile.content, oldFile.language);
    this.files.delete(normOld);
    this.files.set(normNew, newFile);

    if (this.entryPath === normOld) {
      this.entryPath = normNew;
    }

    this.rebuildGraph();
    return true;
  }

  getFile(path) {
    const norm = normalizePath(path);
    return this.files.get(norm) || null;
  }

  hasFile(path) {
    const norm = normalizePath(path);
    return this.files.has(norm);
  }

  listFiles() {
    return Array.from(this.files.keys());
  }

  setEntryPath(path) {
    const norm = normalizePath(path);
    if (this.files.has(norm)) {
      this.entryPath = norm;
    }
  }

  getEntryFile() {
    return this.getFile(this.entryPath) || this.files.values().next().value || null;
  }

  rebuildGraph() {
    this.graph.buildGraph(this);
  }

  /**
   * Export VFS as plain JSON object: { [path]: { name, code, language, isEntry, history } }
   */
  toObject() {
    const obj = {};
    this.files.forEach((file, path) => {
      obj[path] = {
        name: path,
        code: file.content,
        language: file.language,
        isEntry: path === this.entryPath,
        history: file.history,
      };
    });
    return { files: obj, manifest: this.manifest };
  }

  /**
   * Import VFS from plain JSON object
   */
  static fromObject(obj) {
    const vfs = new VirtualFileSystem();
    if (!obj || typeof obj !== "object") return vfs;

    const filesObj = obj.files || obj; // Support both {files, manifest} and raw files object
    if (obj.manifest) {
      vfs.manifest = obj.manifest;
    }

    let detectedEntry = null;
    Object.keys(filesObj).forEach((rawPath) => {
      const item = filesObj[rawPath];
      if (!item || typeof item !== "object" && typeof item !== "string") return;
      const content = typeof item === "string" ? item : item.code || item.content || "";
      const lang = typeof item === "object" ? item.language : null;
      const file = vfs.createFile(rawPath, content, lang);
      if (typeof item === "object" && item.history) {
        file.history = item.history;
      }
      if (typeof item === "object" && item.isEntry) {
        detectedEntry = file.path;
      }
    });

    if (detectedEntry) {
      vfs.setEntryPath(detectedEntry);
    } else {
      // Find default entry file
      const paths = vfs.listFiles();
      const entryPriority = [/app\.(tsx|jsx|js)/i, /index\.(tsx|jsx|js|html)/i, /main\.(tsx|jsx|js)/i];
      for (const reg of entryPriority) {
        const found = paths.find((p) => reg.test(p));
        if (found) {
          vfs.setEntryPath(found);
          break;
        }
      }
    }

    return vfs;
  }

  /**
   * Generates directory tree hierarchy for File Explorer UI
   */
  getDirectoryTree() {
    const root = { name: "root", type: "folder", path: "", children: [] };

    this.files.forEach((file, path) => {
      const parts = path.split("/");
      let current = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        const currentPath = parts.slice(0, index + 1).join("/");

        let child = current.children.find((c) => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: isFile ? "file" : "folder",
            language: isFile ? file.language : null,
            children: isFile ? undefined : [],
          };
          current.children.push(child);
        }
        if (!isFile) {
          current = child;
        }
      });
    });

    // Sort folders first, then files alphabetically
    const sortTree = (node) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        node.children.forEach(sortTree);
      }
    };
    sortTree(root);
    return root.children;
  }
}
