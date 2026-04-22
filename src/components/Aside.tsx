interface AsideProps {
  children: React.ReactNode;
}

export function Aside({ children }: AsideProps) {
  return (
    <aside className="font-serif text-base italic text-ink/70 my-6 pl-6 border-l border-ink/15">
      {children}
    </aside>
  );
}
