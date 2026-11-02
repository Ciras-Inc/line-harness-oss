// Run from any directory: node --test .ciras/tests/verify-ai-settings.test.mjs
// Uses only Node built-ins. Fixtures contain managed nonsecret candidate files,
// stay inside this checkout, and are removed even when an assertion fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verify, forbiddenPath, validRepositoryIdentifier,
  validateBundledPolicy, validRepositoryProfile, REQUIRED_FILES,
  POLICY_ID, MANIFEST_PATH, REPOSITORY_PATTERN } from '../verify-ai-settings.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rootStat = fs.lstatSync(repo);
assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'test checkout must be a real directory');
const realRepo = fs.realpathSync(repo);
// The test setup must not follow links before the verifier gets a chance to reject
// a candidate. This is still a static check in an immutable isolated checkout;
// it cannot provide an OS boundary against a concurrent parent-directory swap.
function sourceRead(relative) {
  assert.equal(forbiddenPath(relative), false, 'fixture copies only allowed managed files');
  const parts = relative.split('/');
  let current = realRepo;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stat = fs.lstatSync(current);
    assert.equal(stat.isSymbolicLink(), false, 'fixture source cannot be a symlink: ' + relative);
    assert.ok(index === parts.length - 1 ? stat.isFile() : stat.isDirectory(), 'fixture source type: ' + relative);
  }
  const resolved = fs.realpathSync(current);
  const rel = path.relative(realRepo, resolved);
  assert.ok(rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel), 'fixture source stays in checkout');
  let descriptor;
  try {
    descriptor = fs.openSync(current, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const stat = fs.fstatSync(descriptor);
    assert.ok(stat.isFile() && stat.size <= 8 * 1024 * 1024, 'fixture source must be a bounded regular file');
    return fs.readFileSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}
const sourceManifestBytes = sourceRead(MANIFEST_PATH);
const sourceManifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(sourceManifestBytes));
assert.ok(sourceManifest.files !== null && typeof sourceManifest.files === 'object' && !Array.isArray(sourceManifest.files), 'fixture manifest files must be an object');
assert.ok(Object.keys(sourceManifest.files).length > 0 && Object.keys(sourceManifest.files).length <= 1024, 'fixture manifest file count is bounded');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureFiles = new Map();
for (const relative of Object.keys(sourceManifest.files)) {
  fixtureFiles.set(relative, sourceRead(relative));
}
fixtureFiles.set(MANIFEST_PATH, sourceManifestBytes);
// Child setup-regression probe exits only after the guarded source reads finish.
// Ordinary `node --test` never passes this test-only argument.
if (process.argv.includes('--fixture-init-only')) process.exit(0);

function fixture(run) {
  const root = fs.mkdtempSync(path.join(repo, '.ciras', '.verify-ai-settings-test-'));
  const target = relative => path.join(root, relative);
  const write = (relative, bytes) => {
    fs.mkdirSync(path.dirname(target(relative)), { recursive: true });
    fs.writeFileSync(target(relative), bytes);
  };
  for (const [relative, bytes] of fixtureFiles) write(relative, bytes);
  const json = relative => JSON.parse(fs.readFileSync(target(relative), 'utf8'));
  const putJson = (relative, value) => write(relative, JSON.stringify(value, null, 2) + '\n');
  const changeManifest = mutate => {
    const manifest = json(MANIFEST_PATH);
    mutate(manifest);
    putJson(MANIFEST_PATH, manifest);
  };
  const rehash = relative => changeManifest(m => { m.files[relative] = digest(fs.readFileSync(target(relative))); });
  const mutateJson = (relative, mutate) => {
    const value = json(relative);
    mutate(value);
    putJson(relative, value);
    rehash(relative);
  };
  const mutateText = (relative, mutate) => {
    write(relative, mutate(fs.readFileSync(target(relative), 'utf8')));
    rehash(relative);
  };
  // A fixture-generated digest is a test input, not a deployment trust anchor.
  const options = () => ({
    expectedManifestSha256: digest(fs.readFileSync(target(MANIFEST_PATH))),
    expectedRepository: sourceManifest.profile_id,
    expectedSourceBundleSha256: sourceManifest.source_bundle_sha256,
  });
  const check = (overrides = {}) => verify(root, { ...options(), ...overrides });
  try { return run({ root, target, write, json, putJson, changeManifest, rehash, mutateJson, mutateText, options, check }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}
function rejected(result, checkId) {
  assert.equal(result.ok, false);
  assert.ok(result.checks.some(c => c.id === checkId && !c.ok),
    `expected failing ${checkId}; got ${JSON.stringify(result.errors)}`);
}
function badFixture(name, checkId, mutate) {
  test(name, () => fixture(f => { mutate(f); rejected(f.check(), checkId); }));
}

test('unaltered candidate passes supplied digest, source and target checks', () => fixture(f => {
  const result = f.check();
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  for (const id of ['trusted-manifest', 'expected-source-bundle', 'expected-repository', 'static-scope'])
    assert.ok(result.checks.some(c => c.id === id && c.ok));
}));
test('unanchored consistency is identified rather than represented as trusted provenance', () => fixture(f => {
  const result = verify(f.root);
  assert.equal(result.ok, true);
  for (const id of ['manifest-unanchored', 'source-bundle-unanchored', 'repository-unbound'])
    assert.ok(result.checks.some(c => c.id === id && c.ok));
  assert.equal(result.checks.some(c => c.id === 'trusted-manifest'), false);
}));
test('trusted digest mismatch stops before any manifest-managed file is read', () => fixture(f => {
  fs.rmSync(f.target('AGENTS.md'));
  const result = f.check({ expectedManifestSha256: '0'.repeat(64) });
  rejected(result, 'trusted-manifest');
  assert.equal(result.checks.some(c => ['file', 'file-hash'].includes(c.id)), false);
}));
test('malformed trusted digest is rejected', () => fixture(f => rejected(f.check({ expectedManifestSha256: 'not-a-hash' }), 'trusted-manifest')));
test('external target and source mismatches fail even when local bytes are coherent', () => fixture(f => {
  rejected(f.check({ expectedRepository: 'OtherOwner/other-repo' }), 'expected-repository');
  rejected(f.check({ expectedSourceBundleSha256: '0'.repeat(64) }), 'expected-source-bundle');
}));
test('unavailable roots and symlink root fail closed', () => fixture(f => {
  rejected(verify(f.target('missing-root')), 'root');
  rejected(verify(f.target('README.md')), 'root');
  const alias = f.target('root-alias');
  fs.symlinkSync(f.root, alias, 'dir');
  rejected(verify(alias), 'root');
}));

test('unsafe, secret, native and personal-profile path spellings are rejected', () => {
  for (const value of ['', '../AGENTS.md', '/AGENTS.md', 'x/../AGENTS.md', './AGENTS.md',
    'x//AGENTS.md', 'x\\AGENTS.md', 'C:AGENTS.md', 'x\0.md', '.git/config',
    '.SSH/id_rsa', 'x/.aws/config', 'x/credentials/file', '.config/GH/hosts.yml',
    '.env', 'x/.env.example', '.dev.vars', '.npmrc', '.netrc', '.git-credentials',
    '.pypirc', 'x/test.pem', 'x/test.key', 'x/test.p12', 'x/test.pfx', 'x/id_ed25519.pub',
    'credentials-ledger.json', 'key-rotation.jsonl', '05_PROFILE_SUGIMOTO.json',
    '06_PROFILE_KATAOKA.json', '91_旧履歴_実行対象外/file.md', '98_R1履歴/file.md',
    'audit_archive/file.md', '.mcp.json', '.CLAUDE/settings.local.json',
    '.codex/auth.json', '.codex/config.toml', '.codex/requirements.toml', '.codex/hooks.json',
    '.cursor/mcp.json', '.cursor/permissions.json', '.cursor/environment.json'])
    assert.equal(forbiddenPath(value), true, value);
  for (const value of REQUIRED_FILES) assert.equal(forbiddenPath(value), false, value);
});
test('repository identity rejects traversal and malformed owners', () => {
  for (const value of ['Ciras-Inc/ciras-web-cloner', 'owner/repo.name', 'a/a_1']) assert.equal(validRepositoryIdentifier(value), true);
  for (const value of [null, 1, 'owner', 'owner/..', 'owner/.', '-owner/repo', 'owner-/repo', 'owner/repo/name', 'owner/repo name'])
    assert.equal(validRepositoryIdentifier(value), false, String(value));
});
test('every manifest-nominated name is checked before any named file is read', () => fixture(f => {
  f.changeManifest(m => { m.files['../never-read.txt'] = '0'.repeat(64); });
  fs.rmSync(f.target('AGENTS.md'));
  const result = f.check();
  rejected(result, 'managed-path');
  assert.equal(result.checks.some(c => ['file', 'file-hash'].includes(c.id)), false);
}));
badFixture('invalid SHA format is rejected', 'managed-digest', f => f.changeManifest(m => { m.files['README.md'] = 'bad'; }));
badFixture('missing managed entry is rejected', 'managed-entry', f => f.changeManifest(m => { delete m.files['CLAUDE.md']; }));
badFixture('manifest self-hashing is rejected', 'manifest-self', f => f.changeManifest(m => { m.files[MANIFEST_PATH] = '0'.repeat(64); }));
badFixture('file content tampering fails digest', 'file-hash', f => f.write('README.md', 'tampered\n'));
badFixture('manifest unknown fields fail rather than being silently accepted', 'manifest-fields', f => f.changeManifest(m => { m.unapproved = true; }));
badFixture('manifest cannot claim deployment', 'manifest-not-deployed', f => f.changeManifest(m => { m.applied = true; }));
badFixture('manifest cannot claim native verification', 'manifest-runtime', f => f.changeManifest(m => { m.native_runtime_verified = true; }));
badFixture('manifest cannot turn candidate source into an asserted published commit', 'manifest-source', f => f.changeManifest(m => { m.source_commit = 'a'.repeat(40); }));
badFixture('wrong policy version is rejected', 'manifest-policy', f => f.changeManifest(m => { m.policy_id = 'CIRAS-FINAL-20261029'; }));
badFixture('wrong generator version is rejected', 'manifest-generator', f => f.changeManifest(m => { m.generator_version = '0.0.0'; }));

for (const [label, bytes] of [['malformed', Buffer.from('{')], ['non-object', Buffer.from('[]')], ['invalid UTF-8', Buffer.from([0xff])]])
  badFixture(`manifest ${label} JSON fails`, 'json', f => f.write(MANIFEST_PATH, bytes));
badFixture('missing managed file fails', 'file', f => fs.rmSync(f.target('CLAUDE.md')));
badFixture('file symlink is not followed', 'file', f => {
  fs.rmSync(f.target('CLAUDE.md'));
  fs.symlinkSync(f.target('README.md'), f.target('CLAUDE.md'));
});
badFixture('symlink parent directory is not followed', 'file', f => {
  fs.renameSync(f.target('docs'), f.target('fixture-docs'));
  fs.symlinkSync(f.target('fixture-docs'), f.target('docs'), 'dir');
});
badFixture('directory in place of file fails', 'file', f => {
  fs.rmSync(f.target('CLAUDE.md'));
  fs.mkdirSync(f.target('CLAUDE.md'));
});
badFixture('oversized managed file is not read', 'file', f => f.write('README.md', Buffer.alloc(8 * 1024 * 1024 + 1, 0x61)));
badFixture('invalid UTF-8 in a managed instruction fails despite matching hash', 'utf8', f => {
  f.write('AGENTS.md', Buffer.from([0xff])); f.rehash('AGENTS.md');
});

badFixture('AGENTS missing heading is rejected', 'agents-headings', f => f.mutateText('AGENTS.md', s => s.replace('【承認待ち】', '承認待ち')));
badFixture('AGENTS headings inside fences cannot satisfy the instruction contract', 'agents-headings', f => f.mutateText('AGENTS.md', s => '```md\n' + s + '\n```\n'));
badFixture('CLAUDE fenced import cannot satisfy the bridge', 'claude-import', f => f.mutateText('CLAUDE.md', () => '```md\n@AGENTS.md\n```\n'));
badFixture('CLAUDE extra imports are rejected', 'claude-local', f => f.mutateText('CLAUDE.md', s => s + '\n@.env\n'));
badFixture('Cursor quoted true is not boolean true', 'cursor-frontmatter', f => f.mutateText('.cursor/rules/ciras-repository.mdc', s => s.replace('alwaysApply: true', 'alwaysApply: "true"')));
badFixture('Cursor duplicate field is rejected', 'cursor-frontmatter', f => f.mutateText('.cursor/rules/ciras-repository.mdc', s => s.replace('alwaysApply: true', 'alwaysApply: true\nalwaysApply: true')));
badFixture('Cursor extra frontmatter fields are rejected', 'cursor-frontmatter', f => f.mutateText('.cursor/rules/ciras-repository.mdc', s => s.replace('alwaysApply: true', 'alwaysApply: true\nglobs: "**/*"')));
badFixture('release duplicate section is rejected', 'release-contract', f => f.mutateText('.ciras/governance-release.yaml', s => s + '\nai_repository_settings:\n'));
badFixture('release activation claim is rejected', 'release-contract', f => f.mutateText('.ciras/governance-release.yaml', s => s.replace('applied: false', "applied: 'true'")));

badFixture('policy invalid JSON fails despite matching hash', 'json', f => { f.write('00_CIRAS_POLICY.json', '{'); f.rehash('00_CIRAS_POLICY.json'); });
badFixture('policy missing success condition fails the adopted set', 'policy-success-set', f => f.mutateJson('00_CIRAS_POLICY.json', p => p['成功条件'].pop()));
badFixture('policy missing allow boundary fails the adopted set', 'policy-allow-set', f => f.mutateJson('00_CIRAS_POLICY.json', p => p['許可範囲'].pop()));
test('conditional ordinary execution retains owner-only adoption and unverified runtime', () => fixture(f => {
  const policy = f.json('00_CIRAS_POLICY.json');
  assert.equal(policy.execution_contract.execution_mode, 'authorized_ordinary_actions_owner_only_adoption');
  assert.equal(policy.execution_contract.ordinary_action_actor, 'authorized_ai_or_owner');
  assert.equal(policy.execution_contract.owner_only_actor, 'sugimoto');
  assert.equal(policy.execution_contract.approval_alone_is_sufficient, false);
  assert.equal(f.json('.ciras/native-control-map.json').native_runtime_verified, false);
  const result = f.check();
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.ok(result.checks.some(c => c.id === 'policy-execution-boundary' && c.ok));
}));
for (const value of [true, false]) badFixture(`legacy unconditional execution flag ${value} is rejected`, 'policy-execution-boundary',
  f => f.mutateJson('00_CIRAS_POLICY.json', p => { p.execution_contract.ai_may_execute_production = value; }));
badFixture('approval alone cannot substitute for actual authority and verification', 'policy-execution-boundary',
  f => f.mutateJson('00_CIRAS_POLICY.json', p => { p.execution_contract.approval_alone_is_sufficient = true; }));
for (const action of ['initial-settings-adoption', 'active-protection-change', 'repository-owner-only-action', 'contract-accept'])
  badFixture(`owner-only boundary cannot omit ${action}`, 'policy-execution-boundary',
    f => f.mutateJson('00_CIRAS_POLICY.json', p => {
      p.execution_contract.owner_only_actions = p.execution_contract.owner_only_actions.filter(x => x !== action);
    }));
for (const condition of ['same-fixed-version', 'required-verification-passed', 'formal-review-satisfied',
  'valid-operation-approval', 'actual-authority', 'adopted-route', 'approved-side-effects', 'no-stop-or-unknown-outcome'])
  badFixture(`ordinary execution cannot omit ${condition}`, 'policy-execution-boundary',
    f => f.mutateJson('00_CIRAS_POLICY.json', p => {
      p.execution_contract.ordinary_execution_conditions = p.execution_contract.ordinary_execution_conditions.filter(x => x !== condition);
    }));
badFixture('owner-only adoption cannot be assigned to AI', 'policy-execution-boundary',
  f => f.mutateJson('00_CIRAS_POLICY.json', p => { p.execution_contract.owner_only_actor = 'ai'; }));
badFixture('previous blanket owner-only execution contract is rejected', 'policy-execution-boundary',
  f => f.mutateJson('00_CIRAS_POLICY.json', p => {
    for (const key of ['execution_mode', 'ordinary_action_actor', 'owner_only_actor', 'approval_alone_is_sufficient',
      'owner_only_actions', 'ordinary_execution_conditions']) delete p.execution_contract[key];
    Object.assign(p.execution_contract, { production_actor: 'sugimoto', ai_may_execute_production: false,
      approval_delegates_execution: false, preparation_with_production_side_effects: 'owner_execution_only' });
  }));
badFixture('coherently relaxed schema cannot allow unconditional execution flags', 'policy-execution-boundary', f => {
  f.mutateJson('.ciras/policy.schema.json', s => { s.properties.execution_contract.additionalProperties = true; });
  f.mutateJson('00_CIRAS_POLICY.json', p => { p.execution_contract.ai_may_execute_production = true; });
});
badFixture('candidate cannot disable preservation of existing native settings', 'native-map-not-active',
  f => f.mutateJson('.ciras/native-control-map.json', m => { m.preserve_existing_native_settings = false; }));
badFixture('missing birds-eye checkpoint is rejected', 'policy-birds-eye', f => f.mutateJson('00_CIRAS_POLICY.json', p => p.execution_contract.objective_checkpoints.pop()));
badFixture('weakened owner handoff is rejected', 'policy-owner-handoff', f => f.mutateJson('00_CIRAS_POLICY.json', p => p.owner_handoff_contract.required_fields.pop()));
badFixture('wrong repository policy supplement is rejected', 'policy-repository', f => f.mutateJson('00_CIRAS_POLICY.json', p => { p.repository_specific_requirements = { 'OtherOwner/repo': {} }; }));
badFixture('missing prohibition rule is rejected', 'policy-rule-set', f => f.mutateJson('00_CIRAS_POLICY.json', p => p['禁止の正本（JSON参照）'].rules.pop()));
badFixture('weakened rule decision is rejected', 'policy-decision', f => f.mutateJson('00_CIRAS_POLICY.json', p => { p['禁止の正本（JSON参照）'].rules[0].decision = 'allow'; }));
badFixture('native control map cannot assert runtime success', 'native-map-not-active', f => f.mutateJson('.ciras/native-control-map.json', m => { m.native_runtime_verified = true; }));
badFixture('blank handoff cannot assert completed production', 'handoff-template-not-executed', f => f.mutateJson('docs/OWNER_HANDOFF.template.json', m => { m.production_executed = true; }));
badFixture('repository profile rejects undeclared fields', 'profile-fields', f => f.mutateJson('.ciras/ai-profile.json', p => { p.extra = true; }));
badFixture('repository profile cannot distribute personal approval data', 'profile-not-personal', f => f.mutateJson('.ciras/ai-profile.json', p => { p.permissions = ['approve']; }));

test('bounded schema evaluator accepts its supported vocabulary', () => {
  const schema = { type: 'object', required: ['repo', 'items', 'enabled'], additionalProperties: false,
    properties: { repo: { type: 'string', pattern: REPOSITORY_PATTERN },
      items: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'integer' } }, enabled: { type: 'boolean', const: false } } };
  assert.deepEqual(validateBundledPolicy(schema, { repo: sourceManifest.profile_id, items: [1], enabled: false }), []);
  for (const value of [{ repo: '../bad', items: [], enabled: true },
    { repo: sourceManifest.profile_id, items: ['not-an-integer'], enabled: false, extra: true }])
    assert.ok(validateBundledPolicy(schema, value).length > 0);
});
test('unsupported schema features cannot trigger reference resolution or arbitrary regex evaluation', () => {
  for (const schema of [{ $ref: 'https://invalid.example/no-network' }, { type: 'string', pattern: '(a+)+$' },
    { type: 'number' }, { required: ['same', 'same'] }, { enum: [] }, { type: 'object', additionalProperties: 1 }])
    assert.ok(validateBundledPolicy(schema, {}).length > 0);
});
test('schema depth evaluation is bounded', () => {
  let schema = { type: 'string' };
  for (let i = 0; i < 70; i++) schema = { type: 'array', items: schema };
  assert.ok(validateBundledPolicy(schema, []).some(e => e.includes('bound exceeded')));
});
test('repository profile requires complete command provenance', () => {
  const profile = JSON.parse(fixtureFiles.get('.ciras/ai-profile.json'));
  assert.equal(validRepositoryProfile(profile), true);
  profile.local_check_commands.push({ command: 'node --test', source_path: '../package.json',
    source_blob_sha: 'a'.repeat(40), execution_status: 'not_run', safety: 'local-only' });
  assert.equal(validRepositoryProfile(profile), false);
});
test('fixture initialization rejects linked manifest, managed file and parent before copying', () => {
  for (const variant of ['manifest', 'managed-file', 'parent-directory']) fixture(f => {
    const nestedTest = '.ciras/tests/verify-ai-settings.test.mjs';
    f.write(nestedTest, sourceRead(nestedTest));
    if (variant === 'manifest') {
      fs.renameSync(f.target(MANIFEST_PATH), f.target('.ciras/fixture-manifest.json'));
      fs.symlinkSync(f.target('.ciras/fixture-manifest.json'), f.target(MANIFEST_PATH));
    } else if (variant === 'managed-file') {
      fs.rmSync(f.target('README.md'));
      fs.symlinkSync(f.target('AGENTS.md'), f.target('README.md'));
    } else {
      fs.renameSync(f.target('docs'), f.target('fixture-docs'));
      fs.symlinkSync(f.target('fixture-docs'), f.target('docs'), 'dir');
    }
    // No registered test body executes. Only the child test module's bounded
    // fixture initialization runs; every link target is synthetic and local.
    const run = spawnSync(process.execPath, [f.target(nestedTest), '--fixture-init-only'],
      { cwd: f.root, encoding: 'utf8', timeout: 10000 });
    assert.notEqual(run.status, 0, variant);
    assert.match(run.stdout + run.stderr, /fixture source cannot be a symlink/, variant);
  });
});
test('CLI success, verification failure and usage failure have distinct exit codes', () => fixture(f => {
  const executable = path.join(repo, '.ciras/verify-ai-settings.mjs');
  const run = args => spawnSync(process.execPath, [executable, ...args], { cwd: repo, encoding: 'utf8', timeout: 10000 });
  const opts = f.options();
  const good = run(['--root', f.root, '--expected-manifest-sha256', opts.expectedManifestSha256,
    '--expected-repository', opts.expectedRepository, '--expected-source-bundle-sha256', opts.expectedSourceBundleSha256]);
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).ok, true);
  const bad = run(['--root', f.root, '--expected-repository', 'OtherOwner/repo']);
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).ok, false);
  for (const args of [[], ['--unexpected'], ['--root', f.root, '--root', f.root], ['--root']]) {
    const usage = run(args);
    assert.equal(usage.status, 2, JSON.stringify(args));
    assert.equal(usage.stdout, '');
    assert.ok(usage.stderr.length > 0);
  }
}));
