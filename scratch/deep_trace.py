
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

stack_p = [] # stack for (
stack_k = [] # stack for {

for i, char in enumerate(content):
    if char == '(':
        # find line and col
        line = content.count('\n', 0, i) + 1
        stack_p.append(line)
    elif char == ')':
        if stack_p:
            stack_p.pop()
        else:
            line = content.count('\n', 0, i) + 1
            print(f"EXTRA ) at line {line}")
            
    if char == '{':
        line = content.count('\n', 0, i) + 1
        stack_k.append(line)
    elif char == '}':
        if stack_k:
            stack_k.pop()
        else:
            line = content.count('\n', 0, i) + 1
            print(f"EXTRA }} at line {line}")

if stack_p:
    print(f"UNCLOSED ( from lines: {stack_p}")
if stack_k:
    print(f"UNCLOSED {{ from lines: {stack_k}")
