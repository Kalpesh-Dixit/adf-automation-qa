import { ElementFinder, browser, by, element } from 'protractor';

export class Settings{

     selectECM(url:string) {
        console.log("Visiting site:"+url); 
        browser.get(url);
        console.log("Maximizing window");
        browser.driver.manage().window().maximize();
        console.log("Clicking Provider dropdown");
        element(by.className("mat-select-value")).click();
        console.log("Selecting value: ECM");
        element(by.id("mat-option-1")).click();
        console.log("clicking Apply button");
		element(by.id("host-button")).click();
    }
}
