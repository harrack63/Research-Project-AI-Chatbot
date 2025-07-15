from openie import StanfordOpenIE
import json
import os

# https://stanfordnlp.github.io/CoreNLP/openie.html#api
# Default value of openie.affinity_probability_cap was 1/3.
properties = {
    'openie.affinity_probability_cap': 2 / 3,
}

def process_mayo_clinic_data():
    """Process Mayo Clinic data and convert to dataset format with triplets."""
    
    # Load Mayo Clinic data
    mayo_data_file = 'mayo_clinic_data/mayo_clinic_diseases.json'
    if not os.path.exists(mayo_data_file):
        print(f"Error: {mayo_data_file} not found. Please run collect_mayo_clinic.py first.")
        return
    
    with open(mayo_data_file, 'r', encoding='utf-8') as f:
        mayo_data = json.load(f)
    
    nano_dataset = []
    
    with StanfordOpenIE(properties=properties) as client:
        for i, disease_info in enumerate(mayo_data):
            print(f"Processing {i+1}/{len(mayo_data)}: {disease_info['name']}")
            
            # Get the structured content
            structured_content = disease_info.get('structured_content', {})
            if not structured_content:
                continue
            
            # Process each section separately
            for section_name, section_content in structured_content.items():
                if not section_content or len(section_content.strip()) < 50:
                    continue
                
                print(f"  - Processing section: {section_name}")
                
                # Limit text length to avoid memory issues
                max_length = 5000
                if len(section_content) > max_length:
                    section_content = section_content[:max_length]
                
                # Extract triplets from the section content
                try:
                    triplets = client.annotate(section_content)
                    # Convert triplets to the required format
                    formatted_triplets = []
                    for triple in triplets:
                        formatted_triplets.append([
                            triple["subject"].strip(),
                            triple["relation"].strip(),
                            triple["object"].strip()
                        ])
                    
                    # Only add if we found triplets
                    if formatted_triplets:
                        nano_dataset.append({
                            "passage": section_content,
                            "disease_name": disease_info['name'],
                            "section": section_name,
                            "triplets": formatted_triplets
                        })
                        print(f"    - Found {len(formatted_triplets)} triplets")
                    else:
                        print(f"    - No triplets found")
                        
                except Exception as e:
                    print(f"    - Error processing {section_name}: {str(e)}")
                    continue
    
    # Save the dataset
    os.makedirs('dataset', exist_ok=True)
    dataset_file = 'dataset/mayo_clinic.json'

    with open(dataset_file, 'w', encoding='utf-8') as f:
        json.dump(nano_dataset, f, indent=2, ensure_ascii=False)
    
    print(f"\nDataset saved to {dataset_file}")
    print(f"Total entries: {len(nano_dataset)}")
    
    # Print sample
    if nano_dataset:
        print("\nSample entry:")
        sample = nano_dataset[0]
        print(f"Passage length: {len(sample['passage'])} characters")
        print(f"Number of triplets: {len(sample['triplets'])}")
        print("First 3 triplets:")
        for i, triplet in enumerate(sample['triplets'][:3]):
            print(f"  {i+1}. {triplet}")

if __name__ == "__main__":
    process_mayo_clinic_data()