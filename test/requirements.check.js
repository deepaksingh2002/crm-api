import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const auth = read('src/routes/auth.js');
const enquiries = read('src/routes/enquiries.js');
const app = read('src/app.js');
const pkg = JSON.parse(read('package.json'));

const checks = [
  ['ES modules enabled', pkg.type === 'module'],
  ['Employee register API', /router\.post\('\/register'/.test(auth)],
  ['Employee login API', /router\.post\('\/login'/.test(auth)],
  [
    'JWT used',
    /jwt\.sign/.test(auth) && /jwt\.verify/.test(read('src/middleware/auth.js')),
  ],
  [
    'Public form API has no auth',
    /router\.post\('\/', publicLimiter, validate/.test(enquiries),
  ],
  [
    'Claim lead API requires auth',
    /router\.post\('\/:id\/claim', requireAuth/.test(enquiries),
  ],
  [
    'Fetch unclaimed leads requires auth',
    /router\.get\('\/unclaimed', requireAuth/.test(enquiries),
  ],
  ['Fetch my leads requires auth', /router\.get\('\/mine', requireAuth/.test(enquiries)],
  [
    'Claim is atomic/private',
    /claimed_by: null/.test(enquiries) && /findOneAndUpdate/.test(enquiries),
  ],
  ['Express framework', !!pkg.dependencies.express],
  ['MongoDB database', !!pkg.dependencies.mongodb],
  ['Prettier configured', !!pkg.devDependencies.prettier && fs.existsSync('.prettierrc')],
  ['Rate limiting and helmet', /helmet\(\)/.test(app) && /rateLimit/.test(app)],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failed++;
}
process.exit(failed ? 1 : 0);
