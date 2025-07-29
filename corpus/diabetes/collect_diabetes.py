import requests
from bs4 import BeautifulSoup
import json
import time
import logging
from urllib.parse import urljoin, urlparse
import re
from typing import List, Dict, Optional
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DiabetesRecipeScraper:
    def __init__(self, base_url: str = "https://diabetesfoodhub.org"):
        self.base_url = base_url
        self.recipes_url = f"{base_url}/recipes"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.scraped_urls = set()
        
    def get_all_recipe_urls(self, max_pages: Optional[int] = None) -> List[str]:
        """Collect all recipe URLs from all pages"""
        recipe_urls = []
        page = 0
        
        while True:
            try:
                url = f"{self.recipes_url}?page={page}" if page > 0 else self.recipes_url
                logger.info(f"Scraping page {page}: {url}")
                
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Find recipe cards with the specific structure mentioned
                recipe_cards = soup.find_all('div', class_='recipe-card__click')
                
                if not recipe_cards:
                    logger.info(f"No recipe cards found on page {page}, trying different selector")
                    # Alternative selector if the exact class isn't found
                    recipe_links = soup.find_all('a', href=re.compile(r'/recipes/[^/]+$'))
                    recipe_cards = [{'href': link.get('href')} for link in recipe_links if link.get('href')]
                
                if not recipe_cards:
                    logger.info(f"No more recipes found on page {page}")
                    break
                
                page_urls = []
                for card in recipe_cards:
                    if isinstance(card, dict):
                        href = card.get('href')
                    else:
                        link = card.find('a')
                        href = link.get('href') if link else None
                    
                    if href:
                        full_url = urljoin(self.base_url, href)
                        if full_url not in self.scraped_urls:
                            page_urls.append(full_url)
                            self.scraped_urls.add(full_url)
                
                logger.info(f"Found {len(page_urls)} new recipes on page {page}")
                recipe_urls.extend(page_urls)
                
                # Check if there are more pages
                load_more = soup.find('a', string=re.compile(r'Load more', re.I))
                if not load_more and len(page_urls) == 0:
                    break
                
                page += 1
                if max_pages and page >= max_pages:
                    break
                
                # Rate limiting
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"Error scraping page {page}: {e}")
                break
        
        logger.info(f"Total recipe URLs collected: {len(recipe_urls)}")
        return recipe_urls
    
    def scrape_recipe_details(self, recipe_url: str) -> Optional[Dict]:
        """Scrape detailed information from a single recipe page"""
        try:
            logger.info(f"Scraping recipe: {recipe_url}")
            response = self.session.get(recipe_url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            recipe_data = {
                'url': recipe_url,
                'name': self._extract_name(soup),
                'description': self._extract_description(soup),
                'instructions': self._extract_instructions(soup),
                'tags': self._extract_tags(soup),
                'nutrition_facts': self._extract_nutrition_facts(soup),
                'ingredients': self._extract_ingredients(soup)
            }
            
            return recipe_data
            
        except Exception as e:
            logger.error(f"Error scraping recipe {recipe_url}: {e}")
            return None
    
    def _extract_name(self, soup: BeautifulSoup) -> str:
        """Extract recipe name"""
        name_element = soup.find('h1', class_='recipe-hero__headline')
        if name_element:
            span = name_element.find('span')
            return span.get_text(strip=True) if span else name_element.get_text(strip=True)
        
        # Alternative selectors
        name_element = soup.find('h1')
        return name_element.get_text(strip=True) if name_element else ""
    
    def _extract_description(self, soup: BeautifulSoup) -> str:
        """Extract recipe description"""
        desc_element = soup.find('div', class_='dfh-recipe-desc')
        if desc_element:
            p_tag = desc_element.find('p')
            return p_tag.get_text(strip=True) if p_tag else desc_element.get_text(strip=True)
        return ""
    
    def _extract_instructions(self, soup: BeautifulSoup) -> List[str]:
        """Extract step-by-step instructions"""
        instructions = []
        
        # Look for ordered list with recipe steps
        steps_list = soup.find('ol', class_='recipe-steps')
        if steps_list:
            steps = steps_list.find_all('li')
            for step in steps:
                step_text = step.get_text(strip=True)
                if step_text:
                    instructions.append(step_text)
        
        return instructions
    
    def _extract_tags(self, soup: BeautifulSoup) -> List[str]:
        """Extract recipe tags"""
        tags = []
        
        # Look for recipe tags section
        tags_section = soup.find('div', class_='recipe-tags-section')
        if tags_section:
            tag_links = tags_section.find_all('a')
            for link in tag_links:
                tag_text = link.get_text(strip=True)
                if tag_text:
                    tags.append(tag_text)
        
        return tags
    
    def _extract_nutrition_facts(self, soup: BeautifulSoup) -> Dict:
        """Extract nutrition facts"""
        nutrition = {}
        
        nutrition_content = soup.find('div', class_='nutrition__content')
        if nutrition_content:
            # Extract servings
            servings_label = nutrition_content.find('span', class_='js-servings-label')
            if servings_label:
                nutrition['servings'] = servings_label.get_text(strip=True)
            
            # Extract serving size
            serving_size = nutrition_content.find('div', attrs={'itemprop': 'servingSize'})
            if serving_size:
                nutrition['serving_size'] = serving_size.get_text(strip=True)
            
            # Extract calories
            calories = nutrition_content.find('span', attrs={'itemprop': 'calories'})
            if calories:
                nutrition['calories'] = calories.get_text(strip=True)
            
            # Extract other nutritional values
            nutritional_items = [
                ('fatContent', 'total_fat'),
                ('saturatedFatContent', 'saturated_fat'),
                ('transFatContent', 'trans_fat'),
                ('cholesterolContent', 'cholesterol'),
                ('sodiumContent', 'sodium'),
                ('carbohydrateContent', 'total_carbohydrate'),
                ('fiberContent', 'dietary_fiber'),
                ('sugarContent', 'total_sugars'),
                ('addedSugarContent', 'added_sugars'),
                ('proteinContent', 'protein')
            ]
            
            for itemprop, key in nutritional_items:
                element = nutrition_content.find('span', attrs={'itemprop': itemprop})
                if element:
                    nutrition[key] = element.get_text(strip=True)
        
        return nutrition
    
    def _extract_ingredients(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract ingredients with measurements"""
        ingredients = []
        
        ingredients_section = soup.find('div', class_='ingredients-facts-section')
        if ingredients_section:
            ingredient_wrappers = ingredients_section.find_all('div', class_='ingredient-wrapper')
            
            for wrapper in ingredient_wrappers:
                ingredient_data = {}
                
                # Extract ingredient name
                label = wrapper.find('div', class_='ingredient-label')
                if label:
                    span = label.find('span')
                    ingredient_data['name'] = span.get_text(strip=True) if span else label.get_text(strip=True)
                
                # Extract US measurement
                us_measure = wrapper.find('div', class_='ingredient-us')
                if us_measure:
                    ingredient_data['amount_us'] = us_measure.get_text(strip=True)
                
                # Extract metric measurement
                metric_measure = wrapper.find('div', class_='ingredient-metric')
                if metric_measure:
                    ingredient_data['amount_metric'] = metric_measure.get_text(strip=True)
                
                if ingredient_data.get('name'):
                    ingredients.append(ingredient_data)
        
        return ingredients
    
    def save_recipes_to_json(self, recipes: List[Dict], filename: str = 'diabetes_recipes.json'):
        """Save scraped recipes to JSON file"""
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(recipes, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Saved {len(recipes)} recipes to {filepath}")
    
    def scrape_all_recipes(self, max_pages: Optional[int] = None, max_recipes: Optional[int] = None):
        """Main method to scrape all recipes"""
        logger.info("Starting diabetes recipe scraping...")
        
        # Get all recipe URLs
        recipe_urls = self.get_all_recipe_urls(max_pages=max_pages)
        
        if max_recipes:
            recipe_urls = recipe_urls[:max_recipes]
        
        # Scrape each recipe
        recipes = []
        for i, url in enumerate(recipe_urls, 1):
            logger.info(f"Processing recipe {i}/{len(recipe_urls)}")
            
            recipe_data = self.scrape_recipe_details(url)
            if recipe_data:
                recipes.append(recipe_data)
            
            # Rate limiting
            time.sleep(2)
            
            # Save periodically
            if i % 50 == 0:
                self.save_recipes_to_json(recipes, f'diabetes_recipes_partial_{i}.json')
        
        # Save final results
        self.save_recipes_to_json(recipes)
        logger.info(f"Scraping completed! Total recipes scraped: {len(recipes)}")
        
        return recipes

def main():
    scraper = DiabetesRecipeScraper()
    
    # For testing, limit to first few pages
    recipes = scraper.scrape_all_recipes(max_pages=2, max_recipes=20)
    
    print(f"Successfully scraped {len(recipes)} recipes")
    
    # Print sample recipe
    if recipes:
        sample = recipes[0]
        print("\nSample recipe:")
        print(f"Name: {sample.get('name', 'N/A')}")
        print(f"Description: {sample.get('description', 'N/A')[:100]}...")
        print(f"Tags: {sample.get('tags', [])}")
        print(f"Ingredients count: {len(sample.get('ingredients', []))}")
        print(f"Instructions count: {len(sample.get('instructions', []))}")

if __name__ == "__main__":
    main()