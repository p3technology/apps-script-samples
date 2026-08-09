# QuestionPro Audience Recruiter Pilot

This folder contains a live, lightweight recruitment pilot. The current public deployment is https://questionpro-audience-recruiter.onrender.com/.

## Public recruitment page

`index.html` is the participant-facing landing page. It:

- accepts audience, market, reward, source, campaign, audience ID, referral, destination, and contact parameters;
- validates that the destination is an HTTPS QuestionPro domain;
- does not collect personal information;
- requires consent before continuing;
- passes attribution variables to the QuestionPro destination.

Example:

```text
https://questionpro-audience-recruiter.onrender.com/?audience=South%20Africa%20research%20community&market=South%20Africa&reward=Paid%20opportunities%20may%20be%20available&source=facebook_group_1&campaign=sa_general_2026_01&audience_id=sa_general&dest=https%3A%2F%2Fresearchpanel.questionpro.com
```

## Campaign builder

`admin.html` is a browser-based operator tool. It stores data only in the operator's browser and generates recruitment links and channel-specific messages.

## Current launch destination

The seeded South Africa pilot uses:

`https://researchpanel.questionpro.com`

Confirm that the community accepts new registrations and retains these parameters before sending paid traffic:

- `qp_source`
- `qp_campaign`
- `qp_audience`
- `qp_referral`

## Outcome import

The admin accepts CSV files with:

```csv
campaign_id,source_id,respondent_id,verified,completed,quality_score,fraud_flag,incentive_paid
```

## MVP constraints

- No scraping.
- No automatic posting into social platforms or communities.
- No unsolicited SMS or email.
- No server-side admin authentication.
- No centralized click database.

This pilot is operational for attributed recruiting because the QuestionPro destination receives campaign/source variables. The next production phase should add a shared database, operator authentication, redirect-event logging, suppression lists, and approved email/SMS integrations.

## Ready source links

`pilot-links.csv` contains source- and campaign-attributed links for the first South Africa recruitment channels. Use those exact links so downstream QuestionPro exports can be joined back to source performance.
