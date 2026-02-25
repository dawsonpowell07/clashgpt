import { Filter, X, TrendingUp } from "lucide-react";

interface ActiveFilterTagsProps {
  includedVariants: Set<string>;
  excludedVariants: Set<string>;
  minGames: number;
  getCardLabel: (id: string) => string;
}

export function ActiveFilterTags({
  includedVariants,
  excludedVariants,
  minGames,
  getCardLabel,
}: ActiveFilterTagsProps) {
  const hasFilters = includedVariants.size > 0 || excludedVariants.size > 0 || minGames > 0;
  if (!hasFilters) return null;

  return (
    <div className="relative pt-4 border-t border-border/30">
      <div className="flex flex-wrap gap-2">
        {Array.from(includedVariants).map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-600 dark:text-green-400 ring-1 ring-green-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105"
          >
            <Filter className="w-3 h-3" />
            {getCardLabel(id)}
          </span>
        ))}
        {Array.from(excludedVariants).map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-600 dark:text-red-400 ring-1 ring-red-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105"
          >
            <X className="w-3 h-3" />
            {getCardLabel(id)}
          </span>
        ))}
        {minGames > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30 shadow-sm backdrop-blur-sm transform transition-all hover:scale-105">
            <TrendingUp className="w-3 h-3" />
            Min {minGames} games
          </span>
        )}
      </div>
    </div>
  );
}
