"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var Settings = /** @class */ (function () {
    function Settings() {
    }
    Settings.prototype.selectECM = function (url) {
        console.log("Visiting site:" + url);
        protractor_1.browser.get(url);
        console.log("Maximizing window");
        protractor_1.browser.driver.manage().window().maximize();
        console.log("Clicking Provider dropdown");
        protractor_1.element(protractor_1.by.className("mat-select-value")).click();
        console.log("Selecting value: ECM");
        protractor_1.element(protractor_1.by.id("mat-option-1")).click();
        console.log("clicking Apply button");
        protractor_1.element(protractor_1.by.id("host-button")).click();
    };
    return Settings;
}());
exports.Settings = Settings;
//# sourceMappingURL=Settings.js.map