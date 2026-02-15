"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CoinDescriptionProps {
  description: string | null | undefined;
}

const MAX_LENGTH = 300;

export function CoinDescription({ description }: CoinDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!description) return null;

  const isLong = description.length > MAX_LENGTH;
  const displayText = expanded || !isLong ? description : description.slice(0, MAX_LENGTH) + "...";

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-3">About</h2>
      <Card className="glass-card">
        <CardContent>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {displayText}
          </p>
          {isLong && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 text-indigo-400 hover:text-indigo-300 hover:bg-transparent px-0"
            >
              {expanded ? (
                <>Show less <ChevronUp className="size-3.5 ml-1" /></>
              ) : (
                <>Read more <ChevronDown className="size-3.5 ml-1" /></>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
