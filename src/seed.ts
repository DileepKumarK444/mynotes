import type { State } from './types'

const IMG = (label: string) =>
  `<figure class="img-ph" contenteditable="false"><div class="img-box"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L6 21"/></svg><span>Image placeholder (simulated upload)</span></div><figcaption>${label}</figcaption></figure><p><br></p>`

const todo = (t: string, done = false) =>
  `<div class="todo${done ? ' done' : ''}"><input type="checkbox"${done ? ' checked' : ''}><span>${t}</span></div>`

const roadmap = `
<p>Notes from the planning session with <b>product</b>, <i>design</i> and <u>engineering</u>. The goal is to agree on scope for the next quarter and flag risks early.</p>
<h2>Key decisions</h2>
<ul><li>Ship the new onboarding flow before the holiday freeze.</li><li>Move offline sync to Q1; it needs a storage rewrite.</li><li>Hire one more designer to support the mobile redesign.</li></ul>
<h2>Action items</h2>
${todo('Share the revised timeline with stakeholders', true)}
${todo('Book usability sessions for the onboarding prototype', true)}
${todo('Draft the risk register for offline sync')}
${todo('Confirm design headcount with finance')}
<h2>Milestones</h2>
<table><thead><tr><th>Milestone</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>
<tr><td>Onboarding prototype</td><td>Maya</td><td>12 Nov</td><td>On track</td></tr>
<tr><td>Sync architecture spec</td><td>Daniel</td><td>28 Nov</td><td>In review</td></tr>
<tr><td>Mobile design kickoff</td><td>Priya</td><td>5 Dec</td><td>Not started</td></tr>
</tbody></table>
<p><br></p>
<h2>Reference diagram</h2>
${IMG('Roadmap dependency diagram')}
`

const p = (t: string) => `<p>${t}</p>`
const list = (...items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`

export const seed = (): State => {
  const nbWork = 'nb-work', nbHome = 'nb-home', nbStudy = 'nb-study'
  const s = (id: string, nb: string, name: string, color: string) => ({ id, notebookId: nb, name, color })
  const pg = (id: string, sec: string, title: string, html: string, fav = false, ago = 0) => ({
    id, sectionId: sec, title, html, fav, updated: Date.now() - ago * 3600_000,
  })
  return {
    theme: 'light',
    notebookId: nbWork,
    sectionId: 'sec-planning',
    pageId: 'pg-roadmap',
    notebooks: [
      { id: nbWork, name: 'Work', color: '#7b2fbe', icon: 'briefcase' },
      { id: nbHome, name: 'Personal', color: '#0f8b8d', icon: 'home' },
      { id: nbStudy, name: 'Study', color: '#d9622b', icon: 'graduation' },
    ],
    sections: [
      s('sec-planning', nbWork, 'Planning', '#7b2fbe'),
      s('sec-meetings', nbWork, 'Meetings', '#2f6fde'),
      s('sec-ideas', nbWork, 'Ideas', '#c2418c'),
      s('sec-travel', nbHome, 'Travel', '#0f8b8d'),
      s('sec-recipes', nbHome, 'Recipes', '#d9a21b'),
      s('sec-design', nbStudy, 'Design', '#d9622b'),
      s('sec-bio', nbStudy, 'Biology', '#3d9a4a'),
    ],
    pages: [
      pg('pg-roadmap', 'sec-planning', 'Q4 roadmap review', roadmap, true, 1),
      pg('pg-okr', 'sec-planning', 'OKR draft: growth team',
        `${p('<b>Objective:</b> make the first week with MyNotes unforgettable.')}${list('KR1: 70% of new users create a second notebook in week one', 'KR2: Reduce time-to-first-note below 20 seconds', 'KR3: Lift day-7 retention from 31% to 40%')}${todo('Review with leadership on Thursday')}`, false, 5),
      pg('pg-budget', 'sec-planning', 'Budget scenarios',
        `${p('Three scenarios for next year, ordered from conservative to ambitious.')}<table><thead><tr><th>Scenario</th><th>Headcount</th><th>Spend</th></tr></thead><tbody><tr><td>Lean</td><td>14</td><td>$1.9M</td></tr><tr><td>Base</td><td>18</td><td>$2.4M</td></tr><tr><td>Stretch</td><td>24</td><td>$3.3M</td></tr></tbody></table>`, false, 30),
      pg('pg-standup', 'sec-meetings', 'Weekly standup',
        `<h2>Wins</h2>${list('Search latency down 40%', 'Design system tokens merged')}<h2>Blockers</h2>${list('Waiting on legal for the privacy copy')}${todo('Follow up with legal')}`, true, 2),
      pg('pg-1on1', 'sec-meetings', '1:1 with Priya',
        `${p('Talked about growth goals, mentoring and the mobile redesign. She would like to lead the next design review.')}${todo('Send mentoring reading list')}${todo('Book design review slot', true)}`, false, 52),
      pg('pg-feature', 'sec-ideas', 'Feature ideas',
        `${list('Quick capture widget on the lock screen', 'Page templates for meeting notes', 'Ink and handwriting support', 'Share a page as a read-only link')}${p('<i>Rank these after the next round of customer interviews.</i>')}`, false, 10),
      pg('pg-lisbon', 'sec-travel', 'Lisbon trip',
        `${p('Three days in March. Staying near Alfama.')}<h2>Packing</h2>${todo('Passport', true)}${todo('Camera and charger')}${todo('Comfortable walking shoes')}${todo('Rain jacket')}<h2>Places</h2>${list('Pastéis de Belém', 'Tram 28 early in the morning', 'Sunset at Miradouro da Senhora do Monte')}${IMG('Alfama viewpoint reference photo')}`, true, 3),
      pg('pg-japan', 'sec-travel', 'Japan itinerary',
        `<table><thead><tr><th>Day</th><th>City</th><th>Plan</th></tr></thead><tbody><tr><td>1-3</td><td>Tokyo</td><td>Shibuya, Asakusa, teamLab</td></tr><tr><td>4-6</td><td>Kyoto</td><td>Fushimi Inari, Arashiyama</td></tr><tr><td>7</td><td>Osaka</td><td>Food crawl in Dotonbori</td></tr></tbody></table>`, false, 90),
      pg('pg-pasta', 'sec-recipes', 'Weeknight pasta',
        `${p('Ready in 20 minutes and serves two.')}<h2>Ingredients</h2>${todo('200g spaghetti')}${todo('3 cloves garlic')}${todo('Chilli flakes and olive oil')}${todo('Fresh parsley')}<h2>Method</h2><ol><li>Boil the pasta until al dente.</li><li>Gently fry the garlic in olive oil.</li><li>Toss everything together with a splash of pasta water.</li></ol>`, false, 20),
      pg('pg-type', 'sec-design', 'Typography basics',
        `${p('Good typography is mostly <b>hierarchy</b>, <b>rhythm</b> and <b>contrast</b>.')}${list('Use one type family and vary weight and size', 'Keep body line length between 55 and 75 characters', 'Set line height around 1.5 for long-form text')}`, true, 8),
      pg('pg-color', 'sec-design', 'Colour theory notes',
        `${p('A restrained palette with a single accent colour feels calm and professional.')}${list('Neutral surfaces carry 90% of the interface', 'The accent signals action and selection', 'Check contrast ratio is at least 4.5:1 for body text')}`, false, 40),
      pg('pg-cell', 'sec-bio', 'Cell structure',
        `${p('The <b>mitochondria</b> convert nutrients into ATP, the energy currency of the cell.')}<table><thead><tr><th>Organelle</th><th>Function</th></tr></thead><tbody><tr><td>Nucleus</td><td>Stores DNA</td></tr><tr><td>Ribosome</td><td>Builds proteins</td></tr><tr><td>Golgi apparatus</td><td>Packages and ships proteins</td></tr></tbody></table>${todo('Memorise organelle functions')}`, false, 60),
    ],
  }
}
