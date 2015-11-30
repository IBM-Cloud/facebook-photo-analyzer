# Facebook Photo Analyzer

## Architecture Diagram
![][architectureDiagram]

## Deploy

There are two menthods to deploy this app.  With both ways you will need to create a [Facebook developer app](https://developer.facebook.com) and signup for a [AlchemyAPI account](http://www.alchemyapi.com/api/register.html).

### Facebook setup

1. Goto [https://developer.facebook.com](https://developer.facebook.com)
2. Sign in and click hover over My Apps at the top, then click new app.
![][newAppImage]
3. Click Website for the app type
![][websiteImage]
4. Click Skip and Create App ID
![][skipImage]
5. Give your application a name and category.  Click "Create App ID".
![][appNameImage]
6. Leave the page open on Facebook that it brings you to.  It should have an App ID and App Secret displayed at the top.  We will need this info later.


### Quick and easy

Click the following button

[![Deploy to Bluemix](https://deployment-tracker.mybluemix.net/stats/98666763715aa857bce80728b1c4b606/button.svg)](https://bluemix.net/deploy?repository=https://github.com/IBM-Bluemix/facebook-photo-analyzer.git)

**You might get a screen asking you to create an alias on DevOps services.  If you do just use the part before the @ sign in your email address.  Example if your email is johnsmith@gmail.com your username would be johnsmith***

Once the deployment is done, skip to step 10 below.

### Developer way
1. Create a Bluemix Account

    [Sign up][bluemix_signup_url] for Bluemix, or use an existing account.

2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool

3. Download and [install Git][git_install]

3. Clone the app to your local environment from your terminal using the following command

  ```
  git clone https://github.com/IBM-Bluemix/facebook-photo-analyzer.git
  ```
4. cd into this newly created directory

  ```
  cd facebook-photo-analyzer
  ```

5. Edit the `manifest.yml` file and change the `<application-name>` and `<application-host>` to something unique.

    ```
    applications:
    - name: facebook-photo-analyzer
      framework: node
      runtime: node12
      memory: 256M
      instances: 1
      host: facebook-photo-analyzer
      path: .
      command: node app.js
    ```

  The host you use will determinate your application url initially, e.g. `<application-host>.mybluemix.net`.

6. Connect to Bluemix in the command line tool and follow the prompts to log in.

    ```
    $ cf api https://api.ng.bluemix.net
    $ cf login
    ```

    If you want to deploy this app to the EU region in London use the following
    ```
    $ cf api https://api.eu-gb.bluemix.net
    $ cf login
    ```

    If you want to deploy this app to the Asia/Pacific region in Australia use the following
    ```
    $ cf api https://api.au-syd.bluemix.net
    $ cf login
    ```
7. Create the Visual Recognition service in Bluemix.

  ```
  $ cf create-service visual_recognition free visual-recognition-photo-analyzer
  ```

8. Create the Cloudant service in Bluemix.

  ```
  $ cf create-service cloudantNoSQLDB Shared cloudant-photo-analyzer
  ```

9. Push it to Bluemix. We need to perform additional steps once it is deployed, so we will add the option --no-start argument

  ```
  $ cf push --no-start
  ```

10.  In the Bluemix UI click on your application.  At the top of the screen there will be a url for your application, ex. `http://facebook-photo-analyzer.mybluemix.net`.  Copy this and go back to your Facebook app tab in your browser.  We need to use this url as our application URL.
11. Click "Settings" on the left hand side and then click "Add Platform"
![][settingsImage]
12. Click WWW
![][websitePlatformImage]
13. Type in the URL for your application, ex. `http://myapp.mybluemix.net`, click "Save Changes".
![][siteUrlImage]
14. On the left click Dashboard, copy the Facebook app ID.
15. Go back to Bluemix and click on Environment variables on the left hand side.
![][envarsImage]
16. Click on user defined
![][userDefinedImage]
17. For the name of the enviroment variable enter `FACEBOOK_APP_ID`.  For the value paste your Facebook app ID.
![][appIDImage]
18.  Go back to Facebook, copy the app secret.  Go back to Bluemix.  Repeat step 4 expect this time the variable name is `FACEBOOK_APP_SECRET`.  Paste in the value for the Facebook app secret.
![][appSecretImage]
19.  When we signed up for the Alchemy API we should of recieved an API key in our email.  We need to create an environment variable to store this.  Create another environment variable called `ALCHEMY_API_KEY`, paste in api key for Alchemy for the value.
![][alchemyImage]
20. Click save.
21. Click overview in the top left.
![][overviewImage]
22. On the right hand side, click restart or start.
![][restartImage]

### Privacy Notice

The Personality Box sample web application includes code to track deployments to Bluemix and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker] [deploy_track_url] service on each deployment:

* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)

This data is collected from the `VCAP_APPLICATION` environment variable in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

Deployment tracking can be disabled by removing `require("cf-deployment-tracker-client").track();` from the beginning of the [`app.js`](app.js#L23) main server file.


[newAppImage]: githubContent/addNewApp.png?raw=true
[websiteImage]: githubContent/website.png?raw=true
[skipImage]: githubContent/skip.png?raw=true
[appNameImage]: githubContent/appName.png?raw=true
[settingsImage]: githubContent/settings.png?raw=true
[websitePlatformImage]: githubContent/websitePlatform.png?raw=true
[siteUrlImage]: githubContent/siteUrl.png?raw=true
[envarsImage]: githubContent/envars.png?raw=true
[userDefinedImage]: githubContent/userDefined.png?raw=true
[appIDImage]: githubContent/appID.png?raw=true
[appSecretImage]: githubContent/appSecret.png?raw=true
[alchemyImage]: githubContent/alchemy.png?raw=true
[overviewImage]: githubContent/overview.png?raw=true
[restartImage]: githubContent/restart.png?raw=true
[bluemix_signup_url]: https://console.ng.bluemix.net/?cm_mmc=GitHubReadMe-_-BluemixSampleApp-_-Node-_-Watson
[cloud_foundry_url]: https://github.com/cloudfoundry/cli
[git_install]: https://git-scm.com/downloads
[architectureDiagram]: githubContent/architectureDiagram.png?raw=true
