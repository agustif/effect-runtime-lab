type Listener = (...args: ReadonlyArray<unknown>) => void;

export class TiLlrtEventEmitter {
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): this {
    const existing = this.listeners.get(event);
    if (existing) {
      existing.add(listener);
    } else {
      this.listeners.set(event, new Set([listener]));
    }
    return this;
  }

  once(event: string, listener: Listener): this {
    const onceListener: Listener = (...args) => {
      this.off(event, onceListener);
      listener(...args);
    };
    return this.on(event, onceListener);
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    return this.off(event, listener);
  }

  emit(event: string, ...args: ReadonlyArray<unknown>): boolean {
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) {
      return false;
    }
    for (const listener of Array.from(eventListeners)) {
      listener(...args);
    }
    return true;
  }

  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
