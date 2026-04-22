/**
 * Detect agent-like behaviour / prompt-injection / role-swap attempts in chat requests.
 *
 * Adopted from the Moss pattern (~/synapsedx-main/app/api/chat/agent-guard.ts).
 * Extended with a `system_reveal_attempt` signal for bines.ai.
 *
 * IMPORTANT: this is a DETECT-AND-LOG surface, NOT a hard-block.
 * Per SEC-001 mitigation, legitimate provocative questions must still
 * get replies. We log signals and could (future) append them to the
 * prompt as a `<injection_signals>` note if abuse escalates.
 */

interface Message {
  role: string;
  content: string;
}

export interface GuardResult {
  isLikelyAgent: boolean;
  signals: string[];
}

export function detectAgentBehaviour(messages: Message[]): GuardResult {
  const signals: string[] = [];

  if (messages.length === 1) {
    const content = messages[0]?.content?.toLowerCase() ?? '';

    // Structured-extraction probes
    if (
      content.includes('list all') ||
      content.includes('enumerate') ||
      content.includes('json format') ||
      content.includes('as json') ||
      content.includes('in json')
    ) {
      signals.push('structured_extraction');
    }

    // Prompt-injection attempts
    if (
      content.includes('ignore previous') ||
      content.includes('ignore your previous') ||
      content.includes('disregard previous') ||
      content.includes('instructions above') ||
      content.includes('system prompt')
    ) {
      signals.push('prompt_injection_attempt');
    }

    // Role-swap attempts
    if (
      content.includes('pretend you are') ||
      content.includes('pretend to be') ||
      content.includes('act as') ||
      content.includes('you are now') ||
      content.includes('you are no longer')
    ) {
      signals.push('role_swap_attempt');
    }

    // System-reveal attempts
    if (
      content.includes('reveal your') ||
      content.includes('show me your prompt') ||
      content.includes('print your rules') ||
      content.includes('what are your instructions') ||
      content.includes('describe your guidelines')
    ) {
      signals.push('system_reveal_attempt');
    }

    // Rapid-fire single-turn queries
    if ((messages[0]?.content?.length ?? 0) > 500) {
      signals.push('long_single_query');
    }
  }

  return {
    isLikelyAgent: signals.length >= 2,
    signals,
  };
}
