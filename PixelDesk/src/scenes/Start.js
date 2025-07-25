export class Start extends Phaser.Scene {

    constructor() {
        super('Start');
    }

    preload() {
        this.load.tilemapTiledJSON('officemap', 'assets/officemap.json');

        // Load images for single-image tilesets
        this.load.image('room_builder_walls_image', 'assets/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48/Room_Builder_Walls_48x48.png');
        this.load.image('pixel_office_assets', 'assets/PixelOffice/PixelOfficeAssets.png');
        this.load.image('ice_creem_image', 'assets/moderninteriors-win/6_Home_Designs/Ice-Cream_Shop_Designs/48x48/Ice_Cream_Shop_Design_layer_2_48x48.png');
        this.load.image('ice_creem_floor_image', 'assets/moderninteriors-win/6_Home_Designs/Ice-Cream_Shop_Designs/48x48/Ice_Cream_Shop_Design_layer_1_48x48.png');
        this.load.image('hospital_image', 'assets/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_48x48/19_Hospital_48x48.png');
        this.load.image('characters_list_image', 'assets/moderninteriors-win/2_Characters/Old/Single_Characters_Legacy/48x48/Adam_idle_48x48.png');

        // Load all individual images for library_tileset (Image Collection Tileset)
        // The key here MUST match the 'image' path in officemap.json for each tile
        for (let i = 1; i <= 75; i++) {
            const relativePathInTiledJson = `moderninteriors-win/1_Interiors/48x48/Theme_Sorter_Singles_48x48/5_Classroom_and_Library_Singles_48x48/Classroom_and_Library_Singles_48x48_${i}.png`;
            const fullAssetPath = `assets/${relativePathInTiledJson}`;
            this.load.image(relativePathInTiledJson, fullAssetPath);
        }
    }

    create() {
        const map = this.make.tilemap({ key: 'officemap' });

        // Add single-image tilesets
        const roomFloorTileset = map.addTilesetImage('room_floor_tileset', 'room_builder_walls_image');
        const roomWallTileset = map.addTilesetImage('room_wall_tileset', 'room_builder_walls_image');
        const officeTilesetBlue = map.addTilesetImage('office_tileset_blue', 'pixel_office_assets');
        const iceCreem = map.addTilesetImage('ice_creem', 'ice_creem_image');
        const iceCreemFloor = map.addTilesetImage('ice_creem_floor', 'ice_creem_floor_image');
        const hospital = map.addTilesetImage('hospital', 'hospital_image');
        const charactersList = map.addTilesetImage('characters_list', 'characters_list_image');

        // Add image collection tileset (only pass the Tiled tileset name)
        const libraryTileset = map.addTilesetImage('library_tileset');

        // Create layers, passing all relevant tilesets
        // The order in the array matters if tilesets have overlapping GIDs
        map.createLayer('office_1', [roomFloorTileset, roomWallTileset, hospital, iceCreem, iceCreemFloor, officeTilesetBlue, libraryTileset, charactersList]);
        map.createLayer('office_1_desk', [roomFloorTileset, roomWallTileset, hospital, iceCreem, iceCreemFloor, officeTilesetBlue, libraryTileset, charactersList]);
    }

    update() {
        // No update logic needed for static map display
    }
    
}
