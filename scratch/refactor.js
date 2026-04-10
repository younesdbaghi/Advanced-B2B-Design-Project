const fs = require('fs');
const filepath = 'c:/Users/user/Desktop/B2B-figma/Advanced-B2B-Design-Project/frontend/src/pages/DesignEditor.jsx';
let content = fs.readFileSync(filepath, 'utf8');

const phStartIdx = content.indexOf('const updateButtonOnCanvas =');
const phEndIdx = content.indexOf('  if (!selectedObject) return (');

if (phStartIdx === -1 || phEndIdx === -1) {
    console.error('Could not find PropertiesPanel helpers!');
    process.exit(1);
}

const pHelpersText = content.substring(phStartIdx, phEndIdx);
// Remove them from current location
content = content.substring(0, phStartIdx) + content.substring(phEndIdx);

// Extract generateChartObjects and updateChartOnCanvas from DesignEditor
const chStartIdx = content.indexOf('  // --- CHART GENERATION HELPER ---');
const chEndIdx = content.indexOf('  // --- LOGIQUE DE SAUVEGARDE ET MISE À JOUR DES COMPOSANTS (FUSIONNÉE) ---');

if (chStartIdx === -1 || chEndIdx === -1) {
    console.error('Could not find Chart helpers!');
    process.exit(1);
}

let cHelpersText = content.substring(chStartIdx, chEndIdx);
// Replace them with empty string
content = content.substring(0, chStartIdx) + content.substring(chEndIdx);

// Modify indentation of cHelpersText (remove 2 leading spaces)
// We handle both \n and \r\n
cHelpersText = cHelpersText.split('\n').map(line => line.startsWith('  ') ? line.substring(2) : line).join('\n');

// Prepend both blocks just ABOVE PropertiesPanel
const propPanelStr = '// ─── PROPERTIES PANEL ────────────────────────────────────────────────────────';
content = content.replace(propPanelStr, pHelpersText + '\n\n' + cHelpersText + '\n\n' + propPanelStr);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Helpers moved successfully!');
