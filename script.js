// --- SETUP ---
const apiKey = "b74e880a9e38d5e69de2a341b33fdb95";
let currentUnit = 'metric';
let map, marker, typewriterInterval;
let fullDailyForecastData = {};

// --- DOM Elements ---
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const searchBox = document.getElementById('searchBox');
const interactiveCard = document.getElementById('interactiveCard');
const weatherParticlesContainer = document.getElementById('weather-particles');
const unitSwitcher = document.querySelector('.unit-switcher');
const activePill = document.querySelector('.active-pill');
const unitBtns = document.querySelectorAll('.unit-btn');
const currentLocationEl = document.getElementById('currentLocation');
const currentDateEl = document.getElementById('currentDate');
const weatherDescriptionEl = document.getElementById('weatherDescription');
const weatherIconEl = document.getElementById('weatherIcon');
const currentTempEl = document.getElementById('currentTemp');
const tempUnitEl = document.querySelector('.temperature-unit');
const feelsLikeEl = document.getElementById('feelsLike');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const pressureEl = document.getElementById('pressure');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const hourlyForecastEl = document.getElementById('hourlyForecast');
const dailyForecastEl = document.getElementById('dailyForecast');
const aqiValueEl = document.getElementById('aqiValue');
const aqiIndicatorEl = document.getElementById('aqiIndicator');
const aqiDescriptionEl = document.getElementById('aqiDescription');
const currentWeatherRow = document.getElementById('currentWeatherRow');
const forecastsRow = document.getElementById('forecastsRow');
const weatherDetailsContainer = document.getElementById('weatherDetailsContainer');
const modalBodyContent = document.getElementById('modalBodyContent');
const weatherDetailModal = new bootstrap.Modal(document.getElementById('weatherDetailModal'));
document.getElementById('currentYear').textContent = new Date().getFullYear();

// --- Event Listeners ---
searchBtn.addEventListener('click', handleSearch);
currentLocationBtn.addEventListener('click', getCurrentLocationWeather);
locationInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
document.addEventListener('DOMContentLoaded', () => { fetchWeather('New York'); updatePillPosition(); });

unitBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        if (this.classList.contains('active')) return;
        currentUnit = this.dataset.unit;
        unitBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        updatePillPosition();
        const locationName = currentLocationEl.textContent.split(',')[0];
        if (locationName && locationName !== 'Loading...') fetchWeather(locationName);
    });
});

interactiveCard.addEventListener('mousemove', (e) => {
    const cardRect = interactiveCard.getBoundingClientRect();
    const x = e.clientX - cardRect.left;
    const y = e.clientY - cardRect.top;
    const centerX = cardRect.width / 2;
    const centerY = cardRect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    interactiveCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

interactiveCard.addEventListener('mouseleave', () => {
    interactiveCard.style.transform = 'rotateX(0deg) rotateY(0deg)';
});

// --- Main Functions ---
function handleSearch() {
    const location = locationInput.value.trim();
    if (location) {
        fetchWeather(location);
        locationInput.value = '';
    }
}

function getCurrentLocationWeather() {
    if (!navigator.geolocation) { alert("Geolocation is not supported."); fetchWeather('New York'); return; }
    showLoading();
    navigator.geolocation.getCurrentPosition(
        (position) => fetchAndDisplayWeather(position.coords.latitude, position.coords.longitude),
        () => { alert("Unable to retrieve location."); fetchWeather('New York'); }
    );
}

function fetchWeather(location) {
    showLoading();
    searchBox.classList.add('is-loading');
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&units=${currentUnit}&appid=${apiKey}`)
        .then(res => { if (!res.ok) throw new Error('Location not found.'); return res.json(); })
        .then(data => fetchAndDisplayWeather(data.coord.lat, data.coord.lon))
        .catch(handleError);
}

function fetchAndDisplayWeather(lat, lon) {
    fullDailyForecastData = {};
    currentWeatherRow.classList.add('is-loading');
    forecastsRow.classList.add('is-loading');

    setTimeout(() => {
        Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`),
            fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
        ])
        .then(responses => Promise.all(responses.map(res => { if (!res.ok) throw new Error('API request failed.'); return res.json(); })))
        .then(([currentData, forecastData, airQualityData]) => {
            
            // --- MODIFIED --- //
            // These two lines are now disabled to keep the background static.
            // updateDynamicBackground(currentData.weather[0].main);
            // createWeatherParticles(currentData.weather[0].main);
            
            displayCurrentWeather(currentData);
            displayHourlyForecast(forecastData);
            displayDailyForecast(forecastData);
            displayAirQuality(airQualityData);
            initializeMap(lat, lon);
            
            currentWeatherRow.classList.remove('is-loading');
            forecastsRow.classList.remove('is-loading');
        })
        .catch(handleError)
        .finally(() => { hideLoading(); searchBox.classList.remove('is-loading'); });
    }, 400);
}

// --- Display & Animation Functions ---
function displayCurrentWeather(data) {
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    currentLocationEl.textContent = `${data.name}, ${data.sys.country}`;
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    
    typewriterEffect(weatherDescriptionEl, data.weather[0].description.replace(/\b\w/g, l => l.toUpperCase()));
    
    animateValue(currentTempEl, Math.round(data.main.temp));
    animateValue(feelsLikeEl, Math.round(data.main.feels_like));
    animateValue(humidityEl, data.main.humidity);
    animateValue(pressureEl, data.main.pressure);
    
    tempUnitEl.textContent = tempUnit;
    windSpeedEl.textContent = `${Math.round(currentUnit === 'metric' ? data.wind.speed * 3.6 : data.wind.speed)} ${speedUnit}`;
    sunriseEl.textContent = new Date(data.sys.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    sunsetEl.textContent = new Date(data.sys.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    Array.from(weatherDetailsContainer.children).forEach((child, index) => {
        child.style.animation = 'none';
        child.offsetHeight;
        child.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`;
    });
}

function displayHourlyForecast(data) {
    hourlyForecastEl.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    data.list.slice(0, 8).forEach((forecast, index) => {
        const hourCard = document.createElement('div');
        hourCard.className = 'hourly-card';
        hourCard.style.animationDelay = `${index * 0.1}s`;
        hourCard.innerHTML = `<h6 class="mb-1">${new Date(forecast.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</h6><img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" alt="${forecast.weather[0].description}" class="img-fluid my-1"><h5 class="mb-0">${Math.round(forecast.main.temp)}${tempUnit}</h5>`;
        hourlyForecastEl.appendChild(hourCard);
    });
}

function displayDailyForecast(data) {
    dailyForecastEl.innerHTML = '';
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const forecastsByDay = {};
    data.list.forEach(forecast => {
        const dayName = new Date(forecast.dt * 1000).toLocaleDateString('en-US', { weekday: 'long' });
        if (!forecastsByDay[dayName]) forecastsByDay[dayName] = [];
        forecastsByDay[dayName].push(forecast);
    });
    fullDailyForecastData = forecastsByDay;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    let daysDisplayed = 0;
    Object.keys(forecastsByDay).forEach((dayName, index) => {
        if (dayName === today || daysDisplayed >= 5) return;
        const dayData = forecastsByDay[dayName];
        const middayForecast = dayData.find(f => f.dt_txt.includes("12:00:00")) || dayData[0];
        const temps = dayData.map(f => f.main.temp);
        const maxTemp = Math.round(Math.max(...temps));
        const minTemp = Math.round(Math.min(...temps));
        const description = middayForecast.weather[0].description.replace(/\b\w/g, l => l.toUpperCase());
        const dayCard = document.createElement('div');
        dayCard.className = 'daily-card';
        dayCard.style.animationDelay = `${(index + 1) * 0.1}s`;
        dayCard.dataset.day = dayName;
        dayCard.addEventListener('click', () => showDailyDetailModal(dayName));
        dayCard.innerHTML = `<div class="d-flex justify-content-between align-items-center w-100"><div class="d-flex align-items-center" style="width: 120px;"><h5 class="mb-0">${dayName}</h5></div><div class="d-flex align-items-center flex-grow-1 justify-content-center"><img src="https://openweathermap.org/img/wn/${middayForecast.weather[0].icon}.png" alt="${description}" class="img-fluid me-2" style="width: 40px;"><small class="text-muted">${description}</small></div><div class="text-end" style="width: 100px;"><span class="fw-bold">${maxTemp}${tempUnit}</span> <span class="text-muted ms-2">${minTemp}${tempUnit}</span></div></div>`;
        dailyForecastEl.appendChild(dayCard);
        daysDisplayed++;
    });
}

function displayAirQuality(data) {
    const aqi = data.list[0].main.aqi;
    let aqiText, aqiClass, aqiDesc;
    switch (aqi) {
        case 1: aqiText = 'Good'; aqiClass = 'bg-success'; aqiDesc = 'Excellent air quality.'; break;
        case 2: aqiText = 'Fair'; aqiClass = 'bg-info'; aqiDesc = 'Acceptable air quality.'; break;
        case 3: aqiText = 'Moderate'; aqiClass = 'bg-warning'; aqiDesc = 'Some may experience effects.'; break;
        case 4: aqiText = 'Poor'; aqiClass = 'bg-danger'; aqiDesc = 'Health effects possible.'; break;
        case 5: aqiText = 'Very Poor'; aqiClass = 'bg-dark'; aqiDesc = 'Serious health effects.'; break;
        default: aqiText = 'Unknown'; aqiClass = 'bg-secondary'; aqiDesc = 'Data not available.';
    }
    aqiValueEl.textContent = aqiText;
    aqiValueEl.className = `badge ${aqiClass}`;
    aqiIndicatorEl.className = `progress-bar ${aqiClass}`;
    aqiIndicatorEl.style.width = `${aqi * 20}%`;
    aqiDescriptionEl.textContent = aqiDesc;
}

// --- Utility & Helper Functions ---
function typewriterEffect(element, text) {
    clearInterval(typewriterInterval);
    element.textContent = '';
    element.classList.remove('finished');
    let i = 0;
    typewriterInterval = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typewriterInterval);
            element.classList.add('finished');
        }
    }, 50);
}

/*
// These functions are now disabled to keep the background static.
function createWeatherParticles(weatherMain) { ... }
function updateDynamicBackground(weatherMain) { ... }
*/

function animateValue(element, end) {
    let start = parseInt(element.textContent, 10);
    if (isNaN(start)) start = 0;
    if (start === end) return;
    const duration = 1000;
    const range = end - start;
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        element.textContent = Math.floor(progress * range + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function updatePillPosition() {
    const activeButton = unitSwitcher.querySelector('.unit-btn.active');
    if (!activeButton) return;
    activePill.style.width = `${activeButton.offsetWidth}px`;
    activePill.style.transform = `translateX(${activeButton.offsetLeft - 4}px)`;
}

function initializeMap(lat, lon) {
    const zoomLevel = 10;
    if (!map) {
        map = L.map('weatherMap').setView([lat, lon], zoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
        marker = L.marker([lat, lon]).addTo(map);
    } else {
        map.flyTo([lat, lon], zoomLevel);
        marker.setLatLng([lat, lon]);
    }
}

function showDailyDetailModal(dayName) {
    const dayData = fullDailyForecastData[dayName];
    if (!dayData) return;
    document.getElementById('weatherDetailModalLabel').textContent = `Forecast for ${dayName}`;
    const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
    const speedUnit = currentUnit === 'metric' ? 'km/h' : 'mph';
    let hourlyDetailsHtml = '<div class="list-group">';

    dayData.forEach(forecast => {
        hourlyDetailsHtml += `
            <div class="list-group-item d-flex justify-content-between align-items-center flex-wrap">
                <span class="me-3"><strong>${new Date(forecast.dt * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</strong></span>
                <div class="d-flex align-items-center me-3">
                    <img src="https://openweathermap.org/img/wn/${forecast.weather[0].icon}.png" style="width: 40px;" alt="">
                    <span>${forecast.weather[0].description.replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
                <div class="d-flex align-items-center ms-auto">
                    <span class="fw-bold me-3">${Math.round(forecast.main.temp)}${tempUnit}</span>
                    <span class="me-3"><i class="fas fa-tint me-1 text-primary"></i>${forecast.main.humidity}%</span>
                    <span><i class="fas fa-wind me-1 text-secondary"></i>${Math.round(currentUnit === 'metric' ? forecast.wind.speed * 3.6 : forecast.wind.speed)} ${speedUnit}</span>
                </div>
            </div>`;
    });
    hourlyDetailsHtml += '</div>';
    modalBodyContent.innerHTML = hourlyDetailsHtml;
    weatherDetailModal.show();
}

function showLoading() { document.body.style.cursor = 'wait'; }
function hideLoading() { document.body.style.cursor = 'default'; }
function handleError(error) {
    console.error('An error occurred:', error);
    alert(error.message);
    currentWeatherRow.classList.remove('is-loading');
    forecastsRow.classList.remove('is-loading');
    hideLoading();
    searchBox.classList.remove('is-loading');
}