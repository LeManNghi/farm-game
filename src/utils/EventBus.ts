export interface GameEvents {
  'time:day-changed': { day: number };
  'inventory:changed': { items: Readonly<Record<string, number>> };
  'economy:changed': { balance: number; difference: number };
  'farm:changed': undefined;
  'save:completed': { savedAt: number };
}

type EventHandler<T> = (payload: T) => void;

export class EventBus<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<EventHandler<never>>>();

  public on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): () => void {
    const handlers = this.handlers.get(event) ?? new Set<EventHandler<never>>();
    handlers.add(handler as EventHandler<never>);
    this.handlers.set(event, handlers);
    return () => this.off(event, handler);
  }

  public off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<never>);
  }

  public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload as never));
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const gameEvents = new EventBus<GameEvents>();
