# Educational library

The Swift backend loads `topics.json`, `sources.json` and `exploration.json` at startup. There are 51 issue pages covering 37 selectable regions, with 38 source records. The shared `body-areas.json` catalog defines area names, anatomical sides, point-filter groups, search aliases and front/back navigation. Its IDs are checked against the Swift region catalog.

All summaries are **editorial drafts awaiting clinical review**. `accessedOn` means the source was consulted, not that a clinician approved this project. No clinical reviewer or validated diagnosis is implied.

The sources are NHS pages about [shoulder pain](https://www.nhs.uk/symptoms/shoulder-pain/), [tennis elbow](https://www.nhs.uk/conditions/tennis-elbow/), [wrist pain](https://www.nhs.uk/symptoms/hand-pain/wrist-pain/), [back pain](https://www.nhs.uk/conditions/back-pain/), [knee pain](https://www.nhs.uk/symptoms/knee-pain/), [ankle pain](https://www.nhs.uk/symptoms/foot-pain/ankle-pain/), [sprains and strains](https://www.nhs.uk/conditions/sprains-and-strains/), and [chest pain](https://www.nhs.uk/symptoms/chest-pain/).

New areas added on 2026-11-03 include head, neck, chest, abdomen, upper back, upper arms, forearms, hands, hips, glutes, front thighs, hamstrings, shins, calves and feet. Their NHS sources and consultation dates are recorded in `sources.json`. Chest, headache, abdominal and calf summaries include region-specific help-seeking information.

Topic IDs and source IDs must be unique. Region references must match `BodyRegion.all`; source references must exist. Keep every region covered. Content files are capped at 2 MB each. Run `node scripts/validate-content.mjs` from the project root after edits.

Screening rules refer to the chest, back, sprains and knee sources. They deliberately favor human assessment for uncertain warning signs and are not comprehensive or clinically validated. Numeric pain scoring is a project heuristic. NHS contact numbers are UK-specific, so the API uses local emergency/urgent-care wording rather than assuming the user's country.

Do not add unsupported frequency statistics, medication doses, recovery guarantees, or personalized rehabilitation plans. Review original sources periodically, record changes, and obtain suitable review before offering the service beyond a class demonstration.


Guided profiles and warning messages live in `exploration.json`. Version 2 profiles include 77 conditional follow-ups and per-topic `comparisons`. `when` conditions must reference an earlier question; comparison clues must reference valid options. `Topic.explorationTags` retain the initial pattern associations. Supporting and less-typical features are editorial comparisons, not medical probabilities. Keep source links beside every issue, validate references, and seek clinical review before use beyond the class demo.
