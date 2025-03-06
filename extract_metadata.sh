#!/bin/bash

# Use environment variables if set, otherwise use defaults
JPEG_DIR="${JPEG_DIR:-/workspace/rmate-fups/jpegs}"
OUTPUT_FILE="${OUTPUT_FILE:-/workspace/rmate-fups/metadata.txt}"

# Create or clear the output file
> "$OUTPUT_FILE"

# Check if the directory exists
if [ ! -d "$JPEG_DIR" ]; then
    echo "Error: Directory $JPEG_DIR does not exist"
    exit 1
fi

# Process each JPEG file (handles both .jpg and .jpeg extensions)
shopt -s nullglob
jpeg_files=("$JPEG_DIR"/*.{jpg,jpeg,JPG,JPEG})
if [ ${#jpeg_files[@]} -eq 0 ]; then
    echo "No JPEG files found in $JPEG_DIR"
    exit 1
fi

for jpeg_file in "${jpeg_files[@]}"; do
    # Add file name as header
    echo "=== Metadata for $(basename "$jpeg_file") ===" >> "$OUTPUT_FILE"
    
    # Extract EXIF data and append to file
    exif "$jpeg_file" 2>/dev/null >> "$OUTPUT_FILE" || echo "No EXIF data found for $(basename "$jpeg_file")" >> "$OUTPUT_FILE"
    
    # Add separator
    echo -e "\n" >> "$OUTPUT_FILE"
done

echo "Metadata extraction complete. Results saved to $OUTPUT_FILE"