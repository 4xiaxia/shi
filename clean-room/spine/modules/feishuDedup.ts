const FEISHU_MESSAGE_DEDUP_TTL_MS = 5 * 60_000;

export class FeishuMessageDedupCache {
  private readonly processedMessages = new Map<string, number>();

  private cleanup(now: number = Date.now()): void {
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > FEISHU_MESSAGE_DEDUP_TTL_MS) {
        this.processedMessages.delete(messageId);
      }
    }
  }

  isProcessed(messageId: string): boolean {
    if (!messageId) {
      return false;
    }

    const now = Date.now();
    this.cleanup(now);
    if (this.processedMessages.has(messageId)) {
      return true;
    }

    this.processedMessages.set(messageId, now);
    return false;
  }

  size(): number {
    this.cleanup();
    return this.processedMessages.size;
  }
}
