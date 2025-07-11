#!/usr/bin/env python3
"""
Генератор тестовых данных для визуализации рынка предпринимателей России
Создает агрегированные данные о ~6 млн компаний МСП
"""

import json
import random
import math
from typing import List, Dict, Any

# Константы
TOTAL_COMPANIES = 6_000_000  # Общее количество компаний МСП в России
TARGET_GROUPS = 15_000       # Целевое количество групп для визуализации
COMPANIES_PER_GROUP = TOTAL_COMPANIES // TARGET_GROUPS

# Распределение компаний по категориям выручки (в процентах)
REVENUE_DISTRIBUTION = {
    0: 45.2,  # 0-5 млн руб (микро)
    1: 28.7,  # 5-20 млн руб (малые)
    2: 18.3,  # 20-80 млн руб (средние малые)
    3: 6.1,   # 80-400 млн руб (крупные малые)
    4: 1.7    # 400+ млн руб (средние)
}

# Названия категорий выручки
REVENUE_CATEGORIES = [
    {"min": 0, "max": 5, "name": "0-5 млн руб", "desc": "Микро"},
    {"min": 5, "max": 20, "name": "5-20 млн руб", "desc": "Малые"},
    {"min": 20, "max": 80, "name": "20-80 млн руб", "desc": "Средние малые"},
    {"min": 80, "max": 400, "name": "80-400 млн руб", "desc": "Крупные малые"},
    {"min": 400, "max": 1000, "name": "400+ млн руб", "desc": "Средние"}
]

def load_json_data(filename: str) -> Dict[str, Any]:
    """Загружает данные из JSON файла"""
    with open(f'data/{filename}', 'r', encoding='utf-8') as f:
        return json.load(f)

def weighted_random_choice(items: List[Any], weights: List[float]) -> Any:
    """Выбирает случайный элемент с учетом весов"""
    total = sum(weights)
    r = random.uniform(0, total)
    upto = 0
    for i, w in enumerate(weights):
        if upto + w >= r:
            return items[i]
        upto += w
    return items[-1]

def generate_company_groups() -> List[Dict[str, Any]]:
    """Генерирует агрегированные группы компаний"""
    
    # Загружаем справочные данные
    regions_data = load_json_data('regions.json')
    industries_data = load_json_data('industries.json')
    banks_data = load_json_data('banks.json')
    
    regions = regions_data['regions']
    industries = industries_data['industries']
    banks = banks_data['banks']
    
    # Создаем веса для регионов на основе населения
    region_weights = [region['population'] for region in regions]
    
    # Создаем веса для отраслей (некоторые более популярны)
    industry_weights = []
    for industry in industries:
        if industry['category'] in ['Торговля', 'Услуги', 'Строительство']:
            weight = 3.0  # Более популярные отрасли
        elif industry['category'] in ['IT', 'Производство', 'Транспорт']:
            weight = 2.0  # Средне популярные
        else:
            weight = 1.0  # Менее популярные
        industry_weights.append(weight)
    
    # Создаем веса для банков на основе рыночной доли
    bank_weights = [bank['market_share'] for bank in banks]
    
    groups = []
    group_id = 1
    
    print(f"Генерируем {TARGET_GROUPS} групп компаний...")
    
    for i in range(TARGET_GROUPS):
        if i % 1000 == 0:
            print(f"Обработано {i}/{TARGET_GROUPS} групп")
        
        # Выбираем категорию выручки с учетом распределения
        revenue_categories = list(REVENUE_DISTRIBUTION.keys())
        revenue_weights = list(REVENUE_DISTRIBUTION.values())
        revenue_category = weighted_random_choice(revenue_categories, revenue_weights)
        
        # Выбираем регион с учетом населения
        region = weighted_random_choice(regions, region_weights)
        
        # Выбираем отрасль с учетом популярности
        industry = weighted_random_choice(industries, industry_weights)
        
        # Выбираем банк с учетом рыночной доли
        bank = weighted_random_choice(banks, bank_weights)
        
        # Определяем количество компаний в группе (с вариацией)
        base_count = COMPANIES_PER_GROUP
        variation = random.uniform(0.5, 2.0)  # Вариация от 50% до 200%
        company_count = max(1, int(base_count * variation))
        
        # Добавляем небольшое смещение к координатам для избежания наложения
        lat_offset = random.uniform(-0.5, 0.5)
        lon_offset = random.uniform(-0.5, 0.5)
        
        # Генерируем случайную позицию в 3D пространстве для начального облака
        x = random.uniform(-100, 100)
        y = random.uniform(-100, 100)
        z = random.uniform(-100, 100)
        
        group = {
            "id": f"group_{group_id:06d}",
            "count": company_count,
            "revenue_category": revenue_category,
            "industry_code": industry['code'],
            "industry_name": industry['name'],
            "industry_category": industry['category'],
            "region_code": region['code'],
            "region_name": region['name'],
            "federal_district": region['federal_district'],
            "bank_id": bank['id'],
            "bank_name": bank['name'],
            "coordinates": {
                "lat": region['coordinates']['lat'] + lat_offset,
                "lon": region['coordinates']['lon'] + lon_offset
            },
            "position_3d": {
                "x": x,
                "y": y,
                "z": z
            },
            "metadata": {
                "revenue_range": REVENUE_CATEGORIES[revenue_category],
                "industry_color": industry['color'],
                "bank_color": bank['color']
            }
        }
        
        groups.append(group)
        group_id += 1
    
    return groups

def calculate_statistics(groups: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Вычисляет статистику по сгенерированным данным"""
    
    total_companies = sum(group['count'] for group in groups)
    
    # Статистика по категориям выручки
    revenue_stats = {}
    for category in range(5):
        count = sum(group['count'] for group in groups if group['revenue_category'] == category)
        revenue_stats[category] = {
            "count": count,
            "percentage": round(count / total_companies * 100, 1),
            "name": REVENUE_CATEGORIES[category]['name']
        }
    
    # Топ-10 регионов
    region_stats = {}
    for group in groups:
        region_name = group['region_name']
        if region_name not in region_stats:
            region_stats[region_name] = 0
        region_stats[region_name] += group['count']
    
    top_regions = sorted(region_stats.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Топ-10 отраслей
    industry_stats = {}
    for group in groups:
        industry_category = group['industry_category']
        if industry_category not in industry_stats:
            industry_stats[industry_category] = 0
        industry_stats[industry_category] += group['count']
    
    top_industries = sorted(industry_stats.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Статистика по банкам
    bank_stats = {}
    for group in groups:
        bank_name = group['bank_name']
        if bank_name not in bank_stats:
            bank_stats[bank_name] = 0
        bank_stats[bank_name] += group['count']
    
    return {
        "total_companies": total_companies,
        "total_groups": len(groups),
        "revenue_distribution": revenue_stats,
        "top_regions": top_regions,
        "top_industries": top_industries,
        "bank_distribution": bank_stats
    }

def main():
    """Основная функция генерации данных"""
    
    print("Начинаем генерацию тестовых данных...")
    print(f"Целевое количество компаний: {TOTAL_COMPANIES:,}")
    print(f"Количество групп: {TARGET_GROUPS:,}")
    print(f"Среднее количество компаний на группу: {COMPANIES_PER_GROUP}")
    
    # Генерируем группы компаний
    groups = generate_company_groups()
    
    # Вычисляем статистику
    stats = calculate_statistics(groups)
    
    # Сохраняем данные
    output_data = {
        "metadata": {
            "generated_at": "2024-07-11",
            "total_companies": stats["total_companies"],
            "total_groups": len(groups),
            "description": "Агрегированные данные о компаниях МСП России"
        },
        "revenue_categories": REVENUE_CATEGORIES,
        "companies": groups,
        "statistics": stats
    }
    
    with open('data/companies.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\nГенерация завершена!")
    print(f"Создано групп: {len(groups):,}")
    print(f"Общее количество компаний: {stats['total_companies']:,}")
    print(f"Данные сохранены в: data/companies.json")
    
    # Выводим статистику
    print("\n=== СТАТИСТИКА ===")
    print("\nРаспределение по размеру компаний:")
    for category, data in stats['revenue_distribution'].items():
        print(f"  {data['name']}: {data['count']:,} ({data['percentage']}%)")
    
    print(f"\nТоп-5 регионов:")
    for i, (region, count) in enumerate(stats['top_regions'][:5], 1):
        percentage = round(count / stats['total_companies'] * 100, 1)
        print(f"  {i}. {region}: {count:,} ({percentage}%)")
    
    print(f"\nТоп-5 отраслей:")
    for i, (industry, count) in enumerate(stats['top_industries'][:5], 1):
        percentage = round(count / stats['total_companies'] * 100, 1)
        print(f"  {i}. {industry}: {count:,} ({percentage}%)")

if __name__ == "__main__":
    main()

