import { gameEvents } from '../utils/EventBus.ts';

export class EconomyManager {
  private balance: number;

  constructor(startingBalance = 200) {
    this.balance = this.normalize(startingBalance);
  }

  public get money(): number {
    return this.balance;
  }

  public canAfford(amount: number): boolean {
    return this.normalize(amount) <= this.balance;
  }

  public spend(amount: number): boolean {
    const value = this.normalize(amount);
    if (value <= 0 || value > this.balance) return false;
    this.balance -= value;
    this.notify(-value);
    return true;
  }

  public earn(amount: number): boolean {
    const value = this.normalize(amount);
    if (value <= 0) return false;
    this.balance += value;
    this.notify(value);
    return true;
  }

  public restore(balance: number): void {
    const previous = this.balance;
    this.balance = this.normalize(balance);
    this.notify(this.balance - previous);
  }

  private normalize(value: number): number {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  private notify(difference: number): void {
    gameEvents.emit('economy:changed', { balance: this.balance, difference });
  }
}
