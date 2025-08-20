// --- 3D Cosmic Background Script ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.z = 1;
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('cosmic-bg'),
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);

// Create starfield
const starGeo = new THREE.BufferGeometry();
const starCount = 6000;
const posArray = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 600;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const starMaterial = new THREE.PointsMaterial({
    size: 0.5,
    color: 0xaaaaaa,
    transparent: true,
});
const stars = new THREE.Points(starGeo, starMaterial);
scene.add(stars);

// Mouse move interaction
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
});

// Animation loop
const clock = new THREE.Clock();
const animate = () => {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    stars.rotation.y = -mouseX * 0.00005;
    stars.rotation.x = -mouseY * 0.00005;
    // Parallax effect on scroll
    camera.position.z = 1 + (document.documentElement.scrollTop || document.body.scrollTop) * 0.001;
    renderer.render(scene, camera);
};
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Leaflet Map Initialization ---
document.addEventListener('DOMContentLoaded', function() {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }

    const map = L.map('map', {
        zoomControl: false // Disable the default zoom control
    }).setView([10.762622, 106.660172], 13); // Centered on Ho Chi Minh City

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Force map to resize after a short delay
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    // User location marker
    let userMarker = null;
    
    // Function to get user's current location
    function getUserLocation() {
        if ('geolocation' in navigator) {
            console.log('Getting user location...');
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const accuracy = position.coords.accuracy;
                    
                    console.log(`User location: ${lat}, ${lon} (accuracy: ${accuracy}m)`);
                    
                    // Create custom icon for user location
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: `<div class="user-location-icon">
                                <img src="https://placehold.co/64x64/4F46E5/FFFFFF?text=YOU" class="user-avatar"/>
                                <div class="pulse"></div>
                               </div>`,
                        iconSize: [60, 60],
                        iconAnchor: [30, 30]
                    });
                    
                    // Remove old user marker if exists
                    if (userMarker) {
                        map.removeLayer(userMarker);
                    }
                    
                    // Add user marker
                    userMarker = L.marker([lat, lon], {icon: userIcon})
                        .addTo(map)
                        .bindPopup(`
                            <div class="text-center">
                                <b class="text-lg text-blue-500">Vị trí của bạn</b><br>
                                <small>Độ chính xác: ~${Math.round(accuracy)}m</small><br>
                                <small>Tọa độ: ${lat.toFixed(6)}, ${lon.toFixed(6)}</small>
                            </div>
                        `);
                    
                    // Center map on user location
                    map.setView([lat, lon], 15);
                    
                    // Show success message
                    showLocationMessage('✅ Đã tìm thấy vị trí của bạn!', 'success');
                },
                function(error) {
                    console.error('Geolocation error:', error);
                    let errorMessage = 'Không thể lấy vị trí của bạn. ';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Vui lòng cho phép truy cập vị trí.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Thông tin vị trí không khả dụng.';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Hết thời gian chờ.';
                            break;
                        default:
                            errorMessage += 'Lỗi không xác định.';
                            break;
                    }
                    
                    showLocationMessage(errorMessage, 'error');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        } else {
            showLocationMessage('❌ Trình duyệt không hỗ trợ định vị.', 'error');
        }
    }
    
    // Function to show location messages
    function showLocationMessage(message, type) {
        // Remove existing message if any
        const existingMessage = document.querySelector('.location-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `location-message fixed top-4 right-4 z-50 p-4 rounded-lg text-white font-semibold shadow-lg ${
            type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 3000);
    }
    
    // Add locate user button to map
    const locateButton = L.control({position: 'bottomright'});
    
    locateButton.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'locate-user-button');
        div.innerHTML = `
            <button onclick="getUserLocation()" class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors" title="Tìm vị trí của tôi">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </button>
        `;
        
        // Prevent map events on button click
        L.DomEvent.disableClickPropagation(div);
        
        return div;
    };
    
    locateButton.addTo(map);
    
    // Make getUserLocation available globally
    window.getUserLocation = getUserLocation;
    
    // Auto-locate user on page load
    getUserLocation();

    // --- Friend Data & Markers ---
    const friends = [
        { name: 'Cosmo Explorer', lat: 10.7769, lon: 106.7009, avatar: 'https://placehold.co/64x64/8A2BE2/FFFFFF?text=C', color: '#a855f7', location: 'Tại Đài thiên văn', speed: 5, battery: 80, time: '15 phút' },
        { name: 'Galaxy Gazer', lat: 10.75, lon: 106.66, avatar: 'https://placehold.co/64x64/00BFFF/FFFFFF?text=G', color: '#38bdf8', location: 'Đang ở nhà', speed: 0, battery: 95, time: '3 giờ' },
        { name: 'Starlight', lat: 10.78, lon: 106.68, avatar: 'https://placehold.co/64x64/FFAA00/FFFFFF?text=S', color: '#f59e0b', location: 'Quán cà phê Stardust', speed: 0, battery: 55, time: '2 giờ trước' }
    ];

    const friendsListContainer = document.getElementById('friends-list');
    if (!friendsListContainer) {
        console.error('Friends list container not found');
        return;
    }

    // Loop through friends to create map markers and list items
    friends.forEach(friend => {
        // Create custom icon for the map marker
        const customIcon = L.divIcon({
            className: 'custom-map-icon-container',
            html: `<img src="${friend.avatar}" class="custom-map-icon" style="border-color: ${friend.color};">`,
            iconSize: [48, 48],
            iconAnchor: [24, 48]
        });
        
        // Create popup content for the marker
        const popupContent = `
            <div class="text-center">
                <b class="text-lg">${friend.name}</b><br>
                ${friend.location}<br>
                ${friend.speed > 0 ? `Di chuyển: ${friend.speed} km/h` : `Dừng • ${friend.time}`}<br>
                Pin: ${friend.battery}%
            </div>
        `;

        // Add marker to the map
        L.marker([friend.lat, friend.lon], {icon: customIcon})
            .addTo(map)
            .bindPopup(popupContent);

        // Create a list item for the sidebar
        const friendElement = document.createElement('div');
        friendElement.className = `flex items-center justify-between ${friend.time.includes('trước') ? 'opacity-60' : ''}`;
        friendElement.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${friend.avatar}" alt="User Avatar" class="w-12 h-12 rounded-full"/>
                <div>
                    <p class="font-semibold text-white">${friend.name}</p>
                    <p class="text-xs text-gray-400">
                        ${friend.speed > 0 ? `Đang di chuyển - ${friend.speed} km/h` : `${friend.location} • ${friend.time}`}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">${friend.battery}%</span>
                    <button class="p-2 rounded-full hover:bg-purple-500/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="m18.5 8.5 3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>
                    </button>
            </div>
        `;
        friendsListContainer.appendChild(friendElement);
    });
});
