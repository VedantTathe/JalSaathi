const fs = require('fs');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const filePath = process.argv[2];
const namespace = process.argv[3] || 'dashboard';

if (!filePath) {
  console.error('Provide file path');
  process.exit(1);
}

let code = fs.readFileSync(filePath, 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx']
});

const extracted = {};

function generateKey(text) {
  let key = text.trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .slice(0, 4)
    .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  if (!key) return 'text';
  return key;
}

// Ensure useLanguage is imported
let hasUseLanguageImport = false;
traverse(ast, {
  ImportDeclaration(path) {
    if (path.node.source.value.includes('LanguageContext')) {
      hasUseLanguageImport = true;
    }
  }
});

if (!hasUseLanguageImport) {
  // Add import at top
  const importAst = parser.parse("import { useLanguage } from '../../contexts/LanguageContext';\\n", { sourceType: 'module' });
  ast.program.body.unshift(importAst.program.body[0]);
}

// Add const { t } = useLanguage(); inside main component if missing
traverse(ast, {
  VariableDeclarator(path) {
    if (
      path.node.init &&
      path.node.init.type === 'ArrowFunctionExpression' &&
      path.parent.kind === 'const' &&
      ['DeliveryDashboard', 'CustomerDashboard', 'ProviderDashboard'].includes(path.node.id.name)
    ) {
      const body = path.node.init.body.body;
      const hasT = body.some(n => 
        n.type === 'VariableDeclaration' && 
        n.declarations[0].id.properties &&
        n.declarations[0].id.properties.some(p => p.key.name === 't')
      );
      
      if (!hasT) {
        const tDecl = parser.parse("const { t } = useLanguage();").program.body[0];
        body.unshift(tDecl);
      }
    }
  },
  
  JSXText(path) {
    const text = path.node.value;
    const trimmed = text.trim();
    if (trimmed && trimmed.length > 1 && !/^[0-9\\W]+$/.test(trimmed)) {
      const key = generateKey(trimmed);
      let finalKey = key;
      let counter = 1;
      while (extracted[finalKey] && extracted[finalKey] !== trimmed) {
        finalKey = `${key}${counter}`;
        counter++;
      }
      extracted[finalKey] = trimmed;
      
      const tCall = t.callExpression(t.identifier('t'), [t.stringLiteral(`${namespace}.${finalKey}`)]);
      path.replaceWith(t.jsxExpressionContainer(tCall));
      path.skip();
    }
  }
});

const output = generate(ast, {}, code);
fs.writeFileSync(filePath, output.code);

const dictPath = 'extracted-' + namespace + '.json';
fs.writeFileSync(dictPath, JSON.stringify(extracted, null, 2));
console.log('Processed ' + filePath + ', extracted ' + Object.keys(extracted).length + ' strings');
