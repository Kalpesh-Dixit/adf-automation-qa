var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    framework: 'jasmine', 
    directConnect:true,    
    specs: ['./outputjs/specs/ADFDemo.js'],

    capabilities: {
      browserName: 'firefox',
      shardTestFiles: true,
      maxInstances: 2,
      chromeOptions: {
          args: [
              // disable chrome's wakiness
              '--disable-infobars',
              '--disable-extensions',
              'verbose',
              'log-path=/tmp/chromedriver.log'
          ],
          prefs: {
              // disable chrome's annoying password manager
              'profile.password_manager_enabled': false,
              'credentials_enable_service': false,
              'password_manager_enabled': false
          }
      }
  },


    onPrepare() { 
      require('ts-node').register({ 
      project: require('path').join(__dirname, './tsconfig.json')
    });
    //Beutiful Report settings
    jasmine.getEnv().addReporter(new HtmlReporter({
      baseDirectory: 'Reports/screenshots'
   }).getJasmine2Reporter());
},
       
}