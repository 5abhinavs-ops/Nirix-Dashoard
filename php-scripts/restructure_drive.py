"""Create per-company/per-boat subfolder structure inside Daily Reports and Certifications folders."""
import json, urllib.request, urllib.parse, time, base64
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

with open('/etc/nirix-dashboard/service-account.json') as f:
    sa = json.load(f)

def b64url(data):
    if isinstance(data, str): data = data.encode()
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

now = int(time.time())
header = b64url(json.dumps({'alg':'RS256','typ':'JWT'}))
claim = b64url(json.dumps({
    'iss': sa['client_email'],
    'scope': 'https://www.googleapis.com/auth/drive',
    'aud': 'https://oauth2.googleapis.com/token',
    'exp': now+3600, 'iat': now
}))
key = serialization.load_pem_private_key(sa['private_key'].encode(), password=None)
sig = b64url(key.sign(f'{header}.{claim}'.encode(), padding.PKCS1v15(), hashes.SHA256()))
jwt = f'{header}.{claim}.{sig}'

data = urllib.parse.urlencode({'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion':jwt}).encode()
resp = json.loads(urllib.request.urlopen(urllib.request.Request('https://oauth2.googleapis.com/token',data=data)).read())
token = resp['access_token']
print('Token: OK\n')

DAILY_REPORTS_FOLDER = '19sLnneKHgsyf5JyM4CyuSzjf007P0_13'
CERTIFICATIONS_FOLDER = '12CgxLHYpoNLBbQDrz91HdgNFmKS-4vRO'

SG_SHIPPING_BOATS = ['Galaxy', 'SG Brave', 'SG Fortune', 'SG Justice', 'SG Patience',
                     'SG Loyalty', 'SG Generous', 'SG Integrity', 'SG Dahlia',
                     'SG Sunflower', 'SG Jasmine', 'SG Marigold']

SEA_CABBIE_BOATS = ['SG Ekam', 'SG Naav', 'SG Dve', 'KM Golf', 'SG Panch',
                    'SG Chatur', 'SG Sapta', 'SG Ashta', 'SG Trinee', 'Vayu1', 'Vayu2']

def find_folder(parent_id, name):
    """Check if a folder with this name already exists under parent."""
    q = urllib.parse.quote(f"name = '{name}' and '{parent_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false")
    url = f'https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true'
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {token}')
    resp = json.loads(urllib.request.urlopen(req).read())
    files = resp.get('files', [])
    return files[0]['id'] if files else None

def create_folder(parent_id, name):
    """Create a folder, or return existing one if it already exists."""
    existing = find_folder(parent_id, name)
    if existing:
        return existing, False

    url = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id'
    body = json.dumps({
        'name': name,
        'mimeType': 'application/vnd.google-apps.folder',
        'parents': [parent_id]
    }).encode()
    req = urllib.request.Request(url, data=body, method='POST')
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Content-Type', 'application/json')
    resp = json.loads(urllib.request.urlopen(req).read())
    return resp['id'], True

results = []

for root_name, root_id in [('Daily Reports', DAILY_REPORTS_FOLDER), ('Certifications', CERTIFICATIONS_FOLDER)]:
    for company, boats in [('SG Shipping', SG_SHIPPING_BOATS), ('Sea Cabbie', SEA_CABBIE_BOATS)]:
        company_id, created = create_folder(root_id, company)
        tag = 'NEW' if created else 'EXISTS'
        print(f'{root_name} / {company:<15} -> {company_id} [{tag}]')
        results.append((root_name, company, '', company_id))

        for boat in boats:
            boat_id, created = create_folder(company_id, boat)
            tag = 'NEW' if created else 'EXISTS'
            print(f'{root_name} / {company} / {boat:<15} -> {boat_id} [{tag}]')
            results.append((root_name, company, boat, boat_id))

    print()

print('\n=== FOLDER ID TABLE ===\n')
print(f'{"Path":<55} {"ID"}')
print('-' * 100)
for root, company, boat, fid in results:
    path = f'{root} / {company}' + (f' / {boat}' if boat else '')
    print(f'{path:<55} {fid}')

print('\nDONE')
