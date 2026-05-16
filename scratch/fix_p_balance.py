
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

stack = []
to_remove = []

for i, char in enumerate(content):
    if char == '(':
        stack.append(i)
    elif char == ')':
        if stack:
            stack.pop()
        else:
            to_remove.append(i)

if to_remove:
    for idx in reversed(to_remove):
        content = content[:idx] + content[idx+1:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"REMOVED {len(to_remove)} EXTRA )")
else:
    print("NO EXTRA ) FOUND")

# Also check for unclosed ones
if stack:
    print(f"STILL HAVE {len(stack)} UNCLOSED (")
