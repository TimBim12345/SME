/**
 * DataManager - Модуль для управления данными компаний
 * Загружает, обрабатывает и фильтрует данные
 */

class DataManager {
    constructor() {
        this.rawData = null;
        this.companies = [];
        this.regions = [];
        this.industries = [];
        this.banks = [];
        this.revenueCategories = [];
        this.statistics = null;
        
        // Активные фильтры
        this.activeFilters = {
            revenue: new Set(),
            industry: new Set(),
            region: new Set(),
            bank: new Set()
        };
        
        // Кэш для фильтрованных данных
        this.filteredCache = new Map();
        
        this.loadingCallbacks = [];
        this.filterCallbacks = [];
    }
    
    // Подписка на события
    onDataLoaded(callback) {
        this.loadingCallbacks.push(callback);
    }
    
    onFiltersChanged(callback) {
        this.filterCallbacks.push(callback);
    }
    
    // Загрузка всех данных
    async loadAllData() {
        try {
            console.log('Загрузка данных...');
            
            // Загружаем все файлы параллельно
            const [companiesData, regionsData, industriesData, banksData] = await Promise.all([
                this.loadJSON('data/companies.json'),
                this.loadJSON('data/regions.json'),
                this.loadJSON('data/industries.json'),
                this.loadJSON('data/banks.json')
            ]);
            
            // Обрабатываем данные
            this.rawData = companiesData;
            this.companies = companiesData.companies;
            this.regions = regionsData.regions;
            this.industries = industriesData.industries;
            this.banks = banksData.banks;
            this.revenueCategories = companiesData.revenue_categories;
            this.statistics = companiesData.statistics;
            
            // Создаем индексы для быстрого поиска
            this.createIndexes();
            
            console.log(`Загружено ${this.companies.length} групп компаний`);
            console.log(`Общее количество компаний: ${this.statistics.total_companies.toLocaleString()}`);
            
            // Уведомляем подписчиков
            this.loadingCallbacks.forEach(callback => callback(this.getAllData()));
            
            return this.getAllData();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            throw error;
        }
    }
    
    async loadJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка загрузки ${url}: ${response.status}`);
        }
        return await response.json();
    }
    
    createIndexes() {
        // Создаем индексы для быстрого поиска
        this.regionIndex = new Map();
        this.regions.forEach(region => {
            this.regionIndex.set(region.code, region);
        });
        
        this.industryIndex = new Map();
        this.industries.forEach(industry => {
            this.industryIndex.set(industry.code, industry);
        });
        
        this.bankIndex = new Map();
        this.banks.forEach(bank => {
            this.bankIndex.set(bank.id, bank);
        });
        
        // Группируем отрасли по категориям
        this.industryCategories = new Map();
        this.industries.forEach(industry => {
            if (!this.industryCategories.has(industry.category)) {
                this.industryCategories.set(industry.category, []);
            }
            this.industryCategories.get(industry.category).push(industry);
        });
    }
    
    getAllData() {
        return {
            companies: this.companies,
            regions: this.regions,
            industries: this.industries,
            banks: this.banks,
            revenueCategories: this.revenueCategories,
            statistics: this.statistics,
            industryCategories: this.industryCategories
        };
    }
    
    // Методы фильтрации
    setRevenueFilter(categories) {
        this.activeFilters.revenue = new Set(categories);
        this.applyFilters();
    }
    
    setIndustryFilter(industryCodes) {
        this.activeFilters.industry = new Set(industryCodes);
        this.applyFilters();
    }
    
    setRegionFilter(regionCodes) {
        this.activeFilters.region = new Set(regionCodes);
        this.applyFilters();
    }
    
    setBankFilter(bankIds) {
        this.activeFilters.bank = new Set(bankIds);
        this.applyFilters();
    }
    
    clearAllFilters() {
        this.activeFilters.revenue.clear();
        this.activeFilters.industry.clear();
        this.activeFilters.region.clear();
        this.activeFilters.bank.clear();
        this.applyFilters();
    }
    
    clearFilter(filterType) {
        if (this.activeFilters[filterType]) {
            this.activeFilters[filterType].clear();
            this.applyFilters();
        }
    }
    
    applyFilters() {
        // Создаем ключ для кэша
        const cacheKey = this.createFilterCacheKey();
        
        // Проверяем кэш
        if (this.filteredCache.has(cacheKey)) {
            const cached = this.filteredCache.get(cacheKey);
            this.notifyFilterChange(cached.companies, cached.statistics);
            return cached;
        }
        
        // Фильтруем компании
        let filtered = this.companies;
        
        // Фильтр по выручке
        if (this.activeFilters.revenue.size > 0) {
            filtered = filtered.filter(company => 
                this.activeFilters.revenue.has(company.revenue_category)
            );
        }
        
        // Фильтр по отраслям
        if (this.activeFilters.industry.size > 0) {
            filtered = filtered.filter(company => 
                this.activeFilters.industry.has(company.industry_code)
            );
        }
        
        // Фильтр по регионам
        if (this.activeFilters.region.size > 0) {
            filtered = filtered.filter(company => 
                this.activeFilters.region.has(company.region_code)
            );
        }
        
        // Фильтр по банкам
        if (this.activeFilters.bank.size > 0) {
            filtered = filtered.filter(company => 
                this.activeFilters.bank.has(company.bank_id)
            );
        }
        
        // Вычисляем статистику для отфильтрованных данных
        const filteredStats = this.calculateStatistics(filtered);
        
        // Сохраняем в кэш
        const result = {
            companies: filtered,
            statistics: filteredStats
        };
        this.filteredCache.set(cacheKey, result);
        
        // Уведомляем подписчиков
        this.notifyFilterChange(filtered, filteredStats);
        
        return result;
    }
    
    createFilterCacheKey() {
        const parts = [
            Array.from(this.activeFilters.revenue).sort().join(','),
            Array.from(this.activeFilters.industry).sort().join(','),
            Array.from(this.activeFilters.region).sort().join(','),
            Array.from(this.activeFilters.bank).sort().join(',')
        ];
        return parts.join('|');
    }
    
    notifyFilterChange(companies, statistics) {
        this.filterCallbacks.forEach(callback => callback({
            companies,
            statistics,
            activeFilters: this.getActiveFiltersInfo()
        }));
    }
    
    getActiveFiltersInfo() {
        const info = {
            revenue: [],
            industry: [],
            region: [],
            bank: [],
            total: 0
        };
        
        // Информация о фильтрах по выручке
        this.activeFilters.revenue.forEach(category => {
            info.revenue.push({
                category,
                name: this.revenueCategories[category].name,
                desc: this.revenueCategories[category].desc
            });
        });
        
        // Информация о фильтрах по отраслям
        this.activeFilters.industry.forEach(code => {
            const industry = this.industryIndex.get(code);
            if (industry) {
                info.industry.push({
                    code,
                    name: industry.name,
                    category: industry.category
                });
            }
        });
        
        // Информация о фильтрах по регионам
        this.activeFilters.region.forEach(code => {
            const region = this.regionIndex.get(code);
            if (region) {
                info.region.push({
                    code,
                    name: region.name,
                    federalDistrict: region.federal_district
                });
            }
        });
        
        // Информация о фильтрах по банкам
        this.activeFilters.bank.forEach(id => {
            const bank = this.bankIndex.get(id);
            if (bank) {
                info.bank.push({
                    id,
                    name: bank.name
                });
            }
        });
        
        info.total = info.revenue.length + info.industry.length + info.region.length + info.bank.length;
        
        return info;
    }
    
    calculateStatistics(companies) {
        const totalCompanies = companies.reduce((sum, company) => sum + company.count, 0);
        
        // Распределение по выручке
        const revenueDistribution = {};
        for (let i = 0; i < 5; i++) {
            revenueDistribution[i] = {
                count: 0,
                percentage: 0,
                name: this.revenueCategories[i].name
            };
        }
        
        companies.forEach(company => {
            revenueDistribution[company.revenue_category].count += company.count;
        });
        
        // Вычисляем проценты
        Object.values(revenueDistribution).forEach(item => {
            item.percentage = totalCompanies > 0 ? (item.count / totalCompanies * 100) : 0;
        });
        
        // Топ регионы
        const regionStats = {};
        companies.forEach(company => {
            if (!regionStats[company.region_name]) {
                regionStats[company.region_name] = 0;
            }
            regionStats[company.region_name] += company.count;
        });
        const topRegions = Object.entries(regionStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Топ отрасли
        const industryStats = {};
        companies.forEach(company => {
            if (!industryStats[company.industry_category]) {
                industryStats[company.industry_category] = 0;
            }
            industryStats[company.industry_category] += company.count;
        });
        const topIndustries = Object.entries(industryStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        // Распределение по банкам
        const bankStats = {};
        companies.forEach(company => {
            if (!bankStats[company.bank_name]) {
                bankStats[company.bank_name] = 0;
            }
            bankStats[company.bank_name] += company.count;
        });
        
        return {
            total_companies: totalCompanies,
            total_groups: companies.length,
            revenue_distribution: revenueDistribution,
            top_regions: topRegions,
            top_industries: topIndustries,
            bank_distribution: bankStats
        };
    }
    
    // Поиск компаний
    searchCompanies(query) {
        if (!query || query.length < 2) {
            return [];
        }
        
        const lowerQuery = query.toLowerCase();
        const results = [];
        
        // Поиск по названию региона
        this.companies.forEach(company => {
            if (company.region_name.toLowerCase().includes(lowerQuery) ||
                company.industry_name.toLowerCase().includes(lowerQuery) ||
                company.industry_category.toLowerCase().includes(lowerQuery)) {
                results.push(company);
            }
        });
        
        return results.slice(0, 50); // Ограничиваем результаты
    }
    
    // Получение детальной информации
    getCompanyDetails(companyId) {
        return this.companies.find(company => company.id === companyId);
    }
    
    getRegionDetails(regionCode) {
        return this.regionIndex.get(regionCode);
    }
    
    getIndustryDetails(industryCode) {
        return this.industryIndex.get(industryCode);
    }
    
    getBankDetails(bankId) {
        return this.bankIndex.get(bankId);
    }
    
    // Экспорт данных
    exportFilteredData(format = 'json') {
        const filtered = this.applyFilters();
        
        if (format === 'json') {
            return JSON.stringify(filtered, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(filtered.companies);
        }
        
        return null;
    }
    
    convertToCSV(companies) {
        const headers = [
            'ID',
            'Количество компаний',
            'Категория выручки',
            'Код отрасли',
            'Название отрасли',
            'Категория отрасли',
            'Код региона',
            'Название региона',
            'Федеральный округ',
            'ID банка',
            'Название банка',
            'Широта',
            'Долгота'
        ];
        
        const rows = companies.map(company => [
            company.id,
            company.count,
            company.revenue_category,
            company.industry_code,
            company.industry_name,
            company.industry_category,
            company.region_code,
            company.region_name,
            company.federal_district,
            company.bank_id,
            company.bank_name,
            company.coordinates.lat,
            company.coordinates.lon
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        return csvContent;
    }
    
    // Получение сводной информации
    getSummary() {
        return {
            totalCompanies: this.statistics?.total_companies || 0,
            totalGroups: this.companies.length,
            regionsCount: this.regions.length,
            industriesCount: this.industries.length,
            banksCount: this.banks.length,
            activeFiltersCount: this.getActiveFiltersInfo().total
        };
    }
}

