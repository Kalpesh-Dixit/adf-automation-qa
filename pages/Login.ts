import { ElementFinder, browser, by, element } from 'protractor';

export class Login{

     login(username:string, password:string){
        console.log("Entering username:"+username);
        element(by.id("username")).sendKeys(username);
        console.log("Entering Password:"+password);
        element(by.id("password")).sendKeys(password);
        console.log("cliking submit button");
        element(by.id("login-button")).click();
    }
}
