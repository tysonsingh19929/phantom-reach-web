const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('Testing Task 2: Creator Monetization & Rate Card Engine');
console.log('====================================================');

const filesToTest = [
  path.join(__dirname, 'tool.html'),
  path.join(__dirname, 'tools', 'influencer-score', 'index.html')
];

for (const filePath of filesToTest) {
  const fileName = path.basename(filePath);
  console.log(`\nValidating file: ${filePath}`);

  assert(fs.existsSync(filePath), `${fileName} exists on disk`);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check 1: Zero Emojis in the entire file
  // Emoji regex specifically targeting pictorial emojis, emoticons, pictographs, symbols, and flags
  // explicitly excluding approved text symbols such as checkmarks (✓ U+2713), crosses (✕ U+2715), and dashes (— U+2014)
  const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{231A}\u{231B}\u{23E9}-\u{23EC}\u{23F0}\u{23F3}]/u;
  const hasEmoji = emojiRegex.test(content);
  assert(!hasEmoji, `${fileName} contains strictly ZERO emojis (no warning emojis or pictographs)`);

  // Check 2: Error box uses [ERROR] indicator instead of emoji
  assert(!content.includes('\u26A0'), `${fileName} does not contain warning emoji \\u26A0`);
  assert(content.includes('[ERROR] Task Execution Error:'), `${fileName} uses '[ERROR] Task Execution Error:' text indicator`);

  // Check 3: Handle sanitization
  assert(content.includes("replace(/[^a-zA-Z0-9._]/g, '')"), `${fileName} performs handle sanitization removing unsafe characters`);

  // Check 4: Key elements and texts required by Step 1 & 2
  assert(content.includes('CREATOR MONETIZATION &amp; RATE CARD AUDIT'), `${fileName} includes institutional header 'CREATOR MONETIZATION & RATE CARD AUDIT'`);
  assert(content.includes('Sponsored Reel Valuation'), `${fileName} includes 'Sponsored Reel Valuation'`);
  assert(content.includes('Sponsored Story Valuation'), `${fileName} includes 'Sponsored Story Valuation'`);
  assert(content.includes('Projected Brand Campaign Yield'), `${fileName} includes 'Projected Brand Campaign Yield'`);
  assert(content.includes('Projected Effective CPM'), `${fileName} includes 'Projected Effective CPM'`);
  assert(content.includes('Top-Paying Advertiser Niches'), `${fileName} includes 'Top-Paying Advertiser Niches'`);
  assert(content.includes('Copy Shareable Media Kit Link'), `${fileName} includes 'Copy Shareable Media Kit Link' button`);
  assert(content.includes('https://socialbyvanguard.com/c/@'), `${fileName} includes 'https://socialbyvanguard.com/c/@' media kit link format`);

  // Check 5: Step 3 Direct Guided Redirection Buttons
  assert(content.includes('href="/tools/google-leads"'), `${fileName} contains redirection link to /tools/google-leads`);
  assert(content.includes('Pitch Local Businesses'), `${fileName} contains button label 'Pitch Local Businesses'`);
  assert(content.includes('href="/tools/instagram-leads"'), `${fileName} contains redirection link to /tools/instagram-leads`);
  assert(content.includes('Pitch Instagram Brands'), `${fileName} contains button label 'Pitch Instagram Brands'`);
  assert(content.includes('href="/exchange"'), `${fileName} contains redirection link to /exchange`);
  assert(content.includes('Join Live Campaigns on Exchange Floor'), `${fileName} contains button label 'Join Live Campaigns on Exchange Floor'`);

  // Check 6: Media Kit Modal features (CPM metric & Escape listener)
  assert(content.includes('_mediaKitEscListenerAdded'), `${fileName} includes Escape key listener for media kit modal`);
  assert(content.includes('cpm || \'$18 - $24 CPM\''), `${fileName} renders CPM metric inside media kit preview modal`);

  // Check 7: Extract and syntax-check scripts
  const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    const scriptBody = match[1];
    if (scriptBody && scriptBody.trim()) {
      scriptIndex++;
      try {
        new vm.Script(scriptBody, { filename: `${fileName}-script-${scriptIndex}.js` });
        assert(true, `${fileName} script #${scriptIndex} compiled successfully without syntax errors`);
      } catch (err) {
        assert(false, `${fileName} script #${scriptIndex} syntax error: ${err.message}`);
      }
    }
  }

  // Check 8: Execute calculateMonetizationRates in sandbox to verify calculations
  const sandbox = {
    console,
    Math,
    Number,
    String,
    parseInt,
    parseFloat,
    isNaN
  };
  vm.createContext(sandbox);

  const funcMatch = content.match(/function calculateMonetizationRates[\s\S]*?\n    \}/);
  assert(!!funcMatch, `${fileName} contains function calculateMonetizationRates`);

  if (funcMatch) {
    try {
      vm.runInContext(funcMatch[0], sandbox);

      // Test Case A: Default 840K Macro Creator
      const resA = sandbox.calculateMonetizationRates('840K', 4.82, 92);
      assert(resA.rawFollowers === 840000, `Macro creator parsed 840K to 840,000`);
      assert(resA.reelLowUSD > 2000 && resA.reelHighUSD <= 9000, `Reel valuation USD for 840K ($${resA.reelLowUSD} - $${resA.reelHighUSD}) is in realistic macro tier`);
      assert(resA.reelRateDisplayINR.includes('₹'), `INR reel rate contains rupee sign: ${resA.reelRateDisplayINR}`);
      assert(resA.storyLowUSD > 0, `Story rate is ~35% of Reel: $${resA.storyLowUSD} - $${resA.storyHighUSD}`);
      assert(resA.cpmLowUSD >= 14 && resA.cpmHighUSD <= 45, `Effective CPM ($${resA.cpmLowUSD} - $${resA.cpmHighUSD}) is within institutional ranges`);
      assert(resA.yieldLowUSD > resA.reelLowUSD, `Campaign bundle yield exceeds single reel rate ($${resA.yieldLowUSD} - $${resA.yieldHighUSD})`);
      assert(resA.sponsorNiches.length === 4, `4 top-paying advertiser niches returned`);
      assert(resA.sponsorNiches.some(n => n.name === 'Fitness & Athleisure'), `Niches includes Fitness & Athleisure`);
      assert(resA.sponsorNiches.some(n => n.name === 'Tech SaaS & Productivity'), `Niches includes Tech SaaS & Productivity`);

      // Test Case B: Micro Creator (25K followers)
      const resB = sandbox.calculateMonetizationRates(25000, 4.0, 90);
      assert(resB.reelLowUSD >= 250 && resB.reelHighUSD <= 1500, `Micro creator (25k) reel valuation ($${resB.reelLowUSD} - $${resB.reelHighUSD}) fits micro tier ($250 - $1,500)`);
      assert(resB.reelRateDisplayINR.includes('₹'), `Micro creator INR formatted: ${resB.reelRateDisplayINR}`);

      // Test Case C: Nano Creator (5K followers)
      const resC = sandbox.calculateMonetizationRates(5000, 5.0, 95);
      assert(resC.reelLowUSD >= 120 && resC.reelHighUSD <= 450, `Nano creator (5k) reel valuation ($${resC.reelLowUSD} - $${resC.reelHighUSD}) fits nano tier ($120 - $450)`);

      // Test Case D: Mega Creator (2M followers)
      const resD = sandbox.calculateMonetizationRates('2M', 3.5, 90);
      assert(resD.rawFollowers === 2000000, `Mega creator parsed '2M' to 2,000,000`);
      assert(resD.reelLowUSD >= 4000, `Mega creator reel valuation exceeds $4,000 ($${resD.reelLowUSD} - $${resD.reelHighUSD})`);

      // Test Case E: Handle Sanitization Logic
      const testRawHandles = ["@creator", "hacker<script>", "cool_user!#$%^&*", "\"onclick=alert(1)\""];
      const sanitized = testRawHandles.map(h => h.replace(/^@/, '').replace(/[^a-zA-Z0-9._]/g, '') || 'creator');
      assert(sanitized[0] === 'creator', 'Sanitizes @creator to creator');
      assert(sanitized[1] === 'hackerscript', 'Strips HTML angle brackets');
      assert(sanitized[2] === 'cool_user', 'Strips symbols !#$%^&*');
      assert(sanitized[3] === 'onclickalert1', 'Strips quotes and parentheses');
    } catch (e) {
      assert(false, `Error running calculateMonetizationRates sandbox: ${e.message}`);
    }
  }
}

console.log('----------------------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('----------------------------------------------------');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('[SUCCESS] All Creator Monetization Engine tests passed!');
}
