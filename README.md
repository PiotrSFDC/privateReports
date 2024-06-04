# privateReports
Move reports to and from private user folders

**Prerequsite**
- set private certifate in crt folder
- set connected app on target environment to use oAuth 2.0 JWT flow providing:
  - Digital Certificate
  - oAuth scopes:
  - Access the identity URL service (id, profile, email, address, phone)
  - Manage user data via APIs (api)
  - Access the Salesforce API Platform (sfap_api)
  - Perform requests at any time (refresh_token, offline_access)
  - oAuth policies
  - Access the identity URL service
  - Access the Salesforce API Platform
  - Manage user data via APIs
  - Permitted Users Admin approved users are pre-authorized
  - IP Relaxation Relax IP restrictions
  - Refresh Token Policy: Immediately expire refresh token

**Usage**
In the input/reports.csv provide a list of usernames, reports ids, folder ids