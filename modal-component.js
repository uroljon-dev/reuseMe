class CustomModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const seen = sessionStorage.getItem('reuse_modal_shown');
    if (seen === '1') return;

    this._rootModal = this.querySelector('#welcome-modal') || this.querySelector('.modal');
    if (!this._rootModal) return;

    this._allowBtn = this.querySelector('#allow-location');
    this._closeBtn = this.querySelector('#dont-allow');
    this._iconClose = this.querySelector('#modal-close');

    this._allowBtn && this._allowBtn.addEventListener('click', this._onAllow.bind(this));
    this._closeBtn && this._closeBtn.addEventListener('click', this._onClose.bind(this));
    this._iconClose && this._iconClose.addEventListener('click', this._onClose.bind(this));
    window.addEventListener('keydown', this._onKey.bind(this));

    this._rootModal.style.display = 'flex';
    document.body.classList.add('modal-active');
    setTimeout(() => this._allowBtn && this._allowBtn.focus(), 150);
  }

  _onKey(e) {
    if (e.key === 'Escape') this._onClose();
  }

  _onClose() {
    const checkbox = this.querySelector('#dont-show-welcome-modal');
    if (checkbox && checkbox.checked) {
      sessionStorage.setItem('reuse_modal_shown', '1');
    }
    this._hide();
  }

  _onAllow() {
    const checkbox = this.querySelector('#dont-show-welcome-modal');
    if (checkbox && checkbox.checked) {
      sessionStorage.setItem('reuse_modal_shown', '1');
    }
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      this._onClose();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };

        if (window.map && typeof window.map.setView === 'function') {
          try {
            window.map.setView([coords.lat, coords.lon], 15);
            if (window.L) {
              const locationIcon = L.divIcon({
                className: 'user-location-marker',
                html: '<div class="location-circle"><div class="location-dot"></div></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              if (window.userLocationMarker) {
                window.userLocationMarker.setLatLng([coords.lat, coords.lon]);
              } else {
                window.userLocationMarker = L.marker([coords.lat, coords.lon], { icon: locationIcon }).addTo(window.map).bindPopup('Your location');
              }
            }
          } catch (e) {
            console.warn('Could not update global map with location', e);
          }
        }

        this._hide();
      },
      (err) => {
        console.warn('Geolocation failed or denied', err);
        this._hide();
      },
      { timeout: 10000 }
    );
  }

  _hide() {
    if (this._rootModal) this._rootModal.style.display = 'none';
    document.body.classList.remove('modal-active');
  }
}

customElements.define('custom-modal', CustomModal);