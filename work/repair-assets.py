from pathlib import Path
import shutil,xml.etree.ElementTree as ET
root=Path('work/onlyoffice-browser/extension-build-v0.6')
shutil.copy(root/'sdkjs/common/AllFonts.js',root/'server/FileConverter/bin/AllFonts.js')
ns='http://www.w3.org/2000/svg'
ET.register_namespace('',ns)
folder=root/'web-apps/apps/common/main/resources/img/doc-formats'
sprite=ET.Element('{'+ns+'}svg',{'width':'0','height':'0','style':'position:absolute'})
for file in sorted(folder.glob('*.svg')):
 if file.name.startswith('formats@'):continue
 image=ET.parse(file).getroot()
 box=image.get('viewBox') or '0 0 '+image.get('width','24')+' '+image.get('height','30')
 attrs={k:v for k,v in image.attrib.items() if k not in ['width','height','viewBox']}
 attrs.update({'id':file.stem,'viewBox':box})
 symbol=ET.SubElement(sprite,'{'+ns+'}symbol',attrs)
 for child in image:symbol.append(child)
ET.ElementTree(sprite).write(folder/'formats@2.5x.svg',encoding='unicode')
