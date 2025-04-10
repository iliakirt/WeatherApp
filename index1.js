document.addEventListener('DOMContentLoaded', function() {
    // Initialize date picker
    const datePicker = document.getElementById('datePicker');
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 6);
    
    datePicker.min = formatDate(today);
    datePicker.max = formatDate(maxDate);
    datePicker.value = formatDate(today);
    
    // Initialize chart
    const ctx = document.getElementById('weatherChart').getContext('2d');
    const weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperature (°C)',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
                    },
                    max: 25
                }
            }
        }
    });
    
    // Fetch weather data
    fetchWeatherData();
    
    // Event listeners
    document.querySelectorAll('.date-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const action = this.dataset.action;
            updateWeatherDisplay(action);
        });
    });
    
    datePicker.addEventListener('change', function() {
        document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        const selectedDate = new Date(this.value);
        const diffInDays = Math.floor((selectedDate - today) / (1000 * 60 * 60 * 24));
        updateWeatherDisplay(diffInDays + 1); // +1 because today is index 0
    });
    
    // Helper functions
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function getWeatherIcon(weatherCode) {
        const iconMap = {
            0: 'sun', 1: 'cloud-sun', 2: 'cloud', 3: 'cloud',
            45: 'smog', 48: 'smog', 51: 'cloud-rain', 53: 'cloud-rain',
            55: 'cloud-rain', 56: 'cloud-rain', 57: 'cloud-rain',
            61: 'cloud-rain', 63: 'cloud-rain', 65: 'cloud-showers-heavy',
            66: 'cloud-rain', 67: 'cloud-showers-heavy', 71: 'snowflake',
            73: 'snowflake', 75: 'snowflake', 77: 'snowflake',
            80: 'cloud-showers-heavy', 81: 'cloud-showers-heavy',
            82: 'cloud-showers-heavy', 85: 'snowflake', 86: 'snowflake',
            95: 'bolt', 96: 'bolt', 99: 'bolt'
        };
        return iconMap[weatherCode] || 'question';
    }
    
    function getWeatherDescription(weatherCode) {
        const descriptionMap = {
            0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
            55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snow',
            73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
            80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
            85: 'Slight snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
            96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail'
        };
        return descriptionMap[weatherCode] || 'Unknown weather';
    }
    
    let weatherData = null;
    
    async function fetchWeatherData() {
        try {
            const latitude = 40.5872;
            const longitude = 22.9482;
            
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,apparent_temperature,surface_pressure,weathercode,windspeed_10m,windgusts_10m,winddirection_10m&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,shortwave_radiation_sum&timezone=auto`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }
            
            weatherData = await response.json();
            
            // Update chart
            weatherChart.data.labels = weatherData.daily.time.map(date => {
                const d = new Date(date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            });
            weatherChart.data.datasets[0].data = weatherData.daily.temperature_2m_max;
            weatherChart.update();
            
            // Update current weather display
            updateWeatherDisplay('now');
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            alert('Failed to load weather data. Please try again later.');
        }
    }

    function updateWeatherDisplay(action) {
        if (!weatherData) return;
        
        if (action === 'now') {
            // Current weather data
            const current = weatherData.current_weather;
            const hourly = weatherData.hourly;
            const currentTime = new Date(current.time);
            const currentHour = currentTime.getHours();
            
            updateWeatherUI(
                current.temperature,
                hourly.apparent_temperature[currentHour],
                current.windspeed,
                hourly.windgusts_10m[currentHour],
                current.winddirection,
                hourly.relativehumidity_2m[currentHour],
                hourly.surface_pressure[currentHour],
                current.weathercode
            );
            
        } else if (action === 'today' || action === 0) {
            // Today's data - calculated from hourly data
            const hourly = weatherData.hourly;
            const now = new Date();
            const currentHour = now.getHours();
            
            // Get today's hourly data (first 24 hours)
            const todayData = {
                temps: hourly.temperature_2m.slice(0, 24),
                feelsLike: hourly.apparent_temperature.slice(0, 24),
                winds: hourly.windspeed_10m.slice(0, 24),
                gusts: hourly.windgusts_10m.slice(0, 24),
                humidity: hourly.relativehumidity_2m.slice(0, 24),
                pressure: hourly.surface_pressure.slice(0, 24)
            };
            
            // Calculate metrics
            const maxTemp = Math.max(...todayData.temps);
            const avgFeelsLike = todayData.feelsLike.reduce((a, b) => a + b, 0) / 24;
            const maxWind = Math.max(...todayData.winds);
            const maxGust = Math.max(...todayData.gusts);
            const maxHumidity = Math.max(...todayData.humidity);
            const maxPressure = Math.max(...todayData.pressure);
            
            // Use current weather code or most common from today
            const weatherCode = weatherData.current_weather.weathercode;
            
            updateWeatherUI(
                maxTemp,
                avgFeelsLike.toFixed(1),
                maxWind,
                maxGust,
                weatherData.current_weather.winddirection,
                maxHumidity,
                maxPressure,
                weatherCode
            );
            
        } else if (typeof action === 'number' && action >= 1) {
            // Future days forecast
            const dayIndex = action - 1;
            const daily = weatherData.daily;
            
            updateWeatherUI(
                daily.temperature_2m_max[dayIndex],
                daily.apparent_temperature_max[dayIndex],
                daily.windspeed_10m_max[dayIndex],
                daily.windgusts_10m_max[dayIndex],
                daily.winddirection_10m_dominant[dayIndex],
                Math.max(...weatherData.hourly.relativehumidity_2m.slice(dayIndex * 24, (dayIndex + 1) * 24)),
                Math.max(...weatherData.hourly.surface_pressure.slice(dayIndex * 24, (dayIndex + 1) * 24)),
                daily.weathercode[dayIndex]
            );
        }
    }
    
    function updateWeatherUI(temp, feelsLike, windSpeed, windGust, windDir, humidity, pressure, weatherCode) {
        document.getElementById('temperature').textContent = `${temp}°C`;
        document.getElementById('feelsLike').textContent = `${feelsLike}°C`;
        document.getElementById('windSpeed').textContent = `${windSpeed} m/s`;
        document.getElementById('windGust').textContent = `${windGust} m/s`;
        document.getElementById('windDirection').textContent = `${windDir}°`;
        document.getElementById('humidity').textContent = `${humidity}%`;
        document.getElementById('pressure').textContent = `${pressure} hPa`;
        
        const weatherIcon = document.getElementById('weatherIcon');
        weatherIcon.innerHTML = `<i class="fas fa-${getWeatherIcon(weatherCode)}"></i>`;
        document.getElementById('weatherDescription').textContent = getWeatherDescription(weatherCode);
    }
});