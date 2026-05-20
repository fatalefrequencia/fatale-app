import os

files_to_modify = [
    r"C:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\index.css",
    r"C:\Users\Customer\Downloads\Fatale version 1\fatale-app\src\components\SpatialProfile.css"
]

font_face_declaration = """@font-face {
    font-family: 'FataleNeon';
    src: url('./assets/fonts/FataleNeon.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

"""

# 1. Modify index.css
index_css_path = files_to_modify[0]
if os.path.exists(index_css_path):
    with open(index_css_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Prepend font face declaration
    if "@font-face" not in content or "FataleNeon" not in content:
        content = font_face_declaration + content
        
    # Replace Share Tech Mono
    content = content.replace("'Share Tech Mono'", "'FataleNeon'")
    content = content.replace('"Share Tech Mono"', "'FataleNeon'")
    
    with open(index_css_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Modified index.css")

# 2. Modify SpatialProfile.css
spatial_css_path = files_to_modify[1]
if os.path.exists(spatial_css_path):
    with open(spatial_css_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Replace Share Tech Mono
    content = content.replace("'Share Tech Mono'", "'FataleNeon'")
    content = content.replace('"Share Tech Mono"', "'FataleNeon'")
    
    with open(spatial_css_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Modified SpatialProfile.css")
