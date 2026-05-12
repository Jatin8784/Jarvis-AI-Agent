import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function executeCode(code: string): Promise<string> {
  const tmpFile = join(tmpdir(), `jarvis-exec-${Date.now()}.mjs`)

  const wrappedCode = `
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const os = require('os');

const __output = [];
const __log = console.log;
console.log = (...args) => {
  __output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  __log(...args);
};

try {
  const __result = await (async () => {
    ${code}
  })();
  if (__result !== undefined) __output.push(String(__result));
} catch(e) {
  __output.push('Error: ' + e.message);
}

process.stdout.write(__output.join('\\n'));
`

  try {
    writeFileSync(tmpFile, wrappedCode, 'utf8')

    const output = execSync(`node ${tmpFile}`, {
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    })

    return output || '(no output)'
  } catch (err: any) {
    return `Execution error: ${err.stderr || err.message}`
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile)
  }
}
