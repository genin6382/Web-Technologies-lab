
const API_KEY = '5b8be8e50af8d90cc02fac73a464cd36';
let temperatureChart = null;
let humidityChart = null;
let hourlyChart = null;
let dailyChart = null;
let searchTimeout = null;

// Initialize with default city
window.onload = function() {
    getWeatherByCoords(40.7128, -74.0060); // New York coordinates
};

// City search functionality
document.getElementById('cityInput').addEventListener('input', function(e) {
    const query = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (query.length < 2) {
        hideCitySuggestions();
        return;
    }

    searchTimeout = setTimeout(() => {
        searchCities(query);
    }, 300);
});

// Hide suggestions when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) {
        hideCitySuggestions();
    }
});

// Search for cities
async function searchCities(query) {
    try {
        const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error('Search failed');
        }

        const cities = await response.json();
        displayCitySuggestions(cities);
    } catch (error) {
        console.log('City search error:', error);
        hideCitySuggestions();
    }
}

// Display city suggestions
function displayCitySuggestions(cities) {
    const suggestionsDiv = document.getElementById('citySuggestions');
    
    if (cities.length === 0) {
        hideCitySuggestions();
        return;
    }

    const suggestionsHTML = cities.map(city => `
        <div class="suggestion-item" onclick="selectCity('${city.name}', ${city.lat}, ${city.lon}, '${city.country}', '${city.state || ''}')">
            <div class="suggestion-main">${city.name}${city.state ? ', ' + city.state : ''}</div>
            <div class="suggestion-sub">${city.country}</div>
        </div>
    `).join('');

    suggestionsDiv.innerHTML = suggestionsHTML;
    suggestionsDiv.style.display = 'block';
}

// Select a city from suggestions
function selectCity(name, lat, lon, country, state) {
    const displayName = state ? `${name}, ${state}, ${country}` : `${name}, ${country}`;
    document.getElementById('cityInput').value = displayName;
    hideCitySuggestions();
    getWeatherByCoords(lat, lon);
}

// Hide city suggestions
function hideCitySuggestions() {
    document.getElementById('citySuggestions').style.display = 'none';
}

// Get user's location
function getUserLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
                showSuccess('📍 Using your current location');
            },
            error => {
                console.log('Geolocation error:', error);
                showError('❌ Unable to get your location. Please search for a city instead.');
                hideLoading();
            },
            {
                timeout: 10000,
                enableHighAccuracy: true
            }
        );
    } else {
        showError('❌ Geolocation is not supported by your browser.');
    }
}

// Get weather by coordinates
async function getWeatherByCoords(lat, lon) {
    showLoading();
    clearMessages();
    
    try {
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        ]);

        console.log('Current Response Status:', currentResponse.status);
        console.log('Forecast Response Status:', forecastResponse.status);

        if (!currentResponse.ok) {
            const errorData = await currentResponse.json().catch(() => ({}));
            throw new Error(`Current weather API error: ${errorData.message || 'Unknown error'}`);
        }

        if (!forecastResponse.ok) {
            const errorData = await forecastResponse.json().catch(() => ({}));
            throw new Error(`Forecast API error: ${errorData.message || 'Unknown error'}`);
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        console.log('Current Data:', currentData);
        console.log('Forecast Data:', forecastData);

        displayWeather(currentData, forecastData);
        hideLoading();
        showSuccess(`✅ Weather data loaded for ${currentData.name}, ${currentData.sys.country}`);
        
        // Update search input with location name
        document.getElementById('cityInput').value = `${currentData.name}, ${currentData.sys.country}`;
        
    } catch (error) {
        console.error('Weather fetch error:', error);
        showError(`❌ ${error.message}`);
        hideLoading();
    }
}

// Get weather by city name
async function getWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) {
        showError('❌ Please enter a city name');
        return;
    }

    showLoading();
    clearMessages();

    try {
        // First, try to get coordinates for the city
        const geoResponse = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`);
        
        if (!geoResponse.ok) {
            throw new Error('Unable to find city location');
        }

        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) {
            throw new Error('City not found. Please check the spelling and try again.');
        }

        const { lat, lon } = geoData[0];
        
        // Now get weather data using coordinates
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
        ]);

        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('Unable to fetch weather data');
        }

        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();

        displayWeather(currentData, forecastData);
        hideLoading();
        showSuccess(`✅ Weather data loaded for ${currentData.name}, ${currentData.sys.country}`);
        
    } catch (error) {
        console.error('Weather search error:', error);
        showError(`❌ ${error.message}`);
        hideLoading();
    }
}

// Display weather data
function displayWeather(current, forecast) {
    const weatherContent = document.getElementById('weatherContent');
    
    // Left panel content
    const leftPanelHTML = `
        <div class="left-panel">
            <div class="weather-card">
                <div class="current-weather">
                    <div class="weather-info">
                        <h2>${current.name}, ${current.sys.country}</h2>
                        <div class="temperature">${Math.round(current.main.temp)}°C</div>
                        <div class="description">${current.weather[0].description}</div>
                        <div class="weather-details">
                            <div class="detail-item">
                                <div class="label">Feels like</div>
                                <div class="value">${Math.round(current.main.feels_like)}°C</div>
                            </div>
                            <div class="detail-item">
                                <div class="label">Humidity</div>
                                <div class="value">${current.main.humidity}%</div>
                            </div>
                            <div class="detail-item">
                                <div class="label">Wind Speed</div>
                                <div class="value">${current.wind.speed} m/s</div>
                            </div>
                            <div class="detail-item">
                                <div class="label">Pressure</div>
                                <div class="value">${current.main.pressure} hPa</div>
                            </div>
                        </div>
                    </div>
                    <div class="weather-icon">
                        <img src="https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png" alt="Weather Icon">
                    </div>
                </div>
            </div>

            <div class="hourly-forecast">
                <h3>🕐 24-Hour Forecast</h3>
                <div class="hourly-container">
                    ${getHourlyForecast(forecast.list).map(hour => `
                        <div class="hourly-item">
                            <div class="hourly-time">${hour.time}</div>
                            <div class="hourly-icon">
                                <img src="https://openweathermap.org/img/wn/${hour.icon}@2x.png" alt="Weather Icon">
                            </div>
                            <div class="hourly-temp">${Math.round(hour.temp)}°</div>
                            <div class="hourly-desc">${hour.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="daily-forecast">
                <h3>📅 7-Day Forecast</h3>
                ${getDailyForecast(forecast.list).map(day => `
                    <div class="daily-item">
                        <div class="daily-date">${day.date}</div>
                        <div class="daily-icon">
                            <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="Weather Icon">
                        </div>
                        <div class="daily-desc">${day.description}</div>
                        <div class="daily-temps">
                            <span class="daily-high">${Math.round(day.high)}°</span>
                            <span class="daily-low">${Math.round(day.low)}°</span>
                        </div>
                        <div class="daily-humidity">${day.humidity}% 💧</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Right panel with charts
    const rightPanelHTML = `
        <div class="right-panel">
            <div class="charts-container">
                <div class="chart-card">
                    <h3>🌡️ 24-Hour Temperature</h3>
                    <div class="chart-container">
                        <canvas id="hourlyChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>📊 5-Day Temperature Trend</h3>
                    <div class="chart-container">
                        <canvas id="temperatureChart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>💧 Humidity & Precipitation</h3>
                    <div class="chart-container">
                        <canvas id="humidityChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

    weatherContent.innerHTML = leftPanelHTML + rightPanelHTML;

    // Create charts
    createHourlyChart(forecast.list);
    createTemperatureChart(forecast.list);
    createHumidityChart(forecast.list);
}

// Get hourly forecast for next 24 hours
function getHourlyForecast(forecastList) {
    const hourlyData = [];
    const now = new Date();
    
    for (let i = 0; i < Math.min(8, forecastList.length); i++) {
        const item = forecastList[i];
        const date = new Date(item.dt * 1000);
        
        hourlyData.push({
            time: date.getHours() === 0 ? '12 AM' : 
                    date.getHours() === 12 ? '12 PM' :
                    date.getHours() > 12 ? `${date.getHours() - 12} PM` : 
                    `${date.getHours()} AM`,
            temp: item.main.temp,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            humidity: item.main.humidity
        });
    }
    
    return hourlyData;
}

// Get daily forecast
function getDailyForecast(forecastList) {
    const dailyData = new Map();
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        
        if (!dailyData.has(dateKey)) {
            dailyData.set(dateKey, {
                date: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
                temps: [],
                humidity: [],
                descriptions: [],
                icons: []
            });
        }
        
        const dayData = dailyData.get(dateKey);
        dayData.temps.push(item.main.temp);
        dayData.humidity.push(item.main.humidity);
        dayData.descriptions.push(item.weather[0].description);
        dayData.icons.push(item.weather[0].icon);
    });
    
    const result = [];
    dailyData.forEach((data, dateKey) => {
        if (result.length < 7) {
            const avgHumidity = Math.round(data.humidity.reduce((a, b) => a + b, 0) / data.humidity.length);
            const maxTemp = Math.max(...data.temps);
            const minTemp = Math.min(...data.temps);
            
            // Get most common description and icon
            const descCounts = {};
            const iconCounts = {};
            data.descriptions.forEach(desc => descCounts[desc] = (descCounts[desc] || 0) + 1);
            data.icons.forEach(icon => iconCounts[icon] = (iconCounts[icon] || 0) + 1);
            
            const mostCommonDesc = Object.keys(descCounts).reduce((a, b) => descCounts[a] > descCounts[b] ? a : b);
            const mostCommonIcon = Object.keys(iconCounts).reduce((a, b) => iconCounts[a] > iconCounts[b] ? a : b);
            
            result.push({
                date: data.date,
                high: maxTemp,
                low: minTemp,
                humidity: avgHumidity,
                description: mostCommonDesc,
                icon: mostCommonIcon
            });
        }
    });
    
    return result;
}

// Create hourly temperature chart
function createHourlyChart(forecastList) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');
    
    if (hourlyChart) {
        hourlyChart.destroy();
    }

    const hourlyData = getHourlyForecast(forecastList);
    const labels = hourlyData.map(item => item.time);
    const temperatures = hourlyData.map(item => Math.round(item.temp));
    const humidity = hourlyData.map(item => item.humidity);

    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: '#fd79a8',
                backgroundColor: 'rgba(253, 121, 168, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#fd79a8',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6
            }, {
                label: 'Humidity (%)',
                data: humidity,
                borderColor: '#74b9ff',
                backgroundColor: 'rgba(116, 185, 255, 0.1)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Temperature (°C)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    },
                    title: {
                        display: true,
                        text: 'Humidity (%)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

// Create temperature chart
function createTemperatureChart(forecastList) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    
    if (temperatureChart) {
        temperatureChart.destroy();
    }

    const labels = [];
    const temperatures = [];
    const maxTemps = [];
    const minTemps = [];

    // Get data for next 5 days
    for (let i = 0; i < Math.min(40, forecastList.length); i += 8) {
        const item = forecastList[i];
        const date = new Date(item.dt * 1000);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        temperatures.push(Math.round(item.main.temp));
        
        // Calculate daily max/min from 8 forecasts per day
        let dayMax = item.main.temp_max;
        let dayMin = item.main.temp_min;
        for (let j = i; j < Math.min(i + 8, forecastList.length); j++) {
            dayMax = Math.max(dayMax, forecastList[j].main.temp_max);
            dayMin = Math.min(dayMin, forecastList[j].main.temp_min);
        }
        maxTemps.push(Math.round(dayMax));
        minTemps.push(Math.round(dayMin));
    }

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: temperatures,
                borderColor: '#74b9ff',
                backgroundColor: 'rgba(116, 185, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Max Temp (°C)',
                data: maxTemps,
                borderColor: '#fd79a8',
                backgroundColor: 'rgba(253, 121, 168, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4
            }, {
                label: 'Min Temp (°C)',
                data: minTemps,
                borderColor: '#00cec9',
                backgroundColor: 'rgba(0, 206, 201, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

// Create humidity chart
function createHumidityChart(forecastList) {
    const ctx = document.getElementById('humidityChart').getContext('2d');
    
    if (humidityChart) {
        humidityChart.destroy();
    }

    const labels = [];
    const humidity = [];
    const precipitation = [];

    for (let i = 0; i < Math.min(40, forecastList.length); i += 8) {
        const item = forecastList[i];
        const date = new Date(item.dt * 1000);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        humidity.push(item.main.humidity);
        precipitation.push(item.rain ? (item.rain['3h'] || 0) : 0);
    }

    humidityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Humidity (%)',
                data: humidity,
                backgroundColor: 'rgba(116, 185, 255, 0.6)',
                borderColor: '#74b9ff',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Precipitation (mm)',
                data: precipitation,
                backgroundColor: 'rgba(0, 206, 201, 0.6)',
                borderColor: '#00cec9',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    max: 100,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false,
                    },
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

// Utility functions
function showLoading() {
    document.getElementById('loadingMessage').innerHTML = '<div class="loading">🌍 Loading weather data...</div>';
}

function hideLoading() {
    document.getElementById('loadingMessage').innerHTML = '';
}

function showError(message) {
    document.getElementById('errorMessage').innerHTML = `<div class="error">${message}</div>`;
    setTimeout(() => {
        clearMessages();
    }, 5000);
}

function showSuccess(message) {
    document.getElementById('successMessage').innerHTML = `<div class="success">${message}</div>`;
    setTimeout(() => {
        clearMessages();
    }, 3000);
}

function clearMessages() {
    document.getElementById('errorMessage').innerHTML = '';
    document.getElementById('successMessage').innerHTML = '';
}

// Allow Enter key to search
document.getElementById('cityInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        hideCitySuggestions();
        getWeather();
    }
});
