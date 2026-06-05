import re

def parse_js_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # Strip comments and strings/templates to count real braces
    # We can do a simple state machine scan
    level = 0
    i = 0
    n = len(code)
    
    line_nums = []
    line_starts = [0]
    for m in re.finditer('\n', code):
        line_starts.append(m.end())
        
    def get_line_num(pos):
        # binary search or simple scan
        for idx, start in enumerate(line_starts):
            if start > pos:
                return idx
        return len(line_starts)

    in_sl_comment = False
    in_ml_comment = False
    in_string = False
    str_char = None
    in_regex = False
    escaped = False
    
    stack = []
    
    while i < n:
        c = code[i]
        
        # Line number tracking
        line_num = get_line_num(i)
        
        if escaped:
            escaped = False
            i += 1
            continue
            
        if in_sl_comment:
            if c == '\n':
                in_sl_comment = False
            i += 1
            continue
            
        if in_ml_comment:
            if c == '*' and i + 1 < n and code[i+1] == '/':
                in_ml_comment = False
                i += 2
            else:
                i += 1
            continue
            
        if in_string:
            if c == '\\':
                escaped = True
            elif c == str_char:
                in_string = False
            i += 1
            continue
            
        # Check comments
        if c == '/' and i + 1 < n and code[i+1] == '/':
            in_sl_comment = True
            i += 2
            continue
        if c == '/' and i + 1 < n and code[i+1] == '*':
            in_ml_comment = True
            i += 2
            continue
            
        # Check strings
        if c in ["'", '"', '`']:
            in_string = True
            str_char = c
            i += 1
            continue
            
        # Check braces
        if c == '{':
            level += 1
            # Find the line context
            line_end = code.find('\n', i)
            line_text = code[line_starts[line_num-1]:line_end].strip()
            stack.append((line_num, line_text))
        elif c == '}':
            level -= 1
            if stack:
                stack.pop()
            else:
                print(f"Warning: Extra closing brace at line {line_num}")
                
        if line_num in [828, 923, 924, 972, 3445, 3499, 3945, 3949]:
            # Print state at the start of these lines
            # To print only once per line:
            if i == line_starts[line_num-1]:
                print(f"Line {line_num}: Level {level} | open stack size: {len(stack)}")
                if line_num in [972, 3445, 3499]:
                    print("Open blocks:")
                    for s_num, s_txt in stack:
                        print(f"  Line {s_num}: {s_txt}")
        
        i += 1
        
    print(f"Final Level: {level}")

parse_js_braces('src/App.jsx')
