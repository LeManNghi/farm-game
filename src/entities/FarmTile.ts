import Phaser from 'phaser';
import type { CropId } from '../config/items.config.ts';
import { getCropDefinition } from '../config/items.config.ts';
import { Crop, type CropSnapshot, type HarvestResult } from './Crop.ts';

export type SoilState = 'dry' | 'wet';

const SOIL_FRAMES: Record<SoilState, number> = {
  dry: 0,
  wet: 1,
};

export interface FarmTileSnapshot {
  readonly soilState: SoilState;
  readonly crop: CropSnapshot | null;
}

export class FarmTile extends Phaser.GameObjects.Sprite {
  public crop: Crop | null = null;
  public soilState: SoilState = 'dry';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'farm_tile_states', SOIL_FRAMES.dry);
    scene.add.existing(this);
    this.setDepth(y - 1);
  }

  public get isOccupied(): boolean {
    return this.crop !== null;
  }

  public plant(cropId: CropId): Crop | null {
    if (this.crop || getCropDefinition(cropId).kind !== 'field') return null;

    const cropBottomY = this.y + this.displayHeight / 2;
    this.crop = new Crop(this.scene, this.x, cropBottomY, cropId);
    return this.crop;
  }

  public water(): boolean {
    if (this.soilState === 'wet') return false;
    this.soilState = 'wet';
    this.setFrame(SOIL_FRAMES.wet);
    return true;
  }

  public advanceDay(): boolean {
    if (this.soilState !== 'wet') return false;

    const grew = this.crop?.advanceGrowth(1) ?? false;
    this.setSoilState('dry');
    return grew;
  }

  public harvest(): HarvestResult | null {
    if (!this.crop) return null;

    const result = this.crop.harvest();
    if (!result) return null;

    if (this.crop.definition.kind === 'field') {
      this.crop.destroy();
      this.crop = null;
    }

    return result;
  }

  public clearCrop(): void {
    this.crop?.destroy();
    this.crop = null;
  }

  public snapshot(): FarmTileSnapshot {
    return {
      soilState: this.soilState,
      crop: this.crop?.snapshot() ?? null,
    };
  }

  public restore(snapshot: FarmTileSnapshot): void {
    this.clearCrop();
    this.setSoilState(snapshot.soilState === 'wet' ? 'wet' : 'dry');
    if (!snapshot.crop) return;

    const crop = this.plant(snapshot.crop.cropId);
    crop?.restore(snapshot.crop);
  }

  private setSoilState(state: SoilState): void {
    this.soilState = state;
    this.setFrame(SOIL_FRAMES[state]);
  }
}
