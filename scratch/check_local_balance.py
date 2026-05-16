
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines[1277:1631]) # Líneas 1278 a 1631 (0-indexed: 1277 a 1631)

counts = {
    '{': content.count('{'), '}': content.count('}'),
    '(': content.count('('), ')': content.count(')'),
    '<div': content.count('<div'), '</div>': content.count('</div>')
}

print(counts)
