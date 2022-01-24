'use strict';

class Travel {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, time) {
    this.coords = coords; // [lat, lng]
    this.time = time; // days
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Tourist extends Travel {
  type = 'tourist';

  constructor(coords, time, cost) {
    super(coords, time);
    this.cost = cost;
    this._setDescription();
  }
}

class Work extends Travel {
  type = 'work';

  constructor(coords, time, income) {
    super(coords, time);
    this.income = income;
    this._setDescription();
  }
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//         👷‍♂️ Aplication Architecture 👷‍♀️
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
const form = document.querySelector('.form');
const containerTravels = document.querySelector('.travels');
const inputType = document.querySelector('.form__input--type');
const inputTime = document.querySelector('.form__input--time');
const inputCost = document.querySelector('.form__input--cost');
const inputIncome = document.querySelector('.form__input--income');

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #travels = [];

  constructor() {
    // Get user's position
    this._getPosition();
    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newTravel.bind(this));
    inputType.addEventListener('change', this._toggleCostField);
    containerTravels.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get you position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      // change .org to .fr/hot -- another style
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#travels.forEach(trav => {
      this._renderTravelMarker(trav);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputTime.focus();
  }

  _hideForm() {
    // Empty inputs
    inputTime.value = inputCost.value = inputIncome.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleCostField() {
    inputCost.closest('.form__row').classList.toggle('form__row--hidden');
    inputIncome.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newTravel(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const time = +inputTime.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let travel;

    if (type === 'tourist') {
      const cost = +inputCost.value;

      // Check if the data is valid
      if (!validInputs(time, cost) || !allPositive(time, cost))
        return alert('Input have to be positive numbers.');

      travel = new Tourist([lat, lng], time, cost);
    }

    if (type === 'work') {
      const income = +inputIncome.value;

      // Check if the data is valid
      if (!validInputs(time, income) || !allPositive(time, income))
        return alert('Input have to be positive numbers.');

      travel = new Work([lat, lng], time, income);
    }

    // Add new obj to travel array
    this.#travels.push(travel);

    // Render travel on map as marker
    this._renderTravelMarker(travel);

    // Render travel on list
    this._renderTravel(travel);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all travels
    this._setLocalStorage();
  }

  _renderTravelMarker(travel) {
    L.marker(travel.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${travel.type}-popup`,
        })
      )
      .setPopupContent(
        `${travel.type === 'tourist' ? '☀' : '👨‍💼'} ${travel.description}`
      )
      .openPopup();
  }

  _renderTravel(travel) {
    let html = `
      <li class="travel travel--${travel.type}" data-id="${travel.id}">
        <h2 class="travel__title">${travel.description}</h2>
        <div class="travel__details">
          <span class="travel__icon">
            ⏱
          </span>
          <span class="travel__value">${travel.time}</span>
          <span class="travel__unit">days</span>
        </div>
    `;

    if (travel.type === 'tourist')
      html += `
        <div class="travel__details">
          <span class="travel__icon">💰</span>
          <span class="travel__value">${travel.cost}</span>
          <span class="travel__unit">$</span>
        </div>
      </li>
    `;

    if (travel.type === 'work')
      html += `
        <div class="travel__details">
          <span class="travel__icon">💲</span>
          <span class="travel__value">${travel.income}</span>
          <span class="travel__unit">$</span>
        </div>
      </li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const travelEl = e.target.closest('.travel');

    if (!travelEl) return;

    const travel = this.#travels.find(
      travel => travel.id === travelEl.dataset.id
    );

    this.#map.setView(travel.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('travels', JSON.stringify(this.#travels));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('travels'));

    if (!data) return;

    this.#travels = data;

    this.#travels.forEach(travel => {
      this._renderTravel(travel);
    });
  }

  // Use the function if u like reset local memory -> app.reset()
  reset() {
    localStorage.removeItem('travels');
    location.reload();
  }
}

const app = new App();
