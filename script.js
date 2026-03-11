// const GEOJSON_API_URL = "https://opendata.stadt-muenster.de/sites/default/files/Tausch-und-Spende-Angebote-in-Muenster2024.geojson";
const GEOJSON_LOCAL_PATH = "./geojson.json";
const MUENSTER_COORDS = [51.9607, 7.6261];
const WORKER_URL = "https://reuseme.ukhidirboev.workers.dev/";
const WORKER_API_KEY = process.env.WORKER_API_KEY;
const AI_MAPPING = { 'S': 'S1', 'C': 'S2' };
const CATEGORIES = [
  { key: 'K', name: 'Kleidung', icon: '👕' },
  { key: 'E', name: 'Elektrogeräte', icon: '🔌' },
  { key: 'M', name: 'Möbel', icon: '🪑' },
  { key: 'S1', name: 'Kinderspielzeug und Spiele', icon: '🧸' },
  { key: 'S2', name: 'PC-Spiele, CDs, DVDs…', icon: '🎮' },
  { key: 'D', name: 'Dekorationsartikel', icon: '🎨' },
  { key: 'H', name: 'Haushaltsgegenstände', icon: '🏠' },
  { key: 'B', name: 'Bücher', icon: '📚' },
  { key: 'F', name: 'Fahrräder', icon: '🚲' },
  { key: 'W', name: 'Verschiedenes', icon: '📦' }
];

async function setMap() {
  const map = L.map('map', { zoomControl: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://opendata.stadt-muenster.de/dataset/liste-der-orte-zum-spenden-verkaufen-tauschen-m%C3%BCnster">opendata.stadt-muenster.de</a>'
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add My Location control above zoom
  const LocationControl = L.Control.extend({
    options: {
      position: 'bottomright'
    },
    onAdd: function (map) {
      const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-location');
      const button = L.DomUtil.create('a', 'leaflet-control-location-button', container);
      button.innerHTML = '📍';
      button.href = '#';
      button.title = 'My Location';
      L.DomEvent.on(button, 'click', L.DomEvent.stopPropagation)
        .on(button, 'click', L.DomEvent.preventDefault)
        .on(button, 'click', this._onLocationClick, this);
      return container;
    },
    _onLocationClick: function () {
      if (!navigator.geolocation) {
        alert('Geolokalisierung wird von Ihrem Browser nicht unterstützt.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          map.setView(coords, 15);
          // Update or add user location marker
          if (window.userLocationMarker) {
            window.userLocationMarker.setLatLng(coords);
          } else {
            const locationIcon = L.divIcon({
              className: 'user-location-marker',
              html: '<div class="location-circle"><div class="location-dot"></div></div>',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });
            window.userLocationMarker = L.marker(coords, { icon: locationIcon }).addTo(map).bindPopup('Ihr Standort');
          }
        },
        (err) => {
          alert('Standort konnte nicht abgerufen werden.');
        }
      );
    }
  });
  map.addControl(new LocationControl());

  // Add Search control
  const SearchControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function (map) {
      const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-search');

      const burgerButton = L.DomUtil.create('button', 'burger-menu', container);
      burgerButton.innerHTML = '☰';
      burgerButton.title = 'Kategorien filtern';

      const searchInput = L.DomUtil.create('input', 'search-input', container);
      searchInput.type = 'text';
      searchInput.placeholder = 'Beschreiben den Artikel der KI...';

      const searchButton = L.DomUtil.create('button', 'search-button', container);
      searchButton.innerHTML = '🔍';
      searchButton.title = 'Suchen';
      
      // Create side filter panel
      const filterPanel = L.DomUtil.create('div', 'filter-panel', document.body);
      const panelHeader = L.DomUtil.create('div', 'panel-header', filterPanel);
      const closeButton = L.DomUtil.create('button', 'close-panel', panelHeader);
      closeButton.innerHTML = '✕';
      closeButton.title = 'Schließen';
      const panelTitle = L.DomUtil.create('h3', '', panelHeader);
      panelTitle.textContent = 'Kategorien filtern';

      const panelContent = L.DomUtil.create('div', 'panel-content', filterPanel);
      
      // Select All checkbox
      const selectAllLabel = L.DomUtil.create('label', 'category-label select-all-label', panelContent);
      const selectAllCheckbox = L.DomUtil.create('input', '', selectAllLabel);
      selectAllCheckbox.type = 'checkbox';
      selectAllCheckbox.checked = true; // Default all selected
      selectAllLabel.appendChild(document.createTextNode('Alle auswählen'));

      CATEGORIES.forEach(cat => {
        const label = L.DomUtil.create('label', 'category-label', panelContent);
        const checkbox = L.DomUtil.create('input', '', label);
        checkbox.type = 'checkbox';
        checkbox.value = cat.key;
        checkbox.checked = true; // Default all selected
        label.appendChild(document.createTextNode(` ${cat.icon} ${cat.name}`));
      });

      // Donation acceptance section
      const donationSection = L.DomUtil.create('div', 'donation-section', panelContent);
      const donationHeader = L.DomUtil.create('p', 'donation-section__header', donationSection);
      donationHeader.textContent = 'Spenden Annahme:';

      const donationOptions = L.DomUtil.create('div', 'donation-options', donationSection);

      const radioJa = L.DomUtil.create('input', '', donationOptions);
      radioJa.type = 'radio';
      radioJa.name = 'donation';
      radioJa.value = 'ja';
      const labelJa = L.DomUtil.create('label', 'donation-options__label', donationOptions);
      labelJa.appendChild(radioJa);
      const spanJa = L.DomUtil.create('span', '', labelJa);
      spanJa.textContent = 'Ja';
      
      const radioNein = L.DomUtil.create('input', '', donationOptions);
      radioNein.type = 'radio';
      radioNein.name = 'donation';
      radioNein.value = 'nein';
      const labelNein = L.DomUtil.create('label', 'donation-options__label', donationOptions);
      labelNein.appendChild(radioNein);
      const spanNein = L.DomUtil.create('span', '', labelNein);
      spanNein.textContent = 'Nein';
      
      const radioBeide = L.DomUtil.create('input', '', donationOptions);
      radioBeide.type = 'radio';
      radioBeide.name = 'donation';
      radioBeide.value = 'beide';
      radioBeide.checked = true;
      const labelBeide = L.DomUtil.create('label', 'donation-options__label', donationOptions);
      labelBeide.appendChild(radioBeide);
      const spanBeide = L.DomUtil.create('span', '', labelBeide);
      spanBeide.textContent = 'Beide';

      // Function to update checked state
      const updateDonationLabels = () => {
        document.querySelectorAll('.donation-options__label').forEach(label => {
          const input = label.querySelector('input[type="radio"]');
          if (input.checked) {
            label.classList.add('checked');
          } else {
            label.classList.remove('checked');
          }
        });
      };

      // Add event listeners
      radioJa.addEventListener('change', updateDonationLabels);
      radioNein.addEventListener('change', updateDonationLabels);
      radioBeide.addEventListener('change', updateDonationLabels);

      // Initial update
      updateDonationLabels();

      const applyButton = L.DomUtil.create('button', 'apply-filters', panelContent);
      applyButton.textContent = 'Filter anwenden';      // Get all category checkboxes
      const categoryCheckboxes = panelContent.querySelectorAll('input[type="checkbox"][value]');

      // Function to update Select All state
      const updateSelectAll = () => {
        const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
        selectAllCheckbox.checked = allChecked;
      };

      // Event listener for Select All
      L.DomEvent.on(selectAllCheckbox, 'change', () => {
        categoryCheckboxes.forEach(cb => {
          cb.checked = selectAllCheckbox.checked;
        });
      });

      // Event listeners for category checkboxes
      categoryCheckboxes.forEach(cb => {
        L.DomEvent.on(cb, 'change', updateSelectAll);
      });

      // Search functionality
      const performSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;
        if (!WORKER_API_KEY) {
          console.error("API Key is missing! Deployment configuration error.");
          return;
        }
        try {
          const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': WORKER_API_KEY,
            },
            body: JSON.stringify({ item: query }),
          });
          if (!response.ok) throw new Error('Worker response not ok');
          const data = await response.json();
          // Assume data.categories is array of keys like ['K', 'H']
          let categories = [...data.category] || [];
          categories = categories.map(cat => AI_MAPPING[cat] || cat); // Map AI responses to our keys
          const selectedDonation = panelContent.querySelector('input[name="donation"]:checked').value;
          filterLocations(categories, true, selectedDonation);
          const foundCat = CATEGORIES.find(c => c.key === categories[0]);
          const icon = foundCat ? foundCat.icon : categories[0];
          searchInput.value = '';
          searchInput.placeholder = `Gefundene Kategorie: ${icon}`;
          
          // Update filter checkboxes
          const categoryCheckboxes = panelContent.querySelectorAll('input[type="checkbox"][value]');
          categoryCheckboxes.forEach(cb => {
            cb.checked = categories.includes(cb.value);
          });
          // Update Select All
          const selectAllCheckbox = panelContent.querySelector('input[type="checkbox"]:not([value])');
          if (selectAllCheckbox) {
            selectAllCheckbox.checked = categories.length === CATEGORIES.length;
          }
        } catch (error) {
          console.error('Search error:', error);
          alert('Suche fehlgeschlagen. Bitte versuchen Sie es später erneut.');
        }
      };

      L.DomEvent.on(searchButton, 'click', L.DomEvent.stopPropagation)
        .on(searchButton, 'click', L.DomEvent.preventDefault)
        .on(searchButton, 'click', performSearch);

      L.DomEvent.on(searchInput, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
      });

      // Toggle panel on burger click
      L.DomEvent.on(burgerButton, 'click', L.DomEvent.stopPropagation)
        .on(burgerButton, 'click', L.DomEvent.preventDefault)
        .on(burgerButton, 'click', () => {
          filterPanel.classList.toggle('open');
        });

      // Close panel
      L.DomEvent.on(closeButton, 'click', L.DomEvent.stopPropagation)
        .on(closeButton, 'click', L.DomEvent.preventDefault)
        .on(closeButton, 'click', () => {
          filterPanel.classList.remove('open');
        });

      // Apply filters
      L.DomEvent.on(applyButton, 'click', L.DomEvent.stopPropagation)
        .on(applyButton, 'click', L.DomEvent.preventDefault)
        .on(applyButton, 'click', () => {
          const selected = Array.from(panelContent.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
          const selectedDonation = panelContent.querySelector('input[name="donation"]:checked').value;
          filterLocations(selected, true, selectedDonation);
          filterPanel.classList.remove('open');
        });

      // Prevent map interaction when clicking panel
      L.DomEvent.disableClickPropagation(filterPanel);

      return container;
    }
  });
  map.addControl(new SearchControl());

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'granted') { // violates web guidelines but simplifies UX
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      const coords = [pos.coords.latitude, pos.coords.longitude];
      map.setView(coords, 15);
      const locationIcon = L.divIcon({
        className: 'user-location-marker',
        html: '<div class="location-circle"><div class="location-dot"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      const marker = L.marker(coords, { icon: locationIcon }).addTo(map).bindPopup('Your location');
      window.userLocationMarker = marker;
    } else {
      map.setView(MUENSTER_COORDS, 13);
    }
  } catch (e) {
    map.setView(MUENSTER_COORDS, 13);
  }

  window.map = map;
}

function setLocations(url, map) {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      window.originalData = data;
      filterLocations(CATEGORIES.map(cat => cat.key), false); // Initially show all, don't open popup
    })
    .catch(error => {
      console.error('There was a problem fetching the GeoJSON data:', error);
    });
}

function filterLocations(selectedCategories, openClosest = false, donationFilter = 'beide') {
  if (!window.originalData) return;

  const filteredFeatures = window.originalData.features.filter(feature => {
    const cats = feature.properties.Kategorien ? feature.properties.Kategorien.split(',').map(c => c.trim()) : [];
    const donation = feature.properties["Spenden Annahme"];
    const donationMatch = donationFilter === 'beide' || 
        (donationFilter === 'ja' && donation === 'ja') ||
        (donationFilter === 'nein' && (donation === 'nein' || donation === ''));
    return selectedCategories.some(sel => cats.includes(sel)) && donationMatch;
  });

  const filteredData = { ...window.originalData, features: filteredFeatures };

  // Remove existing layer
  if (window.currentLayer) {
    window.map.removeLayer(window.currentLayer);
  }

  // Reset markers array
  window.currentMarkers = [];

  // Add new filtered layer
  window.currentLayer = L.geoJSON(filteredData, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng);
    },
    onEachFeature: function (feature, layer) {
      if (feature.properties && feature.properties.Titel) {
        const title = feature.properties.Webseite
          ? `<a href="https://${feature.properties.Webseite}" target="_blank">${feature.properties.Titel}</a>`
          : feature.properties.Titel;
        let type = feature.properties.Typ;
        if (type == "Spenden & Verkaufen" && feature.properties["Spenden Annahme"] !== "ja") {
          type = "Spende nicht möglich, nur Verkauf";
        }
        const lat = feature.geometry.coordinates[1];
        const lng = feature.geometry.coordinates[0];
        const addressLink = `<a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank">${feature.properties.Adresse}</a>`;
        const phone = feature.properties.Telefon;
        const hours = feature.properties.Öffnungszeiten;
        const cats = feature.properties.Kategorien ? feature.properties.Kategorien.split(',').map(c => c.trim()) : [];
        const catIcons = cats.map(catKey => {
          const cat = CATEGORIES.find(c => c.key === catKey);
          return cat ? cat.icon : catKey;
        }).join(' | ');
        layer.bindPopup(
          `<b>${title}</b><br>
          <b>Kategorien</b>: ${catIcons || 'N/A'}<br>
          ${type.length ? "<b>Typ</b>: " + type + "<br>" : ""}
          <b>Adresse</b>: ${addressLink}<br>
          ${phone.length ? "<b>Telefon</b>: " + phone + "<br>" : ""}
          ${hours.length ? "<b>Öffnungszeiten</b>: " + hours + "<br>" : ""}`
        );
      }
      // Store marker reference
      window.currentMarkers.push(layer);
    }
  }).addTo(window.map);

  // Open popup of closest marker to user location only if filtering
  if (openClosest && window.userLocationMarker && window.currentMarkers.length > 0) {
    const userLatLng = window.userLocationMarker.getLatLng();
    let closestMarker = null;
    let minDistance = Infinity;
    window.currentMarkers.forEach(marker => {
      const markerLatLng = marker.getLatLng();
      const distance = Math.pow(userLatLng.lat - markerLatLng.lat, 2) + Math.pow(userLatLng.lng - markerLatLng.lng, 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestMarker = marker;
      }
    });
    if (closestMarker) {
      closestMarker.openPopup();
    }
    // Clean up markers array
    window.currentMarkers = [];
  }
}
async function init() {
  await setMap();
  setLocations(GEOJSON_LOCAL_PATH, window.map);
}

window.addEventListener("DOMContentLoaded", init);