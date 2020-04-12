import { ElementFinder, browser, by, element, WebElement } from 'protractor';

export class HomePage{

    clickContentServices() {
        console.log("Clicking Content Services");
        element.all(by.css("mat-nav-list.app-sidenav-linklist>mat-list-item"))
        .get(2).click();        
    }

    createFolder(folderName:string){
        console.log("clicking New Folder button");
        element.all(by.css(".app-document-action-buttons>button")).get(1)
        .click();
        console.log("Entering Folder Name: "+folderName);
        element(by.id("adf-folder-name-input")).sendKeys(folderName);
        console.log("clicking create button")
        element(by.id("adf-folder-create-button")).click();
    }

    async verifyFolderName(folderName:string) :Promise<any> { 
        let folderList =  await element.all(by.css("div.adf-datatable-body>adf-datatable-row")).getWebElements();
        console.log("Number of folders in List:" + ( folderList).length);
            for (let i = 0; i < folderList.length; i++) {
                let name = (await folderList[i].findElement(by.css("span.adf-datatable-cell-value"))).getText();
                if (await name==folderName) {
                    console.log("Folder Found:" + name);
                    return name;
                    }
            }
        return false;
    }
        
    verifyDuplicateFolderError(){
        console.log("Fetching error message");
        browser.sleep(1000);
        let errorMsg = element(by.css("simple-snack-bar.mat-simple-snackbar")).getText();
        return errorMsg;
    }

    async deleteFolder(folderName:string){
        let folderList =  await element.all(by.css("div.adf-datatable-body>adf-datatable-row")).getWebElements();
        console.log("Number of folders in List:" + ( folderList).length);
        for (let i = 0; i < folderList.length; i++) {
            let name = (await folderList[i].findElement(by.css("span.adf-datatable-cell-value"))).getText();
                if (await name==folderName) {
                    console.log("Folder Found:" + name);
                    console.log("Deleting Folder:"+folderName);
                    element(by.id("action_menu_right_"+i)).click();
                    console.log("Fetching Delete confirmation message");
                    element.all(by.css(".mat-menu-content>button")).get(4).click();
                    browser.sleep(1000);
                    let errorMsg = element(by.css("simple-snack-bar.mat-simple-snackbar")).getText();
                    return errorMsg;
                    }
                }
        return false;
           
    }       
}