export type CropKind = 'field' | 'orchard';

export interface CropDefinition {
  readonly id: string;
  readonly name: string;
  readonly kind: CropKind;
  readonly textureKey: string;
  readonly assetPath: string;
  readonly frameWidth: 16 | 32;
  readonly frameHeight: 16 | 32;
  readonly seedFrame: number;
  readonly growthFrames: readonly number[];
  readonly harvestFrame: number;
  readonly daysPerStage: number;
  readonly regrowDays?: number;
  readonly harvestAmount: number;
}

const fieldCrop = (id: string, name: string): CropDefinition => ({
  id,
  name,
  kind: 'field',
  textureKey: `crop_${id}`,
  assetPath: `assets/crops/${id}_growing.png`,
  frameWidth: 16,
  frameHeight: 16,
  seedFrame: 0,
  growthFrames: [1, 2, 3],
  harvestFrame: 4,
  daysPerStage: 1,
  harvestAmount: 1,
});

const orchardCrop = (id: string, name: string): CropDefinition => ({
  id,
  name,
  kind: 'orchard',
  textureKey: `crop_${id}`,
  assetPath: `assets/crops/${id}_growing.png`,
  frameWidth: 32,
  frameHeight: 32,
  seedFrame: 0,
  growthFrames: [1, 2],
  harvestFrame: 3,
  daysPerStage: 2,
  regrowDays: 2,
  harvestAmount: 1,
});

export const CROP_DEFINITIONS = {
  carrot: fieldCrop('carrot', 'Cà rốt'),
  cabbage: fieldCrop('cabbage', 'Bắp cải'),
  corn: fieldCrop('corn', 'Ngô'),
  eggplant: fieldCrop('eggplant', 'Cà tím'),
  strawberry: fieldCrop('strawberry', 'Dâu tây'),
  wheat: fieldCrop('wheat', 'Lúa mì'),
  white_radish: fieldCrop('white_radish', 'Củ cải trắng'),
  apple_tree: orchardCrop('apple_tree', 'Cây táo'),
  orange_tree: orchardCrop('orange_tree', 'Cây cam'),
} as const satisfies Record<string, CropDefinition>;

export type CropId = keyof typeof CROP_DEFINITIONS;

export const getCropDefinition = (cropId: CropId): CropDefinition =>
  CROP_DEFINITIONS[cropId];
