from zipfile import ZipFile
from xml.etree import ElementTree as E
n={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with ZipFile('work/lazy-saved/validation.docx') as z:
 root=E.fromstring(z.read('word/document.xml'))
 runs=[r for r in root.findall('.//w:r',n) if r.find('w:t',n) is not None]
 assert runs
 for r in runs:
  font=r.find('w:rPr/w:rFonts',n)
  assert font is not None and font.get('{'+n['w']+'}ascii')=='Times New Roman'
  assert r.find('w:rPr/w:b',n) is not None and r.find('w:rPr/w:i',n) is not None
 text=''.join(t.text or '' for t in root.findall('.//w:t',n))
 assert '中文' in text and 'العربية' in text
with ZipFile('work/lazy-saved/validation.xlsx') as z:
 assert 'System font validation' in z.read('xl/sharedStrings.xml').decode()
 ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
 styles=E.fromstring(z.read('xl/styles.xml'));sheet=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
 cell=sheet.find('.//s:c',ns);style=styles.find('s:cellXfs',ns)[int(cell.get('s','0'))]
 font=styles.find('s:fonts',ns)[int(style.get('fontId'))]
 assert font.find('s:name',ns).get('val')=='Times New Roman'
with ZipFile('work/lazy-saved/validation.pptx') as z:
 s=z.read('ppt/slides/slide2.xml').decode()
 assert 'System font validation' in s and 'Times New Roman' in s
print('Saved text, document bold/italic, cell and slide font persistence: PASS')

with ZipFile('work/system-saved/imported.docx') as z:
 root=E.fromstring(z.read('word/document.xml'))
 assert 'Remembered imported fonts' in ''.join(t.text or '' for t in root.findall('.//w:t',n))
 for r in root.findall('.//w:r',n):
  if r.find('w:t',n) is None:continue
  assert r.find('w:rPr/w:rFonts',n).get('{'+n['w']+'}ascii')=='Liberation Serif'
  assert r.find('w:rPr/w:b',n) is not None and r.find('w:rPr/w:i',n) is not None
print('Imported font and styles persist: PASS')
