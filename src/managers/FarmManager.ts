import type { FarmTile, FarmTileSnapshot } from '../entities/FarmTile.ts';
import type { Crop } from '../entities/Crop.ts';
import { gameEvents } from '../utils/EventBus.ts';

export interface FarmSnapshot {
  readonly tiles: Record<string, FarmTileSnapshot>;
}

export class FarmManager {
  private readonly tiles = new Map<string, FarmTile>();
  private readonly orchardCrops = new Set<Crop>();
  private pendingTileSnapshots: Record<string, FarmTileSnapshot> = {};

  public registerTile(id: string, tile: FarmTile): void {
    if (!id) throw new Error('Farm tile id không được để trống');
    this.tiles.set(id, tile);
    const pending = this.pendingTileSnapshots[id];
    if (pending) {
      tile.restore(pending);
      delete this.pendingTileSnapshots[id];
    }
  }

  public unregisterTile(id: string): void {
    const tile = this.tiles.get(id);
    if (tile) this.pendingTileSnapshots[id] = tile.snapshot();
    this.tiles.delete(id);
  }

  public registerOrchardCrop(crop: Crop): void {
    if (crop.definition.kind !== 'orchard') {
      throw new Error('Chỉ cây ăn quả được đăng ký vào khu vườn cây');
    }
    this.orchardCrops.add(crop);
  }

  public unregisterOrchardCrop(crop: Crop): void {
    this.orchardCrops.delete(crop);
  }

  public advanceDay(): void {
    this.tiles.forEach((tile) => tile.advanceDay());
    this.orchardCrops.forEach((crop) => crop.advanceGrowth(1));
    gameEvents.emit('farm:changed', undefined);
  }

  public snapshot(): FarmSnapshot {
    return {
      tiles: {
        ...this.pendingTileSnapshots,
        ...Object.fromEntries(Array.from(this.tiles, ([id, tile]) => [id, tile.snapshot()])),
      },
    };
  }

  public restore(snapshot: FarmSnapshot): void {
    this.pendingTileSnapshots = { ...snapshot.tiles };
    Object.entries(snapshot.tiles).forEach(([id, tileSnapshot]) => {
      const tile = this.tiles.get(id);
      if (tile) {
        tile.restore(tileSnapshot);
        delete this.pendingTileSnapshots[id];
      }
    });
    gameEvents.emit('farm:changed', undefined);
  }
}
