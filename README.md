## Alfresco ADF automation QA exercise
# Developed by Kalpesh Dixit

Description: 
* This project is developed using Protractor and Typescript. 
* All dependecies are declared in file named package.json.It is located at root location in the project.
* To pass the testdata, I have created testdata.json file in root directory. 
* Given test scenarios are written in ADFDemo.ts file. You can find it inside specs folder.
* protractor.config.js contains execution related configurations. 

Explanation: 
* I have used POM design in this project. Seperate js file is created for each webpage. They are placed in pages folder.
* I have used beutiful reports which provides html reports along with screenshots and analysis charts.
* After creating new folder, I am asserting it by searching that folder in folders list.
* To verify duplicate folder, I have used error message which is flashed at the bottom of the page.
* Delete folder operation is verified with the help of confirmation message which is flashed at the bottom of the page.
* console logs are printed at every step for tracking purpose.
* I have implemented this assignment in chrome and firefox browser. Browser can be selected from protractor.config.js file.   

Prerequisites:
* IDE: visual studio code
* NodeJS version above 6. (I have used 12.16.2).
* Protractor version 5.4.3
* Type Script Version 3.8.3 
* npm version 6
* beutiful reports 1.3.6
* protractor-html-reporter-2 version 1.0.4
* Chrome browser Version 81.0
* Firefox browser version 75.0

