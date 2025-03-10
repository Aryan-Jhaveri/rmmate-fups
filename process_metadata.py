import json
import os
import re
import sys

def parse_metadata_content(content):
    """Parse metadata content directly from string instead of file"""
    image_data = []
    current_image = None
    # Match both formats:
    # 1. Original EXIF: Date and Time | YYYY:MM:DD
    # 2. Filename extraction: Date and Time | YYYY:MM:DD HH:MM:SS
    date_pattern = r'Date and Time\s+\|(?:\s*)(\d{4}):(\d{2}):(\d{2})(?:[ ](\d{2}):(\d{2}):(\d{2}))?'

    lines = content.splitlines()
        
    for line in lines:
        if line.startswith('=== Metadata for'):
            if current_image:
                image_data.append(current_image)
            image_name = line.split('===')[1].strip().replace('Metadata for ', '').strip()
            current_image = {'filename': image_name}
            
            # If no EXIF tool is available, try to extract date from filename
            if image_name and not any(ext in line for ext in ['exif', 'EXIF']):
                match = re.match(r'(\d{4})(\d{2})(\d{2})_', image_name)
                if match and not current_image.get('date'):
                    year, month, day = map(int, match.groups())
                    current_image['date'] = {
                        'year': year,
                        'month': month,
                        'day': day
                    }
        elif 'Date and Time' in line:
            match = re.search(date_pattern, line)
            if match:
                groups = match.groups()
                if len(groups) >= 3:  # We have at least year, month, day
                    year, month, day = map(int, groups[0:3])
                    current_image['date'] = {
                        'year': year,
                        'month': month, 
                        'day': day
                    }
    
    if current_image:
        image_data.append(current_image)

    return image_data

def create_js_file(image_data, output_file):
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    js_content = f"const imageMetadata = {json.dumps(image_data, indent=2)};"
    
    with open(output_file, 'w') as f:
        f.write(js_content)
    
    print(f"Successfully created {output_file} with {len(image_data)} image entries")

if __name__ == "__main__":
    # Default output path (can be overridden by environment variables)
    output_file = os.environ.get("OUTPUT_JS_FILE", "js/imageMetadata.js")
    
    # Check if we're receiving data from stdin (piped from bash script)
    if not sys.stdin.isatty():
        # Read from stdin (piped data)
        metadata_content = sys.stdin.read()
    else:
        # Fallback to reading from file if not piped
        metadata_file = os.environ.get("METADATA_FILE", "metadata.txt")
        if not os.path.exists(metadata_file):
            print(f"Error: Metadata file '{metadata_file}' not found.")
            sys.exit(1)
        with open(metadata_file, 'r') as f:
            metadata_content = f.read()
        
    image_data = parse_metadata_content(metadata_content)
    
    if not image_data:
        print("Warning: No image metadata was extracted.")
    
    create_js_file(image_data, output_file)