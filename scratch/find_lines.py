
import re

file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'studentDetail && (' in line:
        print(f"START: {i+1}")
    if 'setIsDetailModalOpen(false)' in line:
        print(f"IS_DETAIL_CLOSE: {i+1}")
    if 'setIsOfferModalOpen(true)' in line:
        print(f"IS_OFFER_OPEN: {i+1}")
