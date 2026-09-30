# farm-game
A top-down 2D farming simulation web game built with Phaser 3, TypeScript, and Vite.

farm-game/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── assets/
│       ├── characters/     # Sprite sheet nông dân (walk, idle, water, hoe)
│       ├── crops/          # Sprite các giai đoạn phát triển của cây
│       ├── tilesets/       # Tileset đất, cỏ, hàng rào, nhà cửa
│       ├── maps/           # File map JSON xuất từ Tiled (farm_map.json)
│       ├── ui/             # Icons hạt giống, nông sản, tiền tệ, khung popup
│       └── audio/          # Âm thanh cuốc đất, tưới nước, thu hoạch, mua bán
└── src/
    ├── main.ts             # File khởi tạo cấu hình Phaser Game
    ├── config/             # Cấu hình dữ liệu game (Data-driven)
    │   ├── items.config.ts # Thông tin các hạt giống, giá mua, giá bán, thời gian lớn
    │   └── game.config.ts  # Kích thước màn hình, grid size (vd: 16x16 hoặc 32x32)
    ├── scenes/             # Các màn chơi / trạng thái
    │   ├── BootScene.ts    # Tải trước assets
    │   ├── MainScene.ts    # Logic bản đồ, nhân vật, tương tác nông trại
    │   └── UIScene.ts      # Chạy song song (HUD: tiền tệ, balo, nút mở shop)
    ├── entities/           # Đối tượng trong thế giới game
    │   ├── Player.ts       # Nhân vật, di chuyển (WASD/mũi tên), hướng quay
    │   ├── Crop.ts         # Quản lý 1 cụm cây (giai đoạn nảy mầm -> lớn -> thu hoạch)
    │   └── FarmTile.ts     # Trạng thái từng ô đất (đất khô, ướt, đã xới, có cây trồng)
    ├── managers/           # Xử lý logic nghiệp vụ game
    │   ├── FarmManager.ts  # Quản lý lưới đất, tưới cây, tính thời gian cây lớn
    │   ├── InventoryManager.ts # Quản lý balo (thêm/bớt hạt giống, nông sản)
    │   ├── EconomyManager.ts   # Quản lý ví tiền (Gold), mua/bán
    │   └── TimeManager.ts      # Vòng lặp ngày/đêm hoặc tick thời gian trong game
    ├── ui/                 # Giao diện người dùng
    │   ├── ShopModal.ts    # Cửa sổ mua hạt giống, bán thành phẩm
    │   ├── Hotbar.ts       # Thanh chọn nhanh công cụ/hạt giống đang cầm trên tay
    │   └── FloatingText.ts # Hiển thị số tiền nhảy lên (+10G, -5G)
    └── utils/
        └── EventBus.ts     # Hệ thống truyền nhận sự kiện giữa Scenes và Managers