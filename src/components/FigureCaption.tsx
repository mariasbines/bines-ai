interface FigureCaptionProps {
  children: React.ReactNode;
}

export function FigureCaption({ children }: FigureCaptionProps) {
  return (
    <figcaption className="font-mono text-xs text-ink/60 mt-2 uppercase tracking-[0.14em]">
      {children}
    </figcaption>
  );
}
