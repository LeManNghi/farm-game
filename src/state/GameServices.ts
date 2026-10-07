import { EconomyManager } from '../managers/EconomyManager.ts';
import { FarmManager } from '../managers/FarmManager.ts';
import { InventoryManager } from '../managers/InventoryManager.ts';
import { TimeManager } from '../managers/TimeManager.ts';
import { gameEvents } from '../utils/EventBus.ts';
import { SaveManager, type GameSaveData } from './SaveManager.ts';

export class GameServices {
  public readonly economy = new EconomyManager();
  public readonly farm = new FarmManager();
  public readonly inventory = new InventoryManager();
  public readonly time = new TimeManager();
  public readonly saves = new SaveManager();

  private loaded = false;

  public loadOnce(): boolean {
    if (this.loaded) return false;
    this.loaded = true;
    const save = this.saves.load();
    if (!save) return false;

    this.time.restore(save.day);
    this.economy.restore(save.money);
    this.inventory.restore(save.inventory);
    this.farm.restore(save.farm);
    return true;
  }

  public advanceDay(): number {
    this.farm.advanceDay();
    const day = this.time.advanceDay();
    this.save();
    return day;
  }

  public save(): boolean {
    const savedAt = Date.now();
    const data: GameSaveData = {
      version: 1,
      savedAt,
      day: this.time.day,
      money: this.economy.money,
      inventory: this.inventory.snapshot(),
      farm: this.farm.snapshot(),
    };
    const saved = this.saves.save(data);
    if (saved) gameEvents.emit('save:completed', { savedAt });
    return saved;
  }
}

export const gameServices = new GameServices();
