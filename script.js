// --- IMPORTANT SETUP ---
// Your API key has been added.
const apiKey = "6b76f2e04244bdafd76b760809224594";
let currentUnit = 'metric';
// --- END SETUP ---

// Global variables for the map and marker so we can update them
let map;
let marker;

// DOM Elements
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const unitBtns = document.querySelectorAll('.unit-btn');
const currentLocation = document.getElementById('currentLocation');
const currentDate = document.getElementById('currentDate');
const weatherDescription = document.getElementById('weatherDescription');
const weatherIcon = document.getElementById('weatherIcon');
const currentTemp = document.getElementById('currentTemp');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const hourlyForecast = document.getElementById('hourlyForecast');
const dailyForecast = document.getElementById('dailyForecast');
const aqiValue = document.getElementById('aqiValue');
const aqiIndicator = document.getElementById('aqiIndicator');
const aqiDescription = document.getElementById('aqiDescription');
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
currentLocationBtn.addEventListener('click', getCurrentLocationWeather);
locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
document.addEventListener('DOMContentLoaded', getCurrentLocationWeather);

unitBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        unitBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentUnit = this.dataset.unit;
        const locationName = currentLocation.textContent.split(',')[0];
        if (locationName && locationName !== 'Loading...') {
            fetchWeather(locationName);
        }
    });
});

// Main Functions
function handleSearch() {
    const location = locationInput.value.trim();
    if (location) fetchWeather(location);
}

function getCurrentLocationWeather() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported. Showing weather for New York.");
        fetchWeather('New York');
        return;
    }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => fetchAndDisplayWeather(position.coords.latitude, position.coords.longitude),
        () => {
            alert("Unable to retrieve your location. Showing weather for New York.");
            fetchWeather('New York');
        }
    );
}

function fetchWeather(location) {
    showLoading();
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=${currentUnit}&appid=${apiKey}`)
        .then(res => {
            if (!res.ok) throw new Error('Location not found.');
            return res.json();
        })
        .then(data => fetchAndDisplayWeather(data.coord.lat, data.coord.lon))
        .catch(handleError);
}

function fetchAndDisplayWeather(lat, lon) {
    Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
    ])
    .then(responses => Promise.all(responses.map(res => {
        if (!res.ok) throw new Error('Failed to fetch weather data. API key might be inactive.');
        return res.json();
    })))
    .then(([currentData, forecastData, airQualityData]) => {
        displayCurrentWeather(currentData);
        displayHourlyForecast(forecastData);
        displayDailyForecast(forecastData);
        displayAirQuality(airQualityData);
        initializeMap(lat, lon); // This will now create a real map
    })
    .catch(handleError)
    .finally(hideLoading);
}

// Display Functions
function displayCurrentWeather(data) {
    currentLocation.textContent = `${data.name}, ${data.sys.country}`;
    currentDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weatherDescription.textContent = data.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    currentTemp.textContent = `${Math.round(data.main.temp)}${tempUnit}`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}${tempUnit}`;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${Math.round(currentUnit === 'metric' ? data.wind.speed * 3.6 : data.wind.speed)} ${speedUnit}`;
    pressure.textContent = `${data.main.pressure} hPa`;
    sunrise.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunset.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function displayHourlyForecast(data) {
    hourlyForecast.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    data.list.slice(0, 8).forEach(forecast => {
        const hourCard = document.createElement('div');
        hourCard.className = 'hourly-card';
        hourCard.innerHTML = `
            <h6 class="mb-1">${new Date(forecast.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</h6>
            <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="${forecast.weather[0].description}" class="img-fluid my-1">
            <h5 class="mb-0">${Math.round(forecast.main.temp)}${tempUnit}</h5>
        `;
        hourlyForecast.appendChild(hourCard);
    });
}

function displayDailyForecast(data) {
    dailyForecast.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const dailyData = data.list.filter(forecast => forecast.dt_txt.includes("12:00:00")).slice(0, 5);
    dailyData.forEach(forecast => {
        const dayCard = document.createElement('div');
        dayCard.className = 'daily-card d-flex justify-content-between align-items-center';
        dayCard.innerHTML = `
            <div style="width: 100px;">
                <h5 class="mb-0">${new Date(forecast.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' })}</h5>
            </div>
            <div class="d-flex align-items-center">
                <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="" style="width: 40px;">
                <small class="text-muted">${forecast.weather[0].main}</small>
            </div>
            <div class="text-end" style="width: 100px;">
                <span class="fw-bold">${Math.round(forecast.main.temp_max)}${tempUnit}</span>
                <span class="text-muted ms-2">${Math.round(forecast.main.temp_min)}${tempUnit}</span>
            </div>
        `;
        dailyForecast.appendChild(dayCard);
    });
}

function displayAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    let aqiText, aqiClass, aqiDesc;
    switch (aqi) {
        case 1: aqiText = 'Good'; aqiClass = 'bg-success'; aqiDesc = 'Air quality is satisfactory.'; break;
        case 2: aqiText = 'Fair'; aqiClass = 'bg-info'; aqiDesc = 'Air quality is acceptable.'; break;
        case 3: aqiText = 'Moderate'; aqiClass = 'bg-warning'; aqiDesc = 'Sensitive groups may be affected.'; break;
        case 4: aqiText = 'Poor'; aqiClass = 'bg-danger'; aqiDesc = 'Health effects possible for everyone.'; break;
        case 5: aqiText = 'Very Poor'; aqiClass = 'bg-dark'; aqiDesc = 'Serious health effects for everyone.'; break;
        default: aqiText = 'Unknown'; aqiClass = 'bg-secondary'; aqiDesc = 'Data not available.';
    }
    aqiValue.textContent = aqiText;
    aqiValue.className = `badge ${aqiClass}`;
    aqiIndicator.className = `progress-bar ${aqiClass}`;
    aqiIndicator.style.width = `${aqi * 20}%`;
    aqiDescription.textContent = aqiDesc;
}

/**
 * --- NEW: REAL MAP FUNCTION ---
 * Initializes or updates the Leaflet map to show the given coordinates.
 */
function initializeMap(lat, lon) {
    const zoomLevel = 10;
    
    // If the map hasn't been created yet, create it
    if (!map) {
        map = L.map('weatherMap').setView([lat, lon], zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        marker = L.marker([lat, lon]).addTo(map);
    } 
    // If the map already exists, just update its view and marker position
    else {
        map.setView([lat, lon], zoomLevel);
        marker.setLatLng([lat, lon]);
    }
}

// Utility Functions
function showLoading() { document.body.style.cursor = 'wait'; }
function hideLoading() { document.body.style.cursor = 'default'; }
function handleError(error) {
    console.error('An error occurred:', error);
    alert(error.message);
    hideLoading();
}