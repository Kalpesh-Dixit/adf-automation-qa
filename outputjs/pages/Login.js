"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var Login = /** @class */ (function () {
    function Login() {
    }
    Login.prototype.login = function (username, password) {
        console.log("Entering username:" + username);
        protractor_1.element(protractor_1.by.id("username")).sendKeys(username);
        console.log("Entering Password:" + password);
        protractor_1.element(protractor_1.by.id("password")).sendKeys(password);
        console.log("cliking submit button");
        protractor_1.element(protractor_1.by.id("login-button")).click();
    };
    return Login;
}());
exports.Login = Login;
//# sourceMappingURL=Login.js.map