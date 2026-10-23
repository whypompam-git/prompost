import { parseNote } from "@/lib/noteMarkup";
import { cn } from "@/lib/utils";

// Renders a note: **bold**, ==highlight== (yellow marker) and picture thumbnails.
export function NoteView({ text, images, className }: { text: string; images?: string[]; className?: string }) {
  return (
    <div className={className}>
      <p className="whitespace-pre-wrap text-sm text-gray-700">
        {parseNote(text).map((s, i) => (
          <span key={i} className={cn(s.bold && "font-bold text-gray-900", s.mark && "rounded bg-yellow-200 px-0.5 font-medium text-gray-900")}>
            {s.text}
          </span>
        ))}
      </p>
      {images && images.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-20 rounded-lg border border-gray-200 object-cover hover:opacity-90" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
