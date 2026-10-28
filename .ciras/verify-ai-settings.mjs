#!/usr/bin/env node
// Static repository artifact verification. This is not a runtime permission gate.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { TextDecoder } from 'node:util';

export const POLICY_ID = 'CIRAS-SUCCESS-20261028-R2.1';
export const MANIFEST_PATH = '.ciras/ai-settings-manifest.json';
export const REQUIRED_FILES = Object.freeze([
  'AGENTS.md', 'CLAUDE.md', '.cursor/rules/ciras-repository.mdc',
  '00_CIRAS_POLICY.json', '.ciras/repository-context.md',
  '.ciras/ai-profile.json', '.ciras/verify-ai-settings.mjs', 'docs/AI_SETTINGS.md',
  '.ciras/governance-release.yaml', '.ciras/policy.schema.json', 'README.md',
]);
export const HEADINGS = Object.freeze([
  '役割', '成功条件', '許可範囲', '禁止の正本（JSON参照）', '止めて返すもの', '承認待ち',
]);
const RULE_DECISIONS = Object.freeze({
  S01: 'stop_and_return', C01: 'stop_unauthorized_import',
  'A01-SELF': 'stop_and_return', R01: 'stop_and_return',
  G01: 'stop_and_return', G02: 'stop_and_return', G03: 'approval_required',
  D01: 'approval_required', P01: 'approval_required', N01: 'approval_required',
  B01: 'stop_and_return', 'B02-CONTRACT': 'approval_required', 'A01-CHANGE': 'approval_required',
});
const HASH = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function forbiddenPath(relative) {
  if (typeof relative !== 'string' || !relative || relative.length > 4096 ||
      relative.includes('\\') || relative.includes('\0') || relative.includes(':') ||
      path.posix.isAbsolute(relative) || path.posix.normalize(relative) !== relative) return true;
  const parts = relative.split('/');
  if (parts.some((p) => !p || p === '.' || p === '..')) return true;
  if (parts.some((p) => /^(\.git|\.ssh|\.aws|credentials)$/i.test(p))) return true;
  if (parts.some((p, index) => p.toLowerCase() === '.config' && parts[index + 1]?.toLowerCase() === 'gh')) return true;
  const base = parts.at(-1);
  if (/^(\.env(?:\..*)?|\.dev\.vars(?:\..*)?|\.npmrc|\.netrc|\.git-credentials|\.pypirc)$/i.test(base)) return true;
  if (/\.(pem|key|p12|pfx)$/i.test(base) || /^id_(rsa|ed25519|ecdsa)/i.test(base)) return true;
  if (/credentials-ledger|^key-rotation\.jsonl$/i.test(base)) return true;
  if (/^(05_PROFILE|06_PROFILE)|PROFILE_(SUGIMOTO|KATAOKA)/i.test(base)) return true;
  if (parts.some((p) => /^(audit_archive|91_旧履歴_実行対象外|98_R1履歴)$/i.test(p))) return true;
  if (/(?:^|\/)(?:\.mcp\.json|\.claude\.json|\.codex\/auth\.json|\.cursor\/mcp\.json)$/.test(relative)) return true;
  if (/(?:^|\/)\.claude\/settings(?:\.local)?\.json$/.test(relative)) return true;
  return false;
}

function outside(root, target) {
  const rel = path.relative(root, target);
  return rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
}

function hasArchiveKey(value) {
  return containsAnyKey(value, new Set(['audit_archive']));
}

function outsideMarkdownFences(text) {
  let fence = null;
  const lines = [];
  for (const line of text.split(/\r?\n/)) {
    const opening = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!fence && opening) fence = opening[1];
    else if (fence) {
      const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) fence = null;
    } else lines.push(line);
  }
  return lines;
}

// The generated bridge intentionally uses this small YAML subset, not arbitrary settings.
function validCursorFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return false;
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const field = line.match(/^(description|alwaysApply):[ \t]*(.*)$/);
    if (!field || fields.has(field[1])) return false;
    let value = field[2];
    if (field[1] === 'description') {
      // Preserve the generated plain scalar exactly; other descriptions must use a
      // nonempty JSON-quoted string (a deliberately restricted YAML string subset).
      if (value !== 'Ciras repository instructions and execution-surface guidance') {
        try {
          const description = JSON.parse(value);
          if (typeof description !== 'string' || !description.trim()) return false;
        } catch { return false; }
      }
    }
    fields.set(field[1], value);
  }
  return fields.has('description') && fields.get('alwaysApply') === 'true';
}

// Deliberately bounded evaluator for the vocabulary in the bundled policy schema.
// Not a general Draft 2020-12 implementation; no $ref, external resolution, or arbitrary regex.
export function validateBundledPolicy(schema, value) {
  const errors = [];
  const fail = (where, reason) => { if (errors.length < 32) errors.push(`${where}: ${reason}`); };
  const keywords = new Set(['$schema', '$id', 'title', 'type', 'const', 'enum', 'required', 'properties',
    'additionalProperties', 'items', 'minItems', 'maxItems', 'minProperties', 'maxProperties', 'propertyNames', 'pattern']);
  let schemaNodes = 0;
  function inspect(node, where = '$schema', depth = 0) {
    if (++schemaNodes > 4096 || depth > 64) { fail(where, 'schema evaluation bound exceeded'); return; }
    if (!record(node)) { fail(where, 'schema object required'); return; }
    for (const [key, child] of Object.entries(node)) {
      if (!keywords.has(key)) { fail(where, `unsupported schema keyword ${key}`); continue; }
      if (['$schema', '$id', 'title'].includes(key) && typeof child !== 'string') fail(where, `${key} must be string`);
      if (key === '$schema' && child !== 'https://json-schema.org/draft/2020-12/schema') fail(where, 'unsupported schema dialect');
      if (key === 'type' && !['object', 'array', 'string', 'integer'].includes(child)) fail(where, 'unsupported schema type');
      if (key === 'const' && typeof child !== 'string') fail(where, 'only string const is supported');
      if (key === 'enum' && (!Array.isArray(child) || !child.length || !child.every(x => typeof x === 'string'))) fail(where, 'only nonempty string enum is supported');
      if (key === 'required' && (!Array.isArray(child) || !child.every(x => typeof x === 'string') || new Set(child).size !== child.length)) fail(where, 'invalid required');
      if (['minItems', 'maxItems', 'minProperties', 'maxProperties'].includes(key) && (!Number.isSafeInteger(child) || child < 0)) fail(where, `invalid ${key}`);
      if (key === 'pattern' && child !== '^Ciras-Inc/[A-Za-z0-9_.-]+$') fail(where, 'unsupported schema pattern');
      if (key === 'properties') {
        if (!record(child)) fail(where, 'properties must be object');
        else for (const [name, sub] of Object.entries(child)) inspect(sub, `${where}/properties/${name}`, depth + 1);
      }
      if (['items', 'propertyNames'].includes(key)) inspect(child, `${where}/${key}`, depth + 1);
      if (key === 'additionalProperties' && typeof child !== 'boolean') inspect(child, `${where}/${key}`, depth + 1);
    }
  }
  inspect(schema);
  if (errors.length) return errors;
  let visits = 0;
  function check(node, item, where = '$policy', depth = 0) {
    if (++visits > 100000 || depth > 64) { fail(where, 'policy evaluation bound exceeded'); return; }
    const matches = { object: record(item), array: Array.isArray(item), string: typeof item === 'string', integer: Number.isInteger(item) };
    if (node.type && !matches[node.type]) { fail(where, `expected ${node.type}`); return; }
    if (Object.hasOwn(node, 'const') && item !== node.const) fail(where, 'const mismatch');
    if (node.enum && !node.enum.includes(item)) fail(where, 'enum mismatch');
    if (node.pattern && typeof item === 'string' && !/^Ciras-Inc\/[A-Za-z0-9_.-]+$/.test(item)) fail(where, 'pattern mismatch');
    if (record(item)) {
      const keys = Object.keys(item);
      if (node.minProperties !== undefined && keys.length < node.minProperties) fail(where, 'too few properties');
      if (node.maxProperties !== undefined && keys.length > node.maxProperties) fail(where, 'too many properties');
      for (const key of node.required ?? []) if (!Object.hasOwn(item, key)) fail(where, `required ${key}`);
      for (const key of keys) {
        if (node.propertyNames) check(node.propertyNames, key, `${where}/propertyNames`, depth + 1);
        if (node.properties && Object.hasOwn(node.properties, key)) check(node.properties[key], item[key], `${where}/${key}`, depth + 1);
        else if (node.additionalProperties === false) fail(where, `unknown property ${key}`);
        else if (record(node.additionalProperties)) check(node.additionalProperties, item[key], `${where}/${key}`, depth + 1);
      }
    }
    if (Array.isArray(item)) {
      if (node.minItems !== undefined && item.length < node.minItems) fail(where, 'too few items');
      if (node.maxItems !== undefined && item.length > node.maxItems) fail(where, 'too many items');
      if (node.items) for (let index = 0; index < item.length && visits <= 100000; index++) check(node.items, item[index], `${where}/${index}`, depth + 1);
    }
  }
  check(schema, value);
  return errors;
}

function containsAnyKey(value, forbidden) {
  const pending = [value];
  let visited = 0;
  while (pending.length) {
    if (++visited > 100000) return true; // Fail closed for an oversized nested profile.
    const node = pending.pop();
    if (Array.isArray(node)) for (const child of node) pending.push(child);
    else if (record(node)) for (const [key, child] of Object.entries(node)) {
      if (forbidden.has(key)) return true;
      pending.push(child);
    }
  }
  return false;
}

// Only the generator-owned terminal section is parsed. The inherited prefix is preserved,
// not interpreted as authorization; YAML aliases, duplicate fields and unknown fields fail.
function releaseMatches(text, manifest) {
  const lines = text.split(/\r?\n/);
  const sections = lines.flatMap((line, index) => /^(?:ai_repository_settings|"ai_repository_settings"|'ai_repository_settings')\s*:/.test(line) ? [index] : []);
  if (sections.length !== 1 || lines[sections[0]] !== 'ai_repository_settings:') return false;
  const expected = {
    policy_id: manifest.policy_id, source_repository: manifest.source_repository,
    source_commit: manifest.source_commit, source_path: 'control-plane/core/00_CIRAS_POLICY.json',
    generator_version: manifest.generator_version, profile_id: manifest.profile_id,
    manifest: MANIFEST_PATH, adoption_status: 'basis-adopted',
    final_reflection: 'track-by-PR-and-head-sha', native_runtime_verified: false,
  };
  const parsed = Object.create(null);
  for (const line of lines.slice(sections[0] + 1)) {
    if (!line.trim()) continue;
    const field = line.match(/^[ ]{2}([a-z_]+): (?:'([^'\r\n]*)'|(false))$/);
    if (!field || !Object.hasOwn(expected, field[1]) || Object.hasOwn(parsed, field[1])) return false;
    parsed[field[1]] = field[3] ? false : field[2];
  }
  return Object.keys(expected).every(key => Object.hasOwn(parsed, key) && parsed[key] === expected[key]);
}

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(nonempty);
export function validRepositoryProfile(profile) {
  if (!record(profile)) return false;
  const fields = ['schema_version', 'policy_id', 'repository', 'profile_id', 'base_commit', 'default_branch',
    'classification', 'native_runtime_verified', 'protected_branch_conditions', 'required_checks',
    'local_check_commands', 'existing_native_settings', 'runtime_test_status', 'legacy_branch_protection_status'];
  if (Object.keys(profile).length !== fields.length || !fields.every(key => Object.hasOwn(profile, key))) return false;
  if (!(profile.base_commit === null || (typeof profile.base_commit === 'string' && COMMIT.test(profile.base_commit))) ||
      !nonempty(profile.default_branch) || !['active', 'archived_hold', 'empty_hold'].includes(profile.classification) ||
      !nonempty(profile.runtime_test_status) || !nonempty(profile.legacy_branch_protection_status) ||
      !strings(profile.required_checks) || !strings(profile.existing_native_settings)) return false;
  if (!Array.isArray(profile.protected_branch_conditions) || !profile.protected_branch_conditions.every(rule =>
    record(rule) && Number.isSafeInteger(rule.ruleset_id) && rule.ruleset_id > 0 && record(rule.ref_name) &&
    strings(rule.ref_name.include) && strings(rule.ref_name.exclude))) return false;
  const requiredCommand = ['command', 'source_path', 'source_blob_sha', 'execution_status', 'safety'];
  const optionalCommand = ['script_name', 'script_body', 'job'];
  return Array.isArray(profile.local_check_commands) && profile.local_check_commands.every(command =>
    record(command) && requiredCommand.every(key => nonempty(command[key])) && COMMIT.test(command.source_blob_sha) &&
    !forbiddenPath(command.source_path) && optionalCommand.every(key => !Object.hasOwn(command, key) || nonempty(command[key])) &&
    (!Object.hasOwn(command, 'working_directory') || command.working_directory === null || nonempty(command.working_directory)) &&
    Object.keys(command).every(key => [...requiredCommand, ...optionalCommand, 'working_directory'].includes(key)));
}

/**
 * Verify generated bytes and their local contracts without executing repository code.
 * expectedManifestSha256 must come from a separately trusted source to anchor bytes.
 * expectedRepository must come from the deployment target, not from the candidate itself.
 * Requires an immutable isolated checkout; concurrent filesystem writers are outside this static tool.
 * A syntactically valid source_commit is not evidence that the commit exists or is approved.
 */
export function verify(root, { expectedManifestSha256, expectedRepository } = {}) {
  const checks = [];
  const errors = [];
  const add = (id, ok, message) => {
    checks.push({ id, ok: Boolean(ok), message });
    if (!ok) errors.push(`${id}: ${message}`);
    return Boolean(ok);
  };
  const done = () => ({ ok: errors.length === 0, checks, errors });
  let rootPath;
  try {
    const absolute = path.resolve(root);
    const stat = fs.lstatSync(absolute);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('root must be a real directory');
    rootPath = fs.realpathSync(absolute);
  } catch {
    add('root', false, 'Repository root is unavailable, not a directory, or a symlink.');
    return done();
  }
  add('root', true, 'Repository root resolved.');

  const read = (relative) => {
    if (forbiddenPath(relative)) {
      add('path', false, `Rejected unsafe, secret, personal-profile, or history path: ${String(relative)}`);
      return null;
    }
    let current = rootPath;
    let descriptor;
    try {
      const parts = relative.split('/');
      for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        const stat = fs.lstatSync(current);
        if (stat.isSymbolicLink()) throw new Error('symlink');
        if (index < parts.length - 1 && !stat.isDirectory()) throw new Error('directory');
        if (index === parts.length - 1 && !stat.isFile()) throw new Error('regular file');
      }
      if (outside(rootPath, fs.realpathSync(current))) throw new Error('escape');
      descriptor = fs.openSync(current, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
      const stat = fs.fstatSync(descriptor);
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('size or file type');
      return fs.readFileSync(descriptor);
    } catch {
      add('file', false, `Cannot safely read regular repository file: ${relative}`);
      return null;
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
    }
  };
  const parse = (bytes, relative) => {
    if (!bytes) return null;
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const value = JSON.parse(text);
      if (!record(value)) throw new Error('object required');
      return value;
    } catch {
      add('json', false, `Invalid UTF-8 JSON object: ${relative}`);
      return null;
    }
  };
  const manifestBytes = read(MANIFEST_PATH);
  if (!manifestBytes) return done();
  if (expectedManifestSha256 !== undefined) {
    if (!add('trusted-manifest', typeof expectedManifestSha256 === 'string' && HASH.test(expectedManifestSha256) &&
      sha256(manifestBytes) === expectedManifestSha256, 'Manifest hash matches supplied trusted digest.')) return done();
  } else {
    add('manifest-unanchored', true, 'No trusted digest supplied; verifies local consistency only, not provenance or approval.');
  }
  const manifest = parse(manifestBytes, MANIFEST_PATH);
  if (!manifest) return done();
  add('manifest-version', manifest.schema_version === 1, 'Manifest schema_version must be 1.');
  add('manifest-policy', manifest.policy_id === POLICY_ID, 'Manifest policy_id must match adopted R2.1.');
  add('manifest-source', manifest.source_repository === 'Ciras-Inc/ciras-os' && COMMIT.test(manifest.source_commit ?? ''),
    'Source repository and 40-hex commit format checked; existence and approval are not inferred.');
  add('manifest-generator', manifest.generator_version === '1.0.3', 'Generator version must be 1.0.3.');
  if (expectedRepository !== undefined) {
    add('expected-repository', typeof expectedRepository === 'string' && /^Ciras-Inc\/[A-Za-z0-9_.-]+$/.test(expectedRepository) &&
      !['.', '..'].includes(expectedRepository.split('/')[1]) && manifest.profile_id === expectedRepository,
      'Manifest target matches separately supplied expected repository.');
  } else {
    add('repository-unbound', true, 'No external target supplied; repository identity is self-declared local consistency only.');
  }
  add('manifest-profile', typeof manifest.profile_id === 'string' && REPO.test(manifest.profile_id) &&
    manifest.profile_id.startsWith('Ciras-Inc/') && !['.', '..'].includes(manifest.profile_id.split('/')[1]),
    'Profile must identify the target Ciras-Inc repository.');
  add('manifest-base', manifest.base_commit === null || COMMIT.test(manifest.base_commit ?? ''), 'Base commit must be 40-hex or null.');
  add('manifest-runtime', manifest.native_runtime_verified === false, 'Static artifacts must not claim native runtime verification.');
  if (!add('manifest-files', record(manifest.files) && Object.keys(manifest.files).length > 0 && Object.keys(manifest.files).length <= 1024,
    'Manifest must contain a nonempty bounded file-hash map.')) return done();
  add('manifest-self', !Object.hasOwn(manifest.files, MANIFEST_PATH), 'Manifest must not hash itself.');
  for (const required of REQUIRED_FILES) add('managed-entry', Object.hasOwn(manifest.files, required), `Required managed entry: ${required}`);

  // Validate every name before reading any manifest-nominated file.
  for (const [relative, digest] of Object.entries(manifest.files)) {
    add('managed-path', relative !== MANIFEST_PATH && !forbiddenPath(relative), `Allowed managed path: ${relative}`);
    add('managed-digest', typeof digest === 'string' && HASH.test(digest), `SHA-256 format: ${relative}`);
  }
  if (errors.length) return done();
  const contents = new Map();
  for (const [relative, digest] of Object.entries(manifest.files)) {
    const bytes = read(relative);
    if (bytes) {
      contents.set(relative, bytes);
      add('file-hash', sha256(bytes) === digest, `File digest: ${relative}`);
    }
  }
  if (errors.length) return done();
  const utf8 = (relative) => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(contents.get(relative)); }
    catch { add('utf8', false, `Invalid UTF-8: ${relative}`); return ''; }
  };
  const agents = utf8('AGENTS.md');
  const headings = [...outsideMarkdownFences(agents).join('\n').matchAll(/^ {0,3}(?:#{1,6}\s*)?【([^】]+)】\s*$/gm)].map((match) => match[1]);
  add('agents-headings', headings.length === HEADINGS.length && headings.every((heading, index) => heading === HEADINGS[index]),
    'AGENTS must contain the six required section headings once and in order.');
  add('agents-size', contents.get('AGENTS.md').length > 0 && contents.get('AGENTS.md').length < 32768,
    'Root AGENTS is below 32 KiB; nested and user instruction loading remains a separate runtime check.');
  add('agents-policy', agents.includes(POLICY_ID) && agents.includes('00_CIRAS_POLICY.json'), 'AGENTS references its local policy and adopted ID.');

  const claude = utf8('CLAUDE.md');
  const outsideFence = outsideMarkdownFences(claude);
  const importLines = outsideFence.filter((line) => /^ {0,3}@AGENTS\.md\s*$/.test(line));
  add('claude-import', importLines.length === 1, 'CLAUDE has one literal non-fenced sibling @AGENTS.md import.');
  add('claude-minimal', contents.get('CLAUDE.md').length <= 4096 && !HEADINGS.some((heading) => claude.includes(`【${heading}】`)),
    'CLAUDE is a small bridge, not a duplicate six-section policy.');
  const imports = outsideFence.flatMap((line) => [...line.replace(/`[^`]*`/g, '').matchAll(/(?:^|\s)@([^\s]+)/g)].map((match) => match[1]));
  add('claude-local', imports.length === 1 && imports[0] === 'AGENTS.md',
    'CLAUDE imports only sibling AGENTS.md, with no secret or external imports.');

  const cursor = utf8('.cursor/rules/ciras-repository.mdc');
  add('cursor-frontmatter', validCursorFrontmatter(cursor),
    'Generated Cursor bridge uses closed description/alwaysApply frontmatter with boolean true and no duplicate fields.');
  add('cursor-references', cursor.includes('AGENTS.md') && cursor.includes('00_CIRAS_POLICY.json'),
    'Cursor bridge identifies local common instructions and policy.');
  add('cursor-minimal', contents.get('.cursor/rules/ciras-repository.mdc').length <= 8192,
    'Cursor bridge remains short.');

  add('release-contract', releaseMatches(utf8('.ciras/governance-release.yaml'), manifest),
    'Generated release section is complete, unambiguous, and consistent with manifest source/version/target.');
  const schema = parse(contents.get('.ciras/policy.schema.json'), '.ciras/policy.schema.json');
  const policy = parse(contents.get('00_CIRAS_POLICY.json'), '00_CIRAS_POLICY.json');
  if (policy) {
    const schemaErrors = schema ? validateBundledPolicy(schema, policy) : ['Missing valid schema'];
    add('policy-schema', schemaErrors.length === 0, schemaErrors.length ? schemaErrors.join('; ') :
      'Policy satisfies the bundled bounded schema vocabulary; not a general Draft 2020-12 evaluator.');
    add('policy-id', policy.policy_id === POLICY_ID, 'Policy ID matches manifest.');
    add('policy-history', !hasArchiveKey(policy), 'Policy does not embed audit_archive history.');
    const supplements = policy.repository_specific_requirements;
    add('policy-repository', record(supplements) && Object.keys(supplements).length === 1 && Object.hasOwn(supplements, manifest.profile_id),
      'Policy has exactly one supplement for its target repository.');
    const rules = policy['禁止の正本（JSON参照）']?.rules;
    const ids = Array.isArray(rules) ? rules.map((rule) => rule?.id) : [];
    add('policy-rule-set', ids.length === Object.keys(RULE_DECISIONS).length && new Set(ids).size === ids.length &&
      ids.every((id) => Object.hasOwn(RULE_DECISIONS, id)), 'Policy has exactly the 13 adopted unique rule IDs.');
    if (Array.isArray(rules)) {
      for (const rule of rules) add('policy-decision', record(rule) && Object.hasOwn(RULE_DECISIONS, rule.id) &&
        rule.decision === RULE_DECISIONS[rule.id], `Rule decision must match adopted baseline: ${rule?.id ?? 'missing'}`);
    }
  }
  const profile = parse(contents.get('.ciras/ai-profile.json'), '.ciras/ai-profile.json');
  if (profile) {
    add('profile-version', profile.schema_version === 1 && profile.policy_id === POLICY_ID, 'Profile schema and policy versions match.');
    add('profile-repository', profile.repository === manifest.profile_id && profile.profile_id === manifest.profile_id,
      'Profile identifiers both match the manifest target.');
    add('profile-fields', validRepositoryProfile(profile), 'Repository profile has required operational fields and valid types; command completeness requires source review.');
    add('profile-base', profile.base_commit === manifest.base_commit, 'Profile base commit matches manifest.');
    add('profile-runtime', profile.native_runtime_verified === false, 'Profile does not claim product runtime verification.');
    add('profile-history', !hasArchiveKey(profile), 'Profile does not embed historical execution archives.');
    add('profile-not-personal', !containsAnyKey(profile, new Set(['user_key', 'display_name', 'can_approve_company_decisions', 'owner_decision_approver_key', 'permissions'])),
      'Repository profile must not distribute personal identity or approval-authority fields.');
  }
  add('immutable-checkout-required', true, 'Run only against an immutable isolated checkout. Path checks do not prevent concurrent parent-directory replacement and are not an OS security boundary.');
  add('static-scope', true, 'Checks cover stored bytes and static contracts only; they do not authenticate users, approve deployment, or prove native enforcement.');
  return done();
}

function main(argv) {
  let root;
  let expectedManifestSha256;
  let expectedRepository;
  for (let index = 0; index < argv.length; index++) {
    const option = argv[index];
    if ((option === '--root' || option === '--expected-manifest-sha256' || option === '--expected-repository') && index + 1 < argv.length) {
      if (option === '--root' && root === undefined) root = argv[++index];
      else if (option === '--expected-manifest-sha256' && expectedManifestSha256 === undefined) expectedManifestSha256 = argv[++index];
      else if (option === '--expected-repository' && expectedRepository === undefined) expectedRepository = argv[++index];
      else throw new Error('Duplicate argument.');
    } else throw new Error('Usage: node verify.mjs --root <repo> [--expected-manifest-sha256 <trustedhash>] [--expected-repository <owner/repo>]');
  }
  if (!root) throw new Error('Missing --root.');
  const result = verify(root, { expectedManifestSha256, expectedRepository });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
