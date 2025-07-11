/**
 * Scene3D - Модуль для управления 3D визуализацией звездного скопления
 * Использует Three.js для создания интерактивной 3D сцены
 */

class Scene3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.stars = null;
        this.starGeometry = null;
        this.starMaterial = null;
        this.starPositions = null;
        this.starColors = null;
        this.starSizes = null;
        this.companies = [];
        this.filteredCompanies = [];
        this.isMapMode = false;
        this.animationId = null;
        
        // Параметры сцены
        this.sceneParams = {
            starCount: 0,
            cloudRadius: 150,
            mapScale: 200,
            starBaseSize: 2.0,
            starMaxSize: 8.0,
            cameraDistance: 300,
            rotationSpeed: 0.001
        };
        
        // Цвета для категорий выручки
        this.revenueColors = [
            new THREE.Color(0x64b5f6), // 0-5 млн (голубой)
            new THREE.Color(0x42a5f5), // 5-20 млн (синий)
            new THREE.Color(0x2196f3), // 20-80 млн (темно-синий)
            new THREE.Color(0x1976d2), // 80-400 млн (темно-синий)
            new THREE.Color(0x1565c0)  // 400+ млн (очень темно-синий)
        ];
        
        this.init();
    }
    
    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLights();
        this.createBackground();
        this.setupEventListeners();
        this.animate();
        
        console.log('3D сцена инициализирована');
    }
    
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x0a0a0f, 200, 1000);
    }
    
    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 1, 2000);
        this.camera.position.set(0, 0, this.sceneParams.cameraDistance);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x0a0a0f, 0.8);
        this.container.appendChild(this.renderer.domElement);
    }
    
    createControls() {
        // Создаем простые орбитальные контролы без внешней библиотеки
        this.controls = {
            enabled: true,
            autoRotate: false,
            autoRotateSpeed: 0.5,
            enableDamping: true,
            dampingFactor: 0.05,
            minDistance: 50,
            maxDistance: 800,
            
            // Состояние мыши
            isMouseDown: false,
            mouseX: 0,
            mouseY: 0,
            targetRotationX: 0,
            targetRotationY: 0,
            currentRotationX: 0,
            currentRotationY: 0,
            
            // Состояние зума
            targetDistance: this.sceneParams.cameraDistance,
            currentDistance: this.sceneParams.cameraDistance
        };
        
        this.setupMouseControls();
    }
    
    setupMouseControls() {
        const canvas = this.renderer.domElement;
        
        // Обработчики мыши
        canvas.addEventListener('mousedown', (event) => {
            this.controls.isMouseDown = true;
            this.controls.mouseX = event.clientX;
            this.controls.mouseY = event.clientY;
            canvas.style.cursor = 'grabbing';
        });
        
        canvas.addEventListener('mousemove', (event) => {
            if (!this.controls.isMouseDown) return;
            
            const deltaX = event.clientX - this.controls.mouseX;
            const deltaY = event.clientY - this.controls.mouseY;
            
            this.controls.targetRotationY += deltaX * 0.01;
            this.controls.targetRotationX += deltaY * 0.01;
            
            // Ограничиваем вертикальное вращение
            this.controls.targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.controls.targetRotationX));
            
            this.controls.mouseX = event.clientX;
            this.controls.mouseY = event.clientY;
        });
        
        canvas.addEventListener('mouseup', () => {
            this.controls.isMouseDown = false;
            canvas.style.cursor = 'grab';
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.controls.isMouseDown = false;
            canvas.style.cursor = 'grab';
        });
        
        // Обработчик колеса мыши для зума
        canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            const delta = event.deltaY > 0 ? 1.1 : 0.9;
            this.controls.targetDistance *= delta;
            this.controls.targetDistance = Math.max(
                this.controls.minDistance, 
                Math.min(this.controls.maxDistance, this.controls.targetDistance)
            );
        });
        
        canvas.style.cursor = 'grab';
    }
    
    updateControls() {
        if (!this.controls.enabled) return;
        
        // Плавное вращение
        this.controls.currentRotationX += (this.controls.targetRotationX - this.controls.currentRotationX) * this.controls.dampingFactor;
        this.controls.currentRotationY += (this.controls.targetRotationY - this.controls.currentRotationY) * this.controls.dampingFactor;
        
        // Плавный зум
        this.controls.currentDistance += (this.controls.targetDistance - this.controls.currentDistance) * this.controls.dampingFactor;
        
        // Применяем трансформации к камере
        const x = this.controls.currentDistance * Math.sin(this.controls.currentRotationY) * Math.cos(this.controls.currentRotationX);
        const y = this.controls.currentDistance * Math.sin(this.controls.currentRotationX);
        const z = this.controls.currentDistance * Math.cos(this.controls.currentRotationY) * Math.cos(this.controls.currentRotationX);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
        
        // Автоповорот
        if (this.controls.autoRotate && !this.controls.isMouseDown) {
            this.controls.targetRotationY += this.controls.autoRotateSpeed * 0.01;
        }
    }
    
    createLights() {
        // Окружающий свет
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Направленный свет
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);
        
        // Точечный свет для эффекта
        const pointLight = new THREE.PointLight(0x00d4ff, 0.5, 500);
        pointLight.position.set(0, 0, 100);
        this.scene.add(pointLight);
    }
    
    createBackground() {
        // Создаем звездный фон
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;     // x
            positions[i + 1] = (Math.random() - 0.5) * 2000; // y
            positions[i + 2] = (Math.random() - 0.5) * 2000; // z
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.8
        });
        
        const backgroundStars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(backgroundStars);
    }
    
    createStarSystem(companies) {
        this.companies = companies;
        this.filteredCompanies = [...companies];
        
        if (this.stars) {
            this.scene.remove(this.stars);
        }
        
        const starCount = companies.length;
        this.sceneParams.starCount = starCount;
        
        // Создаем геометрию для звезд
        this.starGeometry = new THREE.BufferGeometry();
        this.starPositions = new Float32Array(starCount * 3);
        this.starColors = new Float32Array(starCount * 3);
        this.starSizes = new Float32Array(starCount);
        
        // Заполняем данные звезд
        for (let i = 0; i < starCount; i++) {
            const company = companies[i];
            const i3 = i * 3;
            
            // Позиция в 3D облаке
            this.starPositions[i3] = company.position_3d.x;
            this.starPositions[i3 + 1] = company.position_3d.y;
            this.starPositions[i3 + 2] = company.position_3d.z;
            
            // Цвет на основе категории выручки
            const color = this.revenueColors[company.revenue_category];
            this.starColors[i3] = color.r;
            this.starColors[i3 + 1] = color.g;
            this.starColors[i3 + 2] = color.b;
            
            // Размер на основе количества компаний в группе
            const normalizedSize = Math.log(company.count + 1) / Math.log(1000);
            this.starSizes[i] = this.sceneParams.starBaseSize + normalizedSize * this.sceneParams.starMaxSize;
        }
        
        // Устанавливаем атрибуты геометрии
        this.starGeometry.setAttribute('position', new THREE.BufferAttribute(this.starPositions, 3));
        this.starGeometry.setAttribute('color', new THREE.BufferAttribute(this.starColors, 3));
        this.starGeometry.setAttribute('size', new THREE.BufferAttribute(this.starSizes, 1));
        
        // Создаем материал для звезд
        this.starMaterial = new THREE.PointsMaterial({
            size: 3.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });
        
        // Создаем систему частиц
        this.stars = new THREE.Points(this.starGeometry, this.starMaterial);
        this.scene.add(this.stars);
        
        console.log(`Создана система из ${starCount} звезд`);
    }
    
    switchToMapMode() {
        if (!this.companies.length || this.isMapMode) return;
        
        this.isMapMode = true;
        
        // Анимируем переход к карте
        this.animateToMap();
    }
    
    switchToCloudMode() {
        if (!this.companies.length || !this.isMapMode) return;
        
        this.isMapMode = false;
        
        // Анимируем переход к облаку
        this.animateToCloud();
    }
    
    animateToMap() {
        if (!this.stars) return;
        
        const positions = this.starGeometry.attributes.position.array;
        const targetPositions = new Float32Array(positions.length);
        
        // Вычисляем позиции на карте
        for (let i = 0; i < this.companies.length; i++) {
            const company = this.companies[i];
            const i3 = i * 3;
            
            // Преобразуем координаты в позиции на карте
            const x = (company.coordinates.lon - 37.6176) * this.sceneParams.mapScale / 10; // Центрируем по Москве
            const y = 0; // Плоская карта
            const z = (company.coordinates.lat - 55.7558) * this.sceneParams.mapScale / 10;
            
            targetPositions[i3] = x;
            targetPositions[i3 + 1] = y;
            targetPositions[i3 + 2] = z;
        }
        
        // Анимируем переход
        this.animatePositions(positions, targetPositions, 2000);
    }
    
    animateToCloud() {
        if (!this.stars) return;
        
        const positions = this.starGeometry.attributes.position.array;
        const targetPositions = new Float32Array(positions.length);
        
        // Возвращаем к исходным позициям облака
        for (let i = 0; i < this.companies.length; i++) {
            const company = this.companies[i];
            const i3 = i * 3;
            
            targetPositions[i3] = company.position_3d.x;
            targetPositions[i3 + 1] = company.position_3d.y;
            targetPositions[i3 + 2] = company.position_3d.z;
        }
        
        // Анимируем переход
        this.animatePositions(positions, targetPositions, 2000);
    }
    
    animatePositions(fromPositions, toPositions, duration) {
        const startTime = Date.now();
        const startPositions = new Float32Array(fromPositions);
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Используем easing функцию
            const eased = this.easeInOutCubic(progress);
            
            for (let i = 0; i < fromPositions.length; i++) {
                fromPositions[i] = startPositions[i] + (toPositions[i] - startPositions[i]) * eased;
            }
            
            this.starGeometry.attributes.position.needsUpdate = true;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    applyFilters(filteredCompanies) {
        this.filteredCompanies = filteredCompanies;
        
        if (!this.stars) return;
        
        // Обновляем видимость и прозрачность звезд
        const colors = this.starGeometry.attributes.color.array;
        const originalColors = new Float32Array(colors);
        
        for (let i = 0; i < this.companies.length; i++) {
            const company = this.companies[i];
            const isVisible = filteredCompanies.includes(company);
            const i3 = i * 3;
            
            if (isVisible) {
                // Полная яркость
                const color = this.revenueColors[company.revenue_category];
                colors[i3] = color.r;
                colors[i3 + 1] = color.g;
                colors[i3 + 2] = color.b;
            } else {
                // Затемняем
                colors[i3] *= 0.1;
                colors[i3 + 1] *= 0.1;
                colors[i3 + 2] *= 0.1;
            }
        }
        
        this.starGeometry.attributes.color.needsUpdate = true;
    }
    
    resetView() {
        this.controls.targetRotationX = 0;
        this.controls.targetRotationY = 0;
        this.controls.targetDistance = this.sceneParams.cameraDistance;
    }
    
    zoomIn() {
        this.controls.targetDistance *= 0.8;
        this.controls.targetDistance = Math.max(this.controls.minDistance, this.controls.targetDistance);
    }
    
    zoomOut() {
        this.controls.targetDistance *= 1.25;
        this.controls.targetDistance = Math.min(this.controls.maxDistance, this.controls.targetDistance);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Обновляем контролы
        this.updateControls();
        
        // Рендерим сцену
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.starGeometry) {
            this.starGeometry.dispose();
        }
        
        if (this.starMaterial) {
            this.starMaterial.dispose();
        }
    }
    
    // Методы для получения информации о звезде под курсором
    getStarUnderMouse(mouseX, mouseY) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((mouseX - rect.left) / rect.width) * 2 - 1;
        const y = -((mouseY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x, y }, this.camera);
        
        if (this.stars) {
            const intersects = raycaster.intersectObject(this.stars);
            if (intersects.length > 0) {
                const index = intersects[0].index;
                return this.companies[index];
            }
        }
        
        return null;
    }
}

