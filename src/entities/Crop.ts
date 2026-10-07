import Phaser from 'phaser';
import type { CropDefinition, CropId } from '../config/items.config.ts';
import { getCropDefinition } from '../config/items.config.ts';

export interface HarvestResult {
  readonly cropId: CropId;
  readonly itemFrame: number;
  readonly amount: number;
}

export interface CropSnapshot {
  readonly cropId: CropId;
  readonly growthStage: number;
  readonly elapsedGrowthDays: number;
  readonly readyToHarvest: boolean;
}

export class Crop extends Phaser.GameObjects.Sprite {
  public readonly cropId: CropId;
  public readonly definition: CropDefinition;

  private growthStage = 0;
  private elapsedGrowthDays = 0;
  private readyToHarvest = false;

  constructor(scene: Phaser.Scene, x: number, y: number, cropId: CropId) {
    const definition = getCropDefinition(cropId);
    super(scene, x, y, definition.textureKey, definition.growthFrames[0]);

    this.cropId = cropId;
    this.definition = definition;

    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(y);
  }

  public get stage(): number {
    return this.growthStage;
  }

  public get isHarvestable(): boolean {
    return this.readyToHarvest;
  }

  public advanceGrowth(days = 1): boolean {
    if (days <= 0 || this.readyToHarvest) return false;

    this.elapsedGrowthDays += days;
    let changed = false;

    while (
      this.elapsedGrowthDays >= this.definition.daysPerStage &&
      !this.readyToHarvest
    ) {
      this.elapsedGrowthDays -= this.definition.daysPerStage;

      if (this.growthStage < this.definition.growthFrames.length - 1) {
        this.growthStage += 1;
        this.setFrame(this.definition.growthFrames[this.growthStage]);
        changed = true;
      }

      if (this.growthStage === this.definition.growthFrames.length - 1) {
        this.readyToHarvest = true;
      }
    }

    return changed;
  }

  public harvest(): HarvestResult | null {
    if (!this.readyToHarvest) return null;

    const result: HarvestResult = {
      cropId: this.cropId,
      itemFrame: this.definition.harvestFrame,
      amount: this.definition.harvestAmount,
    };

    if (this.definition.kind === 'orchard') {
      this.growthStage = 0;
      this.elapsedGrowthDays = 0;
      this.readyToHarvest = false;
      this.setFrame(this.definition.growthFrames[0]);
    }

    return result;
  }

  public snapshot(): CropSnapshot {
    return {
      cropId: this.cropId,
      growthStage: this.growthStage,
      elapsedGrowthDays: this.elapsedGrowthDays,
      readyToHarvest: this.readyToHarvest,
    };
  }

  public restore(snapshot: CropSnapshot): void {
    const lastStage = this.definition.growthFrames.length - 1;
    this.growthStage = Phaser.Math.Clamp(Math.floor(snapshot.growthStage), 0, lastStage);
    this.elapsedGrowthDays = Math.max(0, snapshot.elapsedGrowthDays);
    this.readyToHarvest = snapshot.readyToHarvest && this.growthStage === lastStage;
    this.setFrame(this.definition.growthFrames[this.growthStage]);
  }
}
