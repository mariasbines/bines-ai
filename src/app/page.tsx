import { BioLine } from '@/components/BioLine';

export default function Home() {
  return (
    <div className="space-y-8">
      <BioLine />
      <p className="font-serif text-base text-ink/60 italic leading-relaxed">
        Fieldwork and postcards arriving soon. First piece lands with story 001.004; the <code className="font-mono text-ink/80">/argue</code> chat lands with 001.012.
      </p>
    </div>
  );
}
