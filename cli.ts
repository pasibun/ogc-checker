#!/usr/bin/env node
import fs from 'fs';
import process from 'process';
import { Spectral, Document, RulesetDefinition } from '@stoplight/spectral-core';
import { Json } from '@stoplight/spectral-parsers';
import jsonFgRulesets from './src/specs/json-fg/rulesets/index.js';
import ogcApiRulesets from './src/specs/ogc-api/rulesets/index.js';

const usage = `Usage: ogc-checker <spec> <file>\n\n` +
  `Available specs: json-fg, ogc-api-features, ogc-api-processes, ogc-api-records`;

function getRulesets(spec: string): [string, RulesetDefinition][] | undefined {
  switch (spec) {
    case 'json-fg':
      return Object.entries(jsonFgRulesets);
    case 'ogc-api-features':
      return Object.entries(ogcApiRulesets).filter(([k]) =>
        k.startsWith('http://www.opengis.net/spec/ogcapi-features-')
      );
    case 'ogc-api-processes':
      return Object.entries(ogcApiRulesets).filter(([k]) =>
        k.startsWith('http://www.opengis.net/spec/ogcapi-processes-')
      );
    case 'ogc-api-records':
      return Object.entries(ogcApiRulesets).filter(([k]) =>
        k.startsWith('http://www.opengis.net/spec/ogcapi-records-')
      );
    default:
      return undefined;
  }
}

async function main() {
  const [, , spec, file] = process.argv;
  if (!spec || !file) {
    console.error(usage);
    process.exit(1);
  }

  const rulesets = getRulesets(spec);
  if (!rulesets) {
    console.error(`Unknown spec: ${spec}`);
    console.error(usage);
    process.exit(1);
  }

  const content = fs.readFileSync(file, 'utf-8');
  const document = new Document(content, Json);

  let hasErrors = false;
  for (const [name, ruleset] of rulesets) {
    const spectral = new Spectral();
    spectral.setRuleset(ruleset);
    const results = await spectral.run(document);
    if (results.length > 0) {
      hasErrors = true;
      for (const v of results) {
        const start = v.range.start;
        const end = v.range.end;
        const loc = `${start.line + 1}:${start.character + 1}-${end.line + 1}:${end.character + 1}`;
        console.log(`${name}: [${v.code}] ${v.message} (${loc})`);
      }
    }
  }

  if (!hasErrors) {
    console.log('No issues found');
  }

  process.exit(hasErrors ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
