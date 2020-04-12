"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var Settings_1 = require("../pages/Settings");
var Login_1 = require("../pages/Login");
var HomePage_1 = require("../pages/HomePage");
var data = require("../testdata.json");
describe("Alfresco ADF Demo", function () {
    var setting = new Settings_1.Settings();
    var login = new Login_1.Login();
    var home = new HomePage_1.HomePage();
    it("select ECM and login", function () {
        console.log("Selecting ECM from dropdown");
        setting.selectECM(data.baseurl + "settings");
        // verify login page is opened
        expect(protractor_1.element(protractor_1.by.id("username")).getAttribute("placeholder")).toContain("Username");
        console.log("Performing Login");
        login.login("guest@example.com", "Password");
        // verify user landed on home page
        expect(protractor_1.browser.getCurrentUrl()).toContain(data.baseurl + "home");
    });
    it("Create New Folder", function () {
        console.log("Clicking Content Services");
        home.clickContentServices();
        console.log("creating new folder" + data.foldername);
        home.createFolder(data.foldername);
        //verifying folder created
        expect(home.verifyFolderName(data.foldername)).toContain(data.foldername);
    });
    it("Create Duplicate Folder", function () {
        console.log("Creating Duplicate folder :" + data.foldername);
        home.createFolder(data.foldername);
        //Verifying error message
        expect(home.verifyDuplicateFolderError()).toContain(data.duplicatefoldermsg);
    });
    it("Delete Folder", function () {
        console.log("Deleteing folder:" + data.foldername);
        protractor_1.element(protractor_1.by.id("adf-folder-cancel-button")).click();
        //verifying delete corformation message
        expect(home.deleteFolder(data.foldername)).toContain(data.deletefoldermsg);
    });
});
//# sourceMappingURL=ADFDemo.js.map