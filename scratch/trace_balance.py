
file_path = r'c:\2 DAW\PF\EDUCONECT\frontend\src\pages\TutorCentroDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

balance_p = 0
balance_k = 0

for i, line in enumerate(lines):
    balance_p += line.count('(') - line.count(')')
    balance_k += line.count('{') - line.count('}')
    
    # Si detectamos que el balance se vuelve loco en un punto, avisamos
    # Especialmente buscamos dónde el balance de llaves debería ser 1 o 2
    # pero se dispara o cae a cero.
    if i > 146 and i < 1495:
        # Imprimimos solo si hay cambios significativos o cerca del final
        if i > 1480:
            print(f"L{i+1}: P={balance_p} K={balance_k} | {line.strip()}")
