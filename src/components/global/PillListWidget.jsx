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
      isDark
        ? "bg-slate-950/80 border-slate-800/80 shadow-inner"
        : "bg-slate-50/90 border-slate-200/80 shadow-xs"
    }`}>
      {title && (
        <div className={`px-2 text-[11px] font-bold tracking-tight mb-2 ${
          isDark ? "text-slate-400" : "text-slate-500"
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
                isDark
                  ? "bg-slate-900 border-slate-800/90 hover:border-indigo-500/70 hover:bg-indigo-950/30 text-slate-200 hover:text-indigo-400"
                  : "bg-white border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/40 text-slate-700 hover:text-indigo-600 shadow-2xs hover:shadow-md hover:shadow-indigo-500/10"
              }`}
            >
              <span className="text-xs font-semibold truncate pr-2 tracking-tight group-hover:translate-x-0.5 transition-transform">
                {itemText}
              </span>
              <FiChevronRight className={`text-xs shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${
                isDark ? "text-slate-500 group-hover:text-indigo-400" : "text-slate-400 group-hover:text-indigo-600"
              }`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PillListWidget;
