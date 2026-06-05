level = 0
in_string = False
string_char = None
escaped = False
stack = []

with open('src/App.jsx', 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f, 1):
        prev_level = level
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
                    # Find some descriptive text in the line
                    stack.append((idx, line.strip()))
                elif c == '}':
                    level -= 1
                    if stack:
                        stack.pop()
            i += 1
        
        if idx == 972:
            print("At line 972, open blocks are:")
            for s_idx, s_line in stack:
                print(f"  Line {s_idx}: {s_line}")
            break
