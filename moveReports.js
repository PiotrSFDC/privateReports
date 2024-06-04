const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');
const fsPromise = require('fs').promises;
const csv = require('csvtojson');

const csvFilePath = './input/reports.csv';
const reportsResultsFilePath = './output/reports_results.csv';
const clientId = ''; // TBD: Provice client id from the connected app
const privateKey = fs.readFileSync('./crt/domain.key');
const loginUrl = 'https://test.salesforce.com'; // TBD: Change for production

// Function to convert CSV to JSON
async function writeFile(filePath, data) {
	await fsPromise.writeFile(filePath, data);
}

// Function to convert CSV to JSON
async function csvToJSON(csvFilePath) {
	// Convert CSV to JSON using a stream
	const jsonData = await csv().fromFile(csvFilePath);

	const groupedByUsername = jsonData.reduce((acc, item) => {
		let userGroup = acc.find(group => group.user === item.username);
		if (!userGroup) {
			userGroup = { user: item.username, data: [] };
			acc.push(userGroup);
		}
		userGroup.data.push(item);
		return acc;
	}, []);

	return groupedByUsername;
}

// move reports folder
async function patchSalesforceReport(reportId, folderId, authInfo) {
    const accessToken = authInfo.accessToken;
    const instanceUrl = authInfo.instanceUrl;
    const apiEndpoint = `${instanceUrl}/services/data/v58.0/analytics/reports/${reportId}`; // Replace vXX.X with your API version
  
    const data = {
        reportMetadata: {
          folderId: folderId
        }
      };
    
      try {
        const response = await axios.patch(apiEndpoint, data, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
    
        //console.log('PATCH request successful:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error making PATCH request:', error.response ? error.response.data : error.message);
        throw error;
      }
}

const requestAccessToken = async (token) => {
	try {
		const response = await axios.post(loginUrl + '/services/oauth2/token', null, {
			params: {
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: token
			}
		});
		return response.data;
	} catch (error) {
		console.log('Error: ', error.stack);
		console.error('Error requesting access token:', error.response.data);
		throw error;
	}
};

async function getAccessToken(username) {
	// Create JWT token
	const token = jwt.sign(
		{
			iss: clientId, // Consumer Key from Salesforce Connected App
			sub: username, // Salesforce username
			aud: loginUrl, // Login URL
			exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // Token expiration time (24 hour from now)
		},
		privateKey,
		{ algorithm: 'RS256' }
	);
	const userInfo = await requestAccessToken(token);
	const result = {
		username: username,
		accessToken: userInfo.access_token,
		instanceUrl: userInfo.instance_url,
		loginUrl: loginUrl
	};
	return result;
}

// Usage
const main = async () => {
	let results = []; 
	const jsonData = await csvToJSON(csvFilePath);
	console.log(JSON.stringify(jsonData, null, '\t'));
	results.push('username,reportId,folderId,status');

	for (const obj of jsonData) {
		let resultLine = obj.user;
		try {
			authInfo = await getAccessToken(obj.user);
			console.log('Logged as users: ' +authInfo.username);
		} catch (error) {
			console.log('Unable to Login', error.stack);
			resultLine = obj.user + ',,,Unable to Login';
			results.push(resultLine);
			continue;
		}

		//  main loop
		for (const d of obj.data) {
			try {
				//await shareListView(page, authInfo.instanceUrl, d.objectName, d.listViewId, d.userPublicGroup);
                await patchSalesforceReport(d.reportId,d.folderId, authInfo);
				resultLine = obj.user + ',' + d.reportId + ',' + d.folderId + ',OK';
			} catch (error) {
				console.log('Unable to , Error: ', error.stack);
				resultLine = obj.user + ',' + d.reportId + ',' + d.folderId + ',' + error.message;			
			}
			results.push(resultLine);
		}

		
	}

	await writeFile(reportsResultsFilePath, results.join('\r\n'));
	console.log('============END============');
};

main().catch((err) => {
	console.error('Error in main execution:', err.stack);
});