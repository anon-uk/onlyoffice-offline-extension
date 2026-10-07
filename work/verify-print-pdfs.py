import json
from pathlib import Path
from pypdf import PdfReader
report=Path('work/lazy-validation.json');results=json.loads(report.read_text())
for row,ext,pages in zip(results,['docx','xlsx','pptx'],[1,1,2]):
 path=Path('work/lazy-saved/print-'+ext+'.pdf');pdf=PdfReader(path)
 text=''.join(page.extract_text() for page in pdf.pages)
 assert len(pdf.pages)==pages and 'System font validation' in text
 row['print']={'bytes':path.stat().st_size,'pages':len(pdf.pages),'textVerified':True,'physicalPrinterTested':False}
report.write_text(json.dumps(results,indent=2))
print('Native print PDFs: page counts and text verified for all three editors')
