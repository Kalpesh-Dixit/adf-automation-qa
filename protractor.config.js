var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
    framework: 'jasmine', 
    directConnect:true,    
    specs: ['./outputjs/specs/ADFDemo.js'],

    capabilities: {
      'browserName': 'chrome'
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