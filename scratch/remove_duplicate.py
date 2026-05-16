
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Localizamos el primer {isDetailModalOpen && (
# y el segundo, que está en la 1279 (0-indexed 1278)
# Queremos borrar desde la 1271 hasta la 1278 (0-indexed 1270 a 1277)

del lines[1270:1278]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
