/**
 * The demo home's documents, as Super Space's extraction reads them: the text of
 * each page (PDF), slide (PowerPoint), sheet row (Excel), chapter (EPUB) or
 * paragraph run (Word, ODT, HTML; Markdown and text with the line they start on).
 *
 * Copied from omarchy-super-space's demo/make_docs.py (original texts, CC0; the
 * people and companies are fictional), which writes the same files into the demo
 * home. The demo run sheet is left out, as install-to-home.sh leaves it out of a
 * home that demos the searches it spells out.
 */
import type { DocSource } from './types';

export const documents: DocSource[] = [
	{
		path: 'Documents/Home/apartment-lease-new-farm-2026.pdf',
		about: 'Residential Tenancy Agreement - Unit 14, 88 Merthyr Road, New Farm',
		parts: [
			{
				loc: { page: 1 },
				text: 'Residential Tenancy Agreement (General Tenancy, Queensland)\nLessor: Harbourview Property Group Pty Ltd, acting for the owner.\nTenant: Sam Rivera.\nPremises: Unit 14, 88 Merthyr Road, New Farm QLD 4005, including one car park (bay 14) and storage cage 6.\nTerm: fixed term of 12 months, starting 1 August 2026 and ending 31 July 2027.\nThis agreement is made up of these standard terms, the special terms on page 4 and the entry condition report signed on 1 August 2026.',
			},
			{
				loc: { page: 2 },
				text: 'Rent\nThe rent is $620 per week. Rent is paid fortnightly in advance by direct debit, $1,240 every second Friday, starting Friday 7 August 2026.\nRent may only be increased once in any 12 month period and only with at least two months written notice. Late rent: if rent is unpaid for 7 days the lessor may give a notice to remedy breach.\nWater usage is charged to the tenant when the premises are individually metered and water efficient.',
			},
			{
				loc: { page: 3 },
				text: 'Rental bond\nThe tenant must pay a rental bond of $2,400 (two thousand four hundred dollars) before moving in.\nThe lessor must lodge the bond with the Residential Tenancies Authority (RTA) within 10 days of receiving it. The RTA holds the bond for the whole tenancy.\nAt the end of the tenancy the bond is refunded once the premises are left in the same condition as at the start, apart from fair wear and tear. A refund is claimed with a Refund of rental bond form signed by both parties.',
			},
			{
				loc: { page: 4 },
				text: "Special terms\nPets: the tenant may keep one small dog under 10 kg with the lessor's written approval. Carpets must be professionally cleaned at the end of the tenancy if a pet was kept. No cats.\nKeys and remotes: the tenant receives 2 door keys, 1 swipe tag and 1 garage remote. A replacement garage remote costs $85.\nSmoking is not permitted anywhere in the building. Bicycles are stored in the basement cage, not on the balcony.",
			},
			{
				loc: { page: 5 },
				text: "Ending the tenancy\nTo end the tenancy at the end of the fixed term, the tenant must give at least 2 weeks written notice. Breaking the lease early: the tenant pays rent until a new tenant moves in, plus a reletting fee of one week's rent.\nSigned by the tenant, Sam Rivera, on 24 July 2026.\nSigned for the lessor, Harbourview Property Group, on 24 July 2026.",
			},
		],
	},
	{
		path: 'Documents/Home/electricity-bill-sep-2026.pdf',
		about: 'Sunshine Power - electricity bill September 2026',
		parts: [
			{
				loc: { page: 1 },
				text: 'Sunshine Power - Tax invoice\nAccount 4410 2287 19, Sam Rivera, Unit 14, 88 Merthyr Road, New Farm QLD 4005.\nBilling period: 1 July 2026 to 30 September 2026 (92 days).\nAmount due: $287.40, due 14 October 2026.\nUsage: 1,102 kWh at 26.4 cents per kWh. Daily supply charge 98 cents per day. Solar feed-in credit: none.\nYour average daily use was 12.0 kWh, 8 percent lower than the same time last year.',
			},
		],
	},
	{
		path: 'Documents/Home/body-corporate-minutes-sep-2026.odt',
		about: 'Body corporate minutes',
		parts: [
			{
				loc: {},
				text: 'Merthyr Gardens body corporate - committee meeting minutes, 15 September 2026\nPresent: the chair (Unit 3), the treasurer (Unit 9), the secretary (Unit 14) and the building manager.\nPool: the pool will be closed for resurfacing for three weeks in November 2026, starting Monday 2 November. Quotes from two contractors were compared and Bluewater Pools was chosen at $18,600.',
			},
			{
				loc: {},
				text: 'Levies: administrative fund levies increase by 4 percent from 1 January 2027.\nParking: visitor bays are for visitors only; residents parking in them overnight will receive a warning letter.\nNext meeting: 17 November 2026 in the ground floor common room.',
			},
		],
	},
	{
		path: 'Documents/Home/car-service-log.txt',
		parts: [
			{ loc: { line: 1 }, text: 'Car service log - 2019 Mazda 3 hatch' },
			{
				loc: { line: 3 },
				text: '12 Mar 2025  50,210 km  Logbook service at Valley Auto Care. Oil and filter, brake fluid. $389.\n02 Sep 2025  55,040 km  New front tyres (2x Michelin Primacy 4). $412.\n12 Sep 2026  60,118 km  Logbook service at Valley Auto Care. Oil, filters, spark plugs, tyres rotated. $545.',
			},
			{
				loc: { line: 7 },
				text: 'Next service due at 70,000 km or by 12 September 2027, whichever comes first.\nWiper blades are getting streaky - replace before summer storms.',
			},
		],
	},
	{
		path: 'Documents/Home/moving-checklist.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Moving checklist (New Farm, August 2026)\nTwo weeks before\n- Book the removalist (Big Blue Removals, Saturday 1 August, 7am, $145 per hour, 2 movers)\n- Redirect mail with Australia Post for 6 months\n- Tell the electricity company the move date',
			},
			{
				loc: { line: 8 },
				text: 'Moving week\n- Pack the kitchen last; label boxes by room\n- Defrost the freezer the night before\n- Take photos of the old place for the bond inspection',
			},
			{
				loc: { line: 13 },
				text: 'After\n- Update address on driver licence and Medicare\n- Register the bond with the RTA (check the receipt arrives)\n- Find the nearest dog park (New Farm Park off-leash area)',
			},
		],
	},
	{
		path: 'Documents/Meetup/meetup-committee-notes-2026-09-29.docx',
		about: 'Omarchy Brisbane meetup - committee notes',
		parts: [
			{
				loc: {},
				text: 'Omarchy Brisbane meetup - committee notes, 29 September 2026\nAttendees: Priya Natarajan, Marcus Webb, Lena Hoffmann, Sam Rivera.\nVenue\nWe looked at three venues. River City Labs costs $350 but only holds 40 people. The State Library meeting room is free but food is not allowed. The Precinct on Brunswick Street holds 80 people and costs $500 including the projector.',
			},
			{
				loc: {},
				text: 'Decision: we agreed to hold the October meetup at The Precinct, Level 2, 315 Brunswick Street, Fortitude Valley. Marcus will book it today.\nDate and format\nTuesday 20 October 2026, doors at 6:00 pm, talks from 6:30 pm. Three talks of 15 minutes, then lightning demos.\nCatering\nPizza from Bosco in the Valley, budget $280, plus soft drinks. Lena will check dietary needs in the RSVP form.\nActions',
			},
			{
				loc: {},
				text: 'Marcus: book The Precinct and pay the $500 deposit. Lena: post the event on Meetup.com and Mastodon. Sam: prepare the Super Space demo on the Raspberry Pi. Priya: ask Coral Cloud about sponsoring the pizza.',
			},
		],
	},
	{
		path: 'Documents/Meetup/meetup-budget-oct-2026.xlsx',
		about: 'spreadsheet',
		parts: [
			{
				loc: { sheet: 'Budget', row: 1 },
				text: 'Item  Supplier  Cost (AUD)  Paid',
				sense: 'Budget',
			},
			{
				loc: { sheet: 'Budget', row: 2 },
				text: 'Venue hire  The Precinct  500  deposit',
				sense: 'Budget',
			},
			{
				loc: { sheet: 'Budget', row: 3 },
				text: 'Pizza and drinks  Bosco  280  no',
				sense: 'Budget',
			},
			{
				loc: { sheet: 'Budget', row: 4 },
				text: 'Stickers  Sticker Mule  95  yes',
				sense: 'Budget',
			},
			{ loc: { sheet: 'Budget', row: 5 }, text: 'Total  875', sense: 'Budget' },
			{
				loc: { sheet: 'Sponsors', row: 1 },
				text: 'Sponsor  Amount (AUD)  Contact',
				sense: 'Sponsors',
			},
			{
				loc: { sheet: 'Sponsors', row: 2 },
				text: 'Coral Cloud  600  Priya',
				sense: 'Sponsors',
			},
			{
				loc: { sheet: 'Sponsors', row: 3 },
				text: 'Total  600',
				sense: 'Sponsors',
			},
		],
	},
	{
		path: 'Documents/Meetup/omarchy-meetup-talk.pptx',
		about: 'Super Space: Spotlight for Omarchy slides presentation deck',
		parts: [
			{
				loc: { slide: 1 },
				text: 'Super Space: Spotlight for Omarchy\nOmarchy Brisbane meetup, October 2026\nSam Rivera',
			},
			{
				loc: { slide: 2 },
				text: 'Why another launcher?\nFinding a file by what is inside it\nPhotos and videos by what they show\nEverything stays on the machine',
			},
			{
				loc: { slide: 3 },
				text: "How it works\nOne embedding model for text, images and audio\nInstant name matches, then meaning\nSQLite and a small vector index\nMention that the model runs on the Pi's CPU.",
			},
			{
				loc: { slide: 4 },
				text: 'Live demo\nRaspberry Pi 5, 8 GB, no GPU\nFollow the demo run sheet.',
			},
			{
				loc: { slide: 5 },
				text: 'Questions\ngithub.com/vincenth19/omarchy-super-space\nMIT licensed',
			},
		],
	},
	{
		path: 'Documents/Work/kopi-club-pitch-deck.pptx',
		about: 'Kopi Club slides presentation deck',
		parts: [
			{
				loc: { slide: 1 },
				text: 'Kopi Club\nFresh Indonesian coffee, delivered to Brisbane offices',
			},
			{
				loc: { slide: 2 },
				text: 'The problem\nOffice coffee is stale pods and instant\nGood cafes are a 10 minute walk away',
			},
			{
				loc: { slide: 3 },
				text: 'Our solution\nWeekly delivery of single-origin beans from Java, Sumatra and Flores\nRoasted in Brisbane on Mondays, delivered on Tuesdays',
			},
			{
				loc: { slide: 4 },
				text: 'Pricing\nStarter: $12 per month, 250 g of beans\nRegular: $24 per month, 500 g of beans\nOffice: $89 per month, 2 kg of beans plus a free grinder loan\nAnnual plans get two months free\nMost offices pick the Office plan after the first month.',
			},
			{
				loc: { slide: 5 },
				text: 'Market\n4,200 offices with 10 or more staff in Brisbane\nAustralians drink 6 billion cups of coffee a year',
			},
			{
				loc: { slide: 6 },
				text: 'Traction\n312 paying subscribers\n18 percent month-on-month growth since March\nChurn under 3 percent',
			},
			{
				loc: { slide: 7 },
				text: 'Team\nAyu Pratama, founder and roaster\nSam Rivera, engineering\nMarcus Webb, sales',
			},
			{
				loc: { slide: 8 },
				text: 'The ask\nRaising $250,000 seed round\n12 months of runway\nSecond roaster and a delivery van',
			},
		],
	},
	{
		path: 'Documents/Work/bean-there-sales-q3-2026.xlsx',
		about: 'spreadsheet',
		parts: [
			{
				loc: { sheet: 'Summary', row: 1 },
				text: 'Bean There Coffee Co - Q3 2026 sales by store (AUD)',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 2 },
				text: 'Store  Coffees sold  Revenue  vs Q2',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 3 },
				text: 'Fortitude Valley  41210  298540  +4%',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 4 },
				text: 'South Bank  56870  412380  +11%',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 5 },
				text: 'Toowong  33950  241760  -2%',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 6 },
				text: 'Chermside  28400  203115  +1%',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 7 },
				text: 'Total  160430  1155795  +4%',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Summary', row: 8 },
				text: 'Best store this quarter: South Bank',
				sense: 'Summary',
			},
			{
				loc: { sheet: 'Fortitude Valley', row: 1 },
				text: 'Month  Coffees sold  Coffee revenue  Food revenue  Total revenue',
				sense: 'Fortitude Valley',
			},
			{
				loc: { sheet: 'Fortitude Valley', row: 2 },
				text: 'July  13020  70300  23900  94200',
				sense: 'Fortitude Valley',
			},
			{
				loc: { sheet: 'Fortitude Valley', row: 3 },
				text: 'August  13890  75010  25480  100490',
				sense: 'Fortitude Valley',
			},
			{
				loc: { sheet: 'Fortitude Valley', row: 4 },
				text: 'September  14300  77220  26630  103850',
				sense: 'Fortitude Valley',
			},
			{
				loc: { sheet: 'South Bank', row: 1 },
				text: 'Month  Coffees sold  Coffee revenue  Food revenue  Total revenue',
				sense: 'South Bank',
			},
			{
				loc: { sheet: 'South Bank', row: 2 },
				text: 'July  18100  97740  33100  130840',
				sense: 'South Bank',
			},
			{
				loc: { sheet: 'South Bank', row: 3 },
				text: 'August  18650  100710  34200  134910',
				sense: 'South Bank',
			},
			{
				loc: { sheet: 'South Bank', row: 4 },
				text: 'September  20120  108650  37980  146630',
				sense: 'South Bank',
			},
			{
				loc: { sheet: 'Toowong', row: 1 },
				text: 'Month  Coffees sold  Coffee revenue  Food revenue  Total revenue',
				sense: 'Toowong',
			},
			{
				loc: { sheet: 'Toowong', row: 2 },
				text: 'July  11400  61560  20110  81670',
				sense: 'Toowong',
			},
			{
				loc: { sheet: 'Toowong', row: 3 },
				text: 'August  11050  59670  19800  79470',
				sense: 'Toowong',
			},
			{
				loc: { sheet: 'Toowong', row: 4 },
				text: 'September  11500  62100  18520  80620',
				sense: 'Toowong',
			},
			{
				loc: { sheet: 'Chermside', row: 1 },
				text: 'Month  Coffees sold  Coffee revenue  Food revenue  Total revenue',
				sense: 'Chermside',
			},
			{
				loc: { sheet: 'Chermside', row: 2 },
				text: 'July  9300  50220  16180  66400',
				sense: 'Chermside',
			},
			{
				loc: { sheet: 'Chermside', row: 3 },
				text: 'August  9420  50870  16400  67270',
				sense: 'Chermside',
			},
			{
				loc: { sheet: 'Chermside', row: 4 },
				text: 'September  9680  52270  17175  69445',
				sense: 'Chermside',
			},
		],
	},
	{
		path: 'Documents/Work/project-lighthouse-kickoff-brief.docx',
		about: 'Project Lighthouse kickoff brief',
		parts: [
			{
				loc: {},
				text: 'Project Lighthouse - kickoff brief\nGoal: move the billing system from the old PHP monolith to a Rust service by March 2027, without downtime for customers.\nBudget: $180,000, covering two contractors for six months and the load-testing environment.\nTeam: Sam Rivera (tech lead), Priya Natarajan (product), two contract engineers from Fernhill Software.',
			},
			{
				loc: {},
				text: 'Milestones: invoices generated by the new service in shadow mode by December 2026; 10 percent of customers by February 2027; all customers by 31 March 2027.\nRisks: currency rounding differences between the old and new systems; the tax rules for New Zealand customers.',
			},
		],
	},
	{
		path: 'Documents/Work/okrs-2026-q4.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Team OKRs, Q4 2026\nObjective 1: Make billing boring\n- KR1: zero billing incidents that reach customers\n- KR2: Lighthouse shadow mode matches 99.9% of invoices to the cent',
			},
			{
				loc: { line: 7 },
				text: 'Objective 2: Faster support\n- KR1: first response under 2 hours during business hours\n- KR2: cut the support backlog from 140 to 40 tickets',
			},
			{
				loc: { line: 11 },
				text: 'Objective 3: Grow the team\n- KR1: hire one senior engineer in Brisbane\n- KR2: every engineer gives one internal tech talk',
			},
		],
	},
	{
		path: 'Documents/Work/incident-report-2026-09-14.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Incident report: customer portal outage, 14 September 2026\nDuration: 42 minutes (09:12 to 09:54 AEST).',
			},
			{
				loc: { line: 5 },
				text: 'Impact: customers could not log in to the portal or download invoices. About 1,900 failed logins.',
			},
			{
				loc: { line: 7 },
				text: 'Root cause: the TLS certificate for portal.coralcloud.example expired. The renewal job had been failing silently since August because its DNS API token was rotated.',
			},
			{
				loc: { line: 9 },
				text: 'Fix: renewed the certificate by hand at 09:50, then repaired the token.',
			},
			{
				loc: { line: 11 },
				text: 'Follow-ups: alert 21 days before any certificate expires; add the renewal job to the on-call dashboard; document token rotation.',
			},
		],
	},
	{
		path: 'Documents/Work/team-offsite-stradbroke.html',
		about: 'Team offsite - North Stradbroke Island',
		parts: [
			{
				loc: {},
				text: 'Team offsite: North Stradbroke Island (Minjerribah)\nDates: Thursday 5 and Friday 6 November 2026.\nTravel: 7:30 am water taxi from Cleveland to Dunwich, then the bus to Point Lookout.\nStay: Point Lookout Beach Resort, rooms are shared two per room.\nPlan\nThursday: planning for 2027 and the Lighthouse retro\nThursday afternoon: North Gorge walk, look for whales and turtles\nFriday: hack morning, ferry home at 3 pm',
			},
			{
				loc: {},
				text: 'Bring a hat, reef-safe sunscreen and your laptop charger.',
			},
		],
	},
	{
		path: 'Documents/Finance/Invoices/invoice-INV-1042-riverbend-plumbing.pdf',
		about: 'Invoice INV-1042 Riverbend Plumbing',
		parts: [
			{
				loc: { page: 1 },
				text: 'Riverbend Plumbing - Tax invoice INV-1042\nBill to: Sam Rivera, Unit 14, 88 Merthyr Road, New Farm QLD 4005.\nDate: 16 September 2026. Due: 30 September 2026.\nWork done: repaired the hot water system, replaced the tempering valve and the pressure relief valve.\nLabour 2.5 hours: $250.00. Parts: $135.00.\nTotal: $385.00 including GST. Pay by bank transfer, reference INV-1042.',
			},
		],
	},
	{
		path: 'Documents/Finance/Invoices/invoice-2026-08-brightspark-electrical.pdf',
		about: 'BrightSpark Electrical invoice',
		parts: [
			{
				loc: { page: 1 },
				text: 'BrightSpark Electrical - Invoice 2026-08-117\nCustomer: Sam Rivera.\nDate: 21 August 2026.\nInstalled 4 LED downlights in the living room and replaced the bathroom exhaust fan.\nLabour: $380.00. Materials: $260.00.\nTotal due: $640.00 within 14 days.',
			},
		],
	},
	{
		path: 'Documents/Finance/Invoices/invoice-0193-pixel-and-pine.docx',
		about: 'Pixel & Pine invoice 0193',
		parts: [
			{
				loc: {},
				text: 'Pixel & Pine Web Studio - Invoice 0193\nTo: Kopi Club Pty Ltd, attention Ayu Pratama.\nDate: 2 October 2026.\nWebsite redesign: new home page, subscription checkout and order tracking pages. 38.5 hours at $100 per hour: $3,850.00.\nTotal: $3,850.00 (no GST, the studio is not registered for GST).\nPayment due in 30 days.',
			},
		],
	},
	{
		path: 'Documents/Finance/Invoices/invoice-77-greenleaf-gardening.odt',
		about: 'Greenleaf Gardening invoice 77',
		parts: [
			{
				loc: {},
				text: 'Greenleaf Gardening - Invoice 77\nCustomer: Merthyr Gardens body corporate.\nDate: 28 September 2026.\nLawn mowing, edging and hedge trimming for the front garden and courtyard: $120.00.\nGreen waste removal: included.',
			},
		],
	},
	{
		path: 'Documents/Finance/tax-2025-26-home-office-notes.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Tax 2025-26: home office notes\nWorking from home\n- Method: fixed rate method, 70 cents per hour\n- Hours worked from home: 1,240 hours (from my calendar, July 2025 to June 2026)\n- Deduction: 1,240 x $0.70 = $868',
			},
			{
				loc: { line: 8 },
				text: 'Equipment\n- Laptop bought 3 March 2026 for $2,199, 90% work use, depreciate over 2 years\n- Standing desk $649, depreciate over 10 years',
			},
			{
				loc: { line: 12 },
				text: 'Records to keep\n- Calendar export showing the home office hours\n- Receipts for the laptop and desk\n- Internet bill: claim 40% work use',
			},
		],
	},
	{
		path: 'Documents/Finance/household-budget-2026.xlsx',
		about: 'spreadsheet',
		parts: [
			{
				loc: { sheet: 'Monthly', row: 1 },
				text: 'Category  Budget (AUD)  September actual',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 2 },
				text: 'Rent  2687  2687',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 3 },
				text: 'Groceries  650  712',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 4 },
				text: 'Electricity  95  96',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 5 },
				text: 'Internet  85  85',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 6 },
				text: 'Transport  160  131',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 7 },
				text: 'Eating out  250  318',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Monthly', row: 8 },
				text: 'Dog food and vet  120  74',
				sense: 'Monthly',
			},
			{
				loc: { sheet: 'Savings goals', row: 1 },
				text: 'Goal  Target (AUD)  Saved so far  By',
				sense: 'Savings goals',
			},
			{
				loc: { sheet: 'Savings goals', row: 2 },
				text: 'Japan trip (Tokyo and Hokkaido)  6000  2350  April 2027',
				sense: 'Savings goals',
			},
			{
				loc: { sheet: 'Savings goals', row: 3 },
				text: 'Emergency fund  10000  7800  December 2026',
				sense: 'Savings goals',
			},
			{
				loc: { sheet: 'Savings goals', row: 4 },
				text: 'New bike  1400  900  February 2027',
				sense: 'Savings goals',
			},
		],
	},
	{
		path: 'Documents/Finance/car-insurance-renewal-2026.pdf',
		about: 'Car insurance renewal',
		parts: [
			{
				loc: { page: 1 },
				text: 'Comprehensive car insurance - renewal notice\nPolicy MZ-3381-2026 for a 2019 Mazda 3 hatch.\nRenewal date: 1 November 2026.\nAnnual premium: $1,142.60, or $99.80 per month.\nBasic excess: $800. An extra $400 applies to drivers under 25.\nAgreed value: $21,500. Includes windscreen cover with no excess and a hire car after an accident.',
			},
		],
	},
	{
		path: 'Documents/Recipes/banana-bread.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Banana bread\nIngredients\n- 3 very ripe bananas\n- 1/3 cup melted butter\n- 3/4 cup brown sugar\n- 1 egg, beaten\n- 1 teaspoon vanilla\n- 1 teaspoon baking soda and a pinch of salt\n- 1 1/2 cups plain flour',
			},
			{
				loc: { line: 12 },
				text: 'Method\n1. Heat the oven to 180C (160C fan). Grease a loaf tin.\n2. Mash the bananas, stir in the butter, then the sugar, egg and vanilla.\n3. Sprinkle over the baking soda and salt, then fold in the flour.\n4. Bake for 55 to 60 minutes, until a skewer comes out clean.\n5. Cool in the tin for 10 minutes. Best toasted with butter the next day.',
			},
		],
	},
	{
		path: 'Documents/Recipes/pavlova.txt',
		parts: [
			{ loc: { line: 1 }, text: "Christmas pavlova (Nan's recipe)" },
			{ loc: { line: 3 }, text: 'Serves 8. Make it the day before.' },
			{
				loc: { line: 5 },
				text: '4 egg whites at room temperature, 1 cup caster sugar, 2 teaspoons cornflour, 1 teaspoon white vinegar, 1 teaspoon vanilla.',
			},
			{
				loc: { line: 7 },
				text: 'Beat the egg whites to soft peaks, then add the sugar a spoonful at a time until the meringue is thick and glossy. Fold in the cornflour, vinegar and vanilla. Shape into a 20 cm circle on baking paper.',
			},
			{
				loc: { line: 9 },
				text: 'Bake at 120C for 1 hour 20 minutes, then turn the oven off and leave it inside with the door ajar until cold.',
			},
			{
				loc: { line: 11 },
				text: 'Top with whipped cream, strawberries, kiwi fruit and passionfruit just before serving.',
			},
		],
	},
	{
		path: 'Documents/Recipes/beef-rendang.odt',
		about: 'Beef rendang',
		parts: [
			{
				loc: {},
				text: 'Beef rendang (West Sumatran slow-cooked beef curry)\nServes 6. Takes about 3 and a half hours, mostly simmering.\nSpice paste: 10 dried chillies soaked, 6 shallots, 4 cloves garlic, 3 cm galangal, 3 cm ginger, 2 stalks lemongrass, 1 teaspoon turmeric. Blend until smooth.',
			},
			{
				loc: {},
				text: 'Fry the paste in oil for 5 minutes. Add 1.2 kg chuck steak in large cubes, 400 ml coconut milk, 4 kaffir lime leaves, 1 turmeric leaf if you have it, 1 tablespoon tamarind and 1 tablespoon palm sugar.\nSimmer uncovered on low heat for 3 hours, stirring every 15 minutes, until the coconut milk has cooked down and the beef is dark and dry. Stir in 4 tablespoons of toasted grated coconut (kerisik) near the end.',
			},
			{
				loc: {},
				text: 'Serve with steamed rice. It tastes even better the next day.',
			},
		],
	},
	{
		path: 'Documents/Recipes/resep-nasi-goreng.html',
		about: 'Resep nasi goreng kampung',
		parts: [
			{
				loc: {},
				text: 'Resep nasi goreng kampung\nUntuk 2 porsi. Waktu memasak 15 menit.\nBahan\n2 piring nasi putih dingin (nasi kemarin lebih baik)\n3 siung bawang merah dan 2 siung bawang putih, diiris tipis\n2 cabai merah, 1 sendok teh terasi\n2 butir telur, 2 sendok makan kecap manis, garam secukupnya\nCara membuat',
			},
			{
				loc: {},
				text: 'Tumis bawang merah, bawang putih, cabai dan terasi sampai harum. Masukkan telur, orak-arik sebentar. Masukkan nasi, kecap manis dan garam, aduk dengan api besar selama 5 menit.\nSajikan dengan telur mata sapi, kerupuk dan irisan mentimun.',
			},
		],
	},
	{
		path: 'Documents/Recipes/lamingtons.docx',
		about: 'Lamingtons',
		parts: [
			{
				loc: {},
				text: 'Lamingtons\nMakes 16 squares.\nSponge: bake a plain butter sponge in a 20 x 30 cm tin at 180C for 25 minutes. Cool completely, then freeze for 30 minutes so it does not crumble. Cut into 16 squares.\nIcing: 4 cups icing sugar, 1/3 cup cocoa, 15 g butter and 1/2 cup milk, stirred over a bowl of hot water until smooth.',
			},
			{
				loc: {},
				text: 'Dip each square in the chocolate icing, then roll in desiccated coconut. Leave on a rack to set for an hour.\nFor the meetup: make a double batch, they go fast.',
			},
		],
	},
	{
		path: 'Documents/Travel/tasmania-camping-itinerary-dec-2026.pdf',
		about: 'Tasmania camping itinerary December 2026',
		parts: [
			{
				loc: { page: 1 },
				text: 'Tasmania camping trip - 18 to 24 December 2026\nSeven days in a campervan, starting and ending in Hobart.\nCampervan: Apollo Euro Camper, pick up Hobart depot Friday 18 December at 10 am. Booking reference APL-58213.\nTravellers: Sam and Lena.\nRough route: Hobart, Mount Field, Freycinet, Bay of Fires, Cradle Mountain, Strahan, back to Hobart.',
			},
			{
				loc: { page: 2 },
				text: 'Days 1 to 3\nDay 1 (Fri 18 Dec): Hobart to Mount Field National Park. Walk to Russell Falls and Horseshoe Falls. Camp at the Mount Field campground.\nDay 2 (Sat 19 Dec): Drive to Freycinet National Park. Camp at Richardsons Beach campground near Coles Bay (powered site 23, booked through the parks ballot).\nDay 3 (Sun 20 Dec): Early walk up to the Wineglass Bay lookout, then down to the beach for a swim. Oysters at Freycinet Marine Farm for lunch.',
			},
			{
				loc: { page: 3 },
				text: 'Days 4 to 7\nDay 4 (Mon 21 Dec): North to the Bay of Fires. Free camping at Cosy Corner, orange lichen rocks at sunset.\nDay 5 (Tue 22 Dec): Long drive to Cradle Mountain. Walk the Dove Lake circuit (6 km, about 2 hours). Stay at the Discovery Parks campground.\nDay 6 (Wed 23 Dec): Down the west coast to Strahan, Gordon River cruise at 8:30 am.\nDay 7 (Thu 24 Dec): Back to Hobart, return the van by 3 pm, Christmas Eve dinner at the waterfront.',
			},
			{
				loc: { page: 4 },
				text: 'Packing list\nThermal tops and a warm beanie, even in December. Rain jacket. Hiking boots. Head torch. Swimmers and a quick-dry towel.\nHoliday pass for the national parks: $90 per vehicle, buy online before we fly.\nFood for the first two nights; there is a supermarket in Swansea. Gas canister cannot go on the plane: buy one in Hobart.',
			},
		],
	},
	{
		path: 'Documents/Travel/flight-booking-bne-hba.txt',
		parts: [
			{
				loc: { line: 1 },
				text: 'Booking confirmation - Virgin Australia\nBooking reference: QX7P2L',
			},
			{ loc: { line: 4 }, text: 'Passengers: Sam Rivera, Lena Hoffmann' },
			{
				loc: { line: 6 },
				text: 'Flight VA1532, Brisbane (BNE) to Hobart (HBA)\nFriday 18 December 2026, departs 6:15 am, arrives 9:05 am\nBaggage: 23 kg each',
			},
			{
				loc: { line: 10 },
				text: 'Return flight VA1537, Hobart (HBA) to Brisbane (BNE)\nThursday 24 December 2026, departs 6:40 pm, arrives 9:20 pm',
			},
		],
	},
	{
		path: 'Documents/Career/sam-rivera-cv-2026.pdf',
		about: 'Sam Rivera - CV',
		parts: [
			{
				loc: { page: 1 },
				text: 'Sam Rivera - Senior software engineer\nBrisbane, Queensland. sam.rivera@example.com\nExperience\nCoral Cloud, Brisbane - Senior software engineer, 2022 to now. Lead engineer on the billing platform. Moved invoice generation to Rust, cutting run time from 40 minutes to 3. Mentor to four junior engineers.\nFernhill Software, Gold Coast - Software engineer, 2018 to 2022. Built booking systems for tour operators in Python and PostgreSQL.',
			},
			{
				loc: { page: 2 },
				text: 'Education\nBachelor of Information Technology, Queensland University of Technology (QUT), 2015 to 2018. Major in computer science, graduated with distinction.\nSkills\nRust, Python, TypeScript, PostgreSQL, Linux, Kubernetes, Raspberry Pi tinkering.\nInterests\nCoffee roasting, trail running, organising the Omarchy Brisbane meetup.\nReferees\nAvailable on request.',
			},
		],
	},
	{
		path: 'Documents/Career/cover-letter-coral-cloud-staff-engineer.docx',
		about: 'Cover letter',
		parts: [
			{
				loc: {},
				text: 'Cover letter - Staff engineer, Coral Cloud\nDear hiring panel,\nI would like to apply for the staff engineer role in the payments group. Over the last four years I have led the billing platform, and Project Lighthouse is my proposal for moving it to Rust without downtime.\nI enjoy work that makes systems simpler and quieter, and I spend my weekends running the Omarchy meetup and teaching people Linux.',
			},
			{ loc: {}, text: 'Kind regards,\nSam Rivera' },
		],
	},
	{
		path: 'Documents/Personal/best-man-speech-tom-and-jess.docx',
		about: 'Best man speech for Tom and Jess',
		parts: [
			{
				loc: {},
				text: "Best man speech - Tom and Jess, 7 November 2026\nGood evening everyone. For those who don't know me, I'm Sam, and I've known Tom since we were eleven.\nTom and Jess met at a trivia night in West End. Their team was called Quiz Khalifa. They lost, but Tom got her number, so he says it was a win.",
			},
			{
				loc: {},
				text: 'I have to tell you about the camping trip to Noosa. Tom packed the car, he packed the esky, he packed three kinds of hot sauce. He did not pack the tent. We slept in the car, and Jess still agreed to marry him. That is love.\nJess, thank you for making my best mate so happy. Please raise your glasses: to Tom and Jess.',
			},
		],
	},
	{
		path: 'Documents/Personal/gift-ideas.txt',
		parts: [
			{ loc: { line: 1 }, text: 'Gift ideas' },
			{
				loc: { line: 3 },
				text: "Mum (birthday 3 Nov): pottery class voucher at Clayworks West End, about $95. Or a new gardening hat.\nDad (Christmas): a good chef's knife, he keeps borrowing mine.\nLena (birthday Jan): headlamp for the Tasmania trip? No, she has one. Concert tickets.\nTom and Jess wedding: contribute to the honeymoon fund (Japan).",
			},
		],
	},
	{
		path: 'Documents/Personal/book-club-reading-list.md',
		parts: [
			{
				loc: { line: 1 },
				text: "Book club reading list, 2026\n- January: Pride and Prejudice by Jane Austen\n- March: The Time Machine by H. G. Wells\n- May: Frankenstein by Mary Shelley\n- July: Alice's Adventures in Wonderland by Lewis Carroll (re-read, it was a vote)\n- September: The Call of the Wild by Jack London\n- November: Little Women by Louisa May Alcott",
			},
			{
				loc: { line: 10 },
				text: "We meet on the last Sunday of the month at Lena's place. Bring snacks.",
			},
		],
	},
	{
		path: 'Documents/Personal/journal-2026-09.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Journal, September 2026\n6 September\nFirst surf lesson at Currumbin. Stood up twice. Very sore shoulders.',
			},
			{
				loc: { line: 6 },
				text: '13 September\nLong run along the river, 18 km. The half marathon plan is working.',
			},
			{
				loc: { line: 9 },
				text: '20 September\nTom asked me to be his best man. Started thinking about the speech. The Noosa tent story has to go in.',
			},
			{
				loc: { line: 12 },
				text: '27 September\nSpent the whole day on the Super Space demo. The photo search found the beach photos from Bali by meaning alone.',
			},
		],
	},
	{
		path: 'Documents/Personal/surat-untuk-nenek.txt',
		parts: [
			{ loc: { line: 1 }, text: 'Surat untuk Nenek' },
			{ loc: { line: 3 }, text: 'Nenek yang tersayang,' },
			{
				loc: { line: 5 },
				text: 'Apa kabar? Semoga Nenek sehat selalu di Denpasar. Di Brisbane sekarang sudah mulai musim panas dan cuacanya sangat cerah.',
			},
			{
				loc: { line: 7 },
				text: 'Aku ingin memberi kabar bahwa aku akan pulang ke Bali bulan Januari, tanggal 8 sampai 22 Januari 2027. Aku akan membawa kopi dari Brisbane untuk Nenek, dan aku ingin belajar memasak rendang lagi bersama Nenek.',
			},
			{ loc: { line: 9 }, text: 'Peluk dan cium dari jauh,\nSam' },
		],
	},
	{
		path: 'Documents/Personal/half-marathon-training-plan.xlsx',
		about: 'spreadsheet',
		parts: [
			{
				loc: { sheet: 'Plan', row: 1 },
				text: 'Week  Tuesday  Thursday  Sunday long run  Total km',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 2 },
				text: '1  5 km easy  6 km tempo  12 km  23',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 3 },
				text: '2  6 km easy  6 km intervals  14 km  26',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 4 },
				text: '3  6 km easy  8 km tempo  16 km  30',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 5 },
				text: '4  5 km easy  5 km easy  10 km (rest week)  20',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 6 },
				text: '5  6 km easy  8 km intervals  18 km  32',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 7 },
				text: '6  8 km easy  8 km tempo  19 km  35',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 8 },
				text: '7  6 km easy  6 km easy  12 km taper  24',
				sense: 'Plan',
			},
			{
				loc: { sheet: 'Plan', row: 9 },
				text: '8  4 km easy  Rest  Race: Brisbane half marathon, 21.1 km, Sunday 15 November  25',
				sense: 'Plan',
			},
		],
	},
	{
		path: 'Documents/Health/physio-knee-exercises.pdf',
		about: 'Knee rehab exercises',
		parts: [
			{
				loc: { page: 1 },
				text: 'Knee rehabilitation exercises - right knee (patellofemoral pain)\nDo these once a day for 6 weeks. Stop if the pain goes above 4 out of 10.\n1. Straight leg raises: 3 sets of 12, hold for 3 seconds at the top.\n2. Wall sits: 3 times 30 seconds, knees bent to 45 degrees.\n3. Step-downs from a 15 cm step: 3 sets of 10, slow and controlled.\n4. Clamshells with a band: 3 sets of 15 each side.\nReview appointment: Thursday 29 October 2026, 4:15 pm, with the physio at Riverside Physio.',
			},
		],
	},
	{
		path: 'Documents/Notes/wireguard-vpn-setup-raspberry-pi.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'WireGuard VPN on the Raspberry Pi\nHow I set up the home VPN so the laptop can reach the Pi from anywhere.',
			},
			{ loc: { line: 5 }, text: 'Install\n    sudo pacman -S wireguard-tools' },
			{
				loc: { line: 8 },
				text: 'Keys\n    wg genkey | tee server.key | wg pubkey > server.pub\n    wg genkey | tee laptop.key | wg pubkey > laptop.pub',
			},
			{
				loc: { line: 12 },
				text: '/etc/wireguard/wg0.conf on the Pi\n    [Interface]\n    Address = 10.8.0.1/24\n    ListenPort = 51820\n    PrivateKey = <server.key>',
			},
			{
				loc: { line: 18 },
				text: '[Peer]\n    PublicKey = <laptop.pub>\n    AllowedIPs = 10.8.0.2/32\n    PersistentKeepalive = 25',
			},
			{
				loc: { line: 23 },
				text: 'Start on boot\n    sudo systemctl enable --now wg-quick@wg0',
			},
			{
				loc: { line: 26 },
				text: 'Forward UDP port 51820 on the router to the Pi. Check with `sudo wg show`.',
			},
		],
	},
	{
		path: 'Documents/Notes/linux-commands-cheatsheet.txt',
		parts: [
			{ loc: { line: 1 }, text: 'Linux commands I keep forgetting' },
			{
				loc: { line: 3 },
				text: 'Find big files:            du -ah ~ | sort -h | tail -20\nWhat is using a port:      ss -ltnp | grep 8080\nFollow a service log:      journalctl --user -fu superspace\nDisk usage by folder:      ncdu ~\nExtract a tar.gz:          tar xzf file.tar.gz\nCopy with progress:        rsync -ah --progress src/ dest/\nWhich package owns a file: pacman -Qo /usr/bin/ls',
			},
		],
	},
	{
		path: 'Documents/Study/rust-ownership-notes.md',
		parts: [
			{
				loc: { line: 1 },
				text: 'Rust ownership notes\nThe three rules\n1. Each value has one owner.\n2. There can only be one owner at a time.\n3. When the owner goes out of scope, the value is dropped.',
			},
			{
				loc: { line: 8 },
				text: 'Borrowing\n- Any number of shared references (&T), or exactly one mutable reference (&mut T), never both at once.\n- References must always be valid: the borrow checker rejects references that outlive their data.',
			},
			{
				loc: { line: 12 },
				text: 'Tips\n- Clone when fighting the borrow checker in non-hot code; optimise later.\n- Prefer passing &str over &String, and &[T] over &Vec<T>.',
			},
		],
	},
	{
		path: 'Documents/Books/coffee-brewing-field-guide.epub',
		about: 'A Field Guide to Brewing Coffee by Ayu Pratama, ebook',
		parts: [
			{
				loc: { page: 1 },
				text: "Pour over\nA pour over makes a clean, bright cup. Use a ratio of 1 to 16: 15 g of coffee for 250 g of water.\nWater should be just off the boil, around 94 degrees Celsius. Bloom with twice the coffee's weight in water for 30 seconds, then pour slowly in circles. The whole brew should take about 3 minutes.",
			},
			{
				loc: { page: 2 },
				text: 'French press\nUse a coarse grind and a ratio of 1 to 15. Steep for 4 minutes, break the crust, skim the foam, then press gently.\nPour it all out straight away, or the coffee keeps brewing and turns bitter.',
			},
			{
				loc: { page: 3 },
				text: 'AeroPress\nThe AeroPress forgives mistakes. Try 15 g of fine coffee, 200 g of water at 85 degrees, stir for 10 seconds, steep for 1 minute and press for 30 seconds.',
			},
			{
				loc: { page: 4 },
				text: 'Cold brew\nCold brew is steeped, not brewed. Mix 100 g of coarse coffee with 1 litre of cold water.\nLeave it to steep in the fridge for 18 hours, then strain through a paper filter. It keeps for a week. Dilute one to one with milk or water.',
			},
		],
	},
];
