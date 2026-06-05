import re

def clean_translations(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the object body: everything between export default { and };
    match = re.search(r'export default \{(.*?)\};', content, re.DOTALL)
    if not match:
        print(f"Failed to match export default in {filepath}")
        return

    body = match.group(1)
    
    # We want to extract key-value pairs while keeping comments.
    # A simple way is to parse line by line.
    lines = body.splitlines()
    key_val_pattern = re.compile(r'^\s*["\']([^"\']+)["\']\s*:\s*(.*?),?\s*$')
    
    # Track the last line index for each key
    key_to_last_line = {}
    parsed_keys = []
    
    for idx, line in enumerate(lines):
        m = key_val_pattern.match(line)
        if m:
            key = m.group(1)
            key_to_last_line[key] = idx
            parsed_keys.append((key, idx))

    # Reconstruct lines: exclude lines that are overridden
    new_lines = []
    for idx, line in enumerate(lines):
        m = key_val_pattern.match(line)
        if m:
            key = m.group(1)
            # Only keep if this is the last line defining the key
            if key_to_last_line[key] != idx:
                continue
        new_lines.append(line)

    new_body = "\n".join(new_lines)
    new_content = f"export default {{{new_body}\n}};\n"
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Cleaned {filepath}")

clean_translations('src/translations/en.js')
clean_translations('src/translations/es.js')
