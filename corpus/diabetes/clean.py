import json

with open('../dataset/diabetes_recipes.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total recipes: {len(data)}")
print("-" * 50)

# Find recipes with no description
no_description = []
empty_description = []
totally_empty = []

def is_totally_empty(recipe):
    """Check if a recipe is totally empty (only has url, name, and empty fields)"""
    return (
        recipe.get('description', '').strip() == '' and
        recipe.get('instructions', []) == [] and
        recipe.get('tags', []) == [] and
        recipe.get('nutrition_facts', {}) == {} and
        recipe.get('ingredients', []) == []
    )

for i, recipe in enumerate(data):
    description = recipe.get('description', '')
    
    if is_totally_empty(recipe):
        totally_empty.append((i, recipe.get('name', 'Unknown')))
    elif 'description' not in recipe:
        no_description.append((i, recipe.get('name', 'Unknown')))
    elif not description or description.strip() == '':
        empty_description.append((i, recipe.get('name', 'Unknown')))

print(f"Totally empty recipes (will be deleted): {len(totally_empty)}")
for idx, name in totally_empty:
    print(f"  Index {idx}: {name}")

print(f"\nRecipes missing 'description' field: {len(no_description)}")
for idx, name in no_description:
    print(f"  Index {idx}: {name}")

print(f"\nRecipes with empty description: {len(empty_description)}")
for idx, name in empty_description:
    print(f"  Index {idx}: {name}")

print(f"\nTotal recipes with issues: {len(totally_empty) + len(no_description) + len(empty_description)}")

# Delete totally empty recipes
if totally_empty:
    print(f"\nDeleting {len(totally_empty)} totally empty recipes...")
    
    # Sort indices in descending order to avoid index shifting issues
    totally_empty_indices = sorted([idx for idx, name in totally_empty], reverse=True)
    
    for idx in totally_empty_indices:
        print(f"Deleting recipe at index {idx}: {data[idx].get('name', 'Unknown')}")
        del data[idx]
    
    # Save the cleaned data
    with open('../dataset/diabetes_recipes.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved cleaned data. New total: {len(data)} recipes")

# Count remaining empty items
remaining_empty = no_description + empty_description

print(f"\nRemaining recipes with empty descriptions: {len(remaining_empty)}")
print(f"Final total recipes: {len(data)}")
