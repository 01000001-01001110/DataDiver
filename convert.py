import sys
import json
import os
from bs4 import BeautifulSoup
import re
import html2text
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
import time
from urllib.parse import urljoin, urlparse
import requests
import hashlib
import urllib.request

# Maximum size for each markdown file (in characters)
MAX_FILE_SIZE = 100000  # ~100KB per file
# Maximum number of images per batch
MAX_IMAGES_PER_BATCH = 10

def clean_markdown(text):
    # Remove multiple blank lines
    text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
    # Ensure proper spacing around headers
    text = re.sub(r'(?<![\n])#', '\n#', text)
    # Clean up lists
    text = re.sub(r'\n\s*[-*]\s', '\n* ', text)
    # Remove link embeds by adding a zero-width space after the protocol
    text = re.sub(r'(https?://)', r'\1​', text)  # Add zero-width space after protocol
    # Remove base64 data URLs
    text = re.sub(r'data:[^;]+;base64,[a-zA-Z0-9+/=]+', '[Base64 Image Removed]', text)
    return text.strip()

def fetch_url_with_selenium(url):
    """Fetch content from URL using Selenium for JavaScript rendering"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--window-size=1920,1080')  # Set a larger window size
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.get(url)
        
        # Wait for dynamic content to load
        time.sleep(5)  # Allow time for JavaScript execution
        
        # Scroll down a few times to load lazy-loaded images
        for _ in range(3):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
        
        # Scroll back to top
        driver.execute_script("window.scrollTo(0, 0);")
        
        # Get the rendered page source
        html_content = driver.page_source
        
        # Also return the driver for image extraction
        return html_content, driver
    except Exception as e:
        print(f"Error in Selenium: {str(e)}", file=sys.stderr)
        if driver:
            driver.quit()
        raise

def convert_html_to_markdown(html_content, url=""):
    # Initialize HTML to text converter with custom settings
    h = html2text.HTML2Text()
    h.body_width = 0  # No wrapping
    h.ignore_links = False
    h.ignore_images = True  # Ignore images to prevent base64 encoding issues
    h.ignore_emphasis = False
    h.ignore_tables = False
    h.unicode_snob = True
    h.mark_code = True
    
    # Parse HTML with BeautifulSoup first for cleaning
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Add page title at the top
    title = soup.find('title')
    title_text = ""
    if title and title.text:
        title_text = f"# {title.text.strip()}\n\n"
    
    # Add source URL at the top
    source_text = ""
    if url:
        source_text = f"Source: {url}\n\n"
    
    # Remove unwanted elements
    for element in soup.find_all(['script', 'style', 'iframe', 'nav', 'footer', 'svg', 'canvas']):
        element.decompose()
    
    # Remove all images to prevent base64 encoding issues
    for img in soup.find_all('img'):
        img.decompose()
    
    # Remove data attributes that might contain base64 data
    for tag in soup.find_all(True):
        for attr in list(tag.attrs):
            if attr.startswith('data-') or attr in ['src', 'srcset'] and 'base64' in str(tag.attrs[attr]):
                del tag.attrs[attr]
    
    # Convert tables to proper markdown
    for table in soup.find_all('table'):
        # Ensure table cells have content
        for cell in table.find_all(['td', 'th']):
            if not cell.get_text(strip=True):
                cell.string = ' '
    
    # Handle code blocks
    for pre in soup.find_all('pre'):
        code = pre.find('code')
        if code:
            language = code.get('class', [''])[0].replace('language-', '') if code.get('class') else ''
            code_content = code.get_text()
            pre.replace_with(f"\n```{language}\n{code_content}\n```\n")
    
    # Convert to markdown
    markdown = h.handle(str(soup))
    
    # Clean up the markdown
    markdown = clean_markdown(markdown)
    
    # Add title and source at the beginning
    markdown = title_text + source_text + markdown
    
    return markdown

def download_image(url, filepath):
    """Download an image using requests library with proper error handling"""
    try:
        # Set a user agent to avoid being blocked
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Stream the response to handle large files efficiently
        response = requests.get(url, headers=headers, stream=True, timeout=10)
        response.raise_for_status()  # Raise an exception for 4XX/5XX responses
        
        # Check if the response is an image
        content_type = response.headers.get('Content-Type', '')
        if not content_type.startswith('image/'):
            print(f"Warning: URL does not point to an image: {url} (Content-Type: {content_type})", file=sys.stderr)
            return False
        
        # Save the image to file
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        # Verify the file was created and has content
        file_size = os.path.getsize(filepath)
        if file_size == 0:
            print(f"Warning: Downloaded image is empty: {url}", file=sys.stderr)
            os.remove(filepath)  # Remove empty file
            return False
        
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading image {url}: {str(e)}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Unexpected error downloading image {url}: {str(e)}", file=sys.stderr)
        return False

def extract_images_from_selenium(driver, url="", output_dir="images"):
    """Extract images directly from Selenium WebDriver"""
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Find all image elements
    image_elements = driver.find_elements(By.TAG_NAME, 'img')
    print(f"Found {len(image_elements)} image elements with Selenium", file=sys.stderr)
    
    images = []
    for img in image_elements:
        try:
            src = img.get_attribute('src')
            if not src:
                # Try data-src for lazy-loaded images
                src = img.get_attribute('data-src')
                if not src:
                    continue
            
            # Skip base64 images
            if src.startswith('data:'):
                continue
            
            # Convert relative URLs to absolute
            if not bool(urlparse(src).netloc):
                src = urljoin(url, src)
            
            # Get alt text or title
            alt_text = img.get_attribute('alt') or ''
            title = img.get_attribute('title') or ''
            description = alt_text or title or "No description"
            
            images.append({
                'url': src,
                'description': description
            })
        except Exception as e:
            print(f"Error processing image element: {str(e)}", file=sys.stderr)
    
    # Download images
    downloaded_images = []
    for i, img in enumerate(images):
        try:
            # Create a unique filename based on the URL
            file_ext = os.path.splitext(urlparse(img['url']).path)[1].lower()
            if not file_ext or file_ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']:
                # Determine extension from content type if possible, otherwise default to jpg
                try:
                    headers = requests.head(img['url'], timeout=5).headers
                    content_type = headers.get('Content-Type', '')
                    if 'image/jpeg' in content_type:
                        file_ext = '.jpg'
                    elif 'image/png' in content_type:
                        file_ext = '.png'
                    elif 'image/gif' in content_type:
                        file_ext = '.gif'
                    elif 'image/webp' in content_type:
                        file_ext = '.webp'
                    elif 'image/svg+xml' in content_type:
                        file_ext = '.svg'
                    elif 'image/bmp' in content_type:
                        file_ext = '.bmp'
                    else:
                        file_ext = '.jpg'  # Default extension
                except:
                    file_ext = '.jpg'  # Default extension if request fails
            
            # Use hash of URL to create unique filename
            filename = hashlib.md5(img['url'].encode()).hexdigest() + file_ext
            filepath = os.path.join(output_dir, filename)
            
            # Download the image
            success = download_image(img['url'], filepath)
            
            if success:
                downloaded_images.append({
                    'path': filepath,
                    'description': img['description'],
                    'url': img['url']
                })
                print(f"Downloaded image {i+1}/{len(images)}: {img['url']}", file=sys.stderr)
            else:
                print(f"Failed to download image {i+1}/{len(images)}: {img['url']}", file=sys.stderr)
        except Exception as e:
            # Print errors to stderr
            print(f"Error processing image {img['url']}: {str(e)}", file=sys.stderr)
    
    # Group images into batches
    batches = []
    current_batch = []
    
    for img in downloaded_images:
        current_batch.append(img)
        
        if len(current_batch) >= MAX_IMAGES_PER_BATCH:
            batches.append(current_batch)
            current_batch = []
    
    # Add the last batch if it's not empty
    if current_batch:
        batches.append(current_batch)
    
    return batches

def split_markdown(markdown, max_size=MAX_FILE_SIZE):
    """Split markdown into multiple files if it's too large"""
    if len(markdown) <= max_size:
        return [markdown]
    
    # Try to split at headers or double newlines
    parts = []
    current_part = ""
    lines = markdown.split('\n')
    
    for line in lines:
        # If adding this line would exceed the max size, start a new part
        if len(current_part) + len(line) + 1 > max_size and current_part:
            parts.append(current_part)
            current_part = line + '\n'
        else:
            current_part += line + '\n'
    
    # Add the last part if it's not empty
    if current_part:
        parts.append(current_part)
    
    return parts

def main():
    if len(sys.argv) < 2:
        print("Usage: python convert.py <url_or_file> [output_file] [--images]", file=sys.stderr)
        sys.exit(1)
    
    input_source = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'output.md'
    
    # Check if --images flag is present
    extract_images = False
    if len(sys.argv) > 3 and sys.argv[3] == '--images':
        extract_images = True
    
    try:
        # Check if input is a URL or file
        if input_source.startswith(('http://', 'https://')):
            print(f"Fetching URL: {input_source}", file=sys.stderr)
            html_content, driver = fetch_url_with_selenium(input_source)
            url = input_source
        else:
            print(f"Reading file: {input_source}", file=sys.stderr)
            with open(input_source, 'r', encoding='utf-8') as f:
                html_content = f.read()
            url = ""
            driver = None
        
        if extract_images:
            # Extract images
            print("Extracting images...", file=sys.stderr)
            if driver:
                # Use Selenium for image extraction
                image_batches = extract_images_from_selenium(driver, url)
                # Close the driver after use
                driver.quit()
            else:
                # Fallback to BeautifulSoup if we're reading from a file
                soup = BeautifulSoup(html_content, 'html.parser')
                image_batches = []
            
            # Create output files for image batches
            output_files = []
            
            for i, batch in enumerate(image_batches):
                # Create a JSON file with image information
                batch_file = f"{os.path.splitext(output_file)[0]}_images_batch{i+1}.json"
                with open(batch_file, 'w', encoding='utf-8') as f:
                    json.dump(batch, f, indent=2)
                
                output_files.append(batch_file)
            
            # Print the JSON result to stdout for the Node.js wrapper
            print(json.dumps({
                "success": True, 
                "output": output_files, 
                "image_count": sum(len(batch) for batch in image_batches)
            }))
        else:
            # Convert to markdown
            print("Converting to markdown...", file=sys.stderr)
            markdown = convert_html_to_markdown(html_content, url)
            
            # Close the driver if it exists
            if driver:
                driver.quit()
            
            # Split markdown into parts if it's too large
            markdown_parts = split_markdown(markdown)
            
            # Create output files
            output_files = []
            
            if len(markdown_parts) == 1:
                # Single file
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(markdown_parts[0])
                output_files.append(output_file)
            else:
                # Multiple files
                base_name, ext = os.path.splitext(output_file)
                for i, part in enumerate(markdown_parts):
                    part_file = f"{base_name}_part{i+1}{ext}"
                    with open(part_file, 'w', encoding='utf-8') as f:
                        f.write(f"# Part {i+1} of {len(markdown_parts)}\n\n")
                        f.write(part)
                    output_files.append(part_file)
            
            # Print the JSON result to stdout for the Node.js wrapper
            print(json.dumps({"success": True, "output": output_files}))
    except Exception as e:
        # Print error details to stderr for debugging
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        
        # Print the JSON error result to stdout for the Node.js wrapper
        print(json.dumps({"success": False, "error": str(e)}))
        
        # Close the driver if it exists
        if 'driver' in locals() and driver:
            driver.quit()

if __name__ == "__main__":
    main()
