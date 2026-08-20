import { FiChevronRight } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";

/**
 * PillListWidget - Renders list options as sleek, interactive pill-shaped cards
 * matching modern web app design specs with hover highlights & chevrons.
 */
const PillListWidget = ({ items = [], onItemClick, title }) => {
  const { isDark } = useTheme();

  if (!items || items.length === 0) return null;

  return (
    <div className={`p-3 rounded-[24px] border my-2.5 space-y-2 transition-all ${
      "bg-interactive-base/90 border-border-primary/80 shadow-xs dark:bg-interactive-base/80 dark:border-border-primary/80 dark:shadow-inner"
    }`}>
      {title && (
        <div className={`px-2 text-[11px] font-bold tracking-tight mb-2 ${
          "text-text-primary"
        }`}>
          {title}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => {
          const itemText = typeof item === "string" ? item : item.title || item.name || item.text;
          const key = item.id || `pill-${index}-${itemText}`;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onItemClick && onItemClick(itemText)}
              className={`w-full px-4 py-2.5 rounded-full border text-left flex items-center justify-between transition-all duration-200 transform active:scale-[0.98] cursor-pointer group ${
                "bg-white border-border-primary/90 hover:border-border-primary hover:bg-interactive-base/40 text-text-primary hover:text-text-primary shadow-2xs hover:shadow-md hover:shadow-black/10/10 dark:bg-interactive-active dark:border-border-primary/90 dark:hover:border-border-primary/70 dark:hover:bg-interactive-base/30 dark:text-text-muted dark:hover:text-text-primary"
              }`}
            >
              <span className="text-xs font-semibold truncate pr-2 tracking-tight group-hover:translate-x-0.5 transition-transform">
                {itemText}
              </span>
              <FiChevronRight className={`text-xs shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${
                "text-text-primary group-hover:text-text-primary"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PillListWidget;
