import { ElementFinder, browser, by, element } from 'protractor';
import {Settings} from '../pages/Settings';
import {Login} from '../pages/Login';
import {HomePage} from '../pages/HomePage';
import * as data from '../testdata.json';

describe("Alfresco ADF Demo", function() {
	let setting = new Settings();
	let login = new Login();
	let home = new HomePage();
	
	it("select ECM and login", function() {
		
		console.log("Selecting ECM from dropdown")
		setting.selectECM(data.baseurl+"settings");
		// verify login page is opened
		 expect(element(by.id("username")).getAttribute("placeholder")).toContain("Username");
		 console.log("Performing Login");
		 login.login("guest@example.com","Password");
		// verify user landed on home page
		expect(browser.getCurrentUrl()).toContain(data.baseurl+"home");
		})
	
		it("Create New Folder", function() {
			console.log("Clicking Content Services");
			home.clickContentServices();
			console.log("creating new folder"+data.foldername);
			home.createFolder(data.foldername);
			//verifying folder created
			expect(home.verifyFolderName(data.foldername)).toContain(data.foldername);
		})

		it("Create Duplicate Folder", function() {
			console.log("Creating Duplicate folder :"+data.foldername);
			home.createFolder(data.foldername);
			//Verifying error message
			expect(home.verifyDuplicateFolderError()).toContain(data.duplicatefoldermsg);
		})

		it("Delete Folder", function() {
			console.log("Deleteing folder:"+data.foldername);
			element(by.id("adf-folder-cancel-button")).click();
			//verifying delete corformation message
			expect(home.deleteFolder(data.foldername)).toContain(data.deletefoldermsg);	
		})
})