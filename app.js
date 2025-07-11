/**
 * Основное приложение визуализации рынка предпринимателей России
 * Связывает все модули и управляет интерфейсом
 */

class EntrepreneursVisualization {
    constructor() {
        this.dataManager = null;
        this.scene3D = null;
        this.isInitialized = false;
        this.currentMode = 'cloud'; // 'cloud' или 'map'
        this.isLoading = true;
        
        // Элементы интерфейса
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            mainContainer: document.getElementById('main-container'),
            scene3DContainer: document.getElementById('scene-3d'),
            controlsPanel: document.getElementById('controls-panel'),
            filtersPanel: document.getElementById('filters-panel'),
            statsPanel: document.getElementById('stats-panel'),
            
            // Кнопки управления
            modeToggle: document.getElementById('mode-toggle'),
            resetView: document.getElementById('reset-view'),
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            clearFilters: document.getElementById('clear-filters'),
            
            // Фильтры
            revenueFilters: document.getElementById('revenue-filters'),
            industryFilters: document.getElementById('industry-filters'),
            regionFilters: document.getElementById('region-filters'),
            bankFilters: document.getElementById('bank-filters'),
            
            // Статистика
            totalCompanies: document.getElementById('total-companies'),
            totalGroups: document.getElementById('total-groups'),
            activeFilters: document.getElementById('active-filters'),
            
            // Поиск
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results')
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('Инициализация приложения...');
            
            // Показываем экран загрузки
            this.showLoading('Загрузка данных...');
            
            // Инициализируем менеджер данных
            this.dataManager = new DataManager();
            this.dataManager.onDataLoaded((data) => this.onDataLoaded(data));
            this.dataManager.onFiltersChanged((result) => this.onFiltersChanged(result));
            
            // Загружаем данные
            await this.dataManager.loadAllData();
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Ошибка загрузки данных: ' + error.message);
        }
    }
    
    onDataLoaded(data) {
        console.log('Данные загружены, инициализация 3D сцены...');
        
        this.showLoading('Создание 3D визуализации...');
        
        // Инициализируем 3D сцену
        this.scene3D = new Scene3D('scene-3d');
        this.scene3D.createStarSystem(data.companies);
        
        // Настраиваем интерфейс
        this.setupInterface(data);
        this.setupEventListeners();
        this.updateStatistics(data.statistics);
        
        // Скрываем экран загрузки
        this.hideLoading();
        
        this.isInitialized = true;
        console.log('Приложение инициализировано');
    }
    
    setupInterface(data) {
        // Создаем фильтры по категориям выручки
        this.createRevenueFilters(data.revenueCategories);
        
        // Создаем фильтры по отраслям
        this.createIndustryFilters(data.industryCategories);
        
        // Создаем фильтры по регионам (топ-20)
        this.createRegionFilters(data.regions.slice(0, 20));
        
        // Создаем фильтры по банкам
        this.createBankFilters(data.banks);
        
        // Настраиваем поиск
        this.setupSearch();
    }
    
    createRevenueFilters(categories) {
        const container = this.elements.revenueFilters;
        if (!container) return;
        
        container.innerHTML = '<h4>По размеру выручки</h4>';
        
        categories.forEach((category, index) => {
            const label = document.createElement('label');
            label.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = index;
            checkbox.addEventListener('change', () => this.updateRevenueFilter());
            
            const span = document.createElement('span');
            span.textContent = `${category.name} (${category.desc})`;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
        });
    }
    
    createIndustryFilters(industryCategories) {
        const container = this.elements.industryFilters;
        if (!container) return;
        
        container.innerHTML = '<h4>По отраслям</h4>';
        
        // Создаем фильтры по категориям отраслей
        Array.from(industryCategories.entries()).forEach(([categoryName, industries]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'filter-category';
            
            const categoryLabel = document.createElement('label');
            categoryLabel.className = 'filter-category-label';
            
            const categoryCheckbox = document.createElement('input');
            categoryCheckbox.type = 'checkbox';
            categoryCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const industryCheckboxes = categoryDiv.querySelectorAll('.industry-checkbox');
                industryCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                this.updateIndustryFilter();
            });
            
            const categorySpan = document.createElement('span');
            categorySpan.textContent = categoryName;
            
            categoryLabel.appendChild(categoryCheckbox);
            categoryLabel.appendChild(categorySpan);
            categoryDiv.appendChild(categoryLabel);
            
            // Добавляем отдельные отрасли (первые 5)
            const industriesToShow = industries.slice(0, 5);
            industriesToShow.forEach(industry => {
                const label = document.createElement('label');
                label.className = 'filter-item filter-sub-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'industry-checkbox';
                checkbox.value = industry.code;
                checkbox.addEventListener('change', () => this.updateIndustryFilter());
                
                const span = document.createElement('span');
                span.textContent = industry.name.length > 50 ? 
                    industry.name.substring(0, 50) + '...' : 
                    industry.name;
                span.title = industry.name;
                
                label.appendChild(checkbox);
                label.appendChild(span);
                categoryDiv.appendChild(label);
            });
            
            container.appendChild(categoryDiv);
        });
    }
    
    createRegionFilters(regions) {
        const container = this.elements.regionFilters;
        if (!container) return;
        
        container.innerHTML = '<h4>По регионам</h4>';
        
        // Группируем по федеральным округам
        const districts = {};
        regions.forEach(region => {
            if (!districts[region.federal_district]) {
                districts[region.federal_district] = [];
            }
            districts[region.federal_district].push(region);
        });
        
        Object.entries(districts).forEach(([districtName, districtRegions]) => {
            const districtDiv = document.createElement('div');
            districtDiv.className = 'filter-category';
            
            const districtLabel = document.createElement('label');
            districtLabel.className = 'filter-category-label';
            
            const districtCheckbox = document.createElement('input');
            districtCheckbox.type = 'checkbox';
            districtCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                const regionCheckboxes = districtDiv.querySelectorAll('.region-checkbox');
                regionCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                this.updateRegionFilter();
            });
            
            const districtSpan = document.createElement('span');
            districtSpan.textContent = districtName;
            
            districtLabel.appendChild(districtCheckbox);
            districtLabel.appendChild(districtSpan);
            districtDiv.appendChild(districtLabel);
            
            // Добавляем регионы
            districtRegions.forEach(region => {
                const label = document.createElement('label');
                label.className = 'filter-item filter-sub-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'region-checkbox';
                checkbox.value = region.code;
                checkbox.addEventListener('change', () => this.updateRegionFilter());
                
                const span = document.createElement('span');
                span.textContent = region.name;
                
                label.appendChild(checkbox);
                label.appendChild(span);
                districtDiv.appendChild(label);
            });
            
            container.appendChild(districtDiv);
        });
    }
    
    createBankFilters(banks) {
        const container = this.elements.bankFilters;
        if (!container) return;
        
        container.innerHTML = '<h4>По банкам</h4>';
        
        banks.forEach(bank => {
            const label = document.createElement('label');
            label.className = 'filter-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = bank.id;
            checkbox.addEventListener('change', () => this.updateBankFilter());
            
            const span = document.createElement('span');
            span.textContent = `${bank.name} (${bank.market_share}%)`;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            container.appendChild(label);
        });
    }
    
    setupSearch() {
        const searchInput = this.elements.searchInput;
        const searchResults = this.elements.searchResults;
        
        if (!searchInput || !searchResults) return;
        
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                const results = this.dataManager.searchCompanies(query);
                this.displaySearchResults(results);
            }, 300);
        });
        
        // Скрываем результаты при клике вне поиска
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
    
    displaySearchResults(results) {
        const container = this.elements.searchResults;
        if (!container) return;
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-no-results">Ничего не найдено</div>';
        } else {
            container.innerHTML = results.map(company => `
                <div class="search-result-item" data-company-id="${company.id}">
                    <div class="search-result-title">${company.region_name}</div>
                    <div class="search-result-subtitle">${company.industry_category} • ${company.count} компаний</div>
                </div>
            `).join('');
            
            // Добавляем обработчики кликов
            container.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const companyId = item.dataset.companyId;
                    this.focusOnCompany(companyId);
                    container.style.display = 'none';
                });
            });
        }
        
        container.style.display = 'block';
    }
    
    setupEventListeners() {
        // Кнопки управления
        if (this.elements.modeToggle) {
            this.elements.modeToggle.addEventListener('click', () => this.toggleMode());
        }
        
        if (this.elements.resetView) {
            this.elements.resetView.addEventListener('click', () => this.resetView());
        }
        
        if (this.elements.zoomIn) {
            this.elements.zoomIn.addEventListener('click', () => this.zoomIn());
        }
        
        if (this.elements.zoomOut) {
            this.elements.zoomOut.addEventListener('click', () => this.zoomOut());
        }
        
        if (this.elements.clearFilters) {
            this.elements.clearFilters.addEventListener('click', () => this.clearAllFilters());
        }
        
        // Обработчик для tooltip при наведении на звезды
        if (this.elements.scene3DContainer) {
            this.elements.scene3DContainer.addEventListener('mousemove', (e) => {
                this.handleMouseMove(e);
            });
        }
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            if (this.scene3D) {
                this.scene3D.onWindowResize();
            }
        });
    }
    
    // Обработчики фильтров
    updateRevenueFilter() {
        const checkboxes = this.elements.revenueFilters.querySelectorAll('input[type="checkbox"]:checked');
        const categories = Array.from(checkboxes).map(cb => parseInt(cb.value));
        this.dataManager.setRevenueFilter(categories);
    }
    
    updateIndustryFilter() {
        const checkboxes = this.elements.industryFilters.querySelectorAll('.industry-checkbox:checked');
        const codes = Array.from(checkboxes).map(cb => cb.value);
        this.dataManager.setIndustryFilter(codes);
    }
    
    updateRegionFilter() {
        const checkboxes = this.elements.regionFilters.querySelectorAll('.region-checkbox:checked');
        const codes = Array.from(checkboxes).map(cb => cb.value);
        this.dataManager.setRegionFilter(codes);
    }
    
    updateBankFilter() {
        const checkboxes = this.elements.bankFilters.querySelectorAll('input[type="checkbox"]:checked');
        const ids = Array.from(checkboxes).map(cb => cb.value);
        this.dataManager.setBankFilter(ids);
    }
    
    onFiltersChanged(result) {
        // Обновляем 3D визуализацию
        if (this.scene3D) {
            this.scene3D.applyFilters(result.companies);
        }
        
        // Обновляем статистику
        this.updateStatistics(result.statistics);
        
        // Обновляем индикатор активных фильтров
        this.updateActiveFiltersDisplay(result.activeFilters);
    }
    
    updateStatistics(stats) {
        if (this.elements.totalCompanies) {
            this.elements.totalCompanies.textContent = stats.total_companies.toLocaleString();
        }
        
        if (this.elements.totalGroups) {
            this.elements.totalGroups.textContent = stats.total_groups.toLocaleString();
        }
        
        // Обновляем диаграммы статистики
        this.updateStatisticsCharts(stats);
    }
    
    updateStatisticsCharts(stats) {
        // Здесь можно добавить создание диаграмм с помощью Chart.js или D3.js
        // Пока просто выводим в консоль
        console.log('Статистика обновлена:', stats);
    }
    
    updateActiveFiltersDisplay(activeFilters) {
        const container = this.elements.activeFilters;
        if (!container) return;
        
        if (activeFilters.total === 0) {
            container.innerHTML = '<span class="no-filters">Фильтры не применены</span>';
            return;
        }
        
        const filterTags = [];
        
        // Добавляем теги для каждого типа фильтра
        activeFilters.revenue.forEach(filter => {
            filterTags.push(`<span class="filter-tag revenue">${filter.desc}</span>`);
        });
        
        activeFilters.industry.forEach(filter => {
            filterTags.push(`<span class="filter-tag industry">${filter.category}</span>`);
        });
        
        activeFilters.region.forEach(filter => {
            filterTags.push(`<span class="filter-tag region">${filter.name}</span>`);
        });
        
        activeFilters.bank.forEach(filter => {
            filterTags.push(`<span class="filter-tag bank">${filter.name}</span>`);
        });
        
        container.innerHTML = filterTags.join('');
    }
    
    // Методы управления
    toggleMode() {
        if (!this.scene3D) return;
        
        if (this.currentMode === 'cloud') {
            this.scene3D.switchToMapMode();
            this.currentMode = 'map';
            if (this.elements.modeToggle) {
                this.elements.modeToggle.textContent = 'Режим облака';
            }
        } else {
            this.scene3D.switchToCloudMode();
            this.currentMode = 'cloud';
            if (this.elements.modeToggle) {
                this.elements.modeToggle.textContent = 'Режим карты';
            }
        }
    }
    
    resetView() {
        if (this.scene3D) {
            this.scene3D.resetView();
        }
    }
    
    zoomIn() {
        if (this.scene3D) {
            this.scene3D.zoomIn();
        }
    }
    
    zoomOut() {
        if (this.scene3D) {
            this.scene3D.zoomOut();
        }
    }
    
    clearAllFilters() {
        // Снимаем все чекбоксы
        document.querySelectorAll('#filters-panel input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Очищаем фильтры в менеджере данных
        this.dataManager.clearAllFilters();
    }
    
    focusOnCompany(companyId) {
        // Здесь можно добавить логику фокусировки на конкретной компании
        console.log('Фокус на компании:', companyId);
    }
    
    handleMouseMove(event) {
        if (!this.scene3D) return;
        
        const company = this.scene3D.getStarUnderMouse(event.clientX, event.clientY);
        if (company) {
            this.showTooltip(event, company);
        } else {
            this.hideTooltip();
        }
    }
    
    showTooltip(event, company) {
        let tooltip = document.getElementById('tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.innerHTML = `
            <div class="tooltip-title">${company.region_name}</div>
            <div class="tooltip-content">
                <div>Отрасль: ${company.industry_category}</div>
                <div>Компаний: ${company.count.toLocaleString()}</div>
                <div>Выручка: ${company.metadata.revenue_range.name}</div>
                <div>Банк: ${company.bank_name}</div>
            </div>
        `;
        
        tooltip.style.left = (event.clientX + 10) + 'px';
        tooltip.style.top = (event.clientY - 10) + 'px';
        tooltip.style.display = 'block';
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    // Методы для экрана загрузки
    showLoading(message = 'Загрузка...') {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
            const messageEl = this.elements.loadingScreen.querySelector('.loading-message');
            if (messageEl) {
                messageEl.textContent = message;
            }
        }
        this.isLoading = true;
    }
    
    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
        if (this.elements.mainContainer) {
            this.elements.mainContainer.style.display = 'flex';
        }
        this.isLoading = false;
    }
    
    showError(message) {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.innerHTML = `
                <div class="loading-content">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${message}</div>
                    <button onclick="location.reload()" class="retry-button">Попробовать снова</button>
                </div>
            `;
        }
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new EntrepreneursVisualization();
});

