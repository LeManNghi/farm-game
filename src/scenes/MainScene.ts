import Phaser from 'phaser';
import { GAME_SETTINGS } from '../config/game.config.ts';
import { Player } from '../entities/Player.ts';
import { FarmWorldBuilder } from '../world/FarmWorldBuilder.ts';
import { gameServices } from '../state/GameServices.ts';

export class MainScene extends Phaser.Scene {
  private player!: Player;
  private houseDoor!: Phaser.GameObjects.Sprite;
  private houseDoorPosition = new Phaser.Math.Vector2();
  private actionKey!: Phaser.Input.Keyboard.Key;
  private isTransitioning = false;

  constructor() {
    super({ key: 'MainScene' });
  }

  public create(data?: { fromHouse?: boolean }): void {
    this.isTransitioning = false;
    const { TILE_SIZE, MAP_COLS, MAP_ROWS } = GAME_SETTINGS;
    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const world = new FarmWorldBuilder(this).build();
    this.houseDoor = world.houseDoor;
    this.houseDoorPosition = world.houseDoorPosition;
    world.farmTiles.forEach((tile, id) => gameServices.farm.registerTile(id, tile));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      world.farmTiles.forEach((_tile, id) => gameServices.farm.unregisterTile(id));
    });

    const spawnX = this.houseDoorPosition.x;
    const spawnY = data?.fromHouse ? this.houseDoorPosition.y + 14 : this.houseDoorPosition.y + 18;
    this.player = new Player(this, spawnX, spawnY);

    if (data?.fromHouse) {
      this.player.play('player-idle-down');
      this.player.currentDirection = 'down';
    }

    this.physics.add.collider(this.player, world.houseColliders);
    this.physics.add.collider(this.player, world.gateColliders);
    this.physics.add.collider(this.player, world.waterColliders);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setZoom(2);

    const resize = (gameSize: Phaser.Structs.Size): void => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', resize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', resize));

    if (data?.fromHouse) this.cameras.main.fadeIn(300, 0, 0, 0);
    if (this.input.keyboard) {
      this.actionKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    }
  }

  public update(): void {
    if (this.isTransitioning || !this.player) return;
    this.player.update();
    this.checkHouseInteraction();
  }

  private checkHouseInteraction(): void {
    const distance = Phaser.Math.Distance.BetweenPoints(this.player, this.houseDoorPosition);
    if (distance >= 20) return;

    if (Phaser.Input.Keyboard.JustDown(this.actionKey) || distance < 12) {
      this.enterHouse();
    }
  }

  private enterHouse(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.houseDoor.play('door-open');
    (this.player.body as Phaser.Physics.Arcade.Body)?.setVelocity(0, 0);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('HouseScene');
    });
  }
}
