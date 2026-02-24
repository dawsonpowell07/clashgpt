import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecksResponse } from "@/lib/types";

interface DecksPaginationProps {
  decksData: DecksResponse;
  page: number;
  isSearching: boolean;
  onPageChange: (page: number) => void;
}

export function DecksPagination({
  decksData,
  page,
  isSearching,
  onPageChange,
}: DecksPaginationProps) {
  if (isSearching || decksData.total === 0) return null;

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/30">
      <div className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">{(decksData.page - 1) * 24 + 1}</span> to{" "}
        <span className="font-semibold text-foreground">
          {Math.min(decksData.page * 24, decksData.total)}
        </span>{" "}
        of <span className="font-semibold text-foreground">{decksData.total}</span> decks
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!decksData.has_previous || isSearching}
          className="hover:bg-primary/10 hover:border-primary/50 transition-all"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!decksData.has_next || isSearching}
          className="hover:bg-primary/10 hover:border-primary/50 transition-all"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
