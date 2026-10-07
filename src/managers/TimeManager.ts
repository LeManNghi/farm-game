import { gameEvents } from '../utils/EventBus.ts';

export class TimeManager {
  private currentDay = 1;

  public get day(): number {
    return this.currentDay;
  }

  public advanceDay(): number {
    this.currentDay += 1;
    gameEvents.emit('time:day-changed', { day: this.currentDay });
    return this.currentDay;
  }

  public restore(day: number): void {
    this.currentDay = Number.isInteger(day) ? Math.max(1, day) : 1;
    gameEvents.emit('time:day-changed', { day: this.currentDay });
  }
}
