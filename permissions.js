// permissions.js
// Call initPermissions(role, extraPermissions) after login
// Then use can.* checks everywhere in the UI

let _role = null;
let _extras = {};

function initPermissions(role, extras) {
  _role = role;
  _extras = extras || {};
}

const can = {
  editCertName:    () => _role === 'admin' || _role === 'manager',
  editExpiry:      () => _role === 'admin' || _role === 'manager' || (_role === 'viewer' && _extras.editExpiry),
  editRenewal:     () => _role === 'admin' || _role === 'manager',
  uploadCert:      () => _role === 'admin' || _role === 'manager' || (_role === 'viewer' && _extras.upload),
  downloadCert:    () => true,  // all authenticated roles
  deleteCert:      () => _role === 'admin',
  addCert:         () => _role === 'admin' || _role === 'manager',
  accessAdminPanel:() => _role === 'admin',
};
