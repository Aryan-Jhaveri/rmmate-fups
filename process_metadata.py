import json
import os
import re

def parse_metadata_file(metadata_file):
    image_data = []
    current_image = None
    date_pattern = r'Date and Time\s+\|(\d{4}:\d{2}:\d{2})'

    with open(metadata_file, 'r') as f:
        lines = f.readlines()
        
    for line in lines:
        if line.startswith('=== Metadata for'):
            if current_image:
                image_data.append(current_image)
            image_name = line.split('===')[1].strip().replace('Metadata for ', '').strip()
            current_image = {'filename': image_name}
        elif 'Date and Time' in line:
            match = re.search(date_pattern, line)
            if match:
                date_str = match.group(1)
                year, month, day = map(int, date_str.split(':'))
                current_image['date'] = {
                    'year': year,
                    'month': month,
                    'day': day
                }
    
    if current_image:
        image_data.append(current_image)

    return image_data

def create_js_file(image_data, output_file):
    js_content = f"const imageMetadata = {json.dumps(image_data, indent=2)};"
    
    with open(output_file, 'w') as f:
        f.write(js_content)

if __name__ == "__main__":
    metadata_file = "metadata.txt"
    output_file = "js/imageMetadata.js"
    
    if os.path.exists(metadata_file):
        image_data = parse_metadata_file(metadata_file)
        create_js_file(image_data, output_file)
        print(f"Successfully processed {len(image_data)} images")