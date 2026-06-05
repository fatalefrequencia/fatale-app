current_file = None
with open('eslint_errors_utf8.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line_s = line.strip()
        if not line_s:
            continue
        if line_s.startswith('C:\\'):
            current_file = line_s
        elif 'no-undef' in line_s:
            if 'DiscoveryMapView_UPDATED.jsx' in current_file:
                continue
            print(f"File: {current_file}")
            print(f"  Line: {line_s}")
