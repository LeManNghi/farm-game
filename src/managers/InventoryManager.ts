import { gameEvents } from '../utils/EventBus.ts';

export type InventorySnapshot = Record<string, number>;

export class InventoryManager {
  private readonly items = new Map<string, number>();

  public count(itemId: string): number {
    return this.items.get(itemId) ?? 0;
  }

  public has(itemId: string, amount = 1): boolean {
    return amount > 0 && this.count(itemId) >= amount;
  }

  public add(itemId: string, amount = 1): boolean {
    if (!itemId || !Number.isInteger(amount) || amount <= 0) return false;
    this.items.set(itemId, this.count(itemId) + amount);
    this.notify();
    return true;
  }

  public remove(itemId: string, amount = 1): boolean {
    if (!this.has(itemId, amount)) return false;
    const remaining = this.count(itemId) - amount;
    if (remaining === 0) this.items.delete(itemId);
    else this.items.set(itemId, remaining);
    this.notify();
    return true;
  }

  public snapshot(): InventorySnapshot {
    return Object.fromEntries(this.items);
  }

  public restore(snapshot: InventorySnapshot): void {
    this.items.clear();
    Object.entries(snapshot).forEach(([itemId, amount]) => {
      if (itemId && Number.isInteger(amount) && amount > 0) this.items.set(itemId, amount);
    });
    this.notify();
  }

  private notify(): void {
    gameEvents.emit('inventory:changed', { items: this.snapshot() });
  }
}
