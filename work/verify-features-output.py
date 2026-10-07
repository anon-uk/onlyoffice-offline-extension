from pathlib import Path
from zipfile import ZipFile
from pypdf import PdfReader
import json
r=json.loads(Path('work/features-validation.json').read_text())
for ext in ['docx','xlsx','pptx']:
 pdf=PdfReader('work/features-saved/'+ext+'.pdf')
 assert len(pdf.pages)>0
 assert 'Offline' in ' '.join(page.extract_text() or '' for page in pdf.pages)
for ext in ['odt','ods','odp','rtf']:
 pdf=PdfReader('work/features-saved/reopened-'+ext+'.pdf')
 assert 'Offline' in ' '.join(page.extract_text() or '' for page in pdf.pages),ext
with ZipFile('work/features-saved/sample.docx') as z:
 assert b'Offline comment test' in z.read('word/comments.xml')
 assert b'<w:ins' in z.read('word/document.xml')
with ZipFile('work/features-saved/accepted.docx') as z:
 assert b'<w:ins' not in z.read('word/document.xml')
 assert b'Tracked insertion test.' in z.read('word/document.xml')
for ext in ['odt','ods','odp']:
 with ZipFile('work/features-saved/export.'+ext) as z:
  assert b'Offline' in z.read('content.xml')
assert Path('work/features-saved/export.rtf').read_bytes().startswith(b'{\\rtf')
r.update(pdfTextVerified=True,commentXmlVerified=True,trackedInsertionXmlVerified=True,acceptedChangesXmlVerified=True,openDocumentTextVerified=True,reopenedFormatTextVerified=True)
Path('work/features-validation.json').write_text(json.dumps(r,indent=2))
print('PDF text, comments, accepted revisions and reopened formats verified')
