
import sys

def check_balance(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Simple tag counting
    div_open = content.count('<div ') + content.count('<div>')
    div_close = content.count('</div>')
    
    m_div_open = content.count('<motion.div')
    m_div_close = content.count('</motion.div>')

    bracket_open = content.count('{')
    bracket_close = content.count('}')
    
    paren_open = content.count('(')
    paren_close = content.count(')')

    print(f"File: {file_path}")
    print(f"Divs: {div_open} open, {div_close} close. Balance: {div_open - div_close}")
    print(f"Motion Divs: {m_div_open} open, {m_div_close} close. Balance: {m_div_open - m_div_close}")
    print(f"Brackets: {bracket_open} open, {bracket_close} close. Balance: {bracket_open - bracket_close}")
    print(f"Parens: {paren_open} open, {paren_close} close. Balance: {paren_open - paren_close}")

    # Sectional check for Music (around 1500)
    # Sectional check for Gallery (around 1800)
    # Sectional check for Journal (around 2050)
    
if __name__ == "__main__":
    check_balance(sys.argv[1])
