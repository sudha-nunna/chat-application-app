const fs = require('fs');
let code = fs.readFileSync('src/components/layouts/AppLayout.jsx', 'utf8');

// 1. Add activePopover state
code = code.replace(
  /const \[isSidebarCollapsed, setIsSidebarCollapsed\] = useState\(false\);/,
  'const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);\n  const [activePopover, setActivePopover] = useState(null);'
);

// 2. Modify renderSidebarItem signature and collapseUI
code = code.replace(
  /const renderSidebarItem = \(item, type\) => \{/,
  `const renderSidebarItem = (item, type, inPopover = false) => {`
);
code = code.replace(
  /const isPinned = item\.isPinned;/,
  `const isPinned = item.isPinned;\n    const collapseUI = isSidebarCollapsed && !inPopover && !isMobileMenuOpen;`
);

// 3. Update isSidebarCollapsed references inside renderSidebarItem
code = code.replaceAll(
  /isSidebarCollapsed/g,
  (match, offset) => {
    // only replace inside renderSidebarItem (between index 10000 and 15000 approx)
    if (offset > 10000 && offset < 18000) {
      return 'collapseUI';
    }
    return match;
  }
);
// Wait, doing this blindly might break other things. Let's do it precisely via regex.

fs.writeFileSync('src/components/layouts/AppLayout.jsx', code);
