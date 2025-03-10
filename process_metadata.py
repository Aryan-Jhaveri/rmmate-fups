import json
import os
import re
import sys

def parse_metadata_content(content):
    """Parse metadata content directly from string instead of file"""
    media_data = []
    current_media = None
    # Match both formats:
    # 1. Original EXIF: Date and Time | YYYY:MM:DD
    # 2. Filename extraction: Date and Time | YYYY:MM:DD HH:MM:SS
    date_pattern = r'Date and Time\s+\|(?:\s*)(\d{4}):(\d{2}):(\d{2})(?:[ ](\d{2}):(\d{2}):(\d{2}))?'
    # Media type pattern
    type_pattern = r'Type:\s+(image|video)'

    lines = content.splitlines()
        
    for line in lines:
        if line.startswith('=== Metadata for'):
            if current_media:
                media_data.append(current_media)
            image_name = line.split('===')[1].strip().replace('Metadata for ', '').strip()
            current_media = {
                'filename': image_name,
                'type': 'image'  # Default to image type if not specified
            }
            
            # Try to extract date from filename if it matches the pattern
            match = re.match(r'(\d{4})(\d{2})(\d{2})_', image_name)
            if match:
                year, month, day = map(int, match.groups())
                current_media['date'] = {
                    'year': year,
                    'month': month,
                    'day': day
                }
        elif line.startswith('Type:'):
            # Extract media type (image or video)
            match = re.search(type_pattern, line)
            if match and current_media:
                current_media['type'] = match.group(1)
        elif 'Date and Time' in line:
            match = re.search(date_pattern, line)
            if match and current_media:
                groups = match.groups()
                if len(groups) >= 3:  # We have at least year, month, day
                    year, month, day = map(int, groups[0:3])
                    current_media['date'] = {
                        'year': year,
                        'month': month, 
                        'day': day
                    }
    
    if current_media:
        media_data.append(current_media)

    return media_data

def create_js_file(media_data, output_file):
    # Ensure the directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Create variable using 'window.' to avoid redeclaration issues
    js_content = f"window.mediaMetadata = {json.dumps(media_data, indent=2)};"
    
    with open(output_file, 'w') as f:
        f.write(js_content)
    
    # Count image and video files
    image_count = sum(1 for item in media_data if item.get('type') == 'image')
    video_count = sum(1 for item in media_data if item.get('type') == 'video')
    
    print(f"Successfully created {output_file} with {len(media_data)} media entries ({image_count} images, {video_count} videos)")
    
    # For backward compatibility, create imageMetadata.js with only image files
    if image_count > 0:
        image_only_data = [item for item in media_data if item.get('type') == 'image']
        image_output_file = output_file.replace('mediaMetadata.js', 'imageMetadata.js')
        
        # Write imageMetadata.js without the 'type' field (for backward compatibility)
        image_only_data_no_type = []
        for item in image_only_data:
            item_copy = item.copy()
            if 'type' in item_copy:
                del item_copy['type']
            image_only_data_no_type.append(item_copy)
            
        # Use window to avoid redeclaration conflicts
        image_js_content = f"window.imageMetadata = {json.dumps(image_only_data_no_type, indent=2)};"
        
        with open(image_output_file, 'w') as f:
            f.write(image_js_content)
        
        print(f"Also created {image_output_file} with {len(image_only_data)} image entries (for backward compatibility)")

if __name__ == "__main__":
    # Default output path (can be overridden by environment variables)
    output_file = os.environ.get("OUTPUT_JS_FILE", "js/mediaMetadata.js")
    
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
        
    media_data = parse_metadata_content(metadata_content)
    
    if not media_data:
        print("Warning: No media metadata was extracted.")
    
    create_js_file(media_data, output_file)