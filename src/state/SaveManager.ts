import type { FarmSnapshot } from '../managers/FarmManager.ts';
import type { InventorySnapshot } from '../managers/InventoryManager.ts';

export interface GameSaveData {
  readonly version: 1;
  readonly savedAt: number;
  readonly day: number;
  readonly money: number;
  readonly inventory: InventorySnapshot;
  readonly farm: FarmSnapshot;
}

const SAVE_KEY = 'farm-game:save:v1';

export class SaveManager {
  public save(data: GameSaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Không thể lưu game', error);
      return false;
    }
  }

  public load(): GameSaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data: unknown = JSON.parse(raw);
      return this.isValid(data) ? data : null;
    } catch (error) {
      console.warn('Không thể đọc save game', error);
      return null;
    }
  }

  public clear(): boolean {
    try {
      localStorage.removeItem(SAVE_KEY);
      return true;
    } catch (error) {
      console.warn('Không thể xóa save game', error);
      return false;
    }
  }

  private isValid(value: unknown): value is GameSaveData {
    if (!value || typeof value !== 'object') return false;
    const data = value as Partial<GameSaveData>;
    return data.version === 1 &&
      typeof data.savedAt === 'number' &&
      typeof data.day === 'number' &&
      typeof data.money === 'number' &&
      !!data.inventory && typeof data.inventory === 'object' &&
      !!data.farm && typeof data.farm === 'object';
  }
}
