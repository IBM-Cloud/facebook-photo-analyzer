# facebook-photo-analyzer

## Deploy

There are two menthods to deploy this app.  With both ways you will need to create a [Facebook developer app](https://developer.facebook.com) and signup for a [AlchemyAPI account](http://www.alchemyapi.com/api/register.html).

### Facebook setup

1. Goto [https://developer.facebook.com](https://developer.facebook.com)
2. Sign in and click hover over My Apps at the top, then click new app.
![][newAppImage]
3. Create a new app, it will be of the type web app.

### Quick and easy

Click the following button

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy)

**You might get a screen asking you to create an alias on DevOps services.  If you do just use the part before the @ sign in your email address.  Example if your email is johnsmith@gmail.com your username would be johnsmith***

Once the deployment is done, skip to step 1 below.

### Developer way
TBD

1.  In the Bluemix UI click on your application.  At the top of the screen there will be a url for your application, ex. http://facebook-photo-analyzer.mybluemix.net.  Copy this and go back to your Facebook app.  We need to use this url as our application URL.
2. Copy the Facebook app ID.  Go back to Bluemix and click on Environment variables on the left hand side.
3. Click on user defined
4. For the name of the enviroment variable enter `FACEBOOK_APP_ID`.  For the value paste your Facebook app ID.
5.  Go back to Facebook, copy the app secret.  Go back to Bluemix.  Repeat step 4 expect this time the variable name is `FACEBOOK_APP_SECRET`.  Paste in the value for the Facebook app secret.
6.  When we signed up for the Alchemy API we should of recieved an API key in our email.  We need to create an environment variable to store this.  Create another environment variable called `ALCHEMY_API_KEY`, paste in api key for Alchemy for the value.
7. Click save.
8. Click overview in the top left.
9. On the right hand side, click restart.

### Privacy Notice

The Personality Box sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker] [deploy_track_url] service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the `app.js` main server file.


[newAppImage]: githubContent/addNewApp.png?raw=true
