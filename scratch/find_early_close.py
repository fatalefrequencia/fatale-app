level = 0
in_string = False
string_char = None
escaped = False

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        if idx < 197:
            continue
        
        # Scan characters
        i = 0
        while i < len(line):
            c = line[i]
            if escaped:
                escaped = False
                i += 1
                continue
            if c == '\\':
                escaped = True
                i += 1
                continue
            if in_string:
                if c == string_char:
                    in_string = False
            else:
                if c in ['"', "'", '`']:
                    in_string = True
                    string_char = c
                elif c == '{':
                    level += 1
                elif c == '}':
                    level -= 1
            i += 1
            
        if idx in [828, 972, 3445, 3499, 3945, 3949]:
            print(f"Line {idx}: Level {level} | {line.strip()}")
        
        if level <= 0:
            print(f"Brace level reached {level} at line {idx}: {line.strip()}")
            break
            
print(f"Final scan level: {level}")
