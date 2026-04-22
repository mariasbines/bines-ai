import { ChatInterface } from '@/components/ChatInterface';

export default function ArguePage() {
  return (
    <div className="max-w-3xl">
      <header className="mb-10">
        <h1 className="font-serif font-black text-5xl tracking-tight mb-4">Argue</h1>
        <p className="font-serif text-lg leading-relaxed text-ink/80 max-w-xl">
          This is an AI trained on Maria&apos;s voice. It&apos;s not her. Push back, ask it hard
          questions, try to change its mind. Refresh to clear the conversation.
        </p>
      </header>

      <ChatInterface />
    </div>
  );
}
