/**
 * Component Modal hướng dẫn điều khiển game nông trại
 * Hiển thị nút thông báo và popup bảng hướng dẫn chi tiết
 */
export class InstructionsModal {
  private container: HTMLElement;
  private notiButton!: HTMLButtonElement;
  private overlay!: HTMLElement;
  private modalCard!: HTMLElement;
  private isOpen: boolean = false;

  constructor(parent: HTMLElement = document.body) {
    this.container = parent;
    this.createElements();
    this.bindEvents();
  }

  private createElements(): void {
    // 1. Nút icon dấu chấm than trôi nổi ở góc màn hình
    this.notiButton = document.createElement('button');
    this.notiButton.className = 'guide-noti-btn';
    this.notiButton.setAttribute('type', 'button');
    this.notiButton.setAttribute('title', 'Hướng dẫn điều khiển');
    this.notiButton.setAttribute('aria-label', 'Mở hướng dẫn chơi');
    this.notiButton.innerHTML = `<img src="/assets/ui/notification_icon.png" class="noti-icon-img" alt="Hướng dẫn" />`;

    // 2. Lớp phủ mờ (Modal Overlay)
    this.overlay = document.createElement('div');
    this.overlay.className = 'guide-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    // 3. Khung nội dung hướng dẫn (Modal Card)
    this.modalCard = document.createElement('div');
    this.modalCard.className = 'guide-modal-card';

    this.modalCard.innerHTML = `
      <div class="guide-header">
        <div class="guide-title-wrap">
          <img src="/assets/ui/notification_icon.png" class="guide-title-icon" alt="icon" />
          <h2 class="guide-title">HƯỚNG DẪN ĐIỀU KHIỂN</h2>
        </div>
        <button class="guide-close-btn" type="button" aria-label="Đóng">&times;</button>
      </div>

      <div class="guide-body">
        <div class="guide-item">
          <div class="guide-keys">
            <span class="key-chip">W</span>
            <span class="key-chip">A</span>
            <span class="key-chip">S</span>
            <span class="key-chip">D</span>
            <span class="key-or">hoặc</span>
            <span class="key-chip">↑ ← ↓ →</span>
          </div>
          <div class="guide-desc">
            <strong>Di chuyển:</strong> Điều khiển nông dân đi theo 4 hướng trên bản đồ.
          </div>
        </div>

        <div class="guide-item">
          <div class="guide-keys">
            <span class="key-chip">Shift</span>
          </div>
          <div class="guide-desc">
            <strong>Chạy nhanh:</strong> Giữ phím Shift khi di chuyển để tăng tốc độ lên 1.5 lần.
          </div>
        </div>

        <div class="guide-item">
          <div class="guide-keys">
            <span class="key-chip">E</span>
            <span class="key-or">hoặc</span>
            <span class="key-badge-action">Đi tới cửa</span>
          </div>
          <div class="guide-desc">
            <strong>Vào nhà / Ra ngoài:</strong> Tương tác với cửa nhà gỗ để ra vào giữa nông trại và trong nhà.
          </div>
        </div>

        <div class="guide-item">
          <div class="guide-keys">
            <span class="key-chip">E</span>
            <span class="key-badge-action">Gần giường</span>
          </div>
          <div class="guide-desc">
            <strong>Nghỉ ngơi:</strong> Trong nhà, tiến lại gần giường ngủ và nhấn E để nằm nghỉ ngơi.
          </div>
        </div>

        <div class="guide-item">
          <div class="guide-keys">
            <span class="key-badge-action">🌸 Cổng hoa & Vườn đất</span>
          </div>
          <div class="guide-desc">
            <strong>Khu đất trồng:</strong> Bãi đất trồng 6x5 ô và cổng hoa trang trí nằm ở giữa bản đồ nông trại.
          </div>
        </div>
      </div>

      <div class="guide-footer">
        <span class="guide-tip">💡 Mẹo: Nhấn nút dấu chấm than, bấm ra ngoài hoặc nhấn [ESC] để đóng</span>
      </div>
    `;

    this.overlay.appendChild(this.modalCard);
    this.container.appendChild(this.notiButton);
    this.container.appendChild(this.overlay);
  }

  private bindEvents(): void {
    // Click vào nút icon chấm than để bật/tắt
    this.notiButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Nút đóng
    const closeBtn = this.modalCard.querySelector('.guide-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // Click ra ngoài overlay để đóng
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Ngăn chặn nổi bọt sự kiện bên trong card
    this.modalCard.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Nhấn phím Escape để đóng
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  public open(): void {
    this.isOpen = true;
    this.overlay.classList.add('is-open');
    this.notiButton.classList.add('is-active');
    this.overlay.setAttribute('aria-hidden', 'false');
  }

  public close(): void {
    this.isOpen = false;
    this.overlay.classList.remove('is-open');
    this.notiButton.classList.remove('is-active');
    this.overlay.setAttribute('aria-hidden', 'true');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public destroy(): void {
    this.notiButton.remove();
    this.overlay.remove();
  }
}
