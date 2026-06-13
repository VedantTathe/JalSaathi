const fs = require('fs');

function translateBasicHeaders(file, namespace) {
  let content = fs.readFileSync(file, 'utf8');
  let extracted = {};
  
  // Find text inside simple tags like <h1...>, <p...>, <span...>, <button...>
  const regex = /<(h[1-6]|p|button|span|th|td|label)\\b[^>]*>\\s*([^<]+?)\\s*<\\/\1>/g;
  
  content = content.replace(regex, (match, tag, text) => {
    let trimmed = text.trim();
    if (!trimmed || trimmed.length < 2 || /^[0-9Rs.\\s\\-]+$/.test(trimmed)) return match;
    
    // Don't translate if it has curly braces inside (already dynamic)
    if (trimmed.includes('{') || trimmed.includes('}')) return match;
    
    let key = trimmed.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 4).map((w,i) => i===0?w.toLowerCase():w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join('');
    if(!key) key = 'text';
    
    // Ensure unique keys
    let finalKey = key;
    let count = 1;
    while(extracted[finalKey] && extracted[finalKey] !== trimmed) {
      finalKey = key + count;
      count++;
    }
    extracted[finalKey] = trimmed;
    
    // Create new string replacing the exact text
    return match.replace(text, \`{t('\${namespace}.\${finalKey}')}\`);
  });
  
  // check if useLanguage is imported
  if (!content.includes('useLanguage')) {
    content = \"import { useLanguage } from '../../contexts/LanguageContext';\\n\" + content;
  }
  
  // Ensure we add const { t } = useLanguage() if not present
  if (!content.includes('const { t } = useLanguage();')) {
    // Assuming component starts with const DashboardName = 
    content = content.replace(/(const [A-Za-z]+ = \\([^)]*\\) => {\\s*)/, \"\$1const { t } = useLanguage();\\n  \");
  }

  fs.writeFileSync(file, content);
  fs.writeFileSync('extracted-' + namespace + '.json', JSON.stringify(extracted, null, 2));
  console.log('Regex extracted ' + Object.keys(extracted).length + ' strings from ' + file);
}

translateBasicHeaders('src/pages/dashboards/CustomerDashboard.jsx', 'customerDash');
translateBasicHeaders('src/pages/dashboards/ProviderDashboard.jsx', 'providerDash');
