
import re

with open(r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

blocks = [
    'isValModalOpen',
    'isDetailModalOpen',
    'isOfferModalOpen',
    'selectedCompany',
    'selectedDayInfo',
    'isGuideModalOpen',
    'isCompanyProfileModalOpen'
]

for block in blocks:
    print(f"Searching for {block}...")
    for i, line in enumerate(lines):
        if block in line and '{' in line and (i == 0 or '&&' in line):
            print(f"  Found start at line {i+1}: {line.strip()}")
