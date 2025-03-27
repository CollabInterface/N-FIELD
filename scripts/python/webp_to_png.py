import os
from PIL import Image

def convert_webp_to_png():
    """
    Webp to PNG
    Version 1.0.0
    Converts all WebP images in the current directory to PNG format using Pillow,
    saving them in the same directory with incremented numbered filenames.
    """
    webp_files = [f for f in os.listdir('.') if f.lower().endswith('.webp')]
    conversion_counter = 1
    for webp_file in webp_files:
        try:
            # Open the WebP image
            with Image.open(webp_file) as img:
                # Construct the new PNG filename
                base_name, _ = os.path.splitext(webp_file)
                png_filename = f"{base_name}_{conversion_counter}.png"

                # Save the image as PNG
                img.save(png_filename, "PNG")
                print(f"Converted '{webp_file}' to '{png_filename}'")
                conversion_counter += 1
        except Exception as e:
            print(f"Error converting '{webp_file}': {e}")

if __name__ == "__main__":
    convert_webp_to_png()
    print("\nConversion process completed.")