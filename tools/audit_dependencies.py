#!/usr/bin/env python3
"""KTX deployment preflight: fails on unexpected static external references or absent local files.
No secret keys, no network, no database modifications.
"""
from pathlib import Path
from urllib.parse import urlsplit
import re,sys,json
base=Path(__file__).resolve().parent.parent
allow={'fonts.googleapis.com','fonts.gstatic.com','cdnjs.cloudflare.com','cdn.jsdelivr.net','ojyamqpkmhmhqjfcudhy.supabase.co','schemas.openxmlformats.org','www.opensource.org','www.w3.org','localhost','127.0.0.1'}
webfiles=list(base.glob('*.html'))+list(base.glob('*.js'))+list((base/'api').glob('*.js'))
problems=[];domains={};refs=set()
for f in webfiles:
 s=f.read_text(encoding='utf-8',errors='replace')
 for u in re.findall(r'https?://[^\s\"\'<>`\\)]+',s):
  host=urlsplit(u).hostname
  if not host:continue
  domains.setdefault(host,set()).add(f.name)
  if host not in allow and not host.endswith('.supabase.co') and host!='xxxxx.supabase.co':
   problems.append(f'UNREVIEWED HOST {host} in {f.name}')
 for v in re.findall(r'(?:src|href)\s*=\s*[\"\'](\./[^\"\'?\#]+)',s):
  if '${' in v:continue
  name=v[2:]
  if not (base/name).is_file():problems.append(f'MISSING FILE {name} referenced by {f.name}')
 if 'SERVICE_ROLE_KEY' in s and f.name!='admin-create-user.js':
  problems.append(f'REVIEW SERVICE ROLE STRING in {f.name}')
print('KTX static dependency preflight')
print('External hosts:')
for h,fs in sorted(domains.items()):print(' -',h, ':', ', '.join(sorted(fs)))
print('Checked',len(webfiles),'web and JS files')
for p in problems:print('ERROR',p)
sys.exit(1 if problems else 0)
