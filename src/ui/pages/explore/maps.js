const { useState, useEffect, useRef } = React;

const ThreeBackground = () => {
    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.z = 1;
        const renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('cosmic-bg'),
            antialias: true,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
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
        let mouseX = 0;
        let mouseY = 0;
        const onMouseMove = (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
        };
        document.addEventListener('mousemove', onMouseMove);
        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            stars.rotation.y = -mouseX * 0.00005;
            stars.rotation.x = -mouseY * 0.00005;
            camera.position.z = 1 + window.scrollY * 0.001;
            renderer.render(scene, camera);
        };
        animate();
        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            document.removeEventListener('mousemove', onMouseMove);
        }
    }, []);

    return null;
};

const MapComponent = ({ friends }) => {
    const mapRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) {
            mapRef.current = L.map('map', {
                zoomControl: false
            }).setView([10.762622, 106.660172], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);

            friends.forEach(friend => {
                const customIcon = L.divIcon({
                    className: 'custom-map-icon-container',
                    html: `<img src="${friend.avatar}" class="custom-map-icon" style="border-color: ${friend.color};">`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 48]
                });
                
                const popupContent = `
                    <div class="text-center">
                        <b class="text-lg">${friend.name}</b><br>
                        ${friend.location}<br>
                        ${friend.speed > 0 ? `Di chuyển: ${friend.speed} km/h` : `Dừng • ${friend.time}`}<br>
                        Pin: ${friend.battery}%
                    </div>
                `;

                L.marker([friend.lat, friend.lon], { icon: customIcon })
                  .addTo(mapRef.current)
                  .bindPopup(popupContent);
            });
        }
    }, [friends]);

    return <div id="map" className="w-full h-full"></div>;
};

const App = () => {
    const friends = [
        { name: 'Cosmo Explorer', lat: 10.7769, lon: 106.7009, avatar: 'https://placehold.co/64x64/8A2BE2/FFFFFF?text=C', color: '#a855f7', location: 'Tại Đài thiên văn', speed: 5, battery: 80, time: '15 phút' },
        { name: 'Galaxy Gazer', lat: 10.75, lon: 106.66, avatar: 'https://placehold.co/64x64/00BFFF/FFFFFF?text=G', color: '#38bdf8', location: 'Đang ở nhà', speed: 0, battery: 95, time: '3 giờ' },
        { name: 'Starlight', lat: 10.78, lon: 106.68, avatar: 'https://placehold.co/64x64/FFAA00/FFFFFF?text=S', color: '#f59e0b', location: 'Quán cà phê Stardust', speed: 0, battery: 55, time: '2 giờ trước' }
    ];

    return (
        <>
            <ThreeBackground />
            <div className="relative z-10 container mx-auto grid grid-cols-12 gap-8 px-4 py-8">
                <aside className="col-span-12 lg:col-span-3 h-fit sticky top-8">
                    <div className="glass-pane p-4 rounded-2xl space-y-2">
                        <a href="/profile" className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-800/50 transition-colors">
                            <img src="https://placehold.co/48x48/4F46E5/FFFFFF?text=A" alt="User Avatar" className="w-12 h-12 rounded-full border-2 border-indigo-500"/>
                            <div>
                                <h3 className="font-bold text-lg text-white">Alex Starr</h3>
                                <p className="text-sm text-gray-400">@alexstarr</p>
                            </div>
                        </a>
                        <hr className="border-gray-700/50"/>
                        <nav className="flex flex-col space-y-2">
                            <a href="/home" className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold hover:bg-gray-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                <span>Trang chủ</span>
                            </a>
                            <a href="/discovery" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                <span>Khám phá</span>
                            </a>
                            <a href="/messages" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <span>Tin nhắn</span>
                            </a>
                            <a href="/maps" className="flex items-center gap-3 px-4 py-3 rounded-lg text-white font-semibold bg-gray-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                <span>Bản đồ</span>
                            </a>
                             <a href="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <span>Hồ sơ</span>
                            </a>
                            <a href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                <span>Cài đặt</span>
                            </a>
                        </nav>
                        <hr className="border-gray-700/50 pt-2"/>
                        <button 
                            onClick={() => {
                                if(confirm('Bạn có chắc muốn đăng xuất?')) {
                                    window.location.href = '/login';
                                }
                            }}
                            className="w-full logout-button font-bold py-3 rounded-lg flex items-center justify-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </aside>

                <main className="col-span-12 lg:col-span-9">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-4rem)]">
                        <div className="md:col-span-2 h-full">
                            <div className="glass-pane rounded-2xl w-full h-full overflow-hidden relative">
                                <MapComponent friends={friends} />
                            </div>
                        </div>
                        <div className="md:col-span-1 h-full">
                            <div className="glass-pane rounded-2xl w-full h-full flex flex-col">
                                <div className="p-4 border-b border-gray-700/50">
                                    <h2 className="text-xl font-bold text-white">Bạn bè</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
                                    {friends.map(friend => (
                                        <div key={friend.name} className={`flex items-center justify-between ${friend.time.includes('trước') ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <img src={friend.avatar} alt="User Avatar" className="w-12 h-12 rounded-full"/>
                                                <div>
                                                    <p className="font-semibold text-white">{friend.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {friend.speed > 0 ? `Đang di chuyển - ${friend.speed} km/h` : `${friend.location} • ${friend.time}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                 <span className="text-xs text-gray-400">{friend.battery}%</span>
                                                 <button className="p-2 rounded-full hover:bg-purple-500/30 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="m18.5 8.5 3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));
